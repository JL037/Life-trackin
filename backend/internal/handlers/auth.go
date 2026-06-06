package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/bluesky-social/indigo/atproto/auth/oauth"
	"github.com/bluesky-social/indigo/atproto/identity"
	"github.com/bluesky-social/indigo/atproto/syntax"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaredlemler/life-trackin/internal/middleware"
)

type AuthHandler struct {
	app         *oauth.ClientApp
	pool        *pgxpool.Pool
	jwtSecret   string
	frontendURL string
}

func NewAuthHandler(app *oauth.ClientApp, pool *pgxpool.Pool, jwtSecret, frontendURL string) *AuthHandler {
	return &AuthHandler{
		app:         app,
		pool:        pool,
		jwtSecret:   jwtSecret,
		frontendURL: frontendURL,
	}
}

// ClientMetadata serves the OAuth client metadata document.
func (h *AuthHandler) ClientMetadata(w http.ResponseWriter, r *http.Request) {
	meta := h.app.Config.ClientMetadata()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(meta)
}

// Login initiates the AT Protocol OAuth flow using the Indigo SDK.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	handle := r.URL.Query().Get("handle")
	if handle == "" {
		http.Error(w, `{"error":"handle parameter is required"}`, http.StatusBadRequest)
		return
	}

	// The Indigo SDK resolves the handle, discovers the auth server,
	// sends a PAR request, and returns the redirect URL.
	redirectURL, err := h.app.StartAuthFlow(ctx, handle)
	if err != nil {
		log.Printf("OAuth login failed for %s: %v", handle, err)
		http.Error(w, fmt.Sprintf(`{"error":"%v"}`, err), http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// Callback handles the OAuth callback from the authorization server.
func (h *AuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// ProcessCallback validates state, exchanges the code for tokens,
	// verifies the DID, and persists the session in our store.
	sessData, err := h.app.ProcessCallback(ctx, r.URL.Query())
	if err != nil {
		if oauthErr, ok := err.(*oauth.AuthRequestCallbackError); ok {
			log.Printf("OAuth callback error: %s - %s", oauthErr.ErrorCode, oauthErr.ErrorDescription)
			http.Redirect(w, r, h.frontendURL+"/login?error="+url.QueryEscape(oauthErr.ErrorDescription), http.StatusFound)
			return
		}
		log.Printf("OAuth callback processing failed: %v", err)
		http.Redirect(w, r, h.frontendURL+"/login?error="+url.QueryEscape(err.Error()), http.StatusFound)
		return
	}

	// Resolve DID to handle for user upsert.
	did := sessData.AccountDID
	handle, err := h.resolveHandle(ctx, did)
	if err != nil {
		log.Printf("Failed to resolve handle for %s: %v", did, err)
		http.Redirect(w, r, h.frontendURL+"/login?error=identity+resolution+failed", http.StatusFound)
		return
	}

	// Upsert user.
	userID, err := h.upsertUser(ctx, did.String(), handle)
	if err != nil {
		log.Printf("Failed to upsert user: %v", err)
		http.Redirect(w, r, h.frontendURL+"/login?error=internal+error", http.StatusFound)
		return
	}

	// Generate JWT session cookie.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":    userID,
		"did":    did.String(),
		"handle": handle,
		"exp":    time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":    time.Now().Unix(),
	})

	tokenStr, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		log.Printf("Failed to sign JWT: %v", err)
		http.Redirect(w, r, h.frontendURL+"/login?error=internal+error", http.StatusFound)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    tokenStr,
		Path:     "/",
		Domain:   "127.0.0.1",
		HttpOnly: true,
		Secure:   false, // Set to true in production
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60, // 7 days
	})

	http.Redirect(w, r, h.frontendURL+"/dashboard", http.StatusFound)
}

func (h *AuthHandler) resolveHandle(ctx context.Context, did syntax.DID) (string, error) {
	dir := identity.DefaultDirectory()
	ident, err := dir.LookupDID(ctx, did)
	if err != nil {
		return "", err
	}
	if ident.Handle == "" {
		return did.String(), nil // fallback to DID string
	}
	return string(ident.Handle), nil
}

func (h *AuthHandler) upsertUser(ctx context.Context, did, handle string) (string, error) {
	var userID string
	err := h.pool.QueryRow(ctx,
		`INSERT INTO users (did, handle) VALUES ($1, $2)
		 ON CONFLICT (did) DO UPDATE SET handle = $2, updated_at = NOW()
		 RETURNING id`,
		did, handle,
	).Scan(&userID)
	return userID, err
}

// Me returns the current authenticated user's info.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID := middleware.GetUserID(ctx)
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var user struct {
		ID             string    `json:"id"`
		DID            string    `json:"did"`
		Handle         string    `json:"handle"`
		DisplayName    string    `json:"display_name"`
		AvatarURL      string    `json:"avatar_url"`
		PrivacyDefault string    `json:"privacy_default"`
		CreatedAt      time.Time `json:"created_at"`
	}

	err := h.pool.QueryRow(ctx,
		`SELECT id, did, handle, display_name, avatar_url, privacy_default, created_at
		 FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.DID, &user.Handle, &user.DisplayName, &user.AvatarURL, &user.PrivacyDefault, &user.CreatedAt)

	if err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// Logout clears the session.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status":"logged out"}`)
}
