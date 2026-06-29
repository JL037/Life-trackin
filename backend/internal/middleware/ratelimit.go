package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// RateLimiter implements a token bucket rate limiter in memory.
type RateLimiter struct {
	requestsPerWindow int
	window            time.Duration
	clients           map[string]*bucket
	mu                sync.RWMutex
}

type bucket struct {
	tokens   float64
	lastSeen time.Time
}

// NewRateLimiter creates a new token bucket rate limiter.
// requestsPerWindow: max requests allowed per window.
// window: time window (e.g., 1 minute).
func NewRateLimiter(requestsPerWindow int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requestsPerWindow: requestsPerWindow,
		window:            window,
		clients:           make(map[string]*bucket),
	}
	go rl.cleanup()
	return rl
}

// Allow checks if a key is allowed to make a request.
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, exists := rl.clients[key]
	if !exists {
		// First request from this client
		rl.clients[key] = &bucket{
			tokens:   float64(rl.requestsPerWindow) - 1,
			lastSeen: now,
		}
		return true
	}

	// Replenish tokens based on elapsed time
	elapsed := now.Sub(b.lastSeen)
	b.tokens += elapsed.Seconds() * (float64(rl.requestsPerWindow) / rl.window.Seconds())
	if b.tokens > float64(rl.requestsPerWindow) {
		b.tokens = float64(rl.requestsPerWindow)
	}
	b.lastSeen = now

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// cleanup periodically removes stale entries to prevent memory growth.
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, b := range rl.clients {
			if now.Sub(b.lastSeen) > rl.window*2 {
				delete(rl.clients, key)
			}
		}
		rl.mu.Unlock()
	}
}

// RateLimitByIP creates middleware that rate limits requests by client IP.
func RateLimitByIP(rl *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}

			if !rl.Allow(ip) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				w.Write([]byte(`{"error":"rate limit exceeded"}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RateLimitByUser creates middleware that rate limits requests by authenticated user ID.
// Must be applied AFTER AuthMiddleware so user ID exists in context.
func RateLimitByUser(rl *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			if userID == "" {
				// No user in context; pass through (auth middleware should reject later)
				next.ServeHTTP(w, r)
				return
			}

			if !rl.Allow(userID) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				w.Write([]byte(`{"error":"rate limit exceeded"}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
