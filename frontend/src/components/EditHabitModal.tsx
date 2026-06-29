import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Habit } from '../types'
import { X, CheckCircle, Hash, Clock } from 'lucide-react'

interface Props {
  habit: Habit
  onClose: () => void
  onUpdated: (habit: Habit) => void
}

export function EditHabitModal({ habit, onClose, onUpdated }: Props) {
  const [name, setName] = useState(habit.name)
  const [description, setDescription] = useState(habit.description || '')
  const [targetValue, setTargetValue] = useState(habit.target_value)
  const [unit, setUnit] = useState(habit.unit)
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
    if (!name.trim()) return

    setLoading(true)
    setError(null)
    try {
      await api.habits.update(habit.id, {
        name: name.trim(),
        description: description.trim() || null,
        target_value: targetValue,
        unit: unit.trim(),
      })
      onUpdated({
        ...habit,
        name: name.trim(),
        description: description.trim(),
        target_value: targetValue,
        unit: unit.trim(),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed to update habit'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const typeLabel = {
    binary: 'Binary',
    quantitative: 'Numeric',
    timed: 'Duration',
  }[habit.type]

  const TypeIcon = {
    binary: CheckCircle,
    quantitative: Hash,
    timed: Clock,
  }[habit.type]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-bg border border-border max-w-md w-full p-5 font-mono">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <h2 className="text-sm font-bold text-primary">[EDIT_HABIT]</h2>
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
            <label className="block text-xs font-bold text-text-muted mb-1.5">NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border bg-surface text-text focus:outline-none focus:border-primary text-base"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5">DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-primary resize-none text-base"
            />
          </div>

          <div className="border border-border bg-surface p-3">
            <div className="text-xs text-text-muted mb-2">TYPE (READ-ONLY)</div>
            <div className="flex items-center gap-2 text-primary text-sm">
              <TypeIcon className="w-4 h-4" />
              <span>{typeLabel}</span>
            </div>
            <p className="text-[10px] text-text-muted mt-1">// Type cannot be changed after creation</p>
          </div>

          {habit.type !== 'binary' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  TARGET {habit.type === 'timed' ? '(MINUTES)' : ''}
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 border border-border bg-surface text-text focus:outline-none focus:border-primary text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">UNIT</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={habit.type === 'quantitative' ? 'glasses, pages' : 'min'}
                  className="w-full px-3 py-2 border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-primary text-base"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full border border-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-primary font-medium py-2 transition-colors"
            >
              {loading ? 'SAVING...' : 'SAVE_HABIT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
