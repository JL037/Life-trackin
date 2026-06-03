import { useState } from 'react'
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

  const handleQuickCheckIn = async () => {
    setLoading(true)
    try {
      await api.entries.create(habit.id, {
        date: new Date().toISOString().split('T')[0],
        value_bool: true,
      })
      onSubmit()
    } catch (err) {
      console.error('Check-in failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg dark:bg-bg-dark rounded-2xl border border-border dark:border-border-dark shadow-xl max-w-sm w-full p-6 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors"
        >
          <X className="w-5 h-5 text-text-muted" />
        </button>

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-xl font-semibold text-text dark:text-text-dark mb-2">
          {habit.name}
        </h2>
        <p className="text-text-muted mb-6">
          Did you complete this habit today?
        </p>

        <button
          onClick={handleQuickCheckIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-light disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors mb-3"
        >
          <Zap className="w-5 h-5" />
          {loading ? 'Saving...' : 'Yes, I did it!'}
        </button>

        <button
          onClick={onClose}
          className="w-full py-2.5 text-text-muted hover:text-text dark:hover:text-text-dark transition-colors"
        >
          Not yet
        </button>
      </div>
    </div>
  )
}
