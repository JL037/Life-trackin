package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PublicHandler struct {
	pool *pgxpool.Pool
}

func NewPublicHandler(pool *pgxpool.Pool) *PublicHandler {
	return &PublicHandler{pool: pool}
}

// GetUser returns a public user profile by handle.
func (h *PublicHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	handle := chi.URLParam(r, "handle")

	var user struct {
		ID             string    `json:"id"`
		Handle         string    `json:"handle"`
		DisplayName    string    `json:"display_name"`
		Bio            string    `json:"bio"`
		Goals          string    `json:"goals"`
		PrivacyDefault string    `json:"privacy_default"`
		CreatedAt      time.Time `json:"created_at"`
	}

	err := h.pool.QueryRow(ctx,
		`SELECT id, handle, display_name, bio, goals, privacy_default, created_at
		 FROM users WHERE handle = $1`,
		handle,
	).Scan(&user.ID, &user.Handle, &user.DisplayName, &user.Bio, &user.Goals, &user.PrivacyDefault, &user.CreatedAt)

	if err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// ListBoards returns public boards for a user by handle.
func (h *PublicHandler) ListBoards(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	handle := chi.URLParam(r, "handle")

	// First resolve user ID from handle
	var userID string
	err := h.pool.QueryRow(ctx, `SELECT id FROM users WHERE handle = $1`, handle).Scan(&userID)
	if err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	rows, err := h.pool.Query(ctx,
		`SELECT id, user_id, name, description, color_scheme, visibility, position, created_at, updated_at
		 FROM boards WHERE user_id = $1 AND visibility = 'public' ORDER BY position ASC, created_at ASC`,
		userID,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch boards"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type PublicBoard struct {
		ID          string    `json:"id"`
		UserID      string    `json:"user_id"`
		Name        string    `json:"name"`
		Description string    `json:"description"`
		ColorScheme any       `json:"color_scheme"`
		Visibility  string    `json:"visibility"`
		Position    int       `json:"position"`
		CreatedAt   time.Time `json:"created_at"`
		UpdatedAt   time.Time `json:"updated_at"`
	}

	boards := []PublicBoard{}
	for rows.Next() {
		var b PublicBoard
		var colorScheme []byte
		if err := rows.Scan(&b.ID, &b.UserID, &b.Name, &b.Description, &colorScheme, &b.Visibility, &b.Position, &b.CreatedAt, &b.UpdatedAt); err != nil {
			continue
		}
		json.Unmarshal(colorScheme, &b.ColorScheme)
		boards = append(boards, b)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(boards)
}

// BoardStats returns public stats for a single board.
func (h *PublicHandler) BoardStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	boardID := chi.URLParam(r, "boardID")

	// Verify board is public
	var visibility string
	err := h.pool.QueryRow(ctx, `SELECT visibility FROM boards WHERE id = $1`, boardID).Scan(&visibility)
	if err != nil || visibility != "public" {
		http.Error(w, `{"error":"board not found"}`, http.StatusNotFound)
		return
	}

	type BoardStats struct {
		HabitCount    int     `json:"habit_count"`
		CurrentStreak int     `json:"current_streak"`
		LongestStreak int     `json:"longest_streak"`
		TotalEntries  int     `json:"total_entries"`
		LastEntryDate *string `json:"last_entry_date,omitempty"`
	}

	var stats BoardStats
	var lastEntryDate *time.Time

	err = h.pool.QueryRow(ctx,
		`SELECT 
			COUNT(DISTINCT h.id),
			COALESCE(MAX(s.current_streak), 0),
			COALESCE(MAX(s.longest_streak), 0),
			COUNT(DISTINCT e.id),
			MAX(e.date)
		 FROM boards b
		 LEFT JOIN habits h ON h.board_id = b.id AND h.archived = false
		 LEFT JOIN streaks s ON s.habit_id = h.id
		 LEFT JOIN entries e ON e.habit_id = h.id
		 WHERE b.id = $1 AND b.visibility = 'public'`,
		boardID,
	).Scan(&stats.HabitCount, &stats.CurrentStreak, &stats.LongestStreak, &stats.TotalEntries, &lastEntryDate)

	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to fetch stats: %v"}`, err), http.StatusInternalServerError)
		return
	}

	if lastEntryDate != nil {
		s := lastEntryDate.Format("2006-01-02")
		stats.LastEntryDate = &s
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
