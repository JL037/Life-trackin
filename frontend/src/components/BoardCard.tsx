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
      className="block bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4 hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-text dark:text-text-dark group-hover:text-primary transition-colors">
            {board.name}
          </h3>
          {board.description && (
            <p className="text-sm text-text-muted mt-0.5">{board.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg dark:bg-bg-dark border border-border dark:border-border-dark">
          {visibilityIcon}
          <span className="text-xs capitalize text-text-muted">{board.visibility}</span>
        </div>
      </div>

      <Heatmap boardId={board.id} compact year={new Date().getFullYear()} />

      <div className="mt-3 flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
        <span>View board</span>
        <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  )
}
