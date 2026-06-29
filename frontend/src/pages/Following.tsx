import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { FollowsResponse, FollowsUser } from '../types'
import { TerminalSkeleton } from '../components/TerminalSkeleton'
import { ArrowLeft, User as UserIcon, Users } from 'lucide-react'

type TabType = 'following' | 'followers'

export function Following() {
  const [activeTab, setActiveTab] = useState<TabType>('following')
  const [data, setData] = useState<FollowsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useDocumentTitle('[SOCIAL_NETWORK]')

  useEffect(() => {
    setLoading(true)
    api.follows.list(activeTab)
      .then((res: FollowsResponse) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeTab])

  return (
    <div className="font-mono max-w-2xl mx-auto">
      <div className="mb-6 border-b border-border pb-3">
        <Link to="/dashboard" className="text-xs text-text-muted hover:text-primary flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3 h-3" />
          &lt;&lt; DASHBOARD
        </Link>
        <h1 className="text-xl font-bold text-primary">[SOCIAL_NETWORK]</h1>
        <p className="text-text-muted text-xs mt-1">// manage connections</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {(['following', 'followers'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 border py-2 px-4 text-sm transition-colors min-h-[44px] uppercase ${
              activeTab === tab
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-muted hover:border-primary/50'
            }`}
          >
            <Users className="w-4 h-4" />
            {tab} ({data?.count ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <TerminalSkeleton lines={4} />
      ) : data?.users.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border bg-surface">
          <p className="text-text-muted text-sm">
            [{activeTab === 'following' ? 'NO_FOLLOWING' : 'NO_FOLLOWERS'}]
          </p>
          <p className="text-xs text-text-muted mt-1">
            {activeTab === 'following'
              ? 'Follow users to see their public activity in your feed.'
              : 'No one is following you yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.users.map((user: FollowsUser) => (
            <Link
              key={user.id}
              to={`/user/${user.handle}`}
              className="flex items-center gap-3 border border-border bg-surface p-3 hover:border-primary/50 transition-colors"
            >
              <div className="w-10 h-10 border border-primary/30 bg-bg flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-primary">
                  {user.display_name || `@${user.handle}`}
                </h3>
                <p className="text-xs text-text-muted">@{user.handle}</p>
              </div>
              <div className="text-[10px] text-text-dim">
                {new Date(user.followed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
