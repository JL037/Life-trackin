import { useState } from 'react'
import { api } from '../lib/api'
import type { Board } from '../types'
import { X, Lock, Globe, Users } from 'lucide-react'

interface Props {
  onClose: () => void
  onCreated: (board: Board) => void
}

export function CreateBoardModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'followers' | 'public'>('private')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const result = await api.boards.create({
        name: name.trim(),
        description: description.trim(),
        visibility,
      })
      onCreated({ id: result.id, name, description, visibility, user_id: '', position: 0, color_scheme: null as any, created_at: '', updated_at: '' } as Board)
    } catch (err) {
      console.error('Failed to create board:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg dark:bg-bg-dark rounded-2xl border border-border dark:border-border-dark shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text dark:text-text-dark">Create New Board</h2>
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
              placeholder="e.g., Fitness, Reading, Coding"
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do you want to track?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border dark:border-border-dark bg-surface dark:bg-surface-dark text-text dark:text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-1.5">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {(['private', 'followers', 'public'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                    visibility === v
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border dark:border-border-dark text-text-muted hover:border-primary/50'
                  }`}
                >
                  {v === 'private' && <Lock className="w-4 h-4" />}
                  {v === 'followers' && <Users className="w-4 h-4" />}
                  {v === 'public' && <Globe className="w-4 h-4" />}
                  <span className="capitalize">{v}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
