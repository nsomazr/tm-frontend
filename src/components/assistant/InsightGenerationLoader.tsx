import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { TerraAssistantAvatar } from './AssistantIcons'

type LoaderVariant = 'insight' | 'terrain' | 'thinking'

interface InsightGenerationLoaderProps {
  variant?: LoaderVariant
  compact?: boolean
  mobileSheet?: boolean
}

const STEP_INTERVAL_MS = 2200
const PROGRESS_TICK_MS = 180
const MAX_PROGRESS = 92

export default function InsightGenerationLoader({
  variant = 'insight',
  compact = false,
  mobileSheet = false,
}: InsightGenerationLoaderProps) {
  const { m } = useTranslation()
  const ta = m.assistant

  const steps = useMemo(() => {
    if (variant === 'thinking') return [...ta.thinkingSteps]
    if (variant === 'terrain') return [...ta.terrainInsightSteps]
    return [...ta.insightSteps]
  }, [ta.insightSteps, ta.terrainInsightSteps, ta.thinkingSteps, variant])

  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(6)

  useEffect(() => {
    setStepIndex(0)
    setProgress(6)
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
        if (prev >= MAX_PROGRESS) return prev
        const remaining = MAX_PROGRESS - prev
        const bump = Math.max(0.4, remaining * 0.045)
        return Math.min(MAX_PROGRESS, prev + bump)
      })
    }, PROGRESS_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  const pct = Math.min(100, Math.max(0, Math.round(progress)))
  const avatarClass = mobileSheet ? 'h-6 w-6' : 'h-7 w-7'

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
          <span className="insight-gen-loader__title">
            {variant === 'thinking' ? ta.thinking : ta.generating}
          </span>
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

        <p className="insight-gen-loader__hint">{ta.insightLoadingHint}</p>
      </div>
    </div>
  )
}
