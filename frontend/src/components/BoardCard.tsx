import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Board, BoardStats } from '../types'
import { formatRelativeDate } from '../lib/utils'
import { ConfirmModal } from './ConfirmModal'
import { ArrowRight, Lock, Globe, Users, Trash2, Hash, Flame, Activity } from 'lucide-react'

interface Props {
  board: Board
  onDeleted?: (id: string) => void
}

export function BoardCard({ board, onDeleted }: Props) {
  const [stats, setStats] = useState<BoardStats | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

  useEffect(() => {
    api.boards.stats(board.id)
      .then((data: BoardStats) => setStats(data))
      .catch(console.error)
  }, [board.id])

  const visibilityIcon = {
    private: <Lock className="w-3 h-3" />,
    followers: <Users className="w-3 h-3" />,
    public: <Globe className="w-3 h-3" />,
  }[board.visibility]

  const handleDelete = async () => {
    await api.boards.delete(board.id)
    setIsDeleted(true)
    setShowDelete(false)
    onDeleted?.(board.id)
  }

  if (isDeleted) return null

  const isActive = stats?.last_entry_date && formatRelativeDate(stats.last_entry_date) === 'today'

  return (
    <>
      <div className="block border border-border bg-surface p-4 hover:border-primary/50 transition-colors group relative">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowDelete(true)
          }}
          className="absolute top-2 right-2 p-2 border border-border bg-bg hover:border-red-500 hover:text-red-500 text-text-muted transition-colors z-10 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Delete board"
        >
          <Trash2 className="w-3 h-3" />
        </button>

        <Link to={`/board/${board.id}`} className="block">
          <div className="flex items-start justify-between mb-3 pr-8">
            <div>
              <h3 className="font-bold text-primary group-hover:text-primary-dim transition-colors text-sm">
                [{board.name}]
              </h3>
              {board.description && (
                <p className="text-xs text-text-muted mt-0.5">// {board.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 border border-border bg-bg text-xs">
              {visibilityIcon}
              <span className="text-xs uppercase text-text-muted">{board.visibility}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="border border-border bg-bg p-2">
              <div className="flex items-center gap-1 text-text-muted mb-1">
                <Hash className="w-3 h-3" />
                <span className="text-[10px] uppercase">habits</span>
              </div>
              <p className="text-lg font-bold text-primary">{stats?.habit_count ?? 0}</p>
            </div>

            <div className="border border-border bg-bg p-2">
              <div className="flex items-center gap-1 text-text-muted mb-1">
                <Flame className="w-3 h-3" />
                <span className="text-[10px] uppercase">streak</span>
              </div>
              <p className="text-lg font-bold text-primary">{stats?.current_streak ?? 0}d</p>
            </div>

            <div className="border border-border bg-bg p-2">
              <div className="flex items-center gap-1 text-text-muted mb-1">
                <Activity className="w-3 h-3" />
                <span className="text-[10px] uppercase">entries</span>
              </div>
              <p className="text-lg font-bold text-primary">{stats?.total_entries ?? 0}</p>
            </div>
          </div>

          {/* Activity indicator */}
          <div className="flex items-center justify-between text-xs text-text-muted border-t border-border pt-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 ${isActive ? 'bg-primary animate-pulse' : 'bg-text-dim'}`}
              />
              <span>{isActive ? 'active today' : `last: ${formatRelativeDate(stats?.last_entry_date)}`}</span>
            </div>
            <div className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">
              <span>&gt; open</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </Link>
      </div>

      {showDelete && (
        <ConfirmModal
          title="DELETE_BOARD"
          message={`Confirm deletion of board [${board.name}] and all associated habits and entries. This action cannot be undone.`}
          confirmLabel="DELETE"
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
