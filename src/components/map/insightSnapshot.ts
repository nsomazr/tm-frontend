import type { DrawGeometry } from './explorationGeometry'
import type { ExplorationDraw } from './explorationGeometry'

export interface InsightSnapshotContext {
  lat: number
  lng: number
  zoom?: number
  analysisAreaKm2?: number
  explorationGeometry?: DrawGeometry
  explorationDraw?: ExplorationDraw | null
  countryCode?: string
}
