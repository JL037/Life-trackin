import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useToast } from '../context/ToastContext'
import type { FeedResponse, FeedItem } from '../types'
import { TerminalSkeleton } from '../components/TerminalSkeleton'
import { ArrowLeft, User as UserIcon, Activity, CheckCircle, Hash, Clock } from 'lucide-react'

export function Feed() {
  const { addToast } = useToast()
  const [feed, setFeed] = useState<FeedResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useDocumentTitle('[ACTIVITY_FEED]')

  useEffect(() => {
    api.feed.list()
      .then((res: FeedResponse) => setFeed(res))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 429) {
          addToast('Rate limit exceeded. Please slow down.', 'warning')
        }
        console.error(err)
      })
      .finally(() => setLoading(false))
  }, [addToast])

  const typeIcon = (item: FeedItem) => {
    if (item.value_numeric !== undefined) return <Hash className="w-3 h-3" />
    if (item.value_bool !== undefined) return <CheckCircle className="w-3 h-3" />
    return <Clock className="w-3 h-3" />
  }

  return (
    <div className="font-mono max-w-2xl mx-auto">
      <div className="mb-6 border-b border-border pb-3">
        <Link to="/dashboard" className="text-xs text-text-muted hover:text-primary flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" />
          &lt;&lt; DASHBOARD
        </Link>
        <h1 className="text-xl font-bold text-primary">[ACTIVITY_FEED]</h1>
        <p className="text-text-muted text-xs mt-1">// recent entries from followed users</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <TerminalSkeleton lines={3} />
          <TerminalSkeleton lines={3} />
          <TerminalSkeleton lines={3} />
        </div>
      ) : feed?.items.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border bg-surface">
          <Activity className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">[NO_ACTIVITY]</p>
          <p className="text-xs text-text-muted mt-1">
            Follow users with public boards to see their activity here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {feed?.items.map((item) => (
            <Link
              key={item.id}
              to={`/user/${item.handle}`}
              className="block border border-border bg-surface p-3 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 border border-primary/30 bg-bg flex items-center justify-center">
                  <UserIcon className="w-3 h-3 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-primary">
                    {item.display_name || `@${item.handle}`}
                  </span>
                  <span className="text-xs text-text-muted ml-1">@{item.handle}</span>
                </div>
                <span className="text-[10px] text-text-dim">
                  {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="border-l-2 border-primary/30 pl-3 ml-1">
                <p className="text-xs text-primary mb-1">
                  [{item.board_name}] &gt; {item.habit_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    {typeIcon(item)}
                    <span>
                      {item.value_bool !== undefined
                        ? (item.value_bool ? 'COMPLETED' : 'MISSED')
                        : item.value_numeric !== undefined
                          ? `${item.value_numeric}`
                          : 'LOGGED'}
                    </span>
                  </span>
                  {item.notes && (
                    <span className="text-text-dim">// {item.notes}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
