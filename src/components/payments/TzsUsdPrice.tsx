import { useState } from 'react'
import { formatUsd, tzsToUsd, useTzsUsdRate } from '../../hooks/useTzsUsdRate'

interface TzsUsdPriceProps {
  amountTzs: number
  showInUsdLabel: string
  hideUsdLabel: string
  approxUsdLabel: string
  liveRateHint: string
  rateUnavailable: string
  className?: string
  size?: 'sm' | 'md'
}

export default function TzsUsdPrice({
  amountTzs,
  showInUsdLabel,
  hideUsdLabel,
  approxUsdLabel,
  liveRateHint,
  rateUnavailable,
  className = '',
  size = 'md',
}: TzsUsdPriceProps) {
  const [showUsd, setShowUsd] = useState(false)
  const { data: rate, isLoading, isError } = useTzsUsdRate()

  if (amountTzs <= 0) return null

  const toggleClass =
    size === 'sm'
      ? 'text-xs text-terra-700 hover:text-terra-900 font-medium underline-offset-2 hover:underline'
      : 'text-sm text-terra-700 hover:text-terra-900 font-medium underline-offset-2 hover:underline'

  const usdTextClass = size === 'sm' ? 'text-xs text-slate-500 mt-1' : 'text-sm text-slate-500 mt-1.5'

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setShowUsd((v) => !v)}
        className={toggleClass}
        aria-expanded={showUsd}
      >
        {showUsd ? hideUsdLabel : showInUsdLabel}
      </button>
      {showUsd && (
        <div className={usdTextClass}>
          {isLoading && <span>{liveRateHint}</span>}
          {isError && !isLoading && <span>{rateUnavailable}</span>}
          {rate != null && !isLoading && (
            <>
              <span className="font-medium text-slate-700 tabular-nums">
                {approxUsdLabel.replace('{amount}', formatUsd(tzsToUsd(amountTzs, rate)))}
              </span>
              <span className="text-slate-400 ml-1.5">{liveRateHint}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
