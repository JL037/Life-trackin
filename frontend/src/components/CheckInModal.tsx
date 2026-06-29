import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { Habit } from '../types'
import { X, CheckCircle2, Zap } from 'lucide-react'

interface Props {
  habit: Habit
  onClose: () => void
  onSubmit: () => void
}

export function CheckInModal({ habit, onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleQuickCheckIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.entries.create(habit.id, {
        date: new Date().toISOString().split('T')[0],
        value_bool: true,
      })
      onSubmit()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'check-in failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-bg border border-border max-w-sm w-full p-5 font-mono">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <h2 className="text-sm font-bold text-primary">[QUICK_CHECKIN]</h2>
          <button
            onClick={onClose}
            className="p-1 hover:border-primary border border-transparent transition-colors"
          >
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        <div className="text-center mb-4">
          <div className="w-16 h-16 border border-primary/30 bg-bg flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-base font-bold text-primary mb-1">
            {habit.name}
          </h3>
          <p className="text-xs text-text-muted">
            Did you complete this habit today?
          </p>
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/5 p-2 mb-3 text-xs text-red-500">
            <span className="text-red">&gt; ERROR:</span> {error}
          </div>
        )}

        <button
          onClick={handleQuickCheckIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 border border-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 text-primary font-medium py-2 transition-colors mb-2"
        >
          <Zap className="w-4 h-4" />
          {loading ? 'SAVING...' : 'YES, I DID IT'}
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 text-xs text-text-muted hover:text-primary transition-colors border border-transparent hover:border-border"
        >
          NOT YET
        </button>
      </div>
    </div>
  )
}
