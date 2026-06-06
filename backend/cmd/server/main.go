package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"github.com/jaredlemler/life-trackin/internal/auth"
	"github.com/jaredlemler/life-trackin/internal/db"
	"github.com/jaredlemler/life-trackin/internal/handlers"
	"github.com/jaredlemler/life-trackin/internal/middleware"
)

func main() {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://127.0.0.1:8080"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://127.0.0.1:5173"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret-change-in-production"
	}

	ctx := context.Background()

	// Initialize database
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Run migrations
	if err := db.RunMigrations(databaseURL); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Migrations completed successfully")

	// Initialize OAuth (Indigo SDK ClientApp with PostgreSQL store)
	oauthApp := auth.NewOAuthApp(appURL, pool)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(oauthApp, pool, jwtSecret, frontendURL)
	boardHandler := handlers.NewBoardHandler(pool)
	habitHandler := handlers.NewHabitHandler(pool)
	entryHandler := handlers.NewEntryHandler(pool)

	// Setup router
	r := chi.NewRouter()

	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{frontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"status":"ok"}`)
	})

	// OAuth metadata endpoints
	r.Get("/client-metadata.json", authHandler.ClientMetadata)

	// Auth routes
	r.Route("/api/auth", func(r chi.Router) {
		r.Get("/login", authHandler.Login)
		r.Get("/callback", authHandler.Callback)
		r.Get("/me", middleware.RequireAuth(jwtSecret)(authHandler.Me))
		r.Post("/logout", authHandler.Logout)
	})

	// Protected API routes
	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(jwtSecret))

		// Boards
		r.Get("/boards", boardHandler.List)
		r.Post("/boards", boardHandler.Create)
		r.Get("/boards/{boardID}", boardHandler.Get)
		r.Put("/boards/{boardID}", boardHandler.Update)
		r.Delete("/boards/{boardID}", boardHandler.Delete)
		r.Get("/boards/{boardID}/heatmap", boardHandler.Heatmap)

		// Habits
		r.Get("/boards/{boardID}/habits", habitHandler.List)
		r.Post("/boards/{boardID}/habits", habitHandler.Create)
		r.Get("/habits/{habitID}", habitHandler.Get)
		r.Put("/habits/{habitID}", habitHandler.Update)
		r.Delete("/habits/{habitID}", habitHandler.Delete)

		// Entries
		r.Post("/habits/{habitID}/entries", entryHandler.Create)
		r.Get("/habits/{habitID}/entries", entryHandler.List)
		r.Get("/habits/{habitID}/streak", entryHandler.Streak)
		r.Delete("/entries/{entryID}", entryHandler.Delete)
	})

	// Start server
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Server starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced shutdown: %v", err)
	}
	log.Println("Server exited")
}
