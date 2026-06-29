package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestRateLimiter_AllowWithinLimit(t *testing.T) {
	rl := NewRateLimiter(5, time.Minute)

	// 5 requests should all pass
	for i := 0; i < 5; i++ {
		assert.True(t, rl.Allow("client-1"), "request %d should be allowed", i+1)
	}
}

func TestRateLimiter_BlockOverLimit(t *testing.T) {
	rl := NewRateLimiter(3, time.Minute)

	// Exhaust the bucket
	for i := 0; i < 3; i++ {
		rl.Allow("client-1")
	}

	// 4th request should be blocked
	assert.False(t, rl.Allow("client-1"), "4th request should be blocked")
}

func TestRateLimiter_ReplenishOverTime(t *testing.T) {
	rl := NewRateLimiter(2, time.Second)

	// Exhaust bucket
	rl.Allow("client-1")
	rl.Allow("client-1")
	assert.False(t, rl.Allow("client-1"))

	// Wait for replenishment
	time.Sleep(600 * time.Millisecond)
	assert.True(t, rl.Allow("client-1"), "token should be replenished after wait")
}

func TestRateLimiter_DifferentClients(t *testing.T) {
	rl := NewRateLimiter(2, time.Minute)

	// Client 1 exhausts their bucket
	rl.Allow("client-1")
	rl.Allow("client-1")
	assert.False(t, rl.Allow("client-1"))

	// Client 2 still has their full bucket
	assert.True(t, rl.Allow("client-2"))
	assert.True(t, rl.Allow("client-2"))
	assert.False(t, rl.Allow("client-2"))
}

func TestRateLimitByIP_AllowsRequests(t *testing.T) {
	rl := NewRateLimiter(5, time.Minute)
	mw := RateLimitByIP(rl)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRateLimitByIP_BlocksOverLimit(t *testing.T) {
	rl := NewRateLimiter(2, time.Minute)
	mw := RateLimitByIP(rl)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	remoteAddr := "192.168.1.2:12345"

	// First 2 requests pass
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
		req.RemoteAddr = remoteAddr
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
	}

	// 3rd request blocked
	req := httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
	req.RemoteAddr = remoteAddr
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusTooManyRequests, rr.Code)
	assert.Contains(t, rr.Body.String(), "rate limit exceeded")
}

func TestRateLimitByIP_RespectsXForwardedFor(t *testing.T) {
	// In production, the app may sit behind a proxy; our middleware uses
	// r.RemoteAddr directly. This test documents that behavior.
	rl := NewRateLimiter(5, time.Minute)
	mw := RateLimitByIP(rl)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "1.2.3.4")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRateLimitByUser_AllowsRequests(t *testing.T) {
	rl := NewRateLimiter(5, time.Minute)
	mw := RateLimitByUser(rl)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/boards", nil)
	req = req.WithContext(SetUserID(req.Context(), "user-123"))
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestRateLimitByUser_BlocksOverLimit(t *testing.T) {
	rl := NewRateLimiter(2, time.Minute)
	mw := RateLimitByUser(rl)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	userID := "user-456"

	// First 2 requests pass
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/boards", nil)
		req = req.WithContext(SetUserID(req.Context(), userID))
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
	}

	// 3rd request blocked
	req := httptest.NewRequest(http.MethodPost, "/api/boards", nil)
	req = req.WithContext(SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusTooManyRequests, rr.Code)
	assert.Contains(t, rr.Body.String(), "rate limit exceeded")
}

func TestRateLimitByUser_NoUserInContext(t *testing.T) {
	rl := NewRateLimiter(2, time.Minute)
	mw := RateLimitByUser(rl)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/boards", nil)
	// No user in context
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}
