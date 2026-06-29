package validation

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidator_Required(t *testing.T) {
	v := New()
	v.Required("name", "Alice")
	assert.True(t, v.Valid())

	v2 := New()
	v2.Required("name", "")
	assert.False(t, v2.Valid())
	assert.Contains(t, v2.Errors()["name"], "is required")
}

func TestValidator_RequiredBool(t *testing.T) {
	v := New()
	val := true
	v.RequiredBool("active", &val)
	assert.True(t, v.Valid())

	v2 := New()
	v2.RequiredBool("active", nil)
	assert.False(t, v2.Valid())
}

func TestValidator_MinLength(t *testing.T) {
	v := New()
	v.MinLength("name", "Alice", 3)
	assert.True(t, v.Valid())

	v2 := New()
	v2.MinLength("name", "Al", 3)
	assert.False(t, v2.Valid())
	assert.Contains(t, v2.Errors()["name"], "must be at least 3 characters")
}

func TestValidator_MaxLength(t *testing.T) {
	v := New()
	v.MaxLength("name", "Alice", 10)
	assert.True(t, v.Valid())

	v2 := New()
	v2.MaxLength("name", "AliceAnderson", 10)
	assert.False(t, v2.Valid())
	assert.Contains(t, v2.Errors()["name"], "must be at most 10 characters")
}

func TestValidator_OneOf(t *testing.T) {
	v := New()
	v.OneOf("visibility", "public", []string{"private", "public", "followers"})
	assert.True(t, v.Valid())

	v2 := New()
	v2.OneOf("visibility", "secret", []string{"private", "public"})
	assert.False(t, v2.Valid())
	assert.Contains(t, v2.Errors()["visibility"], "must be one of [private public]")
}

func TestValidator_Positive(t *testing.T) {
	v := New()
	v.Positive("target", 5.0)
	assert.True(t, v.Valid())

	v2 := New()
	v2.Positive("target", 0)
	assert.False(t, v2.Valid())
	assert.Contains(t, v2.Errors()["target"], "must be greater than 0")
}

func TestValidator_MultipleErrors(t *testing.T) {
	v := New()
	v.Required("name", "")
	v.MinLength("name", "", 3)
	v.OneOf("type", "unknown", []string{"binary", "timed"})

	assert.False(t, v.Valid())
	assert.Len(t, v.Errors()["name"], 2)
	assert.Len(t, v.Errors()["type"], 1)
}

func TestValidator_Respond_Valid(t *testing.T) {
	v := New()
	v.Required("name", "Alice")

	rr := httptest.NewRecorder()
	responded := v.Respond(rr)

	assert.False(t, responded)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestValidator_Respond_Invalid(t *testing.T) {
	v := New()
	v.Required("name", "")
	v.MinLength("name", "", 3)

	rr := httptest.NewRecorder()
	responded := v.Respond(rr)

	assert.True(t, responded)
	assert.Equal(t, http.StatusBadRequest, rr.Code)

	var body map[string]any
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&body))
	assert.Equal(t, "validation failed", body["error"])
	assert.NotNil(t, body["fields"])
}
