export interface User {
  id: string
  did: string
  handle: string
  display_name: string
  avatar_url: string
  privacy_default: string
  created_at: string
}

export interface Board {
  id: string
  user_id: string
  name: string
  description: string
  color_scheme: {
    empty: string
    levels: string[]
  }
  visibility: 'private' | 'followers' | 'public'
  position: number
  created_at: string
  updated_at: string
}

export type HabitType = 'binary' | 'quantitative' | 'timed'

export interface Habit {
  id: string
  board_id: string
  name: string
  description: string
  type: HabitType
  target_value: number
  unit: string
  frequency: Record<string, unknown>
  config: Record<string, unknown>
  position: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Entry {
  id: string
  habit_id: string
  date: string
  value_bool?: boolean
  value_numeric?: number
  value_duration?: string
  notes: string
  created_at: string
  updated_at: string
}

export interface StreakInfo {
  habit_id: string
  current_streak: number
  longest_streak: number
  last_completed_at?: string
  total_completed: number
}

export interface HeatmapDay {
  date: string
  value: number
  level: number
}

export interface HeatmapResponse {
  year: number
  board_id?: string
  habit_id?: string
  days: HeatmapDay[]
  total_days: number
  active_days: number
}
