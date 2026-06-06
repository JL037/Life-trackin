import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Board } from '../types'
import { Heatmap } from './Heatmap'
import { ConfirmModal } from './ConfirmModal'
import { ArrowRight, Lock, Globe, Users, Trash2 } from 'lucide-react'

interface Props {
  board: Board
  onDeleted?: (id: string) => void
}

export function BoardCard({ board, onDeleted }: Props) {
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)

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

  return (
    <>
      <div className="block border border-border bg-surface p-3 hover:border-primary/50 transition-colors group relative">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowDelete(true)
          }}
          className="absolute top-2 right-2 p-1.5 border border-border bg-bg hover:border-red-500 hover:text-red-500 text-text-muted transition-colors opacity-0 group-hover:opacity-100 z-10"
          title="Delete board"
        >
          <Trash2 className="w-3 h-3" />
        </button>

        <Link to={`/board/${board.id}`} className="block">
          <div className="flex items-start justify-between mb-2 pr-8">
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

          <Heatmap boardId={board.id} compact year={new Date().getFullYear()} />

          <div className="mt-2 flex items-center gap-1 text-xs text-primary group-hover:gap-2 transition-all">
            <span>&gt; open_board</span>
            <ArrowRight className="w-3 h-3" />
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
