import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import { useTheme } from '../../theme/ThemeContext'
import type { MineralCatalogEntry } from '../../types'
import {
  buildCommoditySlots,
  buildSpecialSlots,
  type SpecialCommoditySlot,
} from '../../constants/periodicCommodities'
import {
  ACTINIDE_SERIES,
  ELEMENT_CATEGORY_COLORS,
  ELEMENTS_BY_Z,
  LANTHANIDE_SERIES,
  MAIN_TABLE_GRID,
  PERIODIC_GRID_COLS,
} from '../../constants/periodicElements'

interface MineralPeriodicTableProps {
  catalog: MineralCatalogEntry[]
  selectedSlug?: string | null
  onSelect?: (entry: MineralCatalogEntry | null) => void
  linkMode?: boolean
  embedded?: boolean
  compact?: boolean
  showcase?: boolean
  className?: string
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return `rgba(148, 163, 184, ${alpha})`
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Pick light or dark label text for a solid tile background. */
function textColorForBg(hex: string): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return '#ffffff'
  const r = parseInt(normalized.slice(0, 2), 16) / 255
  const g = parseInt(normalized.slice(2, 4), 16) / 255
  const b = parseInt(normalized.slice(4, 6), 16) / 255
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.58 ? '#0f172a' : '#ffffff'
}

