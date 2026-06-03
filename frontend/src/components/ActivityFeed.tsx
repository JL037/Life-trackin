import { Activity } from 'lucide-react'

export function ActivityFeed() {
  return (
    <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-text-muted" />
        <h3 className="font-medium text-text dark:text-text-dark">Activity</h3>
      </div>
      <div className="text-center py-8 text-text-muted">
        <p>Activity feed coming soon</p>
        <p className="text-xs mt-1">Follow friends to see their progress</p>
      </div>
    </div>
  )
}
