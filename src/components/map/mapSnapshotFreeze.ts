/** Freeze the visible map under a screenshot while capture runs underneath. */
export function mountMapFreezeOverlay(container: HTMLElement, dataUrl: string): () => void {
  const overlay = document.createElement('div')
  overlay.setAttribute('aria-hidden', 'true')
  overlay.style.cssText =
    'position:absolute;inset:0;z-index:30;pointer-events:none;background-color:#e2e8f0;background-size:cover;background-position:center;background-repeat:no-repeat;'
  overlay.style.backgroundImage = `url("${dataUrl}")`

  const hadRelative = container.classList.contains('relative')
  if (!hadRelative) container.classList.add('relative')
  container.appendChild(overlay)

  return () => {
    overlay.remove()
    if (!hadRelative) container.classList.remove('relative')
  }
}
