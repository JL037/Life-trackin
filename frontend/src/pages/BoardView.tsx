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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!board) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-medium text-text dark:text-text-dark mb-2">Board not found</h2>
        <Link to="/dashboard" className="text-primary hover:underline">Back to dashboard</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/dashboard" className="text-sm text-text-muted hover:text-primary flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text dark:text-text-dark">{board.name}</h1>
            {board.description && (
              <p className="text-text-muted mt-1">{board.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-border dark:border-border-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors">
              <Settings className="w-4 h-4 text-text-muted" />
            </button>
            <button
              onClick={() => setShowCreateHabit(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Habit
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4 mb-6">
        <h2 className="text-sm font-medium text-text-muted mb-3">Year Overview</h2>
        <Heatmap boardId={board.id} year={new Date().getFullYear()} />
      </div>

      <h2 className="text-lg font-semibold text-text dark:text-text-dark mb-4">Habits</h2>

      {habits.length === 0 ? (
        <div className="text-center py-12 bg-surface dark:bg-surface-dark rounded-xl border border-dashed border-border dark:border-border-dark">
          <p className="text-text-muted mb-3">No habits in this board yet</p>
          <button
            onClick={() => setShowCreateHabit(true)}
            className="bg-primary hover:bg-primary-light text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Add Your First Habit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map(habit => (
            <HabitCard key={habit.id} habit={habit} />
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
