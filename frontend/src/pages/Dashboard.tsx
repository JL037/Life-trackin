import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Board } from '../types'
import { BoardCard } from '../components/BoardCard'
import { CreateBoardModal } from '../components/CreateBoardModal'
import { Plus } from 'lucide-react'

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
      <div className="flex items-center justify-center h-64 font-mono">
        <div className="text-text-muted text-sm animate-pulse">&gt; loading boards...</div>
      </div>
    )
  }

  return (
    <div className="font-mono">
      <div className="flex items-center justify-between mb-6 border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-bold text-primary tracking-wider">
            [BOARDS]
          </h1>
          <p className="text-text-muted text-xs mt-1">track habits // goals // routines</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 border border-primary bg-primary/10 hover:bg-primary/20 text-primary py-1.5 px-3 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          NEW_BOARD
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border bg-surface">
          <h3 className="text-lg font-bold text-primary mb-2">[NO DATA]</h3>
          <p className="text-text-muted mb-4 text-sm">Initialize first board to begin tracking</p>
          <button
            onClick={() => setShowCreate(true)}
            className="border border-primary bg-primary/10 hover:bg-primary/20 text-primary py-2 px-4 transition-colors text-sm"
          >
            INIT_BOARD
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
