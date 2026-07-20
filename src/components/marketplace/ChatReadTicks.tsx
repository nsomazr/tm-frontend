interface ChatReadTicksProps {
  read: boolean
  className?: string
}

export default function ChatReadTicks({ read, className = '' }: ChatReadTicksProps) {
  if (read) {
    return (
      <span className={`inline-flex shrink-0 ${className}`} title="Read" aria-label="Read">
        <svg viewBox="0 0 16 11" className="h-3.5 w-4" fill="none" aria-hidden>
          <path
            d="M1 6.5 3.5 9 7.5 4.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 6.5 7.5 9 13.5 2.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }

  return (
    <span className={`inline-flex shrink-0 ${className}`} title="Delivered" aria-label="Delivered">
      <svg viewBox="0 0 12 11" className="h-3.5 w-3.5" fill="none" aria-hidden>
        <path
          d="M1 6 3.5 8.5 8 3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
