package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

// OAuthClient wraps the AT Protocol OAuth flow.
// Using a simplified implementation that handles the core flow:
// handle resolution → PAR → redirect → callback → session
type OAuthClient struct {
	AppURL   string
	Store    *PGAuthStore
	mu       sync.RWMutex
}

func NewOAuthClient(ctx context.Context, appURL string, pool *pgxpool.Pool) (*OAuthClient, error) {
	store := NewPGAuthStore(pool)

	return &OAuthClient{
		AppURL: appURL,
		Store:  store,
	}, nil
}

// ClientMetadataDocument returns the OAuth client metadata for AT Protocol
func (c *OAuthClient) ClientMetadataDocument() map[string]any {
	return map[string]any{
		"client_id":                    c.AppURL + "/client-metadata.json",
		"client_name":                  "LifeTrack",
		"client_uri":                   c.AppURL,
		"logo_uri":                     c.AppURL + "/logo.png",
		"tos_uri":                      c.AppURL + "/terms",
		"policy_uri":                   c.AppURL + "/privacy",
		"redirect_uris":                []string{c.AppURL + "/api/auth/callback"},
		"scope":                        "atproto",
		"grant_types":                  []string{"authorization_code", "refresh_token"},
		"response_types":               []string{"code"},
		"token_endpoint_auth_method":   "none",
		"application_type":             "web",
		"dpop_bound_access_tokens":     true,
	}
}

// PGAuthStore implements session persistence in PostgreSQL
type PGAuthStore struct {
	pool *pgxpool.Pool
}

func NewPGAuthStore(pool *pgxpool.Pool) *PGAuthStore {
	return &PGAuthStore{pool: pool}
}

func (s *PGAuthStore) SaveAuthRequest(ctx context.Context, state string, data any) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshaling auth request: %w", err)
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO oauth_auth_requests (state, data) VALUES ($1, $2)
		 ON CONFLICT (state) DO UPDATE SET data = $2`,
		state, jsonData,
	)
	return err
}

func (s *PGAuthStore) LoadAuthRequest(ctx context.Context, state string) (json.RawMessage, error) {
	var data json.RawMessage
	err := s.pool.QueryRow(ctx,
		`DELETE FROM oauth_auth_requests WHERE state = $1 RETURNING data`,
		state,
	).Scan(&data)
	if err != nil {
		return nil, fmt.Errorf("loading auth request: %w", err)
	}
	return data, nil
}

func (s *PGAuthStore) SaveSession(ctx context.Context, sessionID, did string, data any) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshaling session: %w", err)
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO oauth_sessions (session_id, did, data) VALUES ($1, $2, $3)
		 ON CONFLICT (session_id) DO UPDATE SET data = $3, updated_at = NOW()`,
		sessionID, did, jsonData,
	)
	return err
}

func (s *PGAuthStore) LoadSession(ctx context.Context, sessionID string) (string, json.RawMessage, error) {
	var did string
	var data json.RawMessage
	err := s.pool.QueryRow(ctx,
		`SELECT did, data FROM oauth_sessions WHERE session_id = $1`,
		sessionID,
	).Scan(&did, &data)
	if err != nil {
		return "", nil, fmt.Errorf("loading session: %w", err)
	}
	return did, data, nil
}

func (s *PGAuthStore) DeleteSession(ctx context.Context, sessionID string) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM oauth_sessions WHERE session_id = $1`,
		sessionID,
	)
	return err
}
