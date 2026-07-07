/** Composite overview + magnified detail for PDF map snapshots (callout style). */

export interface SnapshotMarker {
  /** 0–1 position on the overview image */
  x: number
  y: number
}

export interface SnapshotCoordinates {
  lat: number
  lng: number
}

export function formatSnapshotCoordinates(lat: number, lng: number): string {
  const latHemi = lat >= 0 ? 'N' : 'S'
  const lngHemi = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(5)}°${latHemi}, ${Math.abs(lng).toFixed(5)}°${lngHemi} · WGS84`
}

function drawCoordinateBar(
  ctx: CanvasRenderingContext2D,
  detailX: number,
  detailY: number,
  detailWidth: number,
  detailHeight: number,
  lat: number,
  lng: number,
) {
  const label = formatSnapshotCoordinates(lat, lng)
  const barHeight = 28
  const barTop = detailY + detailHeight - barHeight

  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.fillRect(detailX, barTop, detailWidth, barHeight)
  ctx.strokeStyle = '#0d9488'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(detailX, barTop)
  ctx.lineTo(detailX + detailWidth, barTop)
  ctx.stroke()

  ctx.fillStyle = '#134e4a'
  ctx.font = '600 13px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, detailX + 12, barTop + barHeight / 2)
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('snapshot image load failed'))
    img.src = dataUrl
  })
}

/**
 * Build a report figure: regional context map on top, rectangular zoom inset below,
 * with a teal callout wedge linking the marker to the detail frame.
 */
export async function compositeInsightSnapshot(
  overviewDataUrl: string,
  detailDataUrl: string,
  marker: SnapshotMarker,
  coordinates?: SnapshotCoordinates,
): Promise<string> {
  const overview = await loadImage(overviewDataUrl)
  const detail = await loadImage(detailDataUrl)

  const width = 920
  const overviewHeight = 340
  const gap = 28
  const detailWidth = 480
  const detailHeight = 320
  const detailX = (width - detailWidth) / 2
  const detailY = overviewHeight + gap
  const height = detailY + detailHeight + 24

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return detailDataUrl

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Overview map (letterboxed)
  const ovScale = Math.min(width / overview.width, overviewHeight / overview.height)
  const ovW = overview.width * ovScale
  const ovH = overview.height * ovScale
  const ovX = (width - ovW) / 2
  const ovY = (overviewHeight - ovH) / 2
  ctx.drawImage(overview, ovX, ovY, ovW, ovH)

  const markerX = ovX + marker.x * ovW
  const markerY = ovY + marker.y * ovH
  const detailCx = detailX + detailWidth / 2

  // Callout wedge (overview marker → detail rectangle top edge)
  ctx.beginPath()
  ctx.moveTo(markerX, markerY)
  ctx.lineTo(detailX + detailWidth * 0.18, detailY)
  ctx.lineTo(detailX + detailWidth * 0.82, detailY)
  ctx.closePath()
  ctx.fillStyle = 'rgba(13, 148, 136, 0.42)'
  ctx.fill()
  ctx.strokeStyle = '#0d9488'
  ctx.lineWidth = 2
  ctx.stroke()

  // Highlight marker on overview
  ctx.beginPath()
  ctx.arc(markerX, markerY, 10, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(220, 38, 38, 0.85)'
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5
  ctx.stroke()

  // Rectangular detail inset
  ctx.save()
  ctx.beginPath()
  ctx.rect(detailX, detailY, detailWidth, detailHeight)
  ctx.clip()
  const detScale = Math.max(detailWidth / detail.width, detailHeight / detail.height)
  const detW = detail.width * detScale
  const detH = detail.height * detScale
  ctx.drawImage(detail, detailCx - detW / 2, detailY + detailHeight / 2 - detH / 2, detW, detH)
  ctx.restore()

  // Single inset frame — magnified view is the analysis area.
  ctx.beginPath()
  ctx.rect(detailX, detailY, detailWidth, detailHeight)
  ctx.strokeStyle = '#0d9488'
  ctx.lineWidth = 3
  ctx.stroke()

  if (coordinates) {
    drawCoordinateBar(ctx, detailX, detailY, detailWidth, detailHeight, coordinates.lat, coordinates.lng)
  }

  return canvas.toDataURL('image/jpeg', 0.85)
}
