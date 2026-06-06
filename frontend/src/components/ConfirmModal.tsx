import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  danger = true,
  onConfirm,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg border border-border shadow-xl max-w-md w-full p-5 font-mono">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            {danger && <AlertTriangle className="w-4 h-4 text-red-500" />}
            <h2 className="text-sm font-bold text-primary">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:border-primary border border-transparent transition-colors">
            <X className="w-4 h-4 text-primary" />
          </button>
        </div>

        <p className="text-sm text-text-muted mb-6">{message}</p>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="border border-border hover:border-primary text-primary px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
              danger
                ? 'border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-500'
                : 'border-primary bg-primary/10 hover:bg-primary/20 text-primary'
            }`}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
