import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  total?: number
  pageSize?: number
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize = 20,
}) => {
  if (totalPages <= 1) {
    if (total !== undefined && total > 0) {
      return (
        <div className="flex justify-between items-center px-2 py-3 text-xs text-[var(--color-text-secondary)]">
          <span>Showing {total} result{total === 1 ? '' : 's'}</span>
        </div>
      )
    }
    return null
  }

  // Calculate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      let start = Math.max(2, page - 1)
      let end = Math.min(totalPages - 1, page + 1)

      if (page <= 3) {
        start = 2
        end = 4
      } else if (page >= totalPages - 2) {
        start = totalPages - 3
        end = totalPages - 1
      }

      if (start > 2) {
        pages.push('...')
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages - 1) {
        pages.push('...')
      }

      pages.push(totalPages)
    }

    return pages
  }

  const startRecord = (page - 1) * pageSize + 1
  const endRecord = total !== undefined ? Math.min(page * pageSize, total) : page * pageSize

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4 mt-2">
      <div className="text-xs text-[var(--color-text-secondary)]">
        {total !== undefined ? (
          <span>
            Showing <span className="font-medium text-[var(--color-text-primary)]">{startRecord}</span> to{' '}
            <span className="font-medium text-[var(--color-text-primary)]">{endRecord}</span> of{' '}
            <span className="font-medium text-[var(--color-text-primary)]">{total}</span> entries
          </span>
        ) : (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1 transition-colors"
          aria-label="Previous Page"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-[var(--color-text-secondary)]">
                  ...
                </span>
              )
            }

            const pageNum = Number(p)
            const isActive = pageNum === page

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[30px] h-[30px] rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1 transition-colors"
          aria-label="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
