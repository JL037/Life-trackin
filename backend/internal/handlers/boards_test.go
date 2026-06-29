package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/jaredlemler/life-trackin/internal/middleware"
	"github.com/jaredlemler/life-trackin/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupBoardHandlerTest(t *testing.T) (*testutil.TestDB, *BoardHandler, string) {
	testutil.SkipIfShort(t)
	db := testutil.NewTestDB(t)
	userID := db.SeedUser(t, "did:plc:boardtest", "boardtest.bsky.social")
	handler := NewBoardHandler(db.Pool)
	return db, handler, userID
}

func TestBoardHandler_Create(t *testing.T) {
	db, handler, userID := setupBoardHandlerTest(t)
	defer db.Reset(t)

	body := `{"name":"Morning Routine","description":"Daily morning habits","visibility":"public"}`
	req := httptest.NewRequest(http.MethodPost, "/api/boards", bytes.NewReader([]byte(body)))
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	
	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp["id"])
}

func TestBoardHandler_Create_MissingName(t *testing.T) {
	db, handler, userID := setupBoardHandlerTest(t)
	defer db.Reset(t)

	body := `{"description":"No name provided"}`
	req := httptest.NewRequest(http.MethodPost, "/api/boards", bytes.NewReader([]byte(body)))
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	handler.Create(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "validation failed")
	assert.Contains(t, rr.Body.String(), "is required")
}

func TestBoardHandler_List(t *testing.T) {
	db, handler, userID := setupBoardHandlerTest(t)
	defer db.Reset(t)

	db.SeedBoard(t, userID, "Board A", "private")
	db.SeedBoard(t, userID, "Board B", "public")

	req := httptest.NewRequest(http.MethodGet, "/api/boards", nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var boards []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &boards))
	assert.Len(t, boards, 2)
}

func TestBoardHandler_Get(t *testing.T) {
	db, handler, userID := setupBoardHandlerTest(t)
	defer db.Reset(t)

	boardID := db.SeedBoard(t, userID, "Fitness", "private")

	router := chi.NewRouter()
	router.Get("/api/boards/{boardID}", handler.Get)

	req := httptest.NewRequest(http.MethodGet, "/api/boards/"+boardID, nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var board map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &board))
	assert.Equal(t, "Fitness", board["name"])
}

func TestBoardHandler_Get_NotFound(t *testing.T) {
	db, handler, userID := setupBoardHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Get("/api/boards/{boardID}", handler.Get)

	req := httptest.NewRequest(http.MethodGet, "/api/boards/550e8400-e29b-41d4-a716-446655440000", nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestBoardHandler_Get_WrongOwner(t *testing.T) {
	db, handler, _ := setupBoardHandlerTest(t)
	defer db.Reset(t)

	otherUserID := db.SeedUser(t, "did:plc:other", "other.bsky.social")
	boardID := db.SeedBoard(t, otherUserID, "Private Board", "private")

	router := chi.NewRouter()
	router.Get("/api/boards/{boardID}", handler.Get)

	req := httptest.NewRequest(http.MethodGet, "/api/boards/"+boardID, nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), "wrong-user-id"))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestBoardHandler_Update(t *testing.T) {
	db, handler, userID := setupBoardHandlerTest(t)
	defer db.Reset(t)

	boardID := db.SeedBoard(t, userID, "Old Name", "private")

	router := chi.NewRouter()
	router.Put("/api/boards/{boardID}", handler.Update)

	body := `{"name":"New Name","visibility":"public"}`
	req := httptest.NewRequest(http.MethodPut, "/api/boards/"+boardID, bytes.NewReader([]byte(body)))
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "updated")
}

func TestBoardHandler_Delete(t *testing.T) {
	db, handler, userID := setupBoardHandlerTest(t)
	defer db.Reset(t)

	boardID := db.SeedBoard(t, userID, "To Delete", "private")

	router := chi.NewRouter()
	router.Delete("/api/boards/{boardID}", handler.Delete)

	req := httptest.NewRequest(http.MethodDelete, "/api/boards/"+boardID, nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "deleted")
}

func TestBoardHandler_Stats(t *testing.T) {
	db, handler, userID := setupBoardHandlerTest(t)
	defer db.Reset(t)

	boardID := db.SeedBoard(t, userID, "Stats Board", "private")
	habitID := db.SeedHabit(t, boardID, "Run", "binary")
	_ = db.SeedEntry(t, habitID, "2026-06-01", boolPtr(true), nil)

	router := chi.NewRouter()
	router.Get("/api/boards/{boardID}/stats", handler.Stats)

	req := httptest.NewRequest(http.MethodGet, "/api/boards/"+boardID+"/stats", nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var stats map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &stats))
	assert.Equal(t, float64(1), stats["habit_count"])
	assert.Equal(t, float64(1), stats["total_entries"])
}

func TestBoardHandler_Heatmap(t *testing.T) {
	db, handler, userID := setupBoardHandlerTest(t)
	defer db.Reset(t)

	boardID := db.SeedBoard(t, userID, "Heatmap Board", "private")
	habitID := db.SeedHabit(t, boardID, "Run", "binary")
	_ = db.SeedEntry(t, habitID, "2026-01-15", boolPtr(true), nil)

	router := chi.NewRouter()
	router.Get("/api/boards/{boardID}/heatmap", handler.Heatmap)

	req := httptest.NewRequest(http.MethodGet, "/api/boards/"+boardID+"/heatmap?year=2026", nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, float64(2026), resp["year"])
	assert.NotNil(t, resp["days"])
}

func boolPtr(b bool) *bool {
	return &b
}
