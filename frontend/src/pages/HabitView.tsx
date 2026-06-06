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
      <div className="flex items-center justify-center h-64 font-mono">
        <div className="text-text-muted text-sm animate-pulse">&gt; loading habit data...</div>
      </div>
    )
  }

  if (!habit) {
    return (
      <div className="text-center py-16 font-mono">
        <h2 className="text-xl font-bold text-red mb-2">[ERROR: HABIT NOT FOUND]</h2>
        <Link to="/dashboard" className="text-primary hover:text-primary-dim border-b border-primary">
          &lt;&lt; RETURN TO DASHBOARD
        </Link>
      </div>
    )
  }

  return (
    <div className="font-mono">
      <div className="mb-6 border-b border-border pb-3">
        <Link to={`/board/${habit.board_id}`} className="text-xs text-text-muted hover:text-primary flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" />
          &lt;&lt; BOARD
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">[{habit.name}]</h1>
            {habit.description && (
              <p className="text-text-muted text-xs mt-1">// {habit.description}</p>
            )}
          </div>
          {streak && <StreakBadge streak={streak} />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="border border-border bg-surface p-3">
          <div className="flex items-center gap-2 text-text-muted mb-1 text-xs">
            <Target className="w-3 h-3" />
            <span>TARGET</span>
          </div>
          <p className="text-lg font-bold text-primary">
            {habit.target_value}{habit.unit}
          </p>
          <p className="text-xs text-text-muted uppercase">type: {habit.type}</p>
        </div>

        <div className="border border-border bg-surface p-3">
          <div className="flex items-center gap-2 text-text-muted mb-1 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span>TOTAL_LOGGED</span>
          </div>
          <p className="text-lg font-bold text-primary">
            {streak?.total_completed || 0}
          </p>
          <p className="text-xs text-text-muted">entries</p>
        </div>

        <div className="border border-border bg-surface p-3">
          <div className="flex items-center gap-2 text-text-muted mb-1 text-xs">
            <Target className="w-3 h-3" />
            <span>STREAK</span>
          </div>
          <p className="text-lg font-bold text-primary">
            {streak?.current_streak || 0}d
          </p>
          <p className="text-xs text-text-muted">
            max: {streak?.longest_streak || 0}d
          </p>
        </div>
      </div>

      <div className="border border-border bg-surface p-4 mb-6">
        <div className="text-xs text-text-muted mb-3 border-b border-border pb-2">
          &gt; ACTIVITY_HEATMAP
        </div>
        <Heatmap habitId={habit.id} year={new Date().getFullYear()} />
      </div>

      <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
        <h2 className="text-lg font-bold text-primary">[RECENT_ENTRIES]</h2>
        <button
          onClick={() => setShowEntryForm(true)}
          className="border border-primary bg-primary/10 hover:bg-primary/20 text-primary py-1.5 px-3 text-sm transition-colors"
        >
          LOG_ENTRY
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border bg-surface">
          <p className="text-text-muted text-sm">[NO ENTRIES] Start tracking today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 20).map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 border flex items-center justify-center text-xs font-bold"
                  style={{ borderColor: entry.value_bool ? '#33ff33' : '#1a991a', color: entry.value_bool ? '#33ff33' : '#1a991a', backgroundColor: entry.value_bool ? '#33ff3310' : 'transparent' }}
                >
                  {entry.value_bool ? 'OK' : '--'}
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">
                    {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  {entry.notes && <p className="text-xs text-text-muted">// {entry.notes}</p>}
                </div>
              </div>
              <div className="text-right">
                {entry.value_numeric !== undefined && (
                  <p className="text-sm font-medium text-primary">{entry.value_numeric}{habit.unit}</p>
                )}
                {entry.value_duration && (
                  <p className="text-sm font-medium text-primary">{entry.value_duration}</p>
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
