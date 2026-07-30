import React from 'react'
import { Inbox } from 'lucide-react'

export interface Column<T> {
  header: string
  accessorKey?: keyof T
  accessorFn?: (row: T) => any
  cell?: (props: { row: T; value: any }) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMessage?: string
}

export function DataTable<T>({ columns, data, isLoading, emptyMessage = 'No data found' }: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, i) => <th key={i}>{col.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((_, colIndex) => (
                  <td key={colIndex}>
                    <div className="h-4 bg-[var(--color-border)] rounded animate-pulse w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full rounded-lg border border-[var(--color-border)] p-12 flex flex-col items-center justify-center text-[var(--color-text-muted)] bg-[var(--color-bg-card)]">
        <Inbox size={48} className="mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, colIndex) => {
                let value: any = null
                if (col.accessorKey) {
                  value = row[col.accessorKey]
                } else if (col.accessorFn) {
                  value = col.accessorFn(row)
                }
                return (
                  <td key={colIndex}>
                    {col.cell ? col.cell({ row, value }) : String(value ?? '-')}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
