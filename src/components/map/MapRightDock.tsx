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
    <aside className="absolute top-3 right-3 z-10 w-64 flex flex-col gap-2 pointer-events-none max-h-[calc(100%-4rem)] overflow-y-auto">
      <div className="pointer-events-auto shrink-0 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <BasemapSwitcher value={basemap} onChange={onBasemapChange} embedded current={current} />
      </div>
      <div className="pointer-events-auto shrink-0 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <LegendPanel layers={layers} embedded />
      </div>
    </aside>
  )
}
