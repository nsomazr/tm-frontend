export type StepProgressItem = {
  id: number | string
  label: string
  short?: string
}

export type StepConnector = 'arrow' | 'or'

interface StepProgressProps<T extends number | string = number> {
  steps: StepProgressItem[]
  current: T
  /** Highest step the user may jump to (inclusive). Defaults to current. */
  maxReachable?: T
  /** Connector between steps. Length should be steps.length - 1. Defaults to arrows. */
  connectors?: StepConnector[]
  onStepClick?: (id: T) => void
  className?: string
  'aria-label'?: string
}

function stepOrder(steps: StepProgressItem[], id: number | string): number {
  return steps.findIndex((s) => s.id === id)
}

/** Build alternative groups from consecutive `or` connectors. */
function alternativeGroups(
  steps: StepProgressItem[],
  connectors: StepConnector[],
): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>()
  const ensure = (id: string) => {
    if (!groups.has(id)) groups.set(id, new Set([id]))
    return groups.get(id)!
  }

  for (let i = 0; i < connectors.length; i++) {
    if (connectors[i] !== 'or') continue
    const a = String(steps[i].id)
    const b = String(steps[i + 1].id)
    const merged = new Set([...ensure(a), ...ensure(b)])
    for (const id of merged) groups.set(id, merged)
  }
  return groups
}

export default function StepProgress<T extends number | string = number>({
  steps,
  current,
  maxReachable,
  connectors,
  onStepClick,
  className = '',
  'aria-label': ariaLabel = 'Progress',
}: StepProgressProps<T>) {
  const currentIdx = stepOrder(steps, current)
  const reachableIdx = stepOrder(steps, maxReachable ?? current)
  const resolvedConnectors: StepConnector[] =
    connectors ?? Array.from({ length: Math.max(0, steps.length - 1) }, () => 'arrow')
  const altGroups = alternativeGroups(steps, resolvedConnectors)
  const currentKey = String(current)
  const currentAltGroup = altGroups.get(currentKey)

  return (
    <nav className={className} aria-label={ariaLabel}>
      <ol className="flex items-start justify-between gap-1 sm:gap-2">
        {steps.map((item, index) => {
          const itemKey = String(item.id)
          const itemIdx = index
          const active = item.id === current
          const inCurrentAltGroup = currentAltGroup?.has(itemKey) ?? false
          // Alternative siblings are never "done" when another path is active.
          const done = itemIdx < currentIdx && !inCurrentAltGroup
          const reachable = itemIdx <= reachableIdx || inCurrentAltGroup
          const clickable = Boolean(onStepClick) && reachable && !active
          const connector = index < steps.length - 1 ? resolvedConnectors[index] ?? 'arrow' : null

          return (
            <li key={itemKey} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (clickable) onStepClick?.(item.id as T)
                  }}
                  disabled={!clickable && !active}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-terra-600 text-white shadow-sm ring-4 ring-terra-600/20'
                      : done
                        ? 'bg-terra-600 text-white hover:bg-terra-700'
                        : reachable
                          ? 'bg-app-subtle text-app-muted ring-1 ring-app-border hover:ring-terra-500/40'
                          : 'bg-app-subtle text-app-muted ring-1 ring-app-border opacity-70'
                  } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 011.414-1.414L8.5 11.586l6.543-6.543a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : typeof item.id === 'number' ? (
                    item.id
                  ) : (
                    itemIdx + 1
                  )}
                </button>
                <p
                  className={`mt-2 text-xs font-semibold sm:text-sm ${
                    active
                      ? 'text-terra-700 dark:text-terra-300'
                      : done
                        ? 'text-app-text'
                        : 'text-app-muted'
                  }`}
                >
                  {item.label}
                </p>
                {item.short ? (
                  <p className="mt-0.5 hidden text-[11px] leading-snug text-app-muted sm:block">
                    {item.short}
                  </p>
                ) : null}
              </div>
              {connector === 'or' ? (
                <div
                  className="mt-4 flex shrink-0 items-center px-1 sm:px-2"
                  aria-hidden
                >
                  <span className="rounded-full bg-app-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-app-muted ring-1 ring-app-border">
                    or
                  </span>
                </div>
              ) : connector === 'arrow' ? (
                <div
                  className={`mt-4 flex shrink-0 items-center px-1 sm:px-2 ${
                    done ? 'text-terra-600' : 'text-app-muted/50'
                  }`}
                  aria-hidden
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
