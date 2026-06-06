import { Link } from 'react-router-dom'
import type { Habit } from '../types'
import { ArrowRight, CheckCircle, Hash, Clock } from 'lucide-react'

interface Props {
  habit: Habit
}

export function HabitCard({ habit }: Props) {
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

  return (
    <Link
      to={`/habit/${habit.id}`}
      className="flex items-center justify-between border border-border bg-surface p-3 hover:border-primary/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
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
      </div>

      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  )
}
