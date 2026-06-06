package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jaredlemler/life-trackin/internal/middleware"
)

type HabitHandler struct {
	pool *pgxpool.Pool
}

func NewHabitHandler(pool *pgxpool.Pool) *HabitHandler {
	return &HabitHandler{pool: pool}
}

type CreateHabitRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Type        string  `json:"type"`
	TargetValue float64 `json:"target_value"`
	Unit        string  `json:"unit"`
	Frequency   any     `json:"frequency,omitempty"`
	Config      any     `json:"config,omitempty"`
}

type UpdateHabitRequest struct {
	Name        *string  `json:"name,omitempty"`
	Description *string  `json:"description,omitempty"`
	TargetValue *float64 `json:"target_value,omitempty"`
	Unit        *string  `json:"unit,omitempty"`
	Frequency   any      `json:"frequency,omitempty"`
	Config      any      `json:"config,omitempty"`
	Position    *int     `json:"position,omitempty"`
	Archived    *bool    `json:"archived,omitempty"`
}

func (h *HabitHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	boardID := chi.URLParam(r, "boardID")

	// Verify board ownership
	var ownerID string
	err := h.pool.QueryRow(ctx, `SELECT user_id FROM boards WHERE id = $1`, boardID).Scan(&ownerID)
	if err != nil || ownerID != userID {
		http.Error(w, `{"error":"board not found"}`, http.StatusNotFound)
		return
	}

	rows, err := h.pool.Query(ctx,
		`SELECT id, board_id, name, description, type, target_value, unit, frequency, config, position, archived, created_at, updated_at
		 FROM habits WHERE board_id = $1 AND archived = false ORDER BY position ASC, created_at ASC`,
		boardID,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch habits"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Habit struct {
		ID          string    `json:"id"`
		BoardID     string    `json:"board_id"`
		Name        string    `json:"name"`
		Description string    `json:"description"`
		Type        string    `json:"type"`
		TargetValue float64   `json:"target_value"`
		Unit        string    `json:"unit"`
		Frequency   any       `json:"frequency"`
		Config      any       `json:"config"`
		Position    int       `json:"position"`
		Archived    bool      `json:"archived"`
		CreatedAt   time.Time `json:"created_at"`
		UpdatedAt   time.Time `json:"updated_at"`
	}

	habits := []Habit{}
	for rows.Next() {
		var habit Habit
		var freq, config []byte
		if err := rows.Scan(&habit.ID, &habit.BoardID, &habit.Name, &habit.Description, &habit.Type,
			&habit.TargetValue, &habit.Unit, &freq, &config, &habit.Position, &habit.Archived,
			&habit.CreatedAt, &habit.UpdatedAt); err != nil {
			log.Printf("Failed to scan habit row: %v", err)
			continue
		}
		if err := json.Unmarshal(freq, &habit.Frequency); err != nil {
			log.Printf("Failed to unmarshal frequency for habit %s: %v", habit.ID, err)
		}
		if err := json.Unmarshal(config, &habit.Config); err != nil {
			log.Printf("Failed to unmarshal config for habit %s: %v", habit.ID, err)
		}
		habits = append(habits, habit)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(habits)
}

func (h *HabitHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	boardID := chi.URLParam(r, "boardID")

	// Verify board ownership
	var ownerID string
	err := h.pool.QueryRow(ctx, `SELECT user_id FROM boards WHERE id = $1`, boardID).Scan(&ownerID)
	if err != nil || ownerID != userID {
		http.Error(w, `{"error":"board not found"}`, http.StatusNotFound)
		return
	}

	var req CreateHabitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, `{"error":"name is required"}`, http.StatusBadRequest)
		return
	}
	if req.Type == "" {
		req.Type = "binary"
	}
	if req.TargetValue == 0 {
		req.TargetValue = 1
	}

	frequency := `{"type": "daily"}`
	if req.Frequency != nil {
		f, err := json.Marshal(req.Frequency)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"invalid frequency: %v"}`, err), http.StatusBadRequest)
			return
		}
		frequency = string(f)
	}
	config := `{}`
	if req.Config != nil {
		c, err := json.Marshal(req.Config)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"invalid config: %v"}`, err), http.StatusBadRequest)
			return
		}
		config = string(c)
	}

	var habitID string
	err = h.pool.QueryRow(ctx,
		`INSERT INTO habits (board_id, name, description, type, target_value, unit, frequency, config)
		 VALUES ($1, $2, $3, $4::habit_type, $5, $6, $7::jsonb, $8::jsonb) RETURNING id`,
		boardID, req.Name, req.Description, req.Type, req.TargetValue, req.Unit, frequency, config,
	).Scan(&habitID)

	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to create habit: %v"}`, err), http.StatusInternalServerError)
		return
	}

	// Create streak record
	if _, err := h.pool.Exec(ctx, `INSERT INTO streaks (habit_id) VALUES ($1) ON CONFLICT DO NOTHING`, habitID); err != nil {
		log.Printf("Failed to initialize streak for habit %s: %v", habitID, err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": habitID})
}

func (h *HabitHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	habitID := chi.URLParam(r, "habitID")

	type Habit struct {
		ID          string    `json:"id"`
		BoardID     string    `json:"board_id"`
		Name        string    `json:"name"`
		Description string    `json:"description"`
		Type        string    `json:"type"`
		TargetValue float64   `json:"target_value"`
		Unit        string    `json:"unit"`
		Frequency   any       `json:"frequency"`
		Config      any       `json:"config"`
		Position    int       `json:"position"`
		Archived    bool      `json:"archived"`
		CreatedAt   time.Time `json:"created_at"`
		UpdatedAt   time.Time `json:"updated_at"`
	}

	var habit Habit
	var freq, config []byte
	err := h.pool.QueryRow(ctx,
		`SELECT h.id, h.board_id, h.name, h.description, h.type, h.target_value, h.unit, 
		        h.frequency, h.config, h.position, h.archived, h.created_at, h.updated_at
		 FROM habits h JOIN boards b ON b.id = h.board_id
		 WHERE h.id = $1 AND b.user_id = $2`,
		habitID, userID,
	).Scan(&habit.ID, &habit.BoardID, &habit.Name, &habit.Description, &habit.Type,
		&habit.TargetValue, &habit.Unit, &freq, &config, &habit.Position, &habit.Archived,
		&habit.CreatedAt, &habit.UpdatedAt)

	if err != nil {
		http.Error(w, `{"error":"habit not found"}`, http.StatusNotFound)
		return
	}
	if err := json.Unmarshal(freq, &habit.Frequency); err != nil {
		log.Printf("Failed to unmarshal frequency for habit %s: %v", habit.ID, err)
	}
	if err := json.Unmarshal(config, &habit.Config); err != nil {
		log.Printf("Failed to unmarshal config for habit %s: %v", habit.ID, err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(habit)
}

func (h *HabitHandler) Update(w http.ResponseWriter, r *http.Request) {
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

	var req UpdateHabitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	query := "UPDATE habits SET updated_at = NOW()"
	args := []any{}
	argIdx := 1

	if req.Name != nil {
		query += fmt.Sprintf(", name = $%d", argIdx)
		args = append(args, *req.Name)
		argIdx++
	}
	if req.Description != nil {
		query += fmt.Sprintf(", description = $%d", argIdx)
		args = append(args, *req.Description)
		argIdx++
	}
	if req.TargetValue != nil {
		query += fmt.Sprintf(", target_value = $%d", argIdx)
		args = append(args, *req.TargetValue)
		argIdx++
	}
	if req.Unit != nil {
		query += fmt.Sprintf(", unit = $%d", argIdx)
		args = append(args, *req.Unit)
		argIdx++
	}
	if req.Frequency != nil {
		f, err := json.Marshal(req.Frequency)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"invalid frequency: %v"}`, err), http.StatusBadRequest)
			return
		}
		query += fmt.Sprintf(", frequency = $%d::jsonb", argIdx)
		args = append(args, string(f))
		argIdx++
	}
	if req.Config != nil {
		c, err := json.Marshal(req.Config)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"invalid config: %v"}`, err), http.StatusBadRequest)
			return
		}
		query += fmt.Sprintf(", config = $%d::jsonb", argIdx)
		args = append(args, string(c))
		argIdx++
	}
	if req.Position != nil {
		query += fmt.Sprintf(", position = $%d", argIdx)
		args = append(args, *req.Position)
		argIdx++
	}
	if req.Archived != nil {
		query += fmt.Sprintf(", archived = $%d", argIdx)
		args = append(args, *req.Archived)
		argIdx++
	}

	query += fmt.Sprintf(" WHERE id = $%d", argIdx)
	args = append(args, habitID)

	if _, err := h.pool.Exec(ctx, query, args...); err != nil {
		http.Error(w, `{"error":"failed to update habit"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status":"updated"}`)
}

func (h *HabitHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	habitID := chi.URLParam(r, "habitID")

	_, err := h.pool.Exec(ctx,
		`DELETE FROM habits h USING boards b WHERE h.board_id = b.id AND h.id = $1 AND b.user_id = $2`,
		habitID, userID,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to delete habit"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status":"deleted"}`)
}
