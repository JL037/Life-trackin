package auth

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/bluesky-social/indigo/atproto/auth/oauth"
	"github.com/bluesky-social/indigo/atproto/syntax"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PGClientAuthStore implements oauth.ClientAuthStore using PostgreSQL.
type PGClientAuthStore struct {
	pool *pgxpool.Pool
}

func NewPGClientAuthStore(pool *pgxpool.Pool) *PGClientAuthStore {
	return &PGClientAuthStore{pool: pool}
}

func (s *PGClientAuthStore) GetSession(ctx context.Context, did syntax.DID, sessionID string) (*oauth.ClientSessionData, error) {
	var data json.RawMessage
	err := s.pool.QueryRow(ctx,
		`SELECT data FROM oauth_sessions WHERE did = $1 AND session_id = $2`,
		did.String(), sessionID,
	).Scan(&data)
	if err != nil {
		return nil, fmt.Errorf("loading session: %w", err)
	}

	var sess oauth.ClientSessionData
	if err := json.Unmarshal(data, &sess); err != nil {
		return nil, fmt.Errorf("decoding session: %w", err)
	}
	return &sess, nil
}

func (s *PGClientAuthStore) SaveSession(ctx context.Context, sess oauth.ClientSessionData) error {
	data, err := json.Marshal(sess)
	if err != nil {
		return fmt.Errorf("marshaling session: %w", err)
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO oauth_sessions (session_id, did, data) VALUES ($1, $2, $3)
		 ON CONFLICT (session_id) DO UPDATE SET did = $2, data = $3, updated_at = NOW()`,
		sess.SessionID, sess.AccountDID.String(), data,
	)
	return err
}

func (s *PGClientAuthStore) DeleteSession(ctx context.Context, did syntax.DID, sessionID string) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM oauth_sessions WHERE did = $1 AND session_id = $2`,
		did.String(), sessionID,
	)
	return err
}

func (s *PGClientAuthStore) GetAuthRequestInfo(ctx context.Context, state string) (*oauth.AuthRequestData, error) {
	var data json.RawMessage
	err := s.pool.QueryRow(ctx,
		`SELECT data FROM oauth_auth_requests WHERE state = $1`,
		state,
	).Scan(&data)
	if err != nil {
		return nil, fmt.Errorf("loading auth request: %w", err)
	}

	var info oauth.AuthRequestData
	if err := json.Unmarshal(data, &info); err != nil {
		return nil, fmt.Errorf("decoding auth request: %w", err)
	}
	return &info, nil
}

func (s *PGClientAuthStore) SaveAuthRequestInfo(ctx context.Context, info oauth.AuthRequestData) error {
	data, err := json.Marshal(info)
	if err != nil {
		return fmt.Errorf("marshaling auth request: %w", err)
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO oauth_auth_requests (state, data) VALUES ($1, $2)
		 ON CONFLICT (state) DO UPDATE SET data = $2`,
		info.State, data,
	)
	return err
}

func (s *PGClientAuthStore) DeleteAuthRequestInfo(ctx context.Context, state string) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM oauth_auth_requests WHERE state = $1`,
		state,
	)
	return err
}