function slugToLabel(slug: string) {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function mineralMapPath(slug: string) {
  return `/?mineral=${encodeURIComponent(slug)}`
}

export default function MineralPeriodicTable({
  catalog,
  selectedSlug = null,
  onSelect,
  linkMode = false,
  embedded = false,
  compact = false,
  showcase = false,
  className = '',
}: MineralPeriodicTableProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const commodityByZ = useMemo(() => buildCommoditySlots(catalog), [catalog])
  const specialSlots = useMemo(() => buildSpecialSlots(catalog), [catalog])
  const catalogBySlug = useMemo(() => new Map(catalog.map((item) => [item.slug, item])), [catalog])

  const findCatalogEntry = (slug: string) =>
    catalogBySlug.get(slug) ??
    catalog.find((e) => e.periodic_special === slug || e.layer_slug === slug) ??
    null

  const renderMappedTile = ({
    keyId,
    entry,
    title,
    className,
    style,
    children,
  }: {
    keyId: string
    entry: MineralCatalogEntry
    title: string
    className: string
    style: CSSProperties
    children: ReactNode
  }) => {
    if (linkMode && !onSelect) {
      return (
        <Link key={keyId} to={mineralMapPath(entry.slug)} title={title} className={className} style={style}>
          {children}
        </Link>
      )
    }
    return (
      <button
        key={keyId}
        type="button"
        title={title}
        onClick={() => handleCommodityClick(entry)}
        className={className}
        style={style}
      >
        {children}
      </button>
    )
  }

  const handleCommodityClick = (entry: MineralCatalogEntry | null) => {
    if (!onSelect || !entry?.is_mapped) return
    if (selectedSlug === entry.slug) {
      onSelect(null)
      return
    }
    onSelect(entry)
  }

  /** Fixed column widths so 18 columns stay readable on small screens (horizontal scroll). */
  const showcaseGridClass =
    'grid w-max max-w-none grid-cols-[repeat(18,2.125rem)] sm:grid-cols-[repeat(18,2.625rem)] md:grid-cols-[repeat(18,3rem)] lg:grid-cols-[repeat(18,3.25rem)]'

  const showcaseTileBase =
    'min-h-0 w-full aspect-square sm:aspect-auto sm:h-[3.125rem] md:h-[3.375rem] lg:h-[3.625rem] rounded-[4px] sm:rounded-md flex flex-col items-stretch justify-start gap-0 p-0.5 sm:p-1 sm:pb-1 border border-black/10 transition-all overflow-hidden'

  const showcaseSymbolClass =
    'font-bold leading-none text-center text-[13px] sm:text-base md:text-lg flex-1 flex items-center justify-center min-h-0 w-full'

  const showcaseNumClass = 'leading-none font-medium text-[8px] sm:text-[8px] shrink-0'

  const showcaseNameClass =
    'hidden sm:block w-full min-h-[0.85rem] md:min-h-[0.95rem] text-[6px] md:text-[7px] leading-[1.1] line-clamp-2 text-center opacity-95 shrink-0 px-px'

  const tileMinH = showcase
    ? showcaseTileBase
    : compact
      ? 'min-h-[2rem]'
      : 'min-h-[2.35rem]'

  const shellClass = showcase
    ? 'flex flex-col w-full text-sm'
    : embedded
      ? 'flex flex-col overflow-hidden map-chrome rounded-xl text-sm w-full'
      : compact
        ? 'flex flex-col overflow-hidden map-chrome rounded-xl text-sm'
        : 'flex flex-col overflow-hidden map-chrome rounded-xl text-sm absolute z-10 top-3 left-3 w-[min(100%-1.5rem,22rem)] max-h-[calc(100%-1.5rem)] hidden md:flex'

  const gridGap = showcase ? 'gap-[3px] sm:gap-1' : 'gap-0.5'

  const mutedElementStyle = (color: string): CSSProperties => ({
    backgroundColor: hexToRgba(color, isDark ? 0.32 : 0.18),
    borderColor: isDark ? 'rgba(148, 163, 184, 0.38)' : 'rgba(148, 163, 184, 0.25)',
    color: isDark ? 'rgba(226, 232, 240, 0.62)' : 'rgba(51, 65, 85, 0.48)',
    filter: isDark ? 'saturate(0.45) brightness(1.08)' : 'saturate(0.25) brightness(0.98)',
    opacity: isDark ? 0.88 : 0.55,
  })

  const mutedSpecialStyle = (): CSSProperties => ({
    backgroundColor: isDark ? 'rgba(148, 163, 184, 0.28)' : 'rgba(148, 163, 184, 0.2)',
    borderColor: isDark ? 'rgba(148, 163, 184, 0.38)' : 'rgba(148, 163, 184, 0.25)',
    color: isDark ? 'rgba(226, 232, 240, 0.62)' : 'rgba(51, 65, 85, 0.48)',
    filter: isDark ? 'saturate(0.35) brightness(1.08)' : 'saturate(0.2) brightness(0.98)',
    opacity: isDark ? 0.88 : 0.55,
  })

  const mappedCommodityStyle = (color: string): CSSProperties => {
    const labelColor = textColorForBg(color)
    return {
      backgroundColor: color,
      color: labelColor,
      textShadow: labelColor === '#ffffff' ? '0 1px 2px rgba(0,0,0,0.4)' : 'none',
      opacity: 1,
      filter: 'none',
    }
  }

  const mappedTileClass = 'periodic-tile-mapped'
  const mutedTileClass = 'periodic-tile-muted'

  const renderElementCell = (z: number) => {
    const element = ELEMENTS_BY_Z[z]
    if (!element) return null

    const slot = commodityByZ.get(z) ?? null
    const entry = slot?.entry ?? null
    const isCommodity = !!slot
    const mapped = entry?.is_mapped === true
    const selected = !!entry && selectedSlug === entry.slug
    const categoryColor = ELEMENT_CATEGORY_COLORS[element.category]
    const commodityColor = entry?.color ?? slot?.fallbackColor ?? categoryColor
    const commodityName = entry ? displayName(entry) : slot ? slugToLabel(slot.slug) : element.name
    const label = mapped && entry ? displayName(entry) : element.name
    const linked = mapped && !!entry

    const style =
      mapped && entry ? mappedCommodityStyle(commodityColor) : mutedElementStyle(categoryColor)

    const tileClass = `${tileMinH} rounded-[3px] sm:rounded-md flex flex-col items-stretch justify-between p-0.5 sm:p-1 text-left border border-black/10 transition-all ${
      mapped && entry ? mappedTileClass : mutedTileClass
    } ${
      selected
        ? 'ring-2 ring-offset-1 ring-offset-app-bg ring-terra-500 scale-[1.03] shadow-md z-[1]'
        : linked
          ? 'hover:brightness-110 hover:scale-[1.02] cursor-pointer shadow-sm'
          : 'cursor-default select-none'
    }`

    const title =
      isCommodity
        ? mapped
          ? m.map.periodicTableMapped.replace('{name}', commodityName)
          : m.map.periodicTableUnmapped.replace('{name}', commodityName)
        : element.name

    const content = (
      <>
        <span className={showcase ? showcaseNumClass : 'leading-none font-medium text-[8px]'}>{z}</span>
        <span
          className={
            showcase
              ? showcaseSymbolClass
              : `font-bold leading-none text-center ${compact ? 'text-[10px]' : 'text-xs'}`
          }
        >
          {element.symbol}
        </span>
        {showcase && <span className={showcaseNameClass}>{label}</span>}
      </>
    )

    if (linked && entry && (linkMode || onSelect)) {
      return renderMappedTile({
        keyId: `z-${z}`,
        entry,
        title,
        className: tileClass,
        style,
        children: content,
      })
    }

    return (
      <button key={`z-${z}`} type="button" aria-disabled title={title} className={tileClass} style={style}>
        {content}
      </button>
    )
  }

  const renderPlaceholder = (kind: -1 | -2) => {
    const label = kind === -1 ? '57–71' : '89–103'

    return (
      <div
        key={kind === -1 ? 'lan-placeholder' : 'act-placeholder'}
        className={`${tileMinH} ${mutedTileClass} rounded-[4px] sm:rounded-md flex flex-col items-center justify-center border border-black/10 text-[7px] sm:text-[10px] font-semibold aspect-square sm:aspect-auto sm:h-[3.125rem] md:h-[3.375rem] lg:h-[3.625rem] w-full`}
        style={mutedElementStyle(kind === -1 ? '#c9a0e8' : '#e8a0d4')}
        aria-hidden
      >
        {label}
      </div>
    )
  }

  const renderEmpty = (key: string) => (
    <div
      key={key}
      className={
        showcase
          ? 'aspect-square sm:aspect-auto sm:h-[3.125rem] md:h-[3.375rem] lg:h-[3.625rem] w-full min-h-0'
          : tileMinH
      }
      aria-hidden
    />
  )

  const renderGridCell = (value: number, key: string) => {
    if (value === 0) return renderEmpty(key)
    if (value === -1) return renderPlaceholder(-1)
    if (value === -2) return renderPlaceholder(-2)
    return renderElementCell(value)
  }

  const renderSeriesRow = (series: number[], rowKey: string) => (
    <div className={`${showcase ? showcaseGridClass : `grid w-full ${gridGap}`} ${showcase ? gridGap : ''}`}
      style={showcase ? undefined : { gridTemplateColumns: `repeat(${PERIODIC_GRID_COLS}, minmax(0, 1fr))` }}
    >
      {renderEmpty(`${rowKey}-pad-1`)}
      {renderEmpty(`${rowKey}-pad-2`)}
      {series.map((z) => renderElementCell(z))}
      {renderEmpty(`${rowKey}-pad-end`)}
    </div>
  )

  const renderSpecialSlot = (slot: SpecialCommoditySlot) => {
    const entry = findCatalogEntry(slot.slug)
    const mapped = entry?.is_mapped === true
    const selected = !!entry && selectedSlug === entry.slug
    const color = entry?.color ?? slot.fallbackColor
    const label = entry ? displayName(entry) : slot.label
    const linked = mapped && !!entry

    const style = mapped && entry ? mappedCommodityStyle(color) : mutedSpecialStyle()

    const specialTileClass = showcase
      ? `${showcaseTileBase} w-[2.125rem] sm:w-[2.625rem] md:w-[3rem] lg:w-[3.25rem] shrink-0 flex flex-col items-stretch justify-start`
      : `${tileMinH} min-w-[3.5rem] sm:min-w-[4.5rem] rounded-md flex flex-col items-center justify-center px-2`

    const tileClass = `${specialTileClass} border border-black/10 transition-all ${
      mapped && entry ? mappedTileClass : mutedTileClass
    } ${
      selected
        ? 'ring-2 ring-offset-1 ring-offset-app-bg ring-terra-500 scale-[1.03] shadow-md'
        : linked
          ? 'hover:brightness-110 hover:scale-[1.02] cursor-pointer shadow-sm'
          : 'cursor-default select-none'
    }`

    const title = mapped
      ? m.map.periodicTableMapped.replace('{name}', label)
      : m.map.periodicTableUnmapped.replace('{name}', label)

    const content = (
      <>
        <span className={showcase ? showcaseSymbolClass : 'font-bold text-sm'}>{slot.symbol}</span>
        {showcase && (
          <span className={`${showcaseNameClass} sm:block`}>{label}</span>
        )}
      </>
    )

    if (linked && entry && (linkMode || onSelect)) {
      return renderMappedTile({
        keyId: slot.slug,
        entry,
        title,
        className: tileClass,
        style,
        children: content,
      })
    }

    return (
      <button key={slot.slug} type="button" aria-disabled title={title} className={tileClass} style={style}>
        {content}
      </button>
    )
  }

  return (
    <div className={`periodic-table ${shellClass} ${className}`}>
      {showcase && (
        <p className="sm:hidden text-[10px] text-slate-500 dark:text-slate-400 text-center mb-2 px-1">
          Swipe sideways to explore the full table
        </p>
      )}
      <div
        className={
          showcase
            ? 'overflow-x-auto overscroll-x-contain scroll-smooth pb-1 -mx-1 px-1 sm:mx-0 sm:px-2'
            : 'overflow-y-auto p-1 sm:p-2'
        }
      >
        <div className={showcase ? 'w-max mx-auto flex flex-col items-stretch' : 'w-full'}>
          <div
            className={
              showcase
                ? `${showcaseGridClass} ${gridGap}`
                : `grid ${gridGap} w-full min-w-[300px] sm:min-w-[520px]`
            }
            style={
              showcase ? undefined : { gridTemplateColumns: `repeat(${PERIODIC_GRID_COLS}, minmax(0, 1fr))` }
            }
          >
            {MAIN_TABLE_GRID.flatMap((row, rowIdx) =>
              row.map((value, colIdx) => renderGridCell(value, `main-${rowIdx}-${colIdx}`))
            )}
          </div>

          <div className={`mt-1 sm:mt-2 flex flex-col ${gridGap}`}>
            {renderSeriesRow(LANTHANIDE_SERIES, 'ln')}
            {renderSeriesRow(ACTINIDE_SERIES, 'an')}
          </div>

          {specialSlots.length > 0 && (
            <div
              className={`mt-2 sm:mt-3 flex items-center justify-center ${gridGap} flex-wrap sm:flex-nowrap`}
            >
              {specialSlots.map((slot) => renderSpecialSlot(slot))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
