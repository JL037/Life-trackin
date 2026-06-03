import { useState } from 'react'
import { api } from '../lib/api'
import type { Habit } from '../types'
import { X, CheckCircle } from 'lucide-react'
import { getToday } from '../lib/utils'

interface Props {
  habit: Habit
  onClose: () => void
  onSubmit: () => void
}

export function EntryForm({ habit, onClose, onSubmit }: Props) {
  const [date, setDate] = useState(getToday())
  const [valueBool, setValueBool] = useState(true)
  const [valueNumeric, setValueNumeric] = useState<number | ''>('')
  const [valueDuration, setValueDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const data: Record<string, unknown> = { date, notes }
    if (habit.type === 'binary') {
      data.value_bool = valueBool
    } else if (habit.type === 'quantitative') {
      data.value_numeric = valueNumeric === '' ? 0 : Number(valueNumeric)
    } else if (habit.type === 'timed') {
      data.value_duration = valueDuration || '00:00:00'
    }

    try {
      await api.entries.create(habit.id, data)
      onSubmit()
    } catch (err) {
      console.error('Failed to create entry:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg dark:bg-bg-dark rounded-2xl border border-border dark:border-border-dark shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text dark:text-text-dark">Log Entry</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {habit.type === 'binary' && (
            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setValueBool(true)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg border font-medium transition-all ${
                    valueBool
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border dark:border-border-dark text-text-muted hover:border-primary/50'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => setValueBool(false)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg border font-medium transition-all ${
                    !valueBool
                      ? 'border-red-500 bg-red-50 text-red-600'
                      : 'border-border dark:border-border-dark text-text-muted hover:border-red-300'
                  }`}
                >
                  <X className="w-4 h-4" />
                  Missed
                </button>
              </div>
            </div>
          )}

          {habit.type === 'quantitative' && (
            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">
                Value {habit.unit && `(${habit.unit})`}
              </label>
              <input
                type="number"
                value={valueNumeric}
                onChange={(e) => setValueNumeric(e.target.value === '' ? '' : Number(e.target.value))}
                min={0}
                step="0.1"
                placeholder={`Target: ${habit.target_value}`}
                className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                autoFocus
              />
            </div>
          )}

          {habit.type === 'timed' && (
            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">
                Duration (HH:MM:SS)
              </label>
              <input
                type="text"
                value={valueDuration}
                onChange={(e) => setValueDuration(e.target.value)}
                placeholder="00:30:00"
                className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                autoFocus
              />
              <p className="text-xs text-text-muted mt-1">Target: {habit.target_value} minutes</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Saving...' : 'Log Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
