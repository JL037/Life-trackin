package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jaredlemler/life-trackin/internal/middleware"
	"github.com/jaredlemler/life-trackin/internal/validation"
)

type BoardHandler struct {
	pool *pgxpool.Pool
}

func NewBoardHandler(pool *pgxpool.Pool) *BoardHandler {
	return &BoardHandler{pool: pool}
}

type CreateBoardRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	ColorScheme any    `json:"color_scheme,omitempty"`
	Visibility  string `json:"visibility,omitempty"`
}

type UpdateBoardRequest struct {
	Name        *string `json:"name,omitempty"`
	Description *string `json:"description,omitempty"`
	ColorScheme any     `json:"color_scheme,omitempty"`
	Visibility  *string `json:"visibility,omitempty"`
	Position    *int    `json:"position,omitempty"`
}

func (h *BoardHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	rows, err := h.pool.Query(ctx,
		`SELECT id, user_id, name, description, color_scheme, visibility, position, created_at, updated_at
		 FROM boards WHERE user_id = $1 ORDER BY position ASC, created_at ASC`,
		userID,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch boards"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type Board struct {
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

	boards := []Board{}
	for rows.Next() {
		var b Board
		var colorScheme []byte
		if err := rows.Scan(&b.ID, &b.UserID, &b.Name, &b.Description, &colorScheme, &b.Visibility, &b.Position, &b.CreatedAt, &b.UpdatedAt); err != nil {
			http.Error(w, `{"error":"failed to scan board"}`, http.StatusInternalServerError)
			return
		}
		if err := json.Unmarshal(colorScheme, &b.ColorScheme); err != nil {
			log.Printf("Failed to unmarshal color_scheme for board %s: %v", b.ID, err)
		}
		boards = append(boards, b)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(boards)
}

func (h *BoardHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	var req CreateBoardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	v := validation.New()
	v.Required("name", req.Name)
	v.MaxLength("name", req.Name, 255)
	v.MaxLength("description", req.Description, 2000)
	if req.Visibility != "" {
		v.OneOf("visibility", req.Visibility, []string{"private", "public", "followers"})
	}
	if v.Respond(w) {
		return
	}

	if req.Visibility == "" {
		req.Visibility = "private"
	}

	colorScheme := `{"empty": "#ebedf0", "levels": ["#9be9a8", "#40c463", "#30a14e", "#216e39"]}`
	if req.ColorScheme != nil {
		cs, err := json.Marshal(req.ColorScheme)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"invalid color_scheme: %v"}`, err), http.StatusBadRequest)
			return
		}
		colorScheme = string(cs)
	}

	var boardID string
	err := h.pool.QueryRow(ctx,
		`INSERT INTO boards (user_id, name, description, color_scheme, visibility)
		 VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING id`,
		userID, req.Name, req.Description, colorScheme, req.Visibility,
	).Scan(&boardID)

	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to create board: %v"}`, err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": boardID})
}

func (h *BoardHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	boardID := chi.URLParam(r, "boardID")

	var b struct {
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

	var colorScheme []byte
	err := h.pool.QueryRow(ctx,
		`SELECT id, user_id, name, description, color_scheme, visibility, position, created_at, updated_at
		 FROM boards WHERE id = $1 AND user_id = $2`,
		boardID, userID,
	).Scan(&b.ID, &b.UserID, &b.Name, &b.Description, &colorScheme, &b.Visibility, &b.Position, &b.CreatedAt, &b.UpdatedAt)

	if err != nil {
		http.Error(w, `{"error":"board not found"}`, http.StatusNotFound)
		return
	}
	if err := json.Unmarshal(colorScheme, &b.ColorScheme); err != nil {
		log.Printf("Failed to unmarshal color_scheme for board %s: %v", b.ID, err)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(b)
}

func (h *BoardHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	boardID := chi.URLParam(r, "boardID")

	var req UpdateBoardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Build dynamic update
	query := "UPDATE boards SET updated_at = NOW()"
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
	if req.ColorScheme != nil {
		cs, err := json.Marshal(req.ColorScheme)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"invalid color_scheme: %v"}`, err), http.StatusBadRequest)
			return
		}
		query += fmt.Sprintf(", color_scheme = $%d::jsonb", argIdx)
		args = append(args, string(cs))
		argIdx++
	}
	if req.Visibility != nil {
		query += fmt.Sprintf(", visibility = $%d", argIdx)
		args = append(args, *req.Visibility)
		argIdx++
	}
	if req.Position != nil {
		query += fmt.Sprintf(", position = $%d", argIdx)
		args = append(args, *req.Position)
		argIdx++
	}

	query += fmt.Sprintf(" WHERE id = $%d AND user_id = $%d", argIdx, argIdx+1)
	args = append(args, boardID, userID)

	_, err := h.pool.Exec(ctx, query, args...)
	if err != nil {
		http.Error(w, `{"error":"failed to update board"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status":"updated"}`)
}

func (h *BoardHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	boardID := chi.URLParam(r, "boardID")

	_, err := h.pool.Exec(ctx,
		`DELETE FROM boards WHERE id = $1 AND user_id = $2`,
		boardID, userID,
	)
	if err != nil {
		http.Error(w, `{"error":"failed to delete board"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, `{"status":"deleted"}`)
}

func (h *BoardHandler) Stats(w http.ResponseWriter, r *http.Request) {
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

	type BoardStats struct {
		HabitCount      int     `json:"habit_count"`
		CurrentStreak   int     `json:"current_streak"`
		LongestStreak   int     `json:"longest_streak"`
		TotalEntries    int     `json:"total_entries"`
		LastEntryDate   *string `json:"last_entry_date,omitempty"`
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
		 WHERE b.id = $1 AND b.user_id = $2`,
		boardID, userID,
	).Scan(&stats.HabitCount, &stats.CurrentStreak, &stats.LongestStreak, &stats.TotalEntries, &lastEntryDate)

	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to fetch board stats: %v"}`, err), http.StatusInternalServerError)
		return
	}

	if lastEntryDate != nil {
		s := lastEntryDate.Format("2006-01-02")
		stats.LastEntryDate = &s
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *BoardHandler) Heatmap(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	boardID := chi.URLParam(r, "boardID")

	yearStr := r.URL.Query().Get("year")
	year := time.Now().Year()
	if yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil {
			year = y
		}
	}

	// Verify board ownership
	var ownerID string
	err := h.pool.QueryRow(ctx, `SELECT user_id FROM boards WHERE id = $1`, boardID).Scan(&ownerID)
	if err != nil || ownerID != userID {
		http.Error(w, `{"error":"board not found"}`, http.StatusNotFound)
		return
	}

	// Get all active habits for this board
	type habitInfo struct {
		id   string
		name string
	}
	var habits []habitInfo
	var totalHabits int

	habitRows, err := h.pool.Query(ctx,
		`SELECT id, name FROM habits WHERE board_id = $1 AND archived = false ORDER BY position ASC, created_at ASC`,
		boardID,
	)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to fetch habits: %v"}`, err), http.StatusInternalServerError)
		return
	}
	for habitRows.Next() {
		var h habitInfo
		if err := habitRows.Scan(&h.id, &h.name); err != nil {
			continue
		}
		habits = append(habits, h)
	}
	habitRows.Close()
	totalHabits = len(habits)

	// Build habit lookup map
	habitNames := make(map[string]string)
	for _, h := range habits {
		habitNames[h.id] = h.name
	}

	// Get all entries for the year
	startDate := fmt.Sprintf("%d-01-01", year)
	endDate := fmt.Sprintf("%d-12-31", year)

	rows, err := h.pool.Query(ctx,
		`SELECT e.date, e.habit_id, e.value_bool, e.value_numeric, h.type, h.target_value
		 FROM entries e
		 JOIN habits h ON h.id = e.habit_id
		 WHERE h.board_id = $1 AND e.date BETWEEN $2 AND $3
		 ORDER BY e.date`,
		boardID, startDate, endDate,
	)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to fetch heatmap data: %v"}`, err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// date -> set of completed habit IDs
	type dayData struct {
		completed map[string]bool
	}
	dayMap := make(map[string]*dayData)
	for rows.Next() {
		var date time.Time
		var habitID string
		var valueBool *bool
		var valueNumeric *float64
		var habitType string
		var targetValue float64
		if err := rows.Scan(&date, &habitID, &valueBool, &valueNumeric, &habitType, &targetValue); err != nil {
			continue
		}
		d := date.Format("2006-01-02")
		if dayMap[d] == nil {
			dayMap[d] = &dayData{completed: make(map[string]bool)}
		}

		// Determine if this habit was "completed" for the day
		completed := false
		switch habitType {
		case "binary":
			completed = valueBool != nil && *valueBool
		case "quantitative":
			completed = valueNumeric != nil && *valueNumeric > 0
		case "timed":
			// For timed, any logged duration counts as "done" for the day
			completed = true
		}
		if completed {
			dayMap[d].completed[habitID] = true
		}
	}

	// Build response
	type HeatmapDay struct {
		Date             string   `json:"date"`
		Value            float64  `json:"value"`
		Level            int      `json:"level"`
		CompletionStatus string   `json:"completion_status"`
		CompletedHabits  []string `json:"completed_habits"`
		TotalHabits      int      `json:"total_habits"`
	}

	days := []HeatmapDay{}
	activeDays := 0
	start := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(year, 12, 31, 0, 0, 0, 0, time.UTC)

	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		dateStr := d.Format("2006-01-02")
		day := HeatmapDay{
			Date:        dateStr,
			Value:       0,
			Level:       0,
			TotalHabits: totalHabits,
		}

		if data, ok := dayMap[dateStr]; ok && totalHabits > 0 {
			completedCount := len(data.completed)
			day.Value = float64(completedCount) / float64(totalHabits)
			activeDays++

			// Build list of completed habit names
			for hid := range data.completed {
				if name, exists := habitNames[hid]; exists {
					day.CompletedHabits = append(day.CompletedHabits, name)
				}
			}

			// Determine completion status
			if completedCount == 0 {
				day.CompletionStatus = "none"
				day.Level = 0
			} else if completedCount == totalHabits {
				day.CompletionStatus = "complete"
				day.Level = 4
			} else {
				day.CompletionStatus = "partial"
				day.Level = 2
			}
		} else {
			day.CompletionStatus = "none"
			day.Level = 0
		}

		days = append(days, day)
	}

	resp := map[string]any{
		"year":        year,
		"board_id":    boardID,
		"days":        days,
		"total_days":  len(days),
		"active_days": activeDays,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
