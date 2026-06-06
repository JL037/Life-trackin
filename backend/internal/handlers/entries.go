package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jaredlemler/life-trackin/internal/middleware"
)

type EntryHandler struct {
	pool *pgxpool.Pool
}

func NewEntryHandler(pool *pgxpool.Pool) *EntryHandler {
	return &EntryHandler{pool: pool}
}

type CreateEntryRequest struct {
	Date          string   `json:"date"`
	ValueBool     *bool    `json:"value_bool,omitempty"`
	ValueNumeric  *float64 `json:"value_numeric,omitempty"`
	ValueDuration *string  `json:"value_duration,omitempty"`
	Notes         string   `json:"notes"`
}

func (h *EntryHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	habitID := chi.URLParam(r, "habitID")

	// Verify ownership
	var ownerID string
	err := h.pool.QueryRow(ctx,
		`SELECT b.user_id FROM habits h JOIN boards b ON b.id = h.board_id WHERE h.id = $1`,
		habitID,
	).Scan(&ownerID)
	if err != nil || ownerID != userID {
		http.Error(w, `{"error":"habit not found"}`, http.StatusNotFound)
		return
	}

	var req CreateEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}

	var entryID string
	err = h.pool.QueryRow(ctx,
		`INSERT INTO entries (habit_id, date, value_bool, value_numeric, value_duration, notes)
		 VALUES ($1, $2, $3, $4, $5::interval, $6)
		 ON CONFLICT (habit_id, date) DO UPDATE SET
		     value_bool = EXCLUDED.value_bool,
		     value_numeric = EXCLUDED.value_numeric,
		     value_duration = EXCLUDED.value_duration,
		     notes = EXCLUDED.notes,
		     updated_at = NOW()
		 RETURNING id`,
		habitID, req.Date, req.ValueBool, req.ValueNumeric, req.ValueDuration, req.Notes,
	).Scan(&entryID)

	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to create entry: %v"}`, err), http.StatusInternalServerError)
		return
	}

	// Update streak asynchronously
	go h.updateStreak(habitID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": entryID})
}

