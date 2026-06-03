package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jaredlemler/life-trackin/internal/auth"
)

type AuthHandler struct {
	oauth       *auth.OAuthClient
	pool        *pgxpool.Pool
	jwtSecret   string
	frontendURL string
}

func NewAuthHandler(oauth *auth.OAuthClient, pool *pgxpool.Pool, jwtSecret, frontendURL string) *AuthHandler {
	return &AuthHandler{
		oauth:       oauth,
		pool:        pool,
		jwtSecret:   jwtSecret,
		frontendURL: frontendURL,
	}
}

// ClientMetadata serves the OAuth client metadata document
func (h *AuthHandler) ClientMetadata(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.oauth.ClientMetadataDocument())
}

// Login initiates the AT Protocol OAuth flow
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	handle := r.URL.Query().Get("handle")
	if handle == "" {
		http.Error(w, `{"error":"handle parameter is required"}`, http.StatusBadRequest)
		return
	}

	// Normalize handle
	handle = strings.TrimPrefix(handle, "@")

	// Resolve handle to DID
	did, err := auth.ResolveHandle(ctx, handle)
	if err != nil {
		log.Printf("Failed to resolve handle %s: %v", handle, err)
		http.Error(w, fmt.Sprintf(`{"error":"failed to resolve handle: %v"}`, err), http.StatusBadRequest)
		return
	}

	// Get PDS URL from DID
	pdsURL, err := auth.GetPDSFromDID(ctx, did)
	if err != nil {
		log.Printf("Failed to get PDS for %s: %v", did, err)
		http.Error(w, fmt.Sprintf(`{"error":"failed to resolve PDS: %v"}`, err), http.StatusInternalServerError)
		return
	}

	// Get auth server metadata
	meta, err := auth.GetAuthServerMetadata(ctx, pdsURL)
	if err != nil {
		log.Printf("Failed to get auth server metadata from %s: %v", pdsURL, err)
		http.Error(w, fmt.Sprintf(`{"error":"failed to get auth server: %v"}`, err), http.StatusInternalServerError)
		return
	}

	// Generate PKCE and state
	verifier, challenge, err := auth.GeneratePKCE()
	if err != nil {
		http.Error(w, `{"error":"failed to generate PKCE"}`, http.StatusInternalServerError)
		return
	}

	state, err := auth.GenerateState()
	if err != nil {
		http.Error(w, `{"error":"failed to generate state"}`, http.StatusInternalServerError)
		return
	}

	// Store auth request
	authReqData := map[string]string{
		"did":            did,
		"handle":         handle,
		"pds_url":        pdsURL,
		"pkce_verifier":  verifier,
		"token_endpoint": meta.TokenEndpoint,
		"issuer":         meta.Issuer,
	}
	if err := h.oauth.Store.SaveAuthRequest(ctx, state, authReqData); err != nil {
		log.Printf("Failed to save auth request: %v", err)
		http.Error(w, `{"error":"failed to save auth state"}`, http.StatusInternalServerError)
		return
	}

	// Build PAR request or direct authorization URL
	callbackURL := h.oauth.AppURL + "/api/auth/callback"
	clientID := h.oauth.AppURL + "/client-metadata.json"

	// If PAR endpoint exists, use it
	if meta.PushedAuthorizationRequestEndpoint != "" {
		authURL, err := h.doPAR(ctx, meta, clientID, callbackURL, state, challenge)
		if err != nil {
			log.Printf("PAR failed, falling back to direct auth: %v", err)
			// Fall back to direct authorization
			authURL = buildAuthURL(meta.AuthorizationEndpoint, clientID, callbackURL, state, challenge)
		}
		http.Redirect(w, r, authURL, http.StatusFound)
		return
	}

	// Direct authorization URL
	authURL := buildAuthURL(meta.AuthorizationEndpoint, clientID, callbackURL, state, challenge)
	http.Redirect(w, r, authURL, http.StatusFound)
}

