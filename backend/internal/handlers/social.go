package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jaredlemler/life-trackin/internal/middleware"
)

type SocialHandler struct {
	pool *pgxpool.Pool
}

func NewSocialHandler(pool *pgxpool.Pool) *SocialHandler {
	return &SocialHandler{pool: pool}
}

// Follow adds a follow relationship.
func (h *SocialHandler) Follow(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	followerID := middleware.GetUserID(ctx)
	handle := chi.URLParam(r, "handle")

	if followerID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Resolve handle to user ID
	var followingID string
	err := h.pool.QueryRow(ctx, `SELECT id FROM users WHERE handle = $1`, handle).Scan(&followingID)
	if err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	if followerID == followingID {
		http.Error(w, `{"error":"cannot follow yourself"}`, http.StatusBadRequest)
		return
	}

	_, err = h.pool.Exec(ctx,
		`INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		followerID, followingID,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to follow user"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status":"followed"}`)
}

// Unfollow removes a follow relationship.
func (h *SocialHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	followerID := middleware.GetUserID(ctx)
	handle := chi.URLParam(r, "handle")

	if followerID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var followingID string
	err := h.pool.QueryRow(ctx, `SELECT id FROM users WHERE handle = $1`, handle).Scan(&followingID)
	if err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	_, err = h.pool.Exec(ctx,
		`DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
		followerID, followingID,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to unfollow user"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status":"unfollowed"}`)
}

// ListFollows returns the current user's following or followers list.
func (h *SocialHandler) ListFollows(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	listType := r.URL.Query().Get("type")
	if listType != "followers" {
		listType = "following"
	}

	type FollowUser struct {
		ID          string    `json:"id"`
		Handle      string    `json:"handle"`
		DisplayName string    `json:"display_name"`
		AvatarURL   string    `json:"avatar_url"`
		FollowedAt  time.Time `json:"followed_at"`
	}

	var query string
	if listType == "following" {
		query = `SELECT u.id, u.handle, u.display_name, u.avatar_url, f.created_at
				 FROM follows f JOIN users u ON u.id = f.following_id
				 WHERE f.follower_id = $1 ORDER BY f.created_at DESC`
	} else {
		query = `SELECT u.id, u.handle, u.display_name, u.avatar_url, f.created_at
				 FROM follows f JOIN users u ON u.id = f.follower_id
				 WHERE f.following_id = $1 ORDER BY f.created_at DESC`
	}

	rows, err := h.pool.Query(ctx, query, userID)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch follows"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []FollowUser{}
	for rows.Next() {
		var u FollowUser
		if err := rows.Scan(&u.ID, &u.Handle, &u.DisplayName, &u.AvatarURL, &u.FollowedAt); err != nil {
			continue
		}
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"type":  listType,
		"users": users,
		"count": len(users),
	})
}

// Feed returns recent activity from followed users.
func (h *SocialHandler) Feed(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
		if limit > 100 {
			limit = 100
		}
		if limit < 1 {
			limit = 50
		}
	}

	type FeedItem struct {
		ID            string    `json:"id"`
		UserID        string    `json:"user_id"`
		Handle        string    `json:"handle"`
		DisplayName   string    `json:"display_name"`
		BoardID       string    `json:"board_id"`
		BoardName     string    `json:"board_name"`
		HabitID       string    `json:"habit_id"`
		HabitName     string    `json:"habit_name"`
		EntryID       string    `json:"entry_id"`
		EntryDate     string    `json:"entry_date"`
		ValueBool     *bool     `json:"value_bool,omitempty"`
		ValueNumeric  *float64  `json:"value_numeric,omitempty"`
		Notes         string    `json:"notes"`
		CreatedAt     time.Time `json:"created_at"`
	}

	rows, err := h.pool.Query(ctx,
		`SELECT 
			e.id,
			u.id,
			u.handle,
			u.display_name,
			b.id,
			b.name,
			h.id,
			h.name,
			e.id,
			e.date,
			e.value_bool,
			e.value_numeric,
			e.notes,
			e.created_at
		 FROM entries e
		 JOIN habits h ON h.id = e.habit_id
		 JOIN boards b ON b.id = h.board_id
		 JOIN users u ON u.id = b.user_id
		 JOIN follows f ON f.following_id = u.id
		 WHERE f.follower_id = $1
		   AND b.visibility IN ('public', 'followers')
		 ORDER BY e.created_at DESC
		 LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch feed"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []FeedItem{}
	for rows.Next() {
		var item FeedItem
		var date time.Time
		if err := rows.Scan(
			&item.EntryID, &item.UserID, &item.Handle, &item.DisplayName,
			&item.BoardID, &item.BoardName, &item.HabitID, &item.HabitName,
			&item.EntryID, &date, &item.ValueBool, &item.ValueNumeric,
			&item.Notes, &item.CreatedAt,
		); err != nil {
			continue
		}
		item.EntryDate = date.Format("2006-01-02")
		items = append(items, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"items": items,
		"count": len(items),
	})
}
