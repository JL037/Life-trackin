// Package validation provides lightweight request body validation helpers.
package validation

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// Validator collects validation errors and produces a consistent response.
type Validator struct {
	errors map[string][]string
}

// New creates a new Validator.
func New() *Validator {
	return &Validator{errors: make(map[string][]string)}
}

// Required checks that a string field is non-empty.
func (v *Validator) Required(field, value string) {
	if strings.TrimSpace(value) == "" {
		v.AddError(field, "is required")
	}
}

// RequiredBool checks that a bool pointer field is present.
func (v *Validator) RequiredBool(field string, value *bool) {
	if value == nil {
		v.AddError(field, "is required")
	}
}

// MinLength checks that a string meets a minimum length.
func (v *Validator) MinLength(field, value string, min int) {
	if len(value) < min {
		v.AddError(field, fmt.Sprintf("must be at least %d characters", min))
	}
}

// MaxLength checks that a string does not exceed a maximum length.
func (v *Validator) MaxLength(field, value string, max int) {
	if len(value) > max {
		v.AddError(field, fmt.Sprintf("must be at most %d characters", max))
	}
}

// OneOf checks that a string is one of the allowed values.
func (v *Validator) OneOf(field, value string, allowed []string) {
	for _, a := range allowed {
		if value == a {
			return
		}
	}
	v.AddError(field, fmt.Sprintf("must be one of %v", allowed))
}

// Positive checks that a numeric value is greater than zero.
func (v *Validator) Positive(field string, value float64) {
	if value <= 0 {
		v.AddError(field, "must be greater than 0")
	}
}

// AddError records a validation error for a field.
func (v *Validator) AddError(field, message string) {
	v.errors[field] = append(v.errors[field], message)
}

// Valid returns true if no errors have been recorded.
func (v *Validator) Valid() bool {
	return len(v.errors) == 0
}

// Errors returns the collected validation errors.
func (v *Validator) Errors() map[string][]string {
	return v.errors
}

// Respond sends a 400 Bad Request with the validation errors as JSON and returns true.
// If validation passed, it returns false and does nothing.
func (v *Validator) Respond(w http.ResponseWriter) bool {
	if v.Valid() {
		return false
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(map[string]any{
		"error":  "validation failed",
		"fields": v.errors,
	})
	return true
}