func (h *AuthHandler) doPAR(ctx context.Context, meta *auth.AuthServerMeta, clientID, callbackURL, state, challenge string) (string, error) {
	data := url.Values{
		"client_id":             {clientID},
		"redirect_uri":         {callbackURL},
		"response_type":        {"code"},
		"scope":                {"atproto"},
		"state":                {state},
		"code_challenge":       {challenge},
		"code_challenge_method": {"S256"},
	}

	resp, err := http.PostForm(meta.PushedAuthorizationRequestEndpoint, data)
	if err != nil {
		return "", fmt.Errorf("PAR request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("PAR returned status %d: %s", resp.StatusCode, string(body))
	}

	var parResp struct {
		RequestURI string `json:"request_uri"`
		ExpiresIn  int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parResp); err != nil {
		return "", fmt.Errorf("decoding PAR response: %w", err)
	}

	// Build authorization URL with request_uri
	params := url.Values{
		"client_id":   {clientID},
		"request_uri": {parResp.RequestURI},
	}
	return meta.AuthorizationEndpoint + "?" + params.Encode(), nil
}

func buildAuthURL(endpoint, clientID, callbackURL, state, challenge string) string {
	params := url.Values{
		"client_id":             {clientID},
		"redirect_uri":         {callbackURL},
		"response_type":        {"code"},
		"scope":                {"atproto"},
		"state":                {state},
		"code_challenge":       {challenge},
		"code_challenge_method": {"S256"},
	}
	return endpoint + "?" + params.Encode()
}

// Callback handles the OAuth callback from the PDS
func (h *AuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Check for error response
	if errParam := r.URL.Query().Get("error"); errParam != "" {
		errDesc := r.URL.Query().Get("error_description")
		log.Printf("OAuth error: %s - %s", errParam, errDesc)
		http.Redirect(w, r, h.frontendURL+"/login?error="+url.QueryEscape(errDesc), http.StatusFound)
		return
	}

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" || state == "" {
		http.Redirect(w, r, h.frontendURL+"/login?error=missing+code+or+state", http.StatusFound)
		return
	}

	// Load auth request
	authData, err := h.oauth.Store.LoadAuthRequest(ctx, state)
	if err != nil {
		log.Printf("Failed to load auth request for state %s: %v", state, err)
		http.Redirect(w, r, h.frontendURL+"/login?error=invalid+state", http.StatusFound)
		return
	}

	var reqData map[string]string
	if err := json.Unmarshal(authData, &reqData); err != nil {
		log.Printf("Failed to unmarshal auth request data: %v", err)
		http.Redirect(w, r, h.frontendURL+"/login?error=internal+error", http.StatusFound)
		return
	}

	// Exchange code for tokens
	tokenResp, err := h.exchangeCode(ctx, reqData, code)
	if err != nil {
		log.Printf("Token exchange failed: %v", err)
		http.Redirect(w, r, h.frontendURL+"/login?error=token+exchange+failed", http.StatusFound)
		return
	}

	// Upsert user
	did := reqData["did"]
	handle := reqData["handle"]
	userID, err := h.upsertUser(ctx, did, handle)
	if err != nil {
		log.Printf("Failed to upsert user: %v", err)
		http.Redirect(w, r, h.frontendURL+"/login?error=internal+error", http.StatusFound)
		return
	}

	// Save OAuth session
	sessionID := state // reuse state as session ID
	if err := h.oauth.Store.SaveSession(ctx, sessionID, did, tokenResp); err != nil {
		log.Printf("Failed to save session: %v", err)
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":    userID,
		"did":    did,
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

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    tokenStr,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 60 * 60, // 7 days
	})

	http.Redirect(w, r, h.frontendURL+"/dashboard", http.StatusFound)
}

func (h *AuthHandler) exchangeCode(ctx context.Context, reqData map[string]string, code string) (map[string]any, error) {
	tokenEndpoint := reqData["token_endpoint"]
	callbackURL := h.oauth.AppURL + "/api/auth/callback"
	clientID := h.oauth.AppURL + "/client-metadata.json"

	data := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {callbackURL},
		"client_id":     {clientID},
		"code_verifier": {reqData["pkce_verifier"]},
	}

	resp, err := http.PostForm(tokenEndpoint, data)
	if err != nil {
		return nil, fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token exchange returned status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, fmt.Errorf("decoding token response: %w", err)
	}

	return tokenResp, nil
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

// Me returns the current authenticated user's info
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userID := getUserIDFromContext(ctx)
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

// Logout clears the session
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

func getUserIDFromContext(ctx context.Context) string {
	if v := ctx.Value("userID"); v != nil {
		return v.(string)
	}
	// Check with typed key
	type contextKey string
	if v := ctx.Value(contextKey("userID")); v != nil {
		return v.(string)
	}
	return ""
}
