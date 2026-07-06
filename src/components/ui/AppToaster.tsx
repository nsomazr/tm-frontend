import { Toaster } from 'sonner'
import { useTheme } from '../../theme/ThemeContext'

export default function AppToaster() {
  const { theme } = useTheme()

  return (
    <Toaster
      theme={theme === 'dark' ? 'dark' : 'light'}
      position="top-right"
      richColors
      closeButton
      expand
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            'group !rounded-xl !border !shadow-lg !font-sans !text-sm !bg-app-surface !text-app-text !border-app-border',
          title: '!font-semibold !text-app-text',
          description: '!text-app-text-secondary !text-sm',
          actionButton:
            '!rounded-lg !bg-terra-600 !text-white !font-medium hover:!bg-terra-700 !border-0',
          cancelButton: '!rounded-lg !border-app-border',
          closeButton:
            '!border-app-border !bg-app-surface !text-app-text-muted hover:!bg-app-subtle',
        },
      }}
    />
  )
}
