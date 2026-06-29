package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuthMiddleware_ValidCookie(t *testing.T) {
	secret := "test-secret"
	token := generateTestToken(t, secret, "user-123", "did:plc:abc")

	mw := AuthMiddleware(secret)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserID(r.Context())
		userDID := GetUserDID(r.Context())
		assert.Equal(t, "user-123", userID)
		assert.Equal(t, "did:plc:abc", userDID)
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/boards", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestAuthMiddleware_ValidBearerHeader(t *testing.T) {
	secret := "test-secret"
	token := generateTestToken(t, secret, "user-456", "did:plc:def")

	mw := AuthMiddleware(secret)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserID(r.Context())
		assert.Equal(t, "user-456", userID)
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/boards", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestAuthMiddleware_MissingToken(t *testing.T) {
	secret := "test-secret"
	mw := AuthMiddleware(secret)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/boards", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "unauthorized")
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	secret := "test-secret"
	mw := AuthMiddleware(secret)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/boards", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "invalid token")
}

func TestAuthMiddleware_WrongSecret(t *testing.T) {
	secret := "test-secret"
	token := generateTestToken(t, "wrong-secret", "user-123", "did:plc:abc")

	mw := AuthMiddleware(secret)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/boards", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestRequireAuth_ValidCookie(t *testing.T) {
	secret := "test-secret"
	token := generateTestToken(t, secret, "user-789", "did:plc:ghi")

	mw := RequireAuth(secret)
	handler := mw(func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserID(r.Context())
		assert.Equal(t, "user-789", userID)
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: token})
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRequireAuth_MissingToken(t *testing.T) {
	secret := "test-secret"
	mw := RequireAuth(secret)
	handler := mw(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestExtractToken_Priority(t *testing.T) {
	// Cookie takes priority over header
	secret := "test-secret"
	cookieToken := generateTestToken(t, secret, "cookie-user", "did:plc:cook")
	headerToken := generateTestToken(t, secret, "header-user", "did:plc:head")

	mw := AuthMiddleware(secret)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserID(r.Context())
		assert.Equal(t, "cookie-user", userID) // cookie wins
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/boards", nil)
	req.AddCookie(&http.Cookie{Name: "session_token", Value: cookieToken})
	req.Header.Set("Authorization", "Bearer "+headerToken)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetUserID_EmptyContext(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	userID := GetUserID(req.Context())
	assert.Equal(t, "", userID)
}

func TestGetUserDID_EmptyContext(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	userDID := GetUserDID(req.Context())
	assert.Equal(t, "", userDID)
}

func generateTestToken(t *testing.T, secret, userID, did string) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"did": did,
		"exp": time.Now().Add(time.Hour).Unix(),
		"iat": time.Now().Unix(),
	})
	tokenStr, err := token.SignedString([]byte(secret))
	require.NoError(t, err)
	return tokenStr
}
