import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn, getHeatmapColor } from '../lib/utils'
import { Tooltip } from './Tooltip'
import type { HeatmapResponse } from '../types'

interface Props {
  boardId?: string
  habitId?: string
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

export function Heatmap({ boardId, habitId, year = new Date().getFullYear(), compact = false }: Props) {
  const [data, setData] = useState<HeatmapResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (boardId) {
      api.boards.heatmap(boardId, year).then(setData).catch(console.error).finally(() => setLoading(false))
    }
  }, [boardId, habitId, year])

  if (loading) {
    return <div className="animate-pulse bg-text-dim border border-border h-20" />
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
    return (
      <div className="flex gap-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <Tooltip
                key={di}
                content={day.date ? `${formatDateLabel(day.date)} — ${getContributionLevelText(day.level)}` : ''}
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{
                    backgroundColor: day.level >= 0 ? getHeatmapColor(day.level) : 'transparent',
                  }}
                />
              </Tooltip>
            ))}
          </div>
        ))}
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
                if (di === 0 && day.date) {
                  const date = new Date(day.date + 'T00:00:00')
                  if (date.getDate() <= 7) {
                    // Show month label
                  }
                }
                return (
                  <Tooltip
                    key={di}
                    content={day.date ? `${formatDateLabel(day.date)} — ${getContributionLevelText(day.level)}` : ''}
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
                        day.level < 0 && "bg-transparent"
                      )}
                      style={{
                        backgroundColor: day.level >= 0 ? getHeatmapColor(day.level) : 'transparent',
                      }}
                    />
                  </Tooltip>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-text-muted font-mono">
        <span>{data.active_days} active_days</span>
        <div className="flex items-center gap-1.5">
          <span>min</span>
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              className="w-3 h-3"
              style={{ backgroundColor: getHeatmapColor(level) }}
            />
          ))}
          <span>max</span>
        </div>
      </div>
    </div>
  )
}
