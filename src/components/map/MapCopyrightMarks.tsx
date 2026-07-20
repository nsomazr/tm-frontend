import { useEffect, useRef } from 'react'
import type Map from 'ol/Map'
import Overlay from 'ol/Overlay'
import { fromLonLat } from 'ol/proj'
import Logo from '../brand/Logo'
import { useTranslation } from '../../i18n/LocaleContext'
import type { CountryFocus } from '../../types'

type Bounds = CountryFocus['bounds']

type Props = {
  map: Map | null
  bounds: Bounds
}

/**
 * Terra Meta branding anchored to the SW of the mapped country extent.
 */
export default function MapCopyrightMarks({ map, bounds }: Props) {
  const { m } = useTranslation()
  const swRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!map || !swRef.current) return

    const padLng = Math.max(0.05, (bounds.east - bounds.west) * 0.02)
    const padLat = Math.max(0.05, (bounds.north - bounds.south) * 0.02)

    const sw = new Overlay({
      element: swRef.current,
      positioning: 'bottom-left',
      offset: [8, -8],
      stopEvent: false,
      insertFirst: false,
    })

    map.addOverlay(sw)
    sw.setPosition(fromLonLat([bounds.west + padLng, bounds.south + padLat]))

    return () => {
      map.removeOverlay(sw)
    }
  }, [map, bounds.west, bounds.south, bounds.east, bounds.north])

  return (
    <>
      <div
        ref={swRef}
        className="pointer-events-none flex select-none flex-col items-start gap-1.5 opacity-90 drop-shadow-md"
        aria-hidden
      >
        <Logo variant="wordmark" className="h-10 w-auto sm:h-11 md:h-12" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700/90 dark:text-slate-200/90 sm:text-[11px] md:text-xs">
          {m.map.mapBrandCredit}
        </p>
      </div>
      <span className="sr-only">© Terra Meta · {m.map.mapBrandCredit}</span>
    </>
  )
}
