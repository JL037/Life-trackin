import { useState } from 'react'
import { api } from '../lib/api'
import type { Habit } from '../types'
import { X, CheckCircle, Hash, Clock } from 'lucide-react'

interface Props {
  boardId: string
  onClose: () => void
  onCreated: (habit: Habit) => void
}

export function CreateHabitModal({ boardId, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'binary' | 'quantitative' | 'timed'>('binary')
  const [targetValue, setTargetValue] = useState(1)
  const [unit, setUnit] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const result = await api.habits.create(boardId, {
        name: name.trim(),
        description: description.trim(),
        type,
        target_value: targetValue,
        unit: unit.trim(),
      })
      onCreated({ id: result.id, name, description, type, target_value: targetValue, unit, board_id: boardId, position: 0, archived: false, frequency: {}, config: {}, created_at: '', updated_at: '' } as Habit)
    } catch (err) {
      console.error('Failed to create habit:', err)
    } finally {
      setLoading(false)
    }
  }

  const typeOptions: { value: typeof type; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'binary', label: 'Binary', icon: <CheckCircle className="w-4 h-4" />, desc: 'Done / Not done' },
    { value: 'quantitative', label: 'Numeric', icon: <Hash className="w-4 h-4" />, desc: 'Count or amount' },
    { value: 'timed', label: 'Duration', icon: <Clock className="w-4 h-4" />, desc: 'Time spent' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg dark:bg-bg-dark rounded-2xl border border-border dark:border-border-dark shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text dark:text-text-dark">Add New Habit</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface dark:hover:bg-surface-dark transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Run, Read 30 Pages"
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`flex flex-col items-center gap-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                    type === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border dark:border-border-dark text-text-muted hover:border-primary/50'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                  <span className="text-[10px] opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {type !== 'binary' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">
                  Target {type === 'timed' ? '(minutes)' : ''}
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={type === 'quantitative' ? 'glasses, pages' : 'min'}
                  className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this habit"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Add Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
