import type { StreakInfo } from '../types'
import { Flame } from 'lucide-react'

interface Props {
  streak: StreakInfo
}

export function StreakBadge({ streak }: Props) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 border border-primary/30 bg-primary/5">
      <Flame className="w-4 h-4 text-primary" />
      <span className="text-xs font-bold text-primary font-mono">
        {streak.current_streak}d_streak
      </span>
    </div>
  )
}
