import { toast as sonner } from 'sonner'

export type ToastAction = {
  label: string
  onClick: () => void
}

type ToastOptions = {
  description?: string
  action?: ToastAction
  duration?: number
}

function show(
  kind: 'success' | 'error' | 'info' | 'warning',
  title: string,
  options?: ToastOptions
) {
  const payload = {
    description: options?.description,
    duration: options?.duration ?? (kind === 'error' ? 6500 : 5000),
    action: options?.action
      ? {
          label: options.action.label,
          onClick: options.action.onClick,
        }
      : undefined,
  }

  switch (kind) {
    case 'success':
      sonner.success(title, payload)
      break
    case 'error':
      sonner.error(title, payload)
      break
    case 'warning':
      sonner.warning(title, payload)
      break
    default:
      sonner.info(title, payload)
  }
}

export const toast = {
  success: (title: string, options?: ToastOptions) => show('success', title, options),
  error: (title: string, options?: ToastOptions) => show('error', title, options),
  info: (title: string, options?: ToastOptions) => show('info', title, options),
  warning: (title: string, options?: ToastOptions) => show('warning', title, options),
  loading: (title: string) => sonner.loading(title),
  dismiss: (id?: string | number) => sonner.dismiss(id),
}
