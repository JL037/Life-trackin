package models

import (
	"time"
)

type User struct {
	ID             string    `json:"id"`
	DID            string    `json:"did"`
	Handle         string    `json:"handle"`
	DisplayName    string    `json:"display_name"`
	AvatarURL      string    `json:"avatar_url"`
	PrivacyDefault string    `json:"privacy_default"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

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

type HabitType string

const (
	HabitTypeBinary       HabitType = "binary"
	HabitTypeQuantitative HabitType = "quantitative"
	HabitTypeTimed        HabitType = "timed"
)

type Habit struct {
	ID          string    `json:"id"`
	BoardID     string    `json:"board_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Type        HabitType `json:"type"`
	TargetValue float64   `json:"target_value"`
	Unit        string    `json:"unit"`
	Frequency   any       `json:"frequency"`
	Config      any       `json:"config"`
	Position    int       `json:"position"`
	Archived    bool      `json:"archived"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

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

type Streak struct {
	HabitID         string  `json:"habit_id"`
	CurrentStreak   int     `json:"current_streak"`
	LongestStreak   int     `json:"longest_streak"`
	LastCompletedAt *string `json:"last_completed_at,omitempty"`
}

type HeatmapDay struct {
	Date             string   `json:"date"`
	Value            float64  `json:"value"`
	Level            int      `json:"level"`
	CompletionStatus string   `json:"completion_status,omitempty"` // "none", "partial", "complete"
	CompletedHabits  []string `json:"completed_habits,omitempty"`
	TotalHabits      int      `json:"total_habits,omitempty"`
}

type HeatmapResponse struct {
	Year       int          `json:"year"`
	HabitID    string       `json:"habit_id,omitempty"`
	BoardID    string       `json:"board_id,omitempty"`
	Days       []HeatmapDay `json:"days"`
	TotalDays  int          `json:"total_days"`
	ActiveDays int          `json:"active_days"`
}
