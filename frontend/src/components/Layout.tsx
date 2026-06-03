import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LayoutDashboard, LogOut, User } from 'lucide-react'

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-lg text-text dark:text-text-dark">LifeTrack</span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark">
                <User className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text dark:text-text-dark">@{user.handle}</span>
              </div>
              <button
                onClick={() => { logout(); navigate('/login') }}
                className="p-2 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-border dark:border-border-dark py-4 text-center text-sm text-text-muted">
        LifeTrack - Powered by AT Protocol
      </footer>
    </div>
  )
}
