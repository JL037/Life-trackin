package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jaredlemler/life-trackin/internal/middleware"
	"github.com/jaredlemler/life-trackin/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupEntryHandlerTest(t *testing.T) (*testutil.TestDB, *EntryHandler, string, string, string) {
	testutil.SkipIfShort(t)
	db := testutil.NewTestDB(t)
	userID := db.SeedUser(t, "did:plc:entrytest", "entrytest.bsky.social")
	boardID := db.SeedBoard(t, userID, "Test Board", "private")
	habitID := db.SeedHabit(t, boardID, "Exercise", "binary")
	handler := NewEntryHandler(db.Pool)
	return db, handler, userID, boardID, habitID
}

func TestEntryHandler_Create(t *testing.T) {
	db, handler, userID, _, habitID := setupEntryHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Post("/api/habits/{habitID}/entries", handler.Create)

	body := `{"date":"2026-06-05","value_bool":true,"notes":"Great run"}`
	req := httptest.NewRequest(http.MethodPost, "/api/habits/"+habitID+"/entries", bytes.NewReader([]byte(body)))
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp["id"])
}

func TestEntryHandler_Create_DefaultDate(t *testing.T) {
	db, handler, userID, _, habitID := setupEntryHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Post("/api/habits/{habitID}/entries", handler.Create)

	body := `{"value_bool":true}`
	req := httptest.NewRequest(http.MethodPost, "/api/habits/"+habitID+"/entries", bytes.NewReader([]byte(body)))
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp["id"])
}

func TestEntryHandler_Create_Quantitative(t *testing.T) {
	db, handler, userID, boardID, _ := setupEntryHandlerTest(t)
	defer db.Reset(t)

	habitID := db.SeedHabit(t, boardID, "Water", "quantitative")

	router := chi.NewRouter()
	router.Post("/api/habits/{habitID}/entries", handler.Create)

	val := 2.5
	bodyBytes, _ := json.Marshal(map[string]any{
		"date":          "2026-06-05",
		"value_numeric": val,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/habits/"+habitID+"/entries", bytes.NewReader(bodyBytes))
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
}

func TestEntryHandler_Create_Upsert(t *testing.T) {
	db, handler, userID, _, habitID := setupEntryHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Post("/api/habits/{habitID}/entries", handler.Create)

	date := "2026-06-05"
	body1 := `{"date":"` + date + `","value_bool":true}`
	req1 := httptest.NewRequest(http.MethodPost, "/api/habits/"+habitID+"/entries", bytes.NewReader([]byte(body1)))
	req1 = req1.WithContext(middleware.SetUserID(req1.Context(), userID))
	rr1 := httptest.NewRecorder()
	router.ServeHTTP(rr1, req1)
	assert.Equal(t, http.StatusCreated, rr1.Code)

	body2 := `{"date":"` + date + `","value_bool":false}`
	req2 := httptest.NewRequest(http.MethodPost, "/api/habits/"+habitID+"/entries", bytes.NewReader([]byte(body2)))
	req2 = req2.WithContext(middleware.SetUserID(req2.Context(), userID))
	rr2 := httptest.NewRecorder()
	router.ServeHTTP(rr2, req2)
	assert.Equal(t, http.StatusCreated, rr2.Code)

	// Verify only one entry exists
	ctx := req2.Context()
	var count int
	err := db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM entries WHERE habit_id = $1 AND date = $2`, habitID, date).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 1, count)
}

func TestEntryHandler_List(t *testing.T) {
	db, handler, userID, _, habitID := setupEntryHandlerTest(t)
	defer db.Reset(t)

	_ = db.SeedEntry(t, habitID, "2026-06-01", boolPtr(true), nil)
	_ = db.SeedEntry(t, habitID, "2026-06-02", boolPtr(false), nil)

	router := chi.NewRouter()
	router.Get("/api/habits/{habitID}/entries", handler.List)

	req := httptest.NewRequest(http.MethodGet, "/api/habits/"+habitID+"/entries?from=2026-06-01&to=2026-06-30", nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var entries []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &entries))
	assert.Len(t, entries, 2)
}

func TestEntryHandler_Streak(t *testing.T) {
	db, handler, userID, _, habitID := setupEntryHandlerTest(t)
	defer db.Reset(t)

	today := time.Now().Format("2006-01-02")
	_ = db.SeedEntry(t, habitID, today, boolPtr(true), nil)

	router := chi.NewRouter()
	router.Get("/api/habits/{habitID}/streak", handler.Streak)

	req := httptest.NewRequest(http.MethodGet, "/api/habits/"+habitID+"/streak", nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var streak map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &streak))
	assert.Equal(t, habitID, streak["habit_id"])
	assert.Equal(t, float64(1), streak["total_completed"])
}

func TestEntryHandler_Delete(t *testing.T) {
	db, handler, userID, _, habitID := setupEntryHandlerTest(t)
	defer db.Reset(t)

	entryID := db.SeedEntry(t, habitID, "2026-06-05", boolPtr(true), nil)

	router := chi.NewRouter()
	router.Delete("/api/entries/{entryID}", handler.Delete)

	req := httptest.NewRequest(http.MethodDelete, "/api/entries/"+entryID, nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "deleted")
}

func TestEntryHandler_Delete_NotFound(t *testing.T) {
	db, handler, userID, _, _ := setupEntryHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Delete("/api/entries/{entryID}", handler.Delete)

	req := httptest.NewRequest(http.MethodDelete, "/api/entries/550e8400-e29b-41d4-a716-446655440000", nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}
