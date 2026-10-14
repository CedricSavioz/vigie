import clsx from 'clsx'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Valeur de tri ; colonne non triable si absente */
  sort?: (row: T) => string | number
  align?: 'left' | 'right' | 'center'
  className?: string
}

/** Tableau générique triable, lignes cliquables. */
export function SortableTable<T extends { id: string }>({
  rows,
  columns,
  onRowClick,
  initialSort,
  empty = 'Aucun élément ne correspond aux filtres.',
}: {
  rows: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  empty?: string
}) {
  const [sort, setSort] = useState(initialSort ?? null)

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key)
    if (!col?.sort || !sort) return rows
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = col.sort!(a)
      const vb = col.sort!(b)
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr')) * factor
    })
  }, [rows, columns, sort])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map((c) => {
              const active = sort?.key === c.key
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={clsx(
                    'px-3 py-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase first:pl-5 last:pr-5',
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                  )}
                >
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'desc' }))
                      }
                      className={clsx('inline-flex cursor-pointer items-center gap-1 uppercase hover:text-slate-800', active && 'text-brand-700')}
                    >
                      {c.header}
                      {active ? (
                        sort!.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={clsx('group transition-colors', onRowClick && 'cursor-pointer hover:bg-brand-50/40')}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={clsx(
                    'px-3 py-2.5 align-middle first:pl-5 last:pr-5',
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                    c.className,
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && <p className="py-10 text-center text-sm text-slate-400">{empty}</p>}
    </div>
  )
}

export function MiniSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white pr-7 pl-2.5 text-xs text-slate-700 focus:border-brand-400 focus:ring-3 focus:ring-brand-100 focus:outline-none"
      >
        <option value="">Tous</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
