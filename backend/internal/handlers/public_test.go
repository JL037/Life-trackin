package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/jaredlemler/life-trackin/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupPublicHandlerTest(t *testing.T) (*testutil.TestDB, *PublicHandler, string, string) {
	testutil.SkipIfShort(t)
	db := testutil.NewTestDB(t)
	userID := db.SeedUser(t, "did:plc:pubtest", "pubtest.bsky.social")
	boardID := db.SeedBoard(t, userID, "Public Board", "public")
	handler := NewPublicHandler(db.Pool)
	return db, handler, userID, boardID
}

func TestPublicHandler_GetUser(t *testing.T) {
	db, handler, _, _ := setupPublicHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Get("/api/public/users/{handle}", handler.GetUser)

	req := httptest.NewRequest(http.MethodGet, "/api/public/users/pubtest.bsky.social", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var user map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &user))
	assert.Equal(t, "pubtest.bsky.social", user["handle"])
}

func TestPublicHandler_GetUser_NotFound(t *testing.T) {
	db, handler, _, _ := setupPublicHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Get("/api/public/users/{handle}", handler.GetUser)

	req := httptest.NewRequest(http.MethodGet, "/api/public/users/nonexistent.bsky.social", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestPublicHandler_ListBoards(t *testing.T) {
	db, handler, userID, _ := setupPublicHandlerTest(t)
	defer db.Reset(t)

	// Seed another private board
	_ = db.SeedBoard(t, userID, "Private Board", "private")

	router := chi.NewRouter()
	router.Get("/api/public/users/{handle}/boards", handler.ListBoards)

	req := httptest.NewRequest(http.MethodGet, "/api/public/users/pubtest.bsky.social/boards", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var boards []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &boards))
	assert.Len(t, boards, 1)
	assert.Equal(t, "Public Board", boards[0]["name"])
}

func TestPublicHandler_BoardStats(t *testing.T) {
	db, handler, _, boardID := setupPublicHandlerTest(t)
	defer db.Reset(t)

	habitID := db.SeedHabit(t, boardID, "Run", "binary")
	_ = db.SeedEntry(t, habitID, "2026-06-01", boolPtr(true), nil)

	router := chi.NewRouter()
	router.Get("/api/public/boards/{boardID}/stats", handler.BoardStats)

	req := httptest.NewRequest(http.MethodGet, "/api/public/boards/"+boardID+"/stats", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var stats map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &stats))
	assert.Equal(t, float64(1), stats["habit_count"])
	assert.Equal(t, float64(1), stats["total_entries"])
}

func TestPublicHandler_BoardStats_PrivateBoard(t *testing.T) {
	db, handler, userID, _ := setupPublicHandlerTest(t)
	defer db.Reset(t)

	privateBoardID := db.SeedBoard(t, userID, "Private Board", "private")

	router := chi.NewRouter()
	router.Get("/api/public/boards/{boardID}/stats", handler.BoardStats)

	req := httptest.NewRequest(http.MethodGet, "/api/public/boards/"+privateBoardID+"/stats", nil)
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}
