import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Activity, ArrowRight } from 'lucide-react'

export function Login() {
  const [handle, setHandle] = useState('')
  const { login } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (handle.trim()) {
      login(handle.trim())
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark mb-2">LifeTrack</h1>
          <p className="text-text-muted">
            GitHub-style life tracking powered by AT Protocol
          </p>
        </div>

        <div className="bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">
                Your AT Protocol Handle
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="handle.bsky.social"
                  className="w-full px-4 py-2.5 rounded-lg border border-border dark:border-border-dark bg-bg dark:bg-bg-dark text-text dark:text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  autoFocus
                />
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                Enter your Bluesky handle to sign in with AT Protocol
              </p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              Sign In with AT Protocol
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border dark:border-border-dark">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Activity className="w-3.5 h-3.5" />
              <span>Your data is stored on your personal data server (PDS)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
