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

func setupHabitHandlerTest(t *testing.T) (*testutil.TestDB, *HabitHandler, string, string) {
	testutil.SkipIfShort(t)
	db := testutil.NewTestDB(t)
	userID := db.SeedUser(t, "did:plc:habittest", "habittest.bsky.social")
	boardID := db.SeedBoard(t, userID, "Test Board", "private")
	handler := NewHabitHandler(db.Pool)
	return db, handler, userID, boardID
}

func TestHabitHandler_Create(t *testing.T) {
	db, handler, userID, boardID := setupHabitHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Post("/api/boards/{boardID}/habits", handler.Create)

	body := `{"name":"Read 30 mins","description":"Daily reading","type":"binary","target_value":1,"unit":"pages"}`
	req := httptest.NewRequest(http.MethodPost, "/api/boards/"+boardID+"/habits", bytes.NewReader([]byte(body)))
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var resp map[string]string
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp["id"])
}

func TestHabitHandler_Create_WrongOwner(t *testing.T) {
	db, handler, _, boardID := setupHabitHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Post("/api/boards/{boardID}/habits", handler.Create)

	body := `{"name":"Read","type":"binary"}`
	req := httptest.NewRequest(http.MethodPost, "/api/boards/"+boardID+"/habits", bytes.NewReader([]byte(body)))
	req = req.WithContext(middleware.SetUserID(req.Context(), "wrong-user"))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestHabitHandler_List(t *testing.T) {
	db, handler, userID, boardID := setupHabitHandlerTest(t)
	defer db.Reset(t)

	db.SeedHabit(t, boardID, "Habit A", "binary")
	db.SeedHabit(t, boardID, "Habit B", "quantitative")

	router := chi.NewRouter()
	router.Get("/api/boards/{boardID}/habits", handler.List)

	req := httptest.NewRequest(http.MethodGet, "/api/boards/"+boardID+"/habits", nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var habits []map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &habits))
	assert.Len(t, habits, 2)
}

func TestHabitHandler_Get(t *testing.T) {
	db, handler, userID, boardID := setupHabitHandlerTest(t)
	defer db.Reset(t)

	habitID := db.SeedHabit(t, boardID, "Meditate", "binary")

	router := chi.NewRouter()
	router.Get("/api/habits/{habitID}", handler.Get)

	req := httptest.NewRequest(http.MethodGet, "/api/habits/"+habitID, nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var habit map[string]any
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &habit))
	assert.Equal(t, "Meditate", habit["name"])
	assert.Equal(t, "binary", habit["type"])
}

func TestHabitHandler_Get_NotFound(t *testing.T) {
	db, handler, userID, _ := setupHabitHandlerTest(t)
	defer db.Reset(t)

	router := chi.NewRouter()
	router.Get("/api/habits/{habitID}", handler.Get)

	req := httptest.NewRequest(http.MethodGet, "/api/habits/550e8400-e29b-41d4-a716-446655440000", nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestHabitHandler_Update(t *testing.T) {
	db, handler, userID, boardID := setupHabitHandlerTest(t)
	defer db.Reset(t)

	habitID := db.SeedHabit(t, boardID, "Old Habit", "binary")

	router := chi.NewRouter()
	router.Put("/api/habits/{habitID}", handler.Update)

	body := `{"name":"Updated Habit","target_value":5}`
	req := httptest.NewRequest(http.MethodPut, "/api/habits/"+habitID, bytes.NewReader([]byte(body)))
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "updated")
}

func TestHabitHandler_Update_Archived(t *testing.T) {
	db, handler, userID, boardID := setupHabitHandlerTest(t)
	defer db.Reset(t)

	habitID := db.SeedHabit(t, boardID, "To Archive", "binary")

	router := chi.NewRouter()
	router.Put("/api/habits/{habitID}", handler.Update)

	body := `{"archived":true}`
	req := httptest.NewRequest(http.MethodPut, "/api/habits/"+habitID, bytes.NewReader([]byte(body)))
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	// Verify it's archived by trying to list
	listRouter := chi.NewRouter()
	listRouter.Get("/api/boards/{boardID}/habits", handler.List)
	listReq := httptest.NewRequest(http.MethodGet, "/api/boards/"+boardID+"/habits", nil)
	listReq = listReq.WithContext(middleware.SetUserID(listReq.Context(), userID))
	listRR := httptest.NewRecorder()
	listRouter.ServeHTTP(listRR, listReq)

	var habits []map[string]any
	require.NoError(t, json.Unmarshal(listRR.Body.Bytes(), &habits))
	assert.Len(t, habits, 0) // archived habits are filtered out
}

func TestHabitHandler_Delete(t *testing.T) {
	db, handler, userID, boardID := setupHabitHandlerTest(t)
	defer db.Reset(t)

	habitID := db.SeedHabit(t, boardID, "To Delete", "binary")

	router := chi.NewRouter()
	router.Delete("/api/habits/{habitID}", handler.Delete)

	req := httptest.NewRequest(http.MethodDelete, "/api/habits/"+habitID, nil)
	req = req.WithContext(middleware.SetUserID(req.Context(), userID))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "deleted")
}
