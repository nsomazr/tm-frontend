import { useEffect, useMemo, useState } from 'react'

export const DEFAULT_PAGE_SIZE = 10

export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    setPage(1)
  }, [total, pageSize])

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  const safePage = Math.min(Math.max(1, page), pageCount)
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  )

  return {
    page: safePage,
    pageCount,
    pageItems,
    setPage,
    total,
    pageSize,
    hasMultiplePages: total > pageSize,
  }
}
