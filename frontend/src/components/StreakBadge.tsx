import type { StreakInfo } from '../types'
import { Flame } from 'lucide-react'

interface Props {
  streak: StreakInfo
}

export function StreakBadge({ streak }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
      <Flame className="w-4 h-4 text-orange-500" />
      <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
        {streak.current_streak} day streak
      </span>
    </div>
  )
}