func (h *EntryHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	habitID := chi.URLParam(r, "habitID")

	// Verify ownership
	var ownerID string
	err := h.pool.QueryRow(ctx,
		`SELECT b.user_id FROM habits h JOIN boards b ON b.id = h.board_id WHERE h.id = $1`,
		habitID,
	).Scan(&ownerID)
	if err != nil || ownerID != userID {
		http.Error(w, `{"error":"habit not found"}`, http.StatusNotFound)
		return
	}

	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	if from == "" {
		from = time.Now().AddDate(0, 0, -365).Format("2006-01-02")
	}
	if to == "" {
		to = time.Now().Format("2006-01-02")
	}

	rows, err := h.pool.Query(ctx,
		`SELECT id, habit_id, date, value_bool, value_numeric, value_duration::text, notes, created_at, updated_at
		 FROM entries WHERE habit_id = $1 AND date BETWEEN $2 AND $3
		 ORDER BY date DESC`,
		habitID, from, to,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch entries"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Entry struct {
		ID            string    `json:"id"`
		HabitID       string    `json:"habit_id"`
		Date          string    `json:"date"`
		ValueBool     *bool     `json:"value_bool,omitempty"`
		ValueNumeric  *float64  `json:"value_numeric,omitempty"`
		ValueDuration *string   `json:"value_duration,omitempty"`
		Notes         string    `json:"notes"`
		CreatedAt     time.Time `json:"created_at"`
		UpdatedAt     time.Time `json:"updated_at"`
	}

	entries := []Entry{}
	for rows.Next() {
		var e Entry
		var date time.Time
		if err := rows.Scan(&e.ID, &e.HabitID, &date, &e.ValueBool, &e.ValueNumeric,
			&e.ValueDuration, &e.Notes, &e.CreatedAt, &e.UpdatedAt); err != nil {
			log.Printf("Failed to scan entry row: %v", err)
			continue
		}
		e.Date = date.Format("2006-01-02")
		entries = append(entries, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func (h *EntryHandler) Streak(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	habitID := chi.URLParam(r, "habitID")

	// Verify ownership
	var ownerID string
	err := h.pool.QueryRow(ctx,
		`SELECT b.user_id FROM habits h JOIN boards b ON b.id = h.board_id WHERE h.id = $1`,
		habitID,
	).Scan(&ownerID)
	if err != nil || ownerID != userID {
		http.Error(w, `{"error":"habit not found"}`, http.StatusNotFound)
		return
	}

	type StreakInfo struct {
		HabitID         string  `json:"habit_id"`
		CurrentStreak   int     `json:"current_streak"`
		LongestStreak   int     `json:"longest_streak"`
		LastCompletedAt *string `json:"last_completed_at,omitempty"`
		TotalCompleted  int     `json:"total_completed"`
	}

	var streak StreakInfo
	var lastCompleted *time.Time
	err = h.pool.QueryRow(ctx,
		`SELECT habit_id, current_streak, longest_streak, last_completed_at
		 FROM streaks WHERE habit_id = $1`,
		habitID,
	).Scan(&streak.HabitID, &streak.CurrentStreak, &streak.LongestStreak, &lastCompleted)

	if err != nil {
		// No streak record yet, compute from entries
		streak.HabitID = habitID
	}

	if lastCompleted != nil {
		s := lastCompleted.Format("2006-01-02")
		streak.LastCompletedAt = &s
	}

	// Get total completed count
	if err := h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM entries WHERE habit_id = $1 AND (value_bool = true OR value_numeric > 0 OR value_duration IS NOT NULL)`,
		habitID,
	).Scan(&streak.TotalCompleted); err != nil {
		log.Printf("Failed to count completed entries for habit %s: %v", habitID, err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(streak)
}

func (h *EntryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	entryID := chi.URLParam(r, "entryID")

	// Get habit ID for streak update
	var habitID string
	err := h.pool.QueryRow(ctx,
		`SELECT e.habit_id FROM entries e
		 JOIN habits h ON h.id = e.habit_id
		 JOIN boards b ON b.id = h.board_id
		 WHERE e.id = $1 AND b.user_id = $2`,
		entryID, userID,
	).Scan(&habitID)

	if err != nil {
		http.Error(w, `{"error":"entry not found"}`, http.StatusNotFound)
		return
	}

	_, err = h.pool.Exec(ctx, `DELETE FROM entries WHERE id = $1`, entryID)
	if err != nil {
		http.Error(w, `{"error":"failed to delete entry"}`, http.StatusInternalServerError)
		return
	}

	// Update streak
	go h.updateStreak(habitID)

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status":"deleted"}`)
}

func (h *EntryHandler) updateStreak(habitID string) {
	ctx := context.Background()

	// Calculate current streak by counting consecutive days backwards from today
	rows, err := h.pool.Query(ctx,
		`SELECT date FROM entries
		 WHERE habit_id = $1 AND (value_bool = true OR value_numeric > 0 OR value_duration IS NOT NULL)
		 ORDER BY date DESC`,
		habitID,
	)
	if err != nil {
		log.Printf("Failed to query entries for streak update (habit %s): %v", habitID, err)
		return
	}
	defer rows.Close()

	var dates []time.Time
	for rows.Next() {
		var d time.Time
		if err := rows.Scan(&d); err != nil {
			log.Printf("Failed to scan entry date for streak (habit %s): %v", habitID, err)
			continue
		}
		dates = append(dates, d)
	}

	if err := rows.Err(); err != nil {
		log.Printf("Error iterating entry rows for streak (habit %s): %v", habitID, err)
	}

	if len(dates) == 0 {
		if _, err := h.pool.Exec(ctx,
			`INSERT INTO streaks (habit_id, current_streak, longest_streak, last_completed_at)
			 VALUES ($1, 0, 0, NULL)
			 ON CONFLICT (habit_id) DO UPDATE SET current_streak = 0, updated_at = NOW()`,
			habitID,
		); err != nil {
			log.Printf("Failed to reset streak for habit %s: %v", habitID, err)
		}
		return
	}

	// Calculate current streak
	today := time.Now().Truncate(24 * time.Hour)
	currentStreak := 0
	expectedDate := today

	for _, d := range dates {
		d = d.Truncate(24 * time.Hour)
		if d.Equal(expectedDate) || d.Equal(expectedDate.AddDate(0, 0, -1)) {
			if d.Equal(expectedDate) {
				currentStreak++
				expectedDate = d.AddDate(0, 0, -1)
			} else if currentStreak == 0 {
				// Allow starting from yesterday
				currentStreak++
				expectedDate = d.AddDate(0, 0, -1)
			} else {
				break
			}
		} else if currentStreak == 0 && today.Sub(d) <= 24*time.Hour {
			currentStreak++
			expectedDate = d.AddDate(0, 0, -1)
		} else {
			break
		}
	}

	// Calculate longest streak
	longestStreak := 0
	streak := 1
	for i := 0; i < len(dates)-1; i++ {
		diff := dates[i].Truncate(24*time.Hour).Sub(dates[i+1].Truncate(24 * time.Hour))
		if diff == 24*time.Hour {
			streak++
		} else {
			if streak > longestStreak {
				longestStreak = streak
			}
			streak = 1
		}
	}
	if streak > longestStreak {
		longestStreak = streak
	}
	if currentStreak > longestStreak {
		longestStreak = currentStreak
	}

	lastCompleted := dates[0].Format("2006-01-02")

	if _, err := h.pool.Exec(ctx,
		`INSERT INTO streaks (habit_id, current_streak, longest_streak, last_completed_at, updated_at)
		 VALUES ($1, $2, $3, $4, NOW())
		 ON CONFLICT (habit_id) DO UPDATE SET
		     current_streak = $2, longest_streak = GREATEST(streaks.longest_streak, $3),
		     last_completed_at = $4, updated_at = NOW()`,
		habitID, currentStreak, longestStreak, lastCompleted,
	); err != nil {
		log.Printf("Failed to update streak for habit %s: %v", habitID, err)
	}
}
