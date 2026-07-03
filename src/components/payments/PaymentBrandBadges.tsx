import type { ReactNode } from 'react'

type LogoConfig = {
  src: string
  alt: string
  rounded?: boolean
  darkTile?: boolean
  /** Zoom into padded logo assets */
  imgScale?: number
  /** How much of the tile height the logo fills (default 78) */
  fillPct?: number
}

export const PAYMENT_LOGOS = {
  mpesa: { src: '/payment/mpesa_logo.png', alt: 'M-Pesa', rounded: true, fillPct: 88 },
  mixx: { src: '/payment/mixx_yas_logo.jpg', alt: 'Mixx by Yas', imgScale: 1.65, fillPct: 78 },
  airtel: { src: '/payment/airtel_money_logo.png', alt: 'Airtel Money', imgScale: 1.85, fillPct: 78 },
  halo: { src: '/payment/halo_pesa_logo_white.png', alt: 'Halopesa', imgScale: 1.15, fillPct: 74 },
  visa: { src: '/payment/visa-logo.jpg', alt: 'Visa', imgScale: 1.15, fillPct: 72 },
  mastercard: { src: '/payment/master_card_logo.svg', alt: 'Mastercard', fillPct: 72 },
} as const satisfies Record<string, LogoConfig>

const MOBILE_MONEY_KEYS = ['mpesa', 'mixx', 'airtel', 'halo'] as const
const CARD_KEYS = ['visa', 'mastercard'] as const

type LogoKey = keyof typeof PAYMENT_LOGOS
type BadgeVariant = 'default' | 'compact'

function logoConfig(key: LogoKey): LogoConfig {
  return PAYMENT_LOGOS[key]
}

function PaymentLogo({
  logoKey,
  className = 'h-full w-full',
  imgClassName = '',
  imgScale = 1,
  fillPct = 72,
}: {
  logoKey: LogoKey
  className?: string
  imgClassName?: string
  imgScale?: number
  fillPct?: number
}) {
  const { src, alt } = PAYMENT_LOGOS[logoKey]
  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ height: `${fillPct}%`, width: `${fillPct}%` }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={imgScale !== 1 ? { transform: `scale(${imgScale})` } : undefined}
        className={`max-h-full max-w-full object-contain ${imgClassName}`}
      />
    </div>
  )
}

function LogoTile({
  logoKey,
  variant = 'default',
}: {
  logoKey: LogoKey
  variant?: BadgeVariant
}) {
  const logo = logoConfig(logoKey)
  const rounded = logo.rounded === true
  const darkTile = logo.darkTile === true
  const fillPct = logo.fillPct ?? 72
  const imgScale = (logo.imgScale ?? 1) * (variant === 'compact' ? 0.9 : 1)

  const heightClass = variant === 'compact' ? 'h-8' : 'h-10'

  return (
    <div
      className={`flex w-full items-center justify-center overflow-hidden border shadow-sm ${heightClass} ${
        rounded ? 'rounded-xl border-slate-200/80 bg-white p-0' : 'rounded-lg px-1.5 py-0.5'
      } ${
        darkTile ? 'border-slate-800 bg-black' : 'border-slate-200/80 bg-white'
      }`}
    >
      <PaymentLogo
        logoKey={logoKey}
        className="h-full w-full"
        imgScale={imgScale}
        fillPct={fillPct}
        imgClassName={rounded ? 'h-full w-full object-cover' : 'object-contain'}
      />
    </div>
  )
}

export function MobileMoneyBadges({ variant = 'default' }: { variant?: BadgeVariant }) {
  const gridClass =
    variant === 'compact'
      ? 'grid grid-cols-2 gap-1.5 w-full'
      : 'grid grid-cols-2 gap-2 sm:grid-cols-4 w-full max-w-md mx-auto'

  return (
    <div className={gridClass} aria-label="Supported mobile money networks">
      {MOBILE_MONEY_KEYS.map((key) => (
        <LogoTile key={key} logoKey={key} variant={variant} />
      ))}
    </div>
  )
}

export function CardBrandLogos({ variant = 'default' }: { variant?: BadgeVariant }) {
  const layoutClass =
    variant === 'compact'
      ? 'grid grid-cols-2 gap-1.5 w-full'
      : 'flex items-center justify-center gap-2 w-full max-w-xs mx-auto'

  return (
    <div className={layoutClass} aria-label="Supported card networks">
      {CARD_KEYS.map((key) => (
        <LogoTile key={key} logoKey={key} variant={variant} />
      ))}
    </div>
  )
}

export function PaymentMethodOption({
  title,
  children,
  onClick,
}: {
  title: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col items-stretch gap-2.5 rounded-xl border border-slate-200 px-2.5 py-3.5 text-left transition-colors hover:border-terra-400 hover:bg-terra-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra-500/40"
    >
      <span className="text-center text-sm font-semibold text-slate-900">{title}</span>
      <div className="min-w-0 w-full">{children}</div>
    </button>
  )
}

export function CardBrandOption({
  brand,
  selected,
  onSelect,
  label,
}: {
  brand: 'visa' | 'mastercard'
  selected: boolean
  onSelect: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      className={`flex items-center justify-center rounded-xl border p-3 transition-colors ${
        selected ? 'border-terra-500 bg-terra-50 ring-1 ring-terra-500/30' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex h-12 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200/80 bg-white px-2 shadow-sm">
        <PaymentLogo
          logoKey={brand}
          className="h-full w-full"
          imgScale={brand === 'visa' ? 1.1 : 1}
          fillPct={72}
          imgClassName="object-contain"
        />
      </div>
    </button>
  )
}
