import { useEffect, useRef } from 'react'
import type Map from 'ol/Map'
import Overlay from 'ol/Overlay'
import { fromLonLat } from 'ol/proj'
import Logo from '../brand/Logo'
import type { CountryFocus } from '../../types'

type Bounds = CountryFocus['bounds']

type Props = {
  map: Map | null
  bounds: Bounds
}

/**
 * Terra Meta copyright icons anchored to the SW and NE of the mapped country extent.
 */
export default function MapCopyrightMarks({ map, bounds }: Props) {
  const swRef = useRef<HTMLDivElement>(null)
  const neRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!map || !swRef.current || !neRef.current) return

    const padLng = Math.max(0.05, (bounds.east - bounds.west) * 0.02)
    const padLat = Math.max(0.05, (bounds.north - bounds.south) * 0.02)

    const sw = new Overlay({
      element: swRef.current,
      positioning: 'bottom-left',
      offset: [6, -6],
      stopEvent: false,
      insertFirst: false,
    })
    const ne = new Overlay({
      element: neRef.current,
      positioning: 'top-right',
      offset: [-6, 6],
      stopEvent: false,
      insertFirst: false,
    })

    map.addOverlay(sw)
    map.addOverlay(ne)
    sw.setPosition(fromLonLat([bounds.west + padLng, bounds.south + padLat]))
    ne.setPosition(fromLonLat([bounds.east - padLng, bounds.north - padLat]))

    return () => {
      map.removeOverlay(sw)
      map.removeOverlay(ne)
    }
  }, [map, bounds.west, bounds.south, bounds.east, bounds.north])

  const markClass =
    'pointer-events-none select-none opacity-[0.45] dark:opacity-[0.55] drop-shadow-md'

  const logoClass = 'h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24'

  return (
    <>
      <div ref={swRef} className={markClass} aria-hidden>
        <Logo variant="icon" className={logoClass} />
      </div>
      <div ref={neRef} className={markClass} aria-hidden>
        <Logo variant="icon" className={logoClass} />
      </div>
      <span className="sr-only">© Terra Meta</span>
    </>
  )
}
