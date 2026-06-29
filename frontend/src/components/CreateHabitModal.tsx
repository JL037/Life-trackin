import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { Habit } from '../types'
import { useToast } from '../context/ToastContext'
import { X, CheckCircle, Hash, Clock } from 'lucide-react'

interface Props {
  boardId: string
  onClose: () => void
  onCreated: (habit: Habit) => void
}

export function CreateHabitModal({ boardId, onClose, onCreated }: Props) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'binary' | 'quantitative' | 'timed'>('binary')
  const [targetValue, setTargetValue] = useState(1)
  const [unit, setUnit] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

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
    setFieldErrors({})
    setGeneralError(null)
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
      if (err instanceof ApiError && err.validationFields) {
        setFieldErrors(err.validationFields)
      } else if (err instanceof ApiError && err.status === 429) {
        addToast('Rate limit exceeded. Please slow down.', 'warning')
      } else {
        const message = err instanceof Error ? err.message : 'failed to create habit'
        setGeneralError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors[field]?.[0]
  }

  const typeOptions: { value: typeof type; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'binary', label: 'Binary', icon: <CheckCircle className="w-4 h-4" />, desc: 'Done / Not done' },
    { value: 'quantitative', label: 'Numeric', icon: <Hash className="w-4 h-4" />, desc: 'Count or amount' },
    { value: 'timed', label: 'Duration', icon: <Clock className="w-4 h-4" />, desc: 'Time spent' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-bg border border-border max-w-md w-full p-5 font-mono">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <h2 className="text-sm font-bold text-primary">[ADD_HABIT]</h2>
          <button onClick={onClose} className="p-1 hover:border-primary border border-transparent transition-colors">
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        {generalError && (
          <div className="border border-red-500/30 bg-red-500/5 p-2 mb-3 text-xs text-red-500">
            <span className="text-red">&gt; ERROR:</span> {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5">NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Run, Read 30 Pages"
              className={`w-full px-3 py-2 border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-primary text-base ${
                getFieldError('name') ? 'border-red-500' : 'border-border'
              }`}
              autoFocus
            />
            {getFieldError('name') && (
              <p className="text-[10px] text-red-500 mt-1">&gt; {getFieldError('name')}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5">TYPE</label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`flex flex-col items-center gap-1 py-2 px-2 border text-xs font-medium transition-all ${
                    type === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:border-primary/50'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                  <span className="text-[10px] opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
            {getFieldError('type') && (
              <p className="text-[10px] text-red-500 mt-1">&gt; {getFieldError('type')}</p>
            )}
          </div>

          {type !== 'binary' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  TARGET {type === 'timed' ? '(MINUTES)' : ''}
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  min={1}
                  className={`w-full px-3 py-2 border bg-surface text-text focus:outline-none focus:border-primary text-base ${
                    getFieldError('target_value') ? 'border-red-500' : 'border-border'
                  }`}
                />
                {getFieldError('target_value') && (
                  <p className="text-[10px] text-red-500 mt-1">&gt; {getFieldError('target_value')}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">UNIT</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={type === 'quantitative' ? 'glasses, pages' : 'min'}
                  className={`w-full px-3 py-2 border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-primary text-base ${
                    getFieldError('unit') ? 'border-red-500' : 'border-border'
                  }`}
                />
                {getFieldError('unit') && (
                  <p className="text-[10px] text-red-500 mt-1">&gt; {getFieldError('unit')}</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5">DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this habit"
              rows={2}
              className={`w-full px-3 py-2 border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-primary resize-none text-base ${
                getFieldError('description') ? 'border-red-500' : 'border-border'
              }`}
            />
            {getFieldError('description') && (
              <p className="text-[10px] text-red-500 mt-1">&gt; {getFieldError('description')}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full border border-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-primary font-medium py-2 transition-colors"
            >
              {loading ? 'CREATING...' : 'ADD HABIT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
