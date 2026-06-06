package auth

import (
	"github.com/bluesky-social/indigo/atproto/auth/oauth"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NewOAuthApp creates an Indigo SDK ClientApp backed by PostgreSQL.
func NewOAuthApp(appURL string, pool *pgxpool.Pool) *oauth.ClientApp {
	store := NewPGClientAuthStore(pool)

	// Use localhost config for development. The auth server generates a
	// virtual client metadata document for http://localhost client IDs.
	config := oauth.NewLocalhostConfig(
		appURL+"/api/auth/callback",
		[]string{"atproto"},
	)

	return oauth.NewClientApp(&config, store)
}
