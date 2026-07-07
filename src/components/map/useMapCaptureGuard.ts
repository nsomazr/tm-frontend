import { useEffect, useRef, type RefObject } from 'react'

function isEditableElement(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

function isCaptureShortcut(e: KeyboardEvent): boolean {
  const meta = e.metaKey
  const ctrl = e.ctrlKey
  const shift = e.shiftKey
  const key = e.key.toLowerCase()

  if (e.key === 'PrintScreen') return true

  // macOS region/window/fullscreen screenshots
  if (meta && shift && ['3', '4', '5'].includes(key)) return true

  // Snipping tool / browser save-page-as-image shortcuts
  if (shift && (meta || ctrl) && key === 's') return true

  if ((meta || ctrl) && (key === 'p' || key === 'c')) return true

  return false
}

function eventInside(container: HTMLElement, target: EventTarget | null): boolean {
  return target instanceof Node && container.contains(target)
}

export function useMapCaptureGuard(
  containerRef: RefObject<HTMLElement | null>,
  onCaptureAttempt?: () => void
) {
  const onAttemptRef = useRef(onCaptureAttempt)
  onAttemptRef.current = onCaptureAttempt

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const notify = () => {
      onAttemptRef.current?.()
    }

    const onContextMenu = (e: MouseEvent) => {
      if (!eventInside(container, e.target)) return
      e.preventDefault()
    }

    const onClipboard = (e: ClipboardEvent) => {
      if (!eventInside(container, e.target) || isEditableElement(e.target as Element)) return
      e.preventDefault()
      notify()
    }

    const onSelectStart = (e: Event) => {
      if (!eventInside(container, e.target) || isEditableElement(e.target as Element)) return
      e.preventDefault()
    }

    const onDragStart = (e: DragEvent) => {
      if (!eventInside(container, e.target)) return
      e.preventDefault()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isCaptureShortcut(e)) return
      if (isEditableElement(document.activeElement)) return

      e.preventDefault()
      e.stopPropagation()
      notify()

      if (e.key === 'PrintScreen' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText('').catch(() => {})
      }
    }

    container.addEventListener('contextmenu', onContextMenu)
    container.addEventListener('copy', onClipboard)
    container.addEventListener('cut', onClipboard)
    container.addEventListener('selectstart', onSelectStart)
    container.addEventListener('dragstart', onDragStart)
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      container.removeEventListener('contextmenu', onContextMenu)
      container.removeEventListener('copy', onClipboard)
      container.removeEventListener('cut', onClipboard)
      container.removeEventListener('selectstart', onSelectStart)
      container.removeEventListener('dragstart', onDragStart)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [containerRef])
}
