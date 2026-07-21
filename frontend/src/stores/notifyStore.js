import { create } from 'zustand'

let toastId = 0

export const useNotifyStore = create((set, get) => ({
  toasts: [],
  dialog: null,

  toast(message, type = 'info') {
    const id = ++toastId
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    }, 4200)
  },

  showDialog(dialog) {
    set({ dialog })
  },

  closeDialog() {
    const { dialog } = get()
    dialog?.onClose?.()
    set({ dialog: null })
  },
}))
