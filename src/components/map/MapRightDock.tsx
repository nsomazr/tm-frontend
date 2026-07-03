import type { MapLayer } from '../../types'
import type { BasemapId } from './basemaps'
import { BASEMAPS } from './basemaps'
import BasemapSwitcher from './BasemapSwitcher'
import LegendPanel from './LegendPanel'

interface MapRightDockProps {
  basemap: BasemapId
  onBasemapChange: (id: BasemapId) => void
  layers: MapLayer[]
}

export default function MapRightDock({ basemap, onBasemapChange, layers }: MapRightDockProps) {
  const current = BASEMAPS.find((b) => b.id === basemap) ?? BASEMAPS[0]

  return (
    <aside className="absolute z-10 flex-col gap-2 pointer-events-none max-h-[calc(100%-4rem)] overflow-y-auto
      top-3 right-3 w-64 hidden md:flex">
      <div className="pointer-events-auto shrink-0 map-chrome rounded-xl overflow-hidden">
        <BasemapSwitcher value={basemap} onChange={onBasemapChange} embedded current={current} />
      </div>
      <div className="pointer-events-auto shrink-0 map-chrome rounded-xl overflow-hidden">
        <LegendPanel layers={layers} embedded defaultOpen />
      </div>
    </aside>
  )
}
