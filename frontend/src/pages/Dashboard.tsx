import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Board } from '../types'
import { BoardCard } from '../components/BoardCard'
import { CreateBoardModal } from '../components/CreateBoardModal'
import { Plus, LayoutDashboard } from 'lucide-react'

export function Dashboard() {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    api.boards.list()
      .then((data: Board[]) => {
        setBoards(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleCreated = (board: Board) => {
    setBoards(prev => [...prev, board])
    setShowCreate(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6" />
            Your Boards
          </h1>
          <p className="text-text-muted mt-1">Track habits, goals, and daily routines</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Board
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-16 bg-surface dark:bg-surface-dark rounded-2xl border border-dashed border-border dark:border-border-dark">
          <LayoutDashboard className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text dark:text-text-dark mb-2">No boards yet</h3>
          <p className="text-text-muted mb-4">Create your first board to start tracking habits</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-primary hover:bg-primary-light text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Create Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBoardModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
