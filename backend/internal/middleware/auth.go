package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "userID"
const UserDIDKey contextKey = "userDID"

// AuthMiddleware validates JWT from cookie or Authorization header
func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := extractToken(r)
			if tokenStr == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			claims := &jwt.MapClaims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
				return []byte(jwtSecret), nil
			})

			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}

			userID, _ := (*claims)["sub"].(string)
			userDID, _ := (*claims)["did"].(string)

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UserDIDKey, userDID)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAuth is a single-handler middleware wrapper
func RequireAuth(jwtSecret string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			tokenStr := extractToken(r)
			if tokenStr == "" {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			claims := &jwt.MapClaims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
				return []byte(jwtSecret), nil
			})

			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}

			userID, _ := (*claims)["sub"].(string)
			userDID, _ := (*claims)["did"].(string)

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UserDIDKey, userDID)

			next(w, r.WithContext(ctx))
		}
	}
}

func extractToken(r *http.Request) string {
	// Try cookie first
	cookie, err := r.Cookie("session_token")
	if err == nil && cookie.Value != "" {
		return cookie.Value
	}

	// Fall back to Authorization header
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}

	return ""
}

// GetUserID extracts user ID from context
func GetUserID(ctx context.Context) string {
	id, _ := ctx.Value(UserIDKey).(string)
	return id
}

// GetUserDID extracts user DID from context
func GetUserDID(ctx context.Context) string {
	did, _ := ctx.Value(UserDIDKey).(string)
	return did
}

// SetUserID injects a user ID into a context (useful for testing).
func SetUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, UserIDKey, userID)
}

// SetUserDID injects a user DID into a context (useful for testing).
func SetUserDID(ctx context.Context, userDID string) context.Context {
	return context.WithValue(ctx, UserDIDKey, userDID)
}
