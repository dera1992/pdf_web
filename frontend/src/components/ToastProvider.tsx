import { useEffect } from 'react'
import { useToastStore } from '../store/toastStore'

export const ToastProvider = () => {
  const { toasts, remove } = useToastStore()

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((toast) => setTimeout(() => remove(toast.id), 4000))
    return () => timers.forEach((timer) => clearTimeout(timer))
  }, [remove, toasts])

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-lg px-4 py-3 text-sm shadow-card ${
            toast.tone === 'error'
              ? 'bg-accent-600 text-white'
              : toast.tone === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-surface-900 text-white'
          }`}
        >
          <div className="font-semibold">{toast.title}</div>
          {toast.description && <div className="text-xs opacity-80">{toast.description}</div>}
        </div>
      ))}
    </div>
  )
}
