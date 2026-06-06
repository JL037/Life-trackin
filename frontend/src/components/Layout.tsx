import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, User } from 'lucide-react'

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col font-mono">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 text-primary hover:text-primary-dim transition-colors">
              <span className="text-primary font-bold">&gt;_</span>
              <span className="font-bold text-lg tracking-wider">LIFETRACK</span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 px-2 py-1 border border-border bg-bg hover:border-primary transition-colors"
              >
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">@{user.handle}</span>
              </Link>
              <button
                onClick={() => { logout(); navigate('/login') }}
                className="p-2 border border-border hover:border-primary hover:text-primary transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-primary" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-border py-2 text-center text-xs text-text-muted font-mono">
        [LIFETRACK v1.0] // AT PROTOCOL // PDS CONNECTED
      </footer>
    </div>
  )
}
