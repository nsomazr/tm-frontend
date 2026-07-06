import { useState } from 'react'
import {
  formatCoordinate,
  lonLatToCrs,
  type CoordinateSystemId,
} from './coordinateSystems'
import type { ExplorationMode } from './explorationGeometry'
import type { SavedExploration } from '../../types'

interface ExploreDrawToolProps {
  mode: ExplorationMode
  points: [number, number][]
  coordinateSystem: CoordinateSystemId
  canExplore: boolean
  canSave: boolean
  saving?: boolean
  savedExplorations?: SavedExploration[]
  onModeChange: (mode: ExplorationMode) => void
  onAddPoint: (lng: number, lat: number) => void
  onRemovePoint: (index: number) => void
  onClear: () => void
  onExplore: () => void
  onSave?: () => void
  onLoad?: (mode: ExplorationMode, points: [number, number][]) => void
  onDelete?: (id: number) => void
  onClose: () => void
  /** Render inside the unified search bar (no outer chrome / title). */
  embedded?: boolean
}

const MODES: { id: ExplorationMode; label: string; hint: string }[] = [
  { id: 'point', label: 'Point', hint: 'A single location.' },
  { id: 'line', label: 'Line', hint: 'A path / structure (2+ points).' },
  { id: 'polygon', label: 'Polygon', hint: 'An area (3+ points).' },
]

export default function ExploreDrawTool({
  mode,
  points,
  coordinateSystem,
  canExplore,
  canSave,
  saving = false,
  savedExplorations = [],
  onModeChange,
  onAddPoint,
  onRemovePoint,
  onClear,
  onExplore,
  onSave,
  onLoad,
  onDelete,
  onClose,
  embedded = false,
}: ExploreDrawToolProps) {
  const [fieldA, setFieldA] = useState('')
  const [fieldB, setFieldB] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const lat = parseFloat(fieldA)
    const lng = parseFloat(fieldB)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError('Enter valid latitude and longitude.')
      return
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Latitude must be between -90 and 90; longitude between -180 and 180.')
      return
    }
    onAddPoint(lng, lat)
    setFieldA('')
    setFieldB('')
    setError(null)
  }

  const body = (
    <>
      <div className={`flex items-center gap-2 ${embedded ? 'px-4 pt-3 pb-1' : 'px-4 py-3 border-b app-divider'}`}>
        {embedded ? (
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
            {MODES.map((mm) => (
              <button
                key={mm.id}
                type="button"
                onClick={() => onModeChange(mm.id)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  mode === mm.id
                    ? 'bg-gradient-to-b from-terra-600 to-terra-700 text-white shadow-sm'
                    : 'map-text-secondary hover:bg-app-subtle'
                }`}
              >
                {mm.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-sm font-semibold map-text">Explore area</span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-lg leading-none map-text-muted transition-colors hover:bg-app-subtle"
          aria-label="Close explore tool"
        >
          ×
        </button>
      </div>

      <div className="flex max-h-[min(52vh,440px)] flex-col gap-3 overflow-y-auto p-4 scrollbar-pane">
        {!embedded && (
          <div className="grid grid-cols-3 gap-1.5">
            {MODES.map((mm) => (
              <button
                key={mm.id}
                type="button"
                onClick={() => onModeChange(mm.id)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  mode === mm.id
                    ? 'bg-gradient-to-b from-terra-600 to-terra-700 text-white shadow'
                    : 'map-text-secondary hover:bg-app-subtle'
                }`}
              >
                {mm.label}
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] leading-snug map-text-muted">
          {MODES.find((mm) => mm.id === mode)?.hint} Click the map or enter WGS84 latitude/longitude below.
        </p>

        <div className="flex items-end gap-1.5">
          <label className="flex-1">
            <span className="block text-[10px] uppercase tracking-wide map-text-muted">Latitude</span>
            <input
              value={fieldA}
              onChange={(e) => setFieldA(e.target.value)}
              inputMode="decimal"
              placeholder="-6.17"
              className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm map-text"
            />
          </label>
          <label className="flex-1">
            <span className="block text-[10px] uppercase tracking-wide map-text-muted">Longitude</span>
            <input
              value={fieldB}
              onChange={(e) => setFieldB(e.target.value)}
              inputMode="decimal"
              placeholder="35.74"
              className="w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-sm map-text"
            />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            className="shrink-0 rounded-md bg-terra-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-terra-700"
          >
            Add
          </button>
        </div>
        {error && <p className="text-[11px] text-red-500">{error}</p>}

        {points.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-app-border/60 p-1.5 scrollbar-pane">
            {points.map(([lng, lat], i) => {
              const c = lonLatToCrs(lng, lat, coordinateSystem)
              return (
                <li key={i} className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-xs map-text-secondary">
                  <span className="tabular-nums">
                    {i + 1}. {formatCoordinate(c, c.kind)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemovePoint(i)}
                    className="map-text-muted hover:text-red-500"
                    aria-label={`Remove point ${i + 1}`}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExplore}
            disabled={!canExplore}
            className="flex-1 rounded-lg bg-gradient-to-b from-terra-600 to-terra-700 px-3 py-2 text-sm font-semibold text-white shadow disabled:opacity-40"
          >
            Explore
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={points.length === 0}
            className="rounded-lg border border-app-border px-3 py-2 text-sm font-medium map-text-secondary hover:bg-app-subtle disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={!canExplore || saving || !canSave}
            title={canSave ? undefined : 'Saving explorations is available on a higher plan.'}
            className="rounded-lg border border-terra-600/50 px-3 py-2 text-sm font-medium text-terra-700 dark:text-terra-300 hover:bg-app-accent-soft disabled:opacity-40"
          >
            {saving ? 'Saving…' : canSave ? 'Save exploration' : 'Save (upgrade required)'}
          </button>
        )}

        {savedExplorations.length > 0 && (
          <div className="border-t app-divider pt-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide map-text-muted">
              Saved explorations
            </p>
            <ul className="max-h-32 space-y-0.5 overflow-y-auto scrollbar-pane">
              {savedExplorations.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded px-1 py-1 text-xs hover:bg-app-subtle">
                  <button
                    type="button"
                    onClick={() => onLoad?.(s.mode, s.points)}
                    className="min-w-0 flex-1 truncate text-left map-text-secondary"
                    title={`Load ${s.name}`}
                  >
                    <span className="font-medium map-text">{s.name}</span>
                    <span className="ml-1 map-text-muted">· {s.mode}</span>
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(s.id)}
                      className="map-text-muted hover:text-red-500"
                      aria-label={`Delete ${s.name}`}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )

  if (embedded) {
    return <div className="pointer-events-auto w-full min-w-0">{body}</div>
  }

  return (
    <div className="pointer-events-auto flex w-full min-w-0 max-h-[min(60vh,520px)] flex-col overflow-hidden rounded-2xl map-chrome bg-app-surface/95 backdrop-blur-sm">
      {body}
    </div>
  )
}
