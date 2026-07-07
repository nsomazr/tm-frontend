export type ConfirmRequest = {
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  destructive: boolean
  onConfirm: () => void
  onCancel?: () => void
}

type Listener = (request: ConfirmRequest | null) => void

const listeners = new Set<Listener>()
let active: ConfirmRequest | null = null

export function subscribeConfirm(listener: Listener) {
  listeners.add(listener)
  listener(active)
  return () => {
    listeners.delete(listener)
  }
}

export function showConfirm(request: ConfirmRequest) {
  active = request
  listeners.forEach((listener) => listener(active))
}

export function closeConfirm() {
  active = null
  listeners.forEach((listener) => listener(null))
}
