import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { User, Board } from '../types'
import { ArrowLeft, User as UserIcon, Globe, Lock, Hash, Flame, Activity } from 'lucide-react'

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return 'never'
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

interface PublicBoard extends Board {
  stats?: {
    habit_count: number
    current_streak: number
    total_entries: number
    last_entry_date?: string
  }
}

export function PublicProfile() {
  const { handle } = useParams<{ handle: string }>()
  const [user, setUser] = useState<User | null>(null)
  const [boards, setBoards] = useState<PublicBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!handle) return

    Promise.all([
      api.public.user(handle),
      api.public.boards(handle),
    ])
      .then(([userData, boardsData]) => {
        setUser(userData as User)
        setBoards(boardsData as PublicBoard[])

        // Fetch stats for each board
        const boardList = boardsData as PublicBoard[]
        boardList.forEach((board) => {
          api.public.boardStats(board.id)
            .then((stats) => {
              setBoards(prev =>
                prev.map(b => b.id === board.id ? { ...b, stats: stats as PublicBoard['stats'] } : b)
              )
            })
            .catch(console.error)
        })
      })
      .catch((err) => {
        setError(err.message || 'user not found')
      })
      .finally(() => setLoading(false))
  }, [handle])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 font-mono">
        <div className="text-text-muted text-sm animate-pulse">&gt; loading profile...</div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="text-center py-16 font-mono">
        <h2 className="text-xl font-bold text-red mb-2">[ERROR: {error?.toUpperCase() || 'NOT FOUND'}]</h2>
        <Link to="/dashboard" className="text-primary hover:text-primary-dim border-b border-primary">
          &lt;&lt; RETURN TO DASHBOARD
        </Link>
      </div>
    )
  }

  return (
    <div className="font-mono max-w-3xl mx-auto">
      <div className="mb-6 border-b border-border pb-3">
        <Link to="/dashboard" className="text-xs text-text-muted hover:text-primary flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" />
          &lt;&lt; DASHBOARD
        </Link>
      </div>

      {/* Profile Header */}
      <div className="border border-border bg-surface p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 border border-primary/30 bg-bg flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-primary">
                {user.display_name || `@${user.handle}`}
              </h1>
              <span className="text-xs text-text-muted">@{user.handle}</span>
            </div>

            {user.bio && (
              <p className="text-sm text-text-muted mb-2">{user.bio}</p>
            )}

            {user.goals && (
              <div className="border border-border bg-bg p-2 mb-2">
                <span className="text-[10px] text-primary uppercase">Goals</span>
                <p className="text-xs text-text-muted mt-0.5">{user.goals}</p>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span>joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {boards.length} public boards
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Public Boards */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-primary mb-4">[PUBLIC_BOARDS]</h2>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border bg-surface">
          <p className="text-text-muted text-sm">[NO PUBLIC BOARDS]</p>
          <p className="text-xs text-text-muted mt-1">This user has no public boards yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {boards.map(board => {
            const isActive = board.stats?.last_entry_date && formatRelativeDate(board.stats.last_entry_date) === 'today'
            return (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className="block border border-border bg-surface p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-primary text-sm">[{board.name}]</h3>
                    {board.description && (
                      <p className="text-xs text-text-muted mt-0.5">// {board.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 border border-border bg-bg text-xs">
                    <Globe className="w-3 h-3" />
                    <span className="text-xs uppercase text-text-muted">public</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-border bg-bg p-2">
                    <div className="flex items-center gap-1 text-text-muted mb-1">
                      <Hash className="w-3 h-3" />
                      <span className="text-[10px] uppercase">habits</span>
                    </div>
                    <p className="text-lg font-bold text-primary">{board.stats?.habit_count ?? 0}</p>
                  </div>

                  <div className="border border-border bg-bg p-2">
                    <div className="flex items-center gap-1 text-text-muted mb-1">
                      <Flame className="w-3 h-3" />
                      <span className="text-[10px] uppercase">streak</span>
                    </div>
                    <p className="text-lg font-bold text-primary">{board.stats?.current_streak ?? 0}d</p>
                  </div>

                  <div className="border border-border bg-bg p-2">
                    <div className="flex items-center gap-1 text-text-muted mb-1">
                      <Activity className="w-3 h-3" />
                      <span className="text-[10px] uppercase">entries</span>
                    </div>
                    <p className="text-lg font-bold text-primary">{board.stats?.total_entries ?? 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-3 text-xs text-text-muted border-t border-border pt-2">
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary animate-pulse' : 'bg-text-dim'}`} />
                  <span>{isActive ? 'active today' : `last: ${formatRelativeDate(board.stats?.last_entry_date)}`}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
