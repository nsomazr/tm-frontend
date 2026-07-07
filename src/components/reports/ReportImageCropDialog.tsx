import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cropImageDataUrl } from './reportEditorCommands'

interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

interface ReportImageCropDialogProps {
  src: string
  open: boolean
  onClose: () => void
  onApply: (nextSrc: string) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function ReportImageCropDialog({ src, open, onClose, onApply }: ReportImageCropDialogProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [imageBox, setImageBox] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [selection, setSelection] = useState<CropRect | null>(null)
  const [dragging, setDragging] = useState(false)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  const [applying, setApplying] = useState(false)

  const resetSelection = useCallback(() => {
    if (!imageBox.width || !imageBox.height) {
      setSelection(null)
      return
    }
    const inset = Math.min(imageBox.width, imageBox.height) * 0.08
    setSelection({
      x: imageBox.x + inset,
      y: imageBox.y + inset,
      width: imageBox.width - inset * 2,
      height: imageBox.height - inset * 2,
    })
  }, [imageBox.height, imageBox.width, imageBox.x, imageBox.y])

  useEffect(() => {
    if (!open) return
    const img = new Image()
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = src
  }, [open, src])

  useEffect(() => {
    if (!open || !naturalSize.width) return
    const frame = frameRef.current
    if (!frame) return

    function measure() {
      const rect = frame!.getBoundingClientRect()
      const scale = Math.min(rect.width / naturalSize.width, rect.height / naturalSize.height)
      const width = naturalSize.width * scale
      const height = naturalSize.height * scale
      setImageBox({
        x: (rect.width - width) / 2,
        y: (rect.height - height) / 2,
        width,
        height,
      })
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, naturalSize.height, naturalSize.width, src])

  useEffect(() => {
    if (open && imageBox.width && imageBox.height) {
      resetSelection()
    }
  }, [open, imageBox.width, imageBox.height, resetSelection])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  function pointFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const frame = frameRef.current
    if (!frame) return { x: 0, y: 0 }
    const rect = frame.getBoundingClientRect()
    return {
      x: clamp(event.clientX - rect.left, imageBox.x, imageBox.x + imageBox.width),
      y: clamp(event.clientY - rect.top, imageBox.y, imageBox.y + imageBox.height),
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!imageBox.width) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = pointFromEvent(event)
    setOrigin(point)
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 })
    setDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !imageBox.width) return
    const point = pointFromEvent(event)
    const x = Math.min(origin.x, point.x)
    const y = Math.min(origin.y, point.y)
    const width = Math.abs(point.x - origin.x)
    const height = Math.abs(point.y - origin.y)
    setSelection({ x, y, width, height })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
    setSelection((current) => {
      if (!current || current.width < 12 || current.height < 12) {
        resetSelection()
        return current
      }
      return current
    })
  }

  async function handleApply() {
    if (!selection || !imageBox.width || !naturalSize.width) return
    if (selection.width < 4 || selection.height < 4) return

    const scaleX = naturalSize.width / imageBox.width
    const scaleY = naturalSize.height / imageBox.height

    setApplying(true)
    try {
      const cropped = await cropImageDataUrl(src, {
        x: Math.round((selection.x - imageBox.x) * scaleX),
        y: Math.round((selection.y - imageBox.y) * scaleY),
        width: Math.round(selection.width * scaleX),
        height: Math.round(selection.height * scaleY),
      })
      onApply(cropped)
      onClose()
    } catch {
      window.alert('Could not crop image. Try again with a smaller selection.')
    } finally {
      setApplying(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="report-image-crop" role="dialog" aria-modal="true" aria-labelledby="report-image-crop-title">
      <div className="report-image-crop__backdrop" onClick={onClose} aria-hidden />
      <div className="report-image-crop__panel">
        <header className="report-image-crop__header">
          <div>
            <h2 id="report-image-crop-title" className="report-image-crop__title">
              Crop image
            </h2>
            <p className="report-image-crop__hint">Drag on the image to choose the area to keep.</p>
          </div>
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
        </header>

        <div
          ref={frameRef}
          className="report-image-crop__frame"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img src={src} alt="" className="report-image-crop__image" draggable={false} />
          {selection && selection.width > 0 && selection.height > 0 && (
            <div
              className="report-image-crop__selection"
              style={{
                left: `${selection.x}px`,
                top: `${selection.y}px`,
                width: `${selection.width}px`,
                height: `${selection.height}px`,
              }}
            />
          )}
        </div>

        <footer className="report-image-crop__footer">
          <button type="button" className="btn-secondary text-sm" onClick={resetSelection}>
            Reset selection
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => void handleApply()}
            disabled={applying || !selection || selection.width < 4 || selection.height < 4}
          >
            {applying ? 'Applying…' : 'Apply crop'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
