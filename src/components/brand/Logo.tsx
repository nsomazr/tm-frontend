type LogoVariant = 'wordmark' | 'icon'

interface LogoProps {
  variant?: LogoVariant
  className?: string
}

const LOGO_SRC: Record<LogoVariant, string> = {
  wordmark: '/logo-word.png',
  icon: '/terrameta-logo-icon.png',
}

const DEFAULT_CLASS: Record<LogoVariant, string> = {
  wordmark: 'h-11 w-auto',
  icon: 'h-10 w-10',
}

export default function Logo({ variant = 'wordmark', className }: LogoProps) {
  return (
    <img
      src={LOGO_SRC[variant]}
      alt="Terra Meta"
      className={`${className ?? DEFAULT_CLASS[variant]} object-contain shrink-0`}
    />
  )
}
