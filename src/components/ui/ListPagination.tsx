interface ListPaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  className?: string
}

export default function ListPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  className = '',
}: ListPaginationProps) {
  if (total <= pageSize) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-xs text-app-text-muted">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="text-xs px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-xs text-app-text-secondary tabular-nums">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="text-xs px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
