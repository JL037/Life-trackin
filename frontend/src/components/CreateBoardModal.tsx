import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import type { Board } from '../types'
import { useToast } from '../context/ToastContext'
import { X, Lock, Globe, Users } from 'lucide-react'

interface Props {
  onClose: () => void
  onCreated: (board: Board) => void
}

export function CreateBoardModal({ onClose, onCreated }: Props) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'followers' | 'public'>('private')
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
      const result = await api.boards.create({
        name: name.trim(),
        description: description.trim(),
        visibility,
      })
      onCreated({ id: result.id, name, description, visibility, user_id: '', position: 0, color_scheme: null as any, created_at: '', updated_at: '' } as Board)
    } catch (err) {
      if (err instanceof ApiError && err.validationFields) {
        setFieldErrors(err.validationFields)
      } else if (err instanceof ApiError && err.status === 429) {
        addToast('Rate limit exceeded. Please slow down.', 'warning')
      } else {
        const message = err instanceof Error ? err.message : 'failed to create board'
        setGeneralError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const getFieldError = (field: string): string | undefined => {
    return fieldErrors[field]?.[0]
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-bg border border-border max-w-md w-full p-5 font-mono">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <h2 className="text-sm font-bold text-primary">[CREATE_BOARD]</h2>
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
              placeholder="e.g., Fitness, Reading, Coding"
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
            <label className="block text-xs font-bold text-text-muted mb-1.5">DESCRIPTION</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do you want to track?"
              rows={2}
              className={`w-full px-3 py-2 border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:border-primary resize-none text-base ${
                getFieldError('description') ? 'border-red-500' : 'border-border'
              }`}
            />
            {getFieldError('description') && (
              <p className="text-[10px] text-red-500 mt-1">&gt; {getFieldError('description')}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5">VISIBILITY</label>
            <div className="grid grid-cols-3 gap-2">
              {(['private', 'followers', 'public'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex flex-col items-center gap-1 py-2 px-3 border text-xs font-medium transition-all ${
                    visibility === v
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:border-primary/50'
                  }`}
                >
                  {v === 'private' && <Lock className="w-4 h-4" />}
                  {v === 'followers' && <Users className="w-4 h-4" />}
                  {v === 'public' && <Globe className="w-4 h-4" />}
                  <span className="capitalize">{v}</span>
                </button>
              ))}
            </div>
            {getFieldError('visibility') && (
              <p className="text-[10px] text-red-500 mt-1">&gt; {getFieldError('visibility')}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full border border-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-primary font-medium py-2 transition-colors"
            >
              {loading ? 'CREATING...' : 'CREATE BOARD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
