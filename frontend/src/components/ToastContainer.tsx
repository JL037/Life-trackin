import { useToast } from '../context/ToastContext'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'

const toastStyles = {
  success: {
    border: 'border-primary',
    text: 'text-primary',
    bg: 'bg-primary/5',
    icon: CheckCircle,
  },
  error: {
    border: 'border-red-500',
    text: 'text-red-500',
    bg: 'bg-red-500/5',
    icon: AlertCircle,
  },
  warning: {
    border: 'border-amber',
    text: 'text-amber',
    bg: 'bg-amber/5',
    icon: AlertTriangle,
  },
  info: {
    border: 'border-primary/50',
    text: 'text-primary',
    bg: 'bg-primary/5',
    icon: Info,
  },
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const style = toastStyles[toast.type]
        const Icon = style.icon
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto border ${style.border} ${style.bg} p-3 font-mono text-xs flex items-start gap-2 animate-in slide-in-from-right duration-200`}
            role="alert"
          >
            <Icon className={`w-4 h-4 ${style.text} flex-shrink-0 mt-0.5`} />
            <span className={`flex-1 ${style.text}`}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className={`${style.text} hover:opacity-70 transition-opacity flex-shrink-0`}
              aria-label="Dismiss toast"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
