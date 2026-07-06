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

type ConfirmOptions = {
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel?: () => void
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

function confirm(title: string, options: ConfirmOptions) {
  const toastId = sonner.warning(title, {
    description: options.description,
    duration: 15000,
    action: {
      label: options.confirmLabel ?? 'Confirm',
      onClick: () => {
        sonner.dismiss(toastId)
        options.onConfirm()
      },
    },
    cancel: {
      label: options.cancelLabel ?? 'Cancel',
      onClick: () => options.onCancel?.(),
    },
    classNames: options.destructive
      ? {
          actionButton:
            '!rounded-lg !bg-red-600 !text-white !font-medium hover:!bg-red-700 !border-0',
        }
      : undefined,
  })
  return toastId
}

export const toast = {
  success: (title: string, options?: ToastOptions) => show('success', title, options),
  error: (title: string, options?: ToastOptions) => show('error', title, options),
  info: (title: string, options?: ToastOptions) => show('info', title, options),
  warning: (title: string, options?: ToastOptions) => show('warning', title, options),
  confirm,
  loading: (title: string) => sonner.loading(title),
  dismiss: (id?: string | number) => sonner.dismiss(id),
}
