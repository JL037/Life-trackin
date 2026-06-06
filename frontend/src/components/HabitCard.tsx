import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Habit } from '../types'
import { ConfirmModal } from './ConfirmModal'
import { ArrowRight, CheckCircle, Hash, Clock, Trash2 } from 'lucide-react'

interface Props {
  habit: Habit
  onDeleted?: (id: string) => void
}

export function HabitCard({ habit, onDeleted }: Props) {
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  const typeIcon = {
    binary: <CheckCircle className="w-4 h-4" />,
    quantitative: <Hash className="w-4 h-4" />,
    timed: <Clock className="w-4 h-4" />,
  }[habit.type]

  const typeLabel = {
    binary: 'Binary',
    quantitative: 'Numeric',
    timed: 'Duration',
  }[habit.type]

  const handleDelete = async () => {
    await api.habits.delete(habit.id)
    setIsDeleted(true)
    setShowDelete(false)
    onDeleted?.(habit.id)
  }

  if (isDeleted) return null

  return (
    <>
      <div className="flex items-center justify-between border border-border bg-surface p-3 hover:border-primary/50 transition-colors group relative">
        <Link to={`/habit/${habit.id}`} className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 border border-primary/30 bg-bg flex items-center justify-center text-primary">
            {typeIcon}
          </div>
          <div>
            <h3 className="font-bold text-primary group-hover:text-primary-dim transition-colors text-sm">
              [{habit.name}]
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-text-muted border border-border bg-bg px-1 py-0.5">
                {typeLabel}
              </span>
              {habit.target_value > 1 && (
                <span className="text-xs text-text-muted">
                  target: {habit.target_value}{habit.unit}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDelete(true)}
            className="p-1.5 border border-border bg-bg hover:border-red-500 hover:text-red-500 text-text-muted transition-colors opacity-0 group-hover:opacity-100"
            title="Delete habit"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <Link to={`/habit/${habit.id}`}>
            <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>

      {showDelete && (
        <ConfirmModal
          title="DELETE_HABIT"
          message={`Confirm deletion of habit [${habit.name}] and all associated entries. This action cannot be undone.`}
          confirmLabel="DELETE"
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
