package testutil

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// TestDB wraps a testcontainers PostgreSQL instance.
type TestDB struct {
	Pool      *pgxpool.Pool
	Container *postgres.PostgresContainer
	DSN       string
}

// NewTestDB spins up a PostgreSQL container, runs migrations, and returns a TestDB.
func NewTestDB(t *testing.T) *TestDB {
	ctx := context.Background()

	// Use a specific postgres version to match production
	container, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("lifetrack_test"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("failed to start postgres container: %v", err)
	}

	t.Cleanup(func() {
		if err := container.Terminate(ctx); err != nil {
			log.Printf("failed to terminate container: %v", err)
		}
	})

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %v", err)
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("failed to create pgx pool: %v", err)
	}

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("failed to ping database: %v", err)
	}

	// Run migrations
	if err := runMigrations(dsn); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	return &TestDB{
		Pool:      pool,
		Container: container,
		DSN:       dsn,
	}
}

// Reset truncates all application tables (except oauth_ tables) for test isolation.
func (td *TestDB) Reset(t *testing.T) {
	ctx := context.Background()
	_, err := td.Pool.Exec(ctx, `
		TRUNCATE TABLE entries, streaks, habits, boards, follows, users, oauth_sessions, oauth_auth_requests RESTART IDENTITY CASCADE;
	`)
	if err != nil {
		t.Fatalf("failed to reset database: %v", err)
	}
}

func runMigrations(dsn string) error {
	// Find migrations directory by searching upward from current working directory.
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("getting working directory: %w", err)
	}

	migrationsPath := findMigrationsDir(cwd)
	if migrationsPath == "" {
		// Fallback: try relative to this source file
		_, b, _, _ := runtime.Caller(0)
		basePath := filepath.Dir(b)
		migrationsPath = filepath.Join(basePath, "..", "..", "..", "migrations")
	}

	// Ensure the path exists for file:// URLs
	absPath, err := filepath.Abs(migrationsPath)
	if err != nil {
		return fmt.Errorf("getting absolute path: %w", err)
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return fmt.Errorf("migrations directory not found at %s", absPath)
	}

	m, err := migrate.New("file://"+absPath, dsn)
	if err != nil {
		return fmt.Errorf("creating migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("running migrations: %w", err)
	}
	return nil
}

func findMigrationsDir(start string) string {
	for dir := start; dir != "/" && dir != filepath.VolumeName(dir)+"\\"; dir = filepath.Dir(dir) {
		candidate := filepath.Join(dir, "migrations")
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate
		}
	}
	return ""
}

// SeedUser creates a user for testing and returns its ID.
func (td *TestDB) SeedUser(t *testing.T, did, handle string) string {
	ctx := context.Background()
	var userID string
	err := td.Pool.QueryRow(ctx,
		`INSERT INTO users (did, handle) VALUES ($1, $2) RETURNING id`,
		did, handle,
	).Scan(&userID)
	if err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	return userID
}

// SeedBoard creates a board for testing and returns its ID.
func (td *TestDB) SeedBoard(t *testing.T, userID, name, visibility string) string {
	ctx := context.Background()
	var boardID string
	err := td.Pool.QueryRow(ctx,
		`INSERT INTO boards (user_id, name, visibility) VALUES ($1, $2, $3) RETURNING id`,
		userID, name, visibility,
	).Scan(&boardID)
	if err != nil {
		t.Fatalf("failed to seed board: %v", err)
	}
	return boardID
}

// SeedHabit creates a habit for testing and returns its ID.
func (td *TestDB) SeedHabit(t *testing.T, boardID, name, habitType string) string {
	ctx := context.Background()
	var habitID string
	err := td.Pool.QueryRow(ctx,
		`INSERT INTO habits (board_id, name, type) VALUES ($1, $2, $3::habit_type) RETURNING id`,
		boardID, name, habitType,
	).Scan(&habitID)
	if err != nil {
		t.Fatalf("failed to seed habit: %v", err)
	}
	// Create streak record
	if _, err := td.Pool.Exec(ctx, `INSERT INTO streaks (habit_id) VALUES ($1) ON CONFLICT DO NOTHING`, habitID); err != nil {
		log.Printf("failed to seed streak for habit %s: %v", habitID, err)
	}
	return habitID
}

// SeedEntry creates an entry for testing and returns its ID.
func (td *TestDB) SeedEntry(t *testing.T, habitID, date string, valueBool *bool, valueNumeric *float64) string {
	ctx := context.Background()
	var entryID string
	err := td.Pool.QueryRow(ctx,
		`INSERT INTO entries (habit_id, date, value_bool, value_numeric) VALUES ($1, $2, $3, $4) RETURNING id`,
		habitID, date, valueBool, valueNumeric,
	).Scan(&entryID)
	if err != nil {
		t.Fatalf("failed to seed entry: %v", err)
	}
	return entryID
}

// SkipIfShort skips integration tests when -short flag is provided.
func SkipIfShort(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}
}

// GetEnv returns an environment variable or a default value.
func GetEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
