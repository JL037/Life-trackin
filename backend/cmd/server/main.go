package main

import (
	"context"
	"fmt"
	"log/slog"
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

	// Configure structured JSON logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		slog.Error("DATABASE_URL is required")
		os.Exit(1)
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

	// Cookie configuration (environment-driven for production safety)
	cookieDomain := os.Getenv("COOKIE_DOMAIN")
	cookieSecure := os.Getenv("COOKIE_SECURE") == "true"
	cookieSameSite := parseSameSite(os.Getenv("COOKIE_SAMESITE"))

	ctx := context.Background()

	// Initialize database
	pool, err := db.Connect(ctx, databaseURL)
	if err != nil {
		slog.Error("failed to connect to database", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer pool.Close()

	// Run migrations
	if err := db.RunMigrations(databaseURL); err != nil {
		slog.Error("failed to run migrations", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("migrations completed successfully")

	// Initialize OAuth (Indigo SDK ClientApp with PostgreSQL store)
	oauthApp := auth.NewOAuthApp(appURL, pool)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(oauthApp, pool, jwtSecret, frontendURL, handlers.CookieConfig{
		Domain:   cookieDomain,
		Secure:   cookieSecure,
		SameSite: cookieSameSite,
	})
	boardHandler := handlers.NewBoardHandler(pool)
	habitHandler := handlers.NewHabitHandler(pool)
	entryHandler := handlers.NewEntryHandler(pool)
	publicHandler := handlers.NewPublicHandler(pool)
	socialHandler := handlers.NewSocialHandler(pool)

	// Rate limiters
	ipRateLimiter := middleware.NewRateLimiter(30, time.Minute)      // 30 req/min per IP
	userRateLimiter := middleware.NewRateLimiter(60, time.Minute)      // 60 req/min per user

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

	// Health check (no rate limit)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		healthCtx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		if err := pool.Ping(healthCtx); err != nil {
			slog.Error("health check failed", slog.String("error", err.Error()))
			w.WriteHeader(http.StatusServiceUnavailable)
			fmt.Fprint(w, `{"status":"unhealthy","check":"database"}`)
			return
		}

		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `{"status":"ok","check":"database"}`)
	})

	// OAuth metadata endpoints (no rate limit)
	r.Get("/client-metadata.json", authHandler.ClientMetadata)

	// Auth routes (per-IP rate limit)
	r.Route("/api/auth", func(r chi.Router) {
		r.Use(middleware.RateLimitByIP(ipRateLimiter))
		r.Get("/login", authHandler.Login)
		r.Get("/callback", authHandler.Callback)
		r.Get("/me", middleware.RequireAuth(jwtSecret)(authHandler.Me))
		r.Put("/me", middleware.RequireAuth(jwtSecret)(authHandler.UpdateProfile))
		r.Post("/logout", authHandler.Logout)
	})

	// Protected API routes (auth + per-user rate limit on writes)
	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(jwtSecret))

		// Read routes (no user rate limit)
		r.Get("/boards", boardHandler.List)
		r.Get("/boards/{boardID}", boardHandler.Get)
		r.Get("/boards/{boardID}/stats", boardHandler.Stats)
		r.Get("/boards/{boardID}/heatmap", boardHandler.Heatmap)
		r.Get("/boards/{boardID}/habits", habitHandler.List)
		r.Get("/habits/{habitID}", habitHandler.Get)
		r.Get("/habits/{habitID}/entries", entryHandler.List)
		r.Get("/habits/{habitID}/streak", entryHandler.Streak)

		// Write routes (per-user rate limit)
		r.With(middleware.RateLimitByUser(userRateLimiter)).Post("/boards", boardHandler.Create)
		r.With(middleware.RateLimitByUser(userRateLimiter)).Put("/boards/{boardID}", boardHandler.Update)
		r.With(middleware.RateLimitByUser(userRateLimiter)).Delete("/boards/{boardID}", boardHandler.Delete)
		r.With(middleware.RateLimitByUser(userRateLimiter)).Post("/boards/{boardID}/habits", habitHandler.Create)
		r.With(middleware.RateLimitByUser(userRateLimiter)).Put("/habits/{habitID}", habitHandler.Update)
		r.With(middleware.RateLimitByUser(userRateLimiter)).Delete("/habits/{habitID}", habitHandler.Delete)
		r.With(middleware.RateLimitByUser(userRateLimiter)).Post("/habits/{habitID}/entries", entryHandler.Create)
		r.With(middleware.RateLimitByUser(userRateLimiter)).Delete("/entries/{entryID}", entryHandler.Delete)

		// Social routes
		r.Post("/follows/{handle}", socialHandler.Follow)
		r.Delete("/follows/{handle}", socialHandler.Unfollow)
		r.Get("/follows", socialHandler.ListFollows)
		r.Get("/feed", socialHandler.Feed)
	})

	// Public API routes (per-IP rate limit)
	r.Route("/api/public", func(r chi.Router) {
		r.Use(middleware.RateLimitByIP(ipRateLimiter))
		r.Get("/users/{handle}", publicHandler.GetUser)
		r.Get("/users/{handle}/boards", publicHandler.ListBoards)
		r.Get("/boards/{boardID}/stats", publicHandler.BoardStats)
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
		slog.Info("server starting", slog.String("port", port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server")
	shutdownCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced shutdown", slog.String("error", err.Error()))
		os.Exit(1)
	}
	slog.Info("server exited")
}

func parseSameSite(v string) http.SameSite {
	switch v {
	case "Strict":
		return http.SameSiteStrictMode
	case "None":
		return http.SameSiteNoneMode
	case "Lax", "":
		return http.SameSiteLaxMode
	default:
		return http.SameSiteLaxMode
	}
}
