import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Board, Habit } from '../types'
import { Heatmap } from '../components/Heatmap'
import { HabitCard } from '../components/HabitCard'
import { CreateHabitModal } from '../components/CreateHabitModal'
import { ArrowLeft, Plus, Settings } from 'lucide-react'

export function BoardView() {
  const { boardId } = useParams<{ boardId: string }>()
  const [board, setBoard] = useState<Board | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateHabit, setShowCreateHabit] = useState(false)

  useEffect(() => {
    if (!boardId) return

    Promise.all([
      api.boards.get(boardId),
      api.habits.list(boardId),
    ])
      .then(([boardData, habitsData]) => {
        setBoard(boardData as Board)
        setHabits(habitsData as Habit[])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [boardId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 font-mono">
        <div className="text-text-muted text-sm animate-pulse">&gt; loading board data...</div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="text-center py-16 font-mono">
        <h2 className="text-xl font-bold text-red mb-2">[ERROR: BOARD NOT FOUND]</h2>
        <Link to="/dashboard" className="text-primary hover:text-primary-dim border-b border-primary">
          &lt;&lt; RETURN TO DASHBOARD
        </Link>
      </div>
    )
  }

  return (
    <div className="font-mono">
      <div className="mb-6 border-b border-border pb-3">
        <Link to="/dashboard" className="text-xs text-text-muted hover:text-primary flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" />
          &lt;&lt; DASHBOARD
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">[{board.name}]</h1>
            {board.description && (
              <p className="text-text-muted text-xs mt-1">// {board.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-border hover:border-primary transition-colors">
              <Settings className="w-4 h-4 text-primary" />
            </button>
            <button
              onClick={() => setShowCreateHabit(true)}
              className="flex items-center gap-2 border border-primary bg-primary/10 hover:bg-primary/20 text-primary py-1.5 px-3 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              NEW_HABIT
            </button>
          </div>
        </div>
      </div>

      <div className="border border-border bg-surface p-4 mb-6">
        <div className="text-xs text-text-muted mb-3 border-b border-border pb-2">
          &gt; YEAR OVERVIEW
        </div>
        <Heatmap boardId={board.id} year={new Date().getFullYear()} />
      </div>

      <h2 className="text-lg font-bold text-primary mb-4">[HABITS]</h2>

      {habits.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border bg-surface">
          <p className="text-text-muted mb-3 text-sm">[NO HABITS INITIALIZED]</p>
          <button
            onClick={() => setShowCreateHabit(true)}
            className="border border-primary bg-primary/10 hover:bg-primary/20 text-primary py-2 px-4 transition-colors text-sm"
          >
            INIT_HABIT
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map(habit => (
            <HabitCard key={habit.id} habit={habit} onDeleted={(id) => setHabits(prev => prev.filter(h => h.id !== id))} />
          ))}
        </div>
      )}

      {showCreateHabit && boardId && (
        <CreateHabitModal
          boardId={boardId}
          onClose={() => setShowCreateHabit(false)}
          onCreated={(habit: Habit) => {
            setHabits(prev => [...prev, habit])
            setShowCreateHabit(false)
          }}
        />
      )}
    </div>
  )
}
