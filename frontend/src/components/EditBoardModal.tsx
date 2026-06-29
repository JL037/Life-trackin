import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Board } from '../types'
import { X, Lock, Globe, Users } from 'lucide-react'

interface Props {
  board: Board
  onClose: () => void
  onUpdated: (board: Board) => void
}

const colorSchemes: { name: string; preview: string; value: any }[] = [
  {
    name: 'Phosphor Green',
    preview: 'bg-[#33ff33]',
    value: { empty: '#0a1a0a', levels: ['#0a1a0a', '#1a4a1a', '#2a8a2a', '#4aca4a', '#7aff7a'] },
  },
  {
    name: 'Amber',
    preview: 'bg-[#ffb000]',
    value: { empty: '#1a1200', levels: ['#1a1200', '#4a3500', '#8a6200', '#ca9a00', '#ffd700'] },
  },
  {
    name: 'Ice Blue',
    preview: 'bg-[#00ffff]',
    value: { empty: '#001a1a', levels: ['#001a1a', '#004a4a', '#008a8a', '#00caca', '#7affff'] },
  },
  {
    name: 'Paper White',
    preview: 'bg-[#eeeeee]',
    value: { empty: '#111111', levels: ['#111111', '#333333', '#555555', '#777777', '#eeeeee'] },
  },
  {
    name: 'Ruby Red',
    preview: 'bg-[#ff3333]',
    value: { empty: '#1a0a0a', levels: ['#1a0a0a', '#4a1a1a', '#8a2a2a', '#ca4a4a', '#ff7a7a'] },
  },
]

export function EditBoardModal({ board, onClose, onUpdated }: Props) {
  const [name, setName] = useState(board.name)
  const [description, setDescription] = useState(board.description || '')
  const [visibility, setVisibility] = useState<'private' | 'followers' | 'public'>(board.visibility)
  const [selectedColor, setSelectedColor] = useState(
    colorSchemes.findIndex(
      cs => JSON.stringify(cs.value) === JSON.stringify(board.color_scheme)
    ) !== -1
      ? colorSchemes.findIndex(cs => JSON.stringify(cs.value) === JSON.stringify(board.color_scheme))
      : 0
  )
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
      await api.boards.update(board.id, {
        name: name.trim(),
        description: description.trim() || null,
        visibility,
        color_scheme: colorSchemes[selectedColor].value,
      })
      onUpdated({
        ...board,
        name: name.trim(),
        description: description.trim(),
        visibility,
        color_scheme: colorSchemes[selectedColor].value,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'failed to update board'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-bg border border-border max-w-md w-full p-5 font-mono">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <h2 className="text-sm font-bold text-primary">[EDIT_BOARD]</h2>
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

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5">VISIBILITY</label>
            <div className="grid grid-cols-3 gap-2">
              {(['private', 'followers', 'public'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex items-center justify-center gap-2 py-2 px-3 border text-xs transition-colors ${
                    visibility === v
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:border-primary/50'
                  }`}
                >
                  {v === 'private' && <Lock className="w-3 h-3" />}
                  {v === 'followers' && <Users className="w-3 h-3" />}
                  {v === 'public' && <Globe className="w-3 h-3" />}
                  <span className="capitalize">{v}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted mb-1.5">COLOR_SCHEME</label>
            <div className="grid grid-cols-5 gap-2">
              {colorSchemes.map((cs, idx) => (
                <button
                  key={cs.name}
                  type="button"
                  onClick={() => setSelectedColor(idx)}
                  className={`flex flex-col items-center gap-1 py-2 px-1 border text-[10px] transition-colors ${
                    selectedColor === idx
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:border-primary/50'
                  }`}
                  title={cs.name}
                >
                  <div className={`w-4 h-4 ${cs.preview}`} />
                  <span>{cs.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full border border-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-primary font-medium py-2 transition-colors"
            >
              {loading ? 'SAVING...' : 'SAVE_BOARD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
