import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Entry, Habit } from '../types'
import { X, CheckCircle } from 'lucide-react'

interface Props {
  entry: Entry
  habit: Habit
  onClose: () => void
  onUpdated: (entry: Entry) => void
}

export function EditEntryModal({ entry, habit, onClose, onUpdated }: Props) {
  const [date, setDate] = useState(entry.date)
  const [valueBool, setValueBool] = useState(entry.value_bool ?? true)
  const [valueNumeric, setValueNumeric] = useState<number | ''>(entry.value_numeric ?? '')
  const [valueDuration, setValueDuration] = useState(entry.value_duration || '')
  const [notes, setNotes] = useState(entry.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data: Record<string, unknown> = { date, notes }
    if (habit.type === 'binary') {
      data.value_bool = valueBool
    } else if (habit.type === 'quantitative') {
      data.value_numeric = valueNumeric === '' ? 0 : Number(valueNumeric)
    } else if (habit.type === 'timed') {
      data.value_duration = valueDuration || '00:00:00'
    }

    try {
      await api.entries.update(entry.id, data)
      onUpdated({
        ...entry,
        date,
        value_bool: habit.type === 'binary' ? valueBool : entry.value_bool,
        value_numeric: habit.type === 'quantitative' ? (valueNumeric === '' ? 0 : Number(valueNumeric)) : entry.value_numeric,
        value_duration: habit.type === 'timed' ? (valueDuration || '00:00:00') : entry.value_duration,
        notes,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed to update entry'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-bg border border-border max-w-md w-full p-5 font-mono">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <h2 className="text-sm font-bold text-primary">[EDIT_ENTRY]</h2>
          <button onClick={onClose} className="p-1 hover:border-primary border border-transparent transition-colors">
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/5 p-2 mb-3 text-xs text-red-500">
            <span className="text-red">&gt; ERROR:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5">DATE</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-surface text-text focus:outline-none focus:border-primary text-base"
            />
          </div>

          {habit.type === 'binary' && (
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5">STATUS</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setValueBool(true)}
                  className={`flex items-center justify-center gap-2 py-3 border font-medium transition-all ${
                    valueBool
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:border-primary/50'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => setValueBool(false)}
                  className={`flex items-center justify-center gap-2 py-3 border font-medium transition-all ${
                    !valueBool
                      ? 'border-red-500 bg-red-500/10 text-red-500'
                      : 'border-border text-text-muted hover:border-red-500/50'
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
              <label className="block text-xs font-bold text-text-muted mb-1.5">
                VALUE {habit.unit && `(${habit.unit})`}
              </label>
              <input
                type="number"
                value={valueNumeric}
                onChange={(e) => setValueNumeric(e.target.value === '' ? '' : Number(e.target.value))}
                min={0}
                step="0.1"
                className="w-full px-3 py-2 border border-border bg-surface text-text focus:outline-none focus:border-primary text-base"
              />
            </div>
          )}

          {habit.type === 'timed' && (
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5">
                DURATION (HH:MM:SS)
              </label>
              <input
                type="text"
                value={valueDuration}
                onChange={(e) => setValueDuration(e.target.value)}
                placeholder="00:30:00"
                className="w-full px-3 py-2 border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-primary text-base"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5">NOTES</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-primary resize-none text-base"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full border border-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-primary font-medium py-2 transition-colors"
            >
              {loading ? 'SAVING...' : 'SAVE_ENTRY'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
