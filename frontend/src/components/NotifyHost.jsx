import { useNotifyStore } from '../stores/notifyStore'
import { XCircle, CheckCircle2, Info } from 'lucide-react'
import '../styles/notify.css'

const ICONS = {
  error: XCircle,
  success: CheckCircle2,
  info: Info,
}

export default function NotifyHost() {
  const toasts = useNotifyStore(s => s.toasts)
  const dialog = useNotifyStore(s => s.dialog)
  const closeDialog = useNotifyStore(s => s.closeDialog)

  return (
    <>
      <div className="notify-stack" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`notify-toast ${t.type}`} role="alert">
            <span className="notify-toast-icon">{(() => { const Icon = ICONS[t.type] || ICONS.info; return <Icon size={16} /> })()}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {dialog && (
        <div className="notify-velo" onClick={(e) => e.target === e.currentTarget && closeDialog()}>
          <div className="notify-dialog" role="dialog" aria-modal="true">
            <div className={`notify-dialog-icon ${dialog.type}`}>
              {(() => { const Icon = ICONS[dialog.type] || ICONS.info; return <Icon size={48} /> })()}
            </div>
            <h2>{dialog.title}</h2>
            {dialog.message && <p>{dialog.message}</p>}
            {dialog.lines?.length > 0 && (
              <div className="notify-dialog-lines">
                {dialog.lines.map((line) => (
                  <div key={line.label}>
                    <span>{line.label}</span>
                    <strong>{line.value}</strong>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className={`notify-dialog-btn ${dialog.type}`}
              onClick={closeDialog}
            >
              {dialog.buttonLabel || 'Entendido'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
