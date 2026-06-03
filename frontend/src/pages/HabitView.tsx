import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Habit, Entry, StreakInfo } from '../types'
import { Heatmap } from '../components/Heatmap'
import { StreakBadge } from '../components/StreakBadge'
import { EntryForm } from '../components/EntryForm'
import { ArrowLeft, Target, TrendingUp } from 'lucide-react'

export function HabitView() {
  const { habitId } = useParams<{ habitId: string }>()
  const [habit, setHabit] = useState<Habit | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [streak, setStreak] = useState<StreakInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEntryForm, setShowEntryForm] = useState(false)

  useEffect(() => {
    if (!habitId) return
    loadData()
  }, [habitId])

  const loadData = () => {
    if (!habitId) return
    Promise.all([
      api.habits.get(habitId),
      api.entries.list(habitId),
      api.habits.streak(habitId),
    ])
      .then(([habitData, entriesData, streakData]) => {
        setHabit(habitData as Habit)
        setEntries(entriesData as Entry[])
        setStreak(streakData as StreakInfo)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!habit) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-medium text-text dark:text-text-dark mb-2">Habit not found</h2>
        <Link to="/dashboard" className="text-primary hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link to={`/board/${habit.board_id}`} className="text-sm text-text-muted hover:text-primary flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Board
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text dark:text-text-dark">{habit.name}</h1>
            {habit.description && (
              <p className="text-text-muted mt-1">{habit.description}</p>
            )}
          </div>
          {streak && <StreakBadge streak={streak} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Target</span>
          </div>
          <p className="text-lg font-semibold text-text dark:text-text-dark">
            {habit.target_value} {habit.unit}
          </p>
          <p className="text-xs text-text-muted capitalize">{habit.type} habit</p>
        </div>

        <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Total Logged</span>
          </div>
          <p className="text-lg font-semibold text-text dark:text-text-dark">
            {streak?.total_completed || 0}
          </p>
          <p className="text-xs text-text-muted">entries</p>
        </div>

        <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4">
          <div className="flex items-center gap-2 text-text-muted mb-1">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Current Streak</span>
          </div>
          <p className="text-lg font-semibold text-text dark:text-text-dark">
            {streak?.current_streak || 0} days
          </p>
          <p className="text-xs text-text-muted">
            Longest: {streak?.longest_streak || 0} days
          </p>
        </div>
      </div>

      <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4 mb-6">
        <h2 className="text-sm font-medium text-text-muted mb-3">Activity Heatmap</h2>
        <Heatmap habitId={habit.id} year={new Date().getFullYear()} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text dark:text-text-dark">Recent Entries</h2>
        <button
          onClick={() => setShowEntryForm(true)}
          className="bg-primary hover:bg-primary-light text-white font-medium py-1.5 px-3 rounded-lg text-sm transition-colors"
        >
          Log Entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 bg-surface dark:bg-surface-dark rounded-xl border border-dashed border-border dark:border-border-dark">
          <p className="text-text-muted">No entries yet. Start tracking today!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 20).map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between bg-surface dark:bg-surface-dark rounded-lg border border-border dark:border-border-dark px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: entry.value_bool ? '#30a14e' : '#ebedf0' }}
                >
                  {entry.value_bool ? 'Done' : '-'}
                </div>
                <div>
                  <p className="text-sm font-medium text-text dark:text-text-dark">
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  {entry.notes && <p className="text-xs text-text-muted">{entry.notes}</p>}
                </div>
              </div>
              <div className="text-right">
                {entry.value_numeric !== undefined && (
                  <p className="text-sm font-medium text-text dark:text-text-dark">{entry.value_numeric} {habit.unit}</p>
                )}
                {entry.value_duration && (
                  <p className="text-sm font-medium text-text dark:text-text-dark">{entry.value_duration}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEntryForm && habit && (
        <EntryForm
          habit={habit}
          onClose={() => setShowEntryForm(false)}
          onSubmit={() => {
            setShowEntryForm(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
