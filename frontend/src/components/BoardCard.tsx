import { Link } from 'react-router-dom'
import type { Board } from '../types'
import { Heatmap } from './Heatmap'
import { ArrowRight, Lock, Globe, Users } from 'lucide-react'

interface Props {
  board: Board
}

export function BoardCard({ board }: Props) {
  const visibilityIcon = {
    private: <Lock className="w-3 h-3" />,
    followers: <Users className="w-3 h-3" />,
    public: <Globe className="w-3 h-3" />,
  }[board.visibility]

  return (
    <Link
      to={`/board/${board.id}`}
      className="block border border-border bg-surface p-3 hover:border-primary/50 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
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
  )
}
