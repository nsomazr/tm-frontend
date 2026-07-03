import type { ReactNode } from 'react'

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center h-7 px-2 rounded-md text-[10px] font-bold tracking-wide shadow-sm ${className}`}
    >
      {children}
    </span>
  )
}

export function MobileMoneyBadges() {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Supported mobile money networks">
      <Badge className="bg-[#4CAF50] text-white">M-PESA</Badge>
      <Badge className="bg-[#00377B] text-white">Tigo Pesa</Badge>
      <Badge className="bg-[#ED1C24] text-white">Airtel Money</Badge>
      <Badge className="bg-[#F58220] text-white">Halopesa</Badge>
    </div>
  )
}

function MastercardIcon() {
  return (
    <svg viewBox="0 0 38 24" className="h-6 w-9" aria-hidden>
      <circle cx="14" cy="12" r="8" fill="#EB001B" />
      <circle cx="24" cy="12" r="8" fill="#F79E1B" fillOpacity="0.95" />
    </svg>
  )
}

function VisaIcon() {
  return (
    <svg viewBox="0 0 48 16" className="h-5 w-12" aria-hidden>
      <text
        x="0"
        y="13"
        fill="#1A1F71"
        fontSize="14"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="-0.5"
      >
        VISA
      </text>
    </svg>
  )
}

export function CardBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2" aria-label="Supported card networks">
      <span className="inline-flex items-center h-8 px-2.5 rounded-md bg-white border border-slate-200 shadow-sm">
        <VisaIcon />
      </span>
      <span className="inline-flex items-center h-8 px-2.5 rounded-md bg-white border border-slate-200 shadow-sm">
        <MastercardIcon />
      </span>
    </div>
  )
}
