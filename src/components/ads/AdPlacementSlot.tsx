import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { adsApi } from '../../api'
import { usePlacementAds } from '../../hooks/usePlacementAds'
import type { AdPlacement, PublicAd } from '../../types'

const SLIDE_INTERVAL_MS = 6000

interface AdPlacementSlotProps {
  placement: AdPlacement
  countryCode?: string
  className?: string
  compact?: boolean
}

function AdSlideContent({ ad, compact }: { ad: PublicAd; compact: boolean }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(ad.image_url) && !imageFailed

  return (
    <>
      {showImage ? (
        <img
          src={ad.image_url}
          alt=""
          onError={() => setImageFailed(true)}
          className={`rounded-lg object-cover shrink-0 ${compact ? 'h-12 w-12' : 'h-16 w-16'}`}
        />
      ) : (
        <div
          className={`rounded-lg bg-terra-500/12 text-terra-700 dark:text-terra-300 flex items-center justify-center font-semibold shrink-0 ${
            compact ? 'h-12 w-12 text-xs' : 'h-16 w-16 text-sm'
          }`}
        >
          {ad.company_name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted">
          Sponsored · {ad.company_name}
        </p>
        <p className={`font-semibold text-app-text ${compact ? 'text-sm' : 'text-base'} truncate`}>
          {ad.headline || ad.title}
        </p>
        {!compact && ad.body_text && (
          <p className="text-xs text-app-text-muted mt-1 line-clamp-2 leading-relaxed">{ad.body_text}</p>
        )}
        <span className="inline-flex mt-2 text-xs font-semibold text-terra-700 dark:text-terra-300">
          {ad.cta_label} →
        </span>
      </div>
    </>
  )
}

export default function AdPlacementSlot({
  placement,
  countryCode = 'TZ',
  className = '',
  compact = false,
}: AdPlacementSlotProps) {
  const { data: ads = [] } = usePlacementAds(placement, countryCode)
  const [activeIndex, setActiveIndex] = useState(0)
  const tracked = useRef<Set<number>>(new Set())

  const slideCount = ads.length
  const ad = slideCount > 0 ? ads[activeIndex % slideCount] : null

  useEffect(() => {
    setActiveIndex(0)
  }, [slideCount, placement, countryCode])

  useEffect(() => {
    if (slideCount <= 1) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount)
    }, SLIDE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [slideCount])

  const trackImpression = useCallback(
    (campaign: PublicAd) => {
      if (tracked.current.has(campaign.id)) return
      tracked.current.add(campaign.id)
      adsApi.track({ ad_id: campaign.id, kind: 'impression', placement }).catch(() => {})
    },
    [placement],
  )

  useEffect(() => {
    if (ad) trackImpression(ad)
  }, [ad, trackImpression])

  if (!ad) return null

  const handleClick = () => {
    adsApi.track({ ad_id: ad.id, kind: 'click', placement }).catch(() => {})
  }

  const goToSlide = (index: number, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setActiveIndex(index)
  }

  return (
    <div className={`relative ${className}`}>
      <a
        href={ad.link_url}
        target={ad.open_in_new_tab ? '_blank' : undefined}
        rel={ad.open_in_new_tab ? 'noopener noreferrer sponsored' : 'sponsored'}
        onClick={handleClick}
        className="flex w-full gap-3 rounded-xl border border-app-border bg-app-surface/95 p-3 shadow-sm transition-colors hover:border-terra-500/35 hover:bg-terra-500/5 map-chrome"
      >
        <AdSlideContent ad={ad} compact={compact} />
      </a>

      {slideCount > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-label="Campaign slides">
          {ads.map((campaign, index) => (
            <button
              key={campaign.id}
              type="button"
              aria-label={`Show campaign ${index + 1} of ${slideCount}`}
              aria-current={index === activeIndex % slideCount}
              onClick={(event) => goToSlide(index, event)}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex % slideCount
                  ? 'w-4 bg-terra-600 dark:bg-terra-400'
                  : 'w-1.5 bg-app-border hover:bg-terra-500/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
