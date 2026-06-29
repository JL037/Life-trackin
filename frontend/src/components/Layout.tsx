import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { LogOut, User, Wifi, WifiOff, Users, Activity } from 'lucide-react'

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const online = useNetworkStatus()

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen flex flex-col font-mono">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 text-primary hover:text-primary-dim transition-colors min-h-[44px] min-w-[44px]">
              <span className="text-primary font-bold">&gt;_</span>
              <span className="font-bold text-lg tracking-wider">LIFETRACK</span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <Link
                to="/feed"
                className={`flex items-center gap-1.5 px-2 py-1 border text-xs transition-colors min-h-[44px] ${
                  isActive('/feed')
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-bg hover:border-primary text-text-muted'
                }`}
                title="Activity Feed"
              >
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">FEED</span>
              </Link>
              <Link
                to="/following"
                className={`flex items-center gap-1.5 px-2 py-1 border text-xs transition-colors min-h-[44px] ${
                  isActive('/following')
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-bg hover:border-primary text-text-muted'
                }`}
                title="Following"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">SOCIAL</span>
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 px-2 py-1 border border-border bg-bg hover:border-primary transition-colors min-h-[44px]"
              >
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">@{user.handle}</span>
              </Link>
              <button
                onClick={() => { logout(); navigate('/login') }}
                className="p-2 border border-border hover:border-primary hover:text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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

      <footer className="border-t border-border py-2 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-text-muted font-mono">
          <div className="flex items-center gap-3">
            <span>[LIFETRACK v1.0]</span>
            <span className="text-text-dim">//</span>
            <span>AT PROTOCOL</span>
            <span className="text-text-dim">//</span>
            <span>PDS: CONNECTED</span>
          </div>
          <div className="flex items-center gap-1.5">
            {online ? (
              <>
                <Wifi className="w-3 h-3 text-primary" />
                <span className="text-primary">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-red-500" />
                <span className="text-red-500">OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
