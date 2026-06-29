import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn, getHeatmapColor, getBoardCompletionColor } from '../lib/utils'
import { Tooltip } from './Tooltip'
import type { HeatmapResponse } from '../types'

interface Props {
  boardId?: string
  year?: number
  compact?: boolean
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const month = monthNames[date.getMonth()]
  const day = date.getDate()
  const weekday = weekdayNames[date.getDay()]
  return `${month} ${day}, ${weekday}`
}

function getContributionLevelText(level: number): string {
  if (level === 0) return 'No contributions'
  if (level === 1) return 'Low'
  if (level === 2) return 'Moderate'
  if (level === 3) return 'High'
  if (level === 4) return 'Very high'
  return ''
}

function getCompletionStatusText(status?: string): string {
  if (status === 'none') return 'Nothing done'
  if (status === 'partial') return 'Partial'
  if (status === 'complete') return 'All done'
  return ''
}

function buildBoardTooltip(day: { date: string; completion_status?: string; completed_habits?: string[]; total_habits?: number; value: number }): string {
  if (!day.date) return ''

  const dateLabel = formatDateLabel(day.date)
  const completedCount = day.completed_habits?.length ?? 0
  const total = day.total_habits ?? 0
  const statusText = getCompletionStatusText(day.completion_status)

  let tooltip = `${dateLabel} — ${statusText}`
  if (total > 0) {
    tooltip += ` (${completedCount}/${total})`
  }

  if (day.completed_habits && day.completed_habits.length > 0) {
    tooltip += `\nDone: ${day.completed_habits.join(', ')}`
  }

  return tooltip
}

export function Heatmap({ boardId, year = new Date().getFullYear(), compact = false }: Props) {
  const [data, setData] = useState<HeatmapResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Determine mode: board-level uses completion status, habit-level uses value levels
  const isBoardMode = !!boardId

  useEffect(() => {
    if (boardId) {
      api.boards.heatmap(boardId, year)
        .then(setData)
        .catch((err) => setError(err instanceof Error ? err.message : 'failed to load heatmap'))
        .finally(() => setLoading(false))
    }
  }, [boardId, year])

  if (loading) {
    return <div className="animate-pulse bg-text-dim border border-border h-20" />
  }

  if (error) {
    return (
      <div className="border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-500 font-mono">
        <span className="text-red">&gt; ERROR:</span> {error}
      </div>
    )
  }

  if (!data || data.days.length === 0) {
    return null
  }

  // Group days by week for the grid
  const weeks: typeof data.days[] = []
  let currentWeek: typeof data.days = []

  const firstDay = new Date(data.days[0].date + 'T00:00:00')
  const dayOfWeek = firstDay.getDay() // 0 = Sunday

  // Pad start
  for (let i = 0; i < dayOfWeek; i++) {
    currentWeek.push({ date: '', value: 0, level: -1 })
  }

  data.days.forEach(day => {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', value: 0, level: -1 })
    }
    weeks.push(currentWeek)
  }

  if (compact) {
    // Show only the last 12 weeks (~3 months) so it fits cleanly in cards
    const recentWeeks = weeks.slice(-12)

    return (
      <div className="overflow-x-auto max-w-full">
        <div className="flex gap-[3px] min-w-0">
          {recentWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => {
                const tooltipContent = isBoardMode && day.completion_status
                  ? buildBoardTooltip(day)
                  : day.date ? `${formatDateLabel(day.date)} — ${getContributionLevelText(day.level)}` : ''

                const bgColor = isBoardMode && day.completion_status
                  ? getBoardCompletionColor(day.completion_status)
                  : day.level >= 0 ? getHeatmapColor(day.level) : 'transparent'

                return (
                  <Tooltip key={di} content={tooltipContent}>
                    <div
                      className="w-[6px] h-[6px] flex-shrink-0"
                      style={{ backgroundColor: bgColor }}
                    />
                  </Tooltip>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="w-full">
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {/* Day labels */}
        <div className="flex flex-col gap-1.5 pt-6 mr-1">
          {[1, 3, 5].map(d => (
            <span key={d} className="text-[10px] text-text-muted w-5 text-right leading-3">
              {weekDays[d]?.slice(0, 2)}
            </span>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex gap-1.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1.5">
              {week.map((day, di) => {
                const tooltipContent = isBoardMode && day.completion_status
                  ? buildBoardTooltip(day)
                  : day.date ? `${formatDateLabel(day.date)} — ${getContributionLevelText(day.level)}` : ''

                const bgColor = isBoardMode && day.completion_status
                  ? getBoardCompletionColor(day.completion_status)
                  : day.level >= 0 ? getHeatmapColor(day.level) : 'transparent'

                return (
                  <Tooltip key={di} content={tooltipContent}>
                    <div
                      className={cn(
                        "w-3 h-3 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
                        day.level < 0 && !day.completion_status && "bg-transparent"
                      )}
                      style={{ backgroundColor: bgColor }}
                    />
                  </Tooltip>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {isBoardMode ? (
        <div className="flex items-center justify-between mt-3 text-xs text-text-muted font-mono">
          <span>{data.active_days} active_days</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3" style={{ backgroundColor: '#991a1a' }} />
              <span>none</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3" style={{ backgroundColor: '#ffb000' }} />
              <span>partial</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3" style={{ backgroundColor: '#7aff7a' }} />
              <span>complete</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-3 text-xs text-text-muted font-mono">
          <span>{data.active_days} active_days</span>
          <div className="flex items-center gap-1.5">
            <span>min</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className="w-3 h-3" style={{ backgroundColor: getHeatmapColor(level) }} />
            ))}
            <span>max</span>
          </div>
        </div>
      )}
    </div>
  )
}
