function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('snapshot image load failed'))
    img.src = dataUrl
  })
}

/** Shrink map snapshots so JSON export requests stay under server upload limits. */
export async function compressSnapshotForExport(
  dataUrl: string,
  maxWidth = 720,
  quality = 0.82,
): Promise<string> {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxWidth / img.width)
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  try {
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return dataUrl
  }
}
