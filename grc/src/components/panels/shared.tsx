import { Pencil, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useUi } from '../../store/UiStore'
import type { EntityKind } from '../../types'
import { IconButton } from '../ui/primitives'

export function PanelSection({
  title,
  count,
  icon,
  onAdd,
  addLabel,
  children,
}: {
  title: string
  count?: number
  icon: ReactNode
  onAdd?: () => void
  addLabel?: string
  children: ReactNode
}) {
  return (
    <section className="px-5 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <span className="text-brand-600">{icon}</span>
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-slate-200/70 px-1.5 py-px text-[10px] text-slate-600 tabular-nums">{count}</span>
          )}
        </h3>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
          >
            <Plus className="size-3.5" />
            {addLabel ?? 'Ajouter'}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

export function PanelItem({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
      className={
        'group mb-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition ' +
        (onClick ? 'cursor-pointer hover:border-brand-300 hover:shadow-sm' : '')
      }
    >
      {children}
    </div>
  )
}

export function EditButton({ kind, id }: { kind: EntityKind; id: string }) {
  const { openForm } = useUi()
  return (
    <IconButton
      label={`Modifier ${id}`}
      className="size-6 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
      onClick={(e) => {
        e.stopPropagation()
        openForm({ kind, id })
      }}
    >
      <Pencil className="size-3" />
    </IconButton>
  )
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={'mt-0.5 text-lg font-semibold tabular-nums ' + (tone ?? 'text-slate-900')}>{value}</p>
    </div>
  )
}

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">{children}</p>
)
