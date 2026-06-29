import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useState } from 'react'

export function Login() {
  const [handle, setHandle] = useState('')
  const { login } = useAuth()

  useDocumentTitle('[AUTHENTICATION]')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (handle.trim()) {
      login(handle.trim())
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-bg font-mono">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-primary font-mono text-xs mb-2 opacity-60">
            SYSTEM BOOT SEQUENCE...
          </div>
          <div className="border border-primary/30 bg-surface p-4">
            <pre className="text-primary text-xs leading-4 mb-2">
{`  _    _ _   _______ _      _____
 | |  | (_) |__   __(_)    |_   _|
 | |__| |_     | |   _ _ __   | |
 |  __  | |    | |  | | '_ \\  | |
 | |  | | |    | |  | | | | |_| |_
 |_|  |_|_|    |_|  |_|_| |_|_____|
`}
            </pre>
            <p className="text-text-muted text-xs tracking-widest">
              AT PROTOCOL LIFE TRACKING SYSTEM
            </p>
          </div>
        </div>

        <div className="border border-border bg-surface p-4">
          <div className="text-xs text-text-muted mb-3 border-b border-border pb-2">
            &gt; AUTHENTICATION REQUIRED
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-primary mb-1.5">
                AT PROTOCOL HANDLE:
              </label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="handle.bsky.social"
                className="w-full px-3 py-2 border border-border bg-bg text-primary placeholder:text-text-dim focus:outline-none focus:border-primary transition-colors font-mono text-base"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 border border-primary bg-primary/10 hover:bg-primary/20 text-primary font-mono py-2 px-4 transition-colors"
            >
              <span>CONNECT_VIA_ATPROTO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-border text-xs text-text-muted">
            <span className="text-primary">&gt;</span> DATA STORED ON PERSONAL DATA SERVER (PDS)
          </div>
        </div>
      </div>
    </div>
  )
}
