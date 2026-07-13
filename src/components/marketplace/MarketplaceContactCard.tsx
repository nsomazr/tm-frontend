import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

function MailIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
    </svg>
  )
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

interface MarketplaceContactCardProps {
  listingTitle: string
  loginNext: string
  signedIn: boolean
  replyEmail: string | null
  contactEmail: string
  onContactEmailChange: (value: string) => void
  message: string
  onMessageChange: (value: string) => void
  sent: boolean
  sending: boolean
  error: string | null
  onSubmit: () => void
}

const MIN_MESSAGE = 10

export default function MarketplaceContactCard({
  listingTitle,
  loginNext,
  signedIn,
  replyEmail,
  contactEmail,
  onContactEmailChange,
  message,
  onMessageChange,
  sent,
  sending,
  error,
  onSubmit,
}: MarketplaceContactCardProps) {
  const [touched, setTouched] = useState(false)
  const trimmed = message.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_MESSAGE
  const missing = touched && trimmed.length === 0
  const fieldError = missing
    ? 'Write a short message to the owner.'
    : tooShort
      ? `Add a bit more detail (${MIN_MESSAGE - trimmed.length} more characters).`
      : null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (trimmed.length < MIN_MESSAGE) return
    onSubmit()
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
      <div className="border-b app-divider bg-app-subtle/50 px-3.5 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-terra-500/10 text-terra-700 dark:text-terra-300">
            <MailIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-app-text">Contact owner</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-app-muted">
              Ask about <span className="font-medium text-app-text-secondary">{listingTitle}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-3.5 py-3.5">
        {!signedIn ? (
          <div className="rounded-xl border border-dashed border-app-border bg-app-bg/70 px-3 py-3 text-center">
            <p className="text-sm text-app-muted">Sign in to message the listing owner.</p>
            <Link to={loginNext} className="btn-primary mt-3 inline-flex text-sm">
              Sign in to inquire
            </Link>
          </div>
        ) : sent ? (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
              <CheckIcon />
            </span>
            <p className="mt-2.5 text-sm font-semibold text-app-text">Inquiry sent</p>
            <p className="mt-1 text-xs leading-relaxed text-app-muted">
              The owner will see it in their marketplace inbox
              {replyEmail ? (
                <>
                  . Replies go to <span className="font-medium text-app-text">{replyEmail}</span>
                </>
              ) : (
                '.'
              )}
            </p>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="space-y-3">
            {replyEmail ? (
              <div className="flex items-center gap-2 rounded-xl bg-app-subtle/70 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">Reply to</span>
                <span className="min-w-0 truncate text-xs font-medium text-app-text">{replyEmail}</span>
              </div>
            ) : (
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">Email</span>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => onContactEmailChange(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-1.5 w-full rounded-xl border border-app-border bg-app-bg px-3 py-2.5 text-sm text-app-text shadow-sm placeholder:text-app-muted/80 transition-[border-color,box-shadow] focus:border-terra-500 focus:outline-none focus:ring-2 focus:ring-terra-500/20"
                />
              </label>
            )}

            <label className="block">
              <div className="flex items-end justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">Message</span>
                <span className="text-[11px] tabular-nums text-app-muted">
                  {trimmed.length}/{MIN_MESSAGE}+
                </span>
              </div>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Introduce yourself and what you are looking for…"
                aria-invalid={!!fieldError}
                className={`mt-1.5 w-full resize-y rounded-xl border bg-app-bg px-3 py-2.5 text-sm leading-relaxed text-app-text shadow-sm placeholder:text-app-muted/80 transition-[border-color,box-shadow] focus:outline-none focus:ring-2 ${
                  fieldError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-app-border focus:border-terra-500 focus:ring-terra-500/20'
                }`}
              />
              {fieldError ? <p className="mt-1.5 text-xs text-red-600">{fieldError}</p> : null}
            </label>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button type="submit" className="btn-primary w-full text-sm" disabled={sending}>
              {sending ? 'Sending…' : 'Send inquiry'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
