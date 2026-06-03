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
      className="flex items-center justify-between bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4 hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {typeIcon}
        </div>
        <div>
          <h3 className="font-medium text-text dark:text-text-dark group-hover:text-primary transition-colors">
            {habit.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-muted bg-bg dark:bg-bg-dark px-1.5 py-0.5 rounded border border-border dark:border-border-dark">
              {typeLabel}
            </span>
            {habit.target_value > 1 && (
              <span className="text-xs text-text-muted">
                Target: {habit.target_value} {habit.unit}
              </span>
            )}
          </div>
        </div>
      </div>

      <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  )
}
