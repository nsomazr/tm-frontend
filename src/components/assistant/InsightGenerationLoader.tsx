import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { TerraAssistantAvatar } from './AssistantIcons'

type LoaderVariant = 'insight' | 'terrain' | 'thinking'

interface InsightGenerationLoaderProps {
  variant?: LoaderVariant
  compact?: boolean
  mobileSheet?: boolean
}

/** Pace early steps quickly; keep the final "drafting" phase moving slowly until the API returns. */
const STEP_INTERVAL_MS = 1600
const PROGRESS_TICK_MS = 220
const SOFT_CAP = 88
const HARD_CAP = 97
const LONG_WAIT_MS = 12_000

export default function InsightGenerationLoader({
  variant = 'insight',
  compact = false,
  mobileSheet = false,
}: InsightGenerationLoaderProps) {
  const { m } = useTranslation()
  const ta = m.assistant
  const avatarClass = mobileSheet ? 'h-6 w-6' : 'h-7 w-7'

  // Normal chat replies: simple thinking indicator (no multi-step progress).
  if (variant === 'thinking') {
    return (
      <div
        className={`flex gap-2.5 justify-start items-center ${compact ? 'py-1' : 'py-1.5'}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <TerraAssistantAvatar className={`shrink-0 ${avatarClass}`} />
        <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-app-surface px-3 py-2 text-sm map-text-muted shadow-sm">
          <span className="insight-gen-loader__pulse shrink-0" aria-hidden />
          <span>{ta.thinking}</span>
        </div>
      </div>
    )
  }

  return (
    <MapInsightProgressLoader
      variant={variant}
      compact={compact}
      mobileSheet={mobileSheet}
      avatarClass={avatarClass}
    />
  )
}

function MapInsightProgressLoader({
  variant,
  compact,
  mobileSheet,
  avatarClass,
}: {
  variant: 'insight' | 'terrain'
  compact: boolean
  mobileSheet: boolean
  avatarClass: string
}) {
  const { m } = useTranslation()
  const ta = m.assistant

  const steps = useMemo(() => {
    if (variant === 'terrain') return [...ta.terrainInsightSteps]
    return [...ta.insightSteps]
  }, [ta.insightSteps, ta.terrainInsightSteps, variant])

  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(8)
  const [longWait, setLongWait] = useState(false)

  useEffect(() => {
    setStepIndex(0)
    setProgress(8)
    setLongWait(false)
  }, [variant, steps.length])

  useEffect(() => {
    if (steps.length <= 1) return
    const id = window.setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
    }, STEP_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [steps.length])

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= HARD_CAP) return prev
        const target = prev < SOFT_CAP ? SOFT_CAP : HARD_CAP
        const remaining = target - prev
        const rate = prev < SOFT_CAP ? 0.07 : 0.018
        const bump = Math.max(prev < SOFT_CAP ? 0.55 : 0.12, remaining * rate)
        return Math.min(HARD_CAP, prev + bump)
      })
    }, PROGRESS_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => setLongWait(true), LONG_WAIT_MS)
    return () => window.clearTimeout(id)
  }, [variant])

  const pct = Math.min(100, Math.max(0, Math.round(progress)))
  const onFinalStep = stepIndex >= steps.length - 1
  const hint =
    longWait && onFinalStep
      ? ta.insightLoadingHintLong || ta.insightLoadingHint
      : ta.insightLoadingHint

  return (
    <div
      className={`flex gap-2.5 justify-start ${compact ? 'py-1' : 'py-1.5'}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <TerraAssistantAvatar className={`shrink-0 mt-0.5 ${avatarClass}`} />
      <div className="insight-gen-loader max-w-[min(92%,22rem)] sm:max-w-[85%]">
        <div className="insight-gen-loader__header">
          <span className="insight-gen-loader__pulse" aria-hidden />
          <span className="insight-gen-loader__title">{ta.generating}</span>
          <span className="insight-gen-loader__pct">{pct}%</span>
        </div>

        <div className="insight-gen-loader__track" aria-hidden>
          <div className="insight-gen-loader__bar" style={{ width: `${pct}%` }} />
        </div>

        <ul className="insight-gen-loader__steps">
          {steps.map((label, i) => {
            const done = i < stepIndex
            const active = i === stepIndex
            return (
              <li
                key={`${label}-${i}`}
                className={`insight-gen-loader__step ${
                  done ? 'is-done' : active ? 'is-active' : 'is-pending'
                }`}
              >
                <span className="insight-gen-loader__marker" aria-hidden>
                  {done ? (
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : active ? (
                    <span className="insight-gen-loader__dot" />
                  ) : (
                    <span className="insight-gen-loader__idle" />
                  )}
                </span>
                <span className="insight-gen-loader__label">{label}</span>
              </li>
            )
          })}
        </ul>

        <p className="insight-gen-loader__hint">{hint}</p>
      </div>
    </div>
  )
}
