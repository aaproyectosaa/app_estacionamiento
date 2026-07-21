import { useNotifyStore } from '../stores/notifyStore'

export function notify(message, type = 'info') {
  useNotifyStore.getState().toast(message, type)
}

export function notifyError(message) {
  notify(message, 'error')
}

export function notifySuccess(message) {
  notify(message, 'success')
}

export function showDialog({ title, message, lines, type = 'info', buttonLabel = 'Entendido' }) {
  return new Promise((resolve) => {
    useNotifyStore.getState().showDialog({
      title,
      message,
      lines,
      type,
      buttonLabel,
      onClose: resolve,
    })
  })
}
