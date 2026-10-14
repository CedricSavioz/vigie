import clsx from 'clsx'
import { CalendarDays, Columns3, GanttChart, GripVertical, Pencil, Plus } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { PriorityBadge } from '../components/ui/badges'
import { Button, Card, IconButton, PageHeader, Segmented } from '../components/ui/primitives'
import { daysUntil, formatDate, formatEurCompact, formatMonth } from '../lib/format'
import { ACTION_STATUS_LABEL, CRITICALITY_LABEL } from '../lib/labels'
import { effectiveActionStatus, todayIso } from '../lib/risk'
import { useGrc } from '../store/GrcStore'
import { useScope, useUi } from '../store/UiStore'
import type { ActionPlan, ActionStatus } from '../types'

const COLUMNS: { status: ActionStatus; accent: string }[] = [
  { status: 'a_faire', accent: 'bg-slate-400' },
  { status: 'en_cours', accent: 'bg-brand-500' },
  { status: 'en_retard', accent: 'bg-red-500' },
  { status: 'termine', accent: 'bg-emerald-500' },
]

const BAR_COLOR: Record<ActionStatus, string> = {
  a_faire: 'bg-slate-400',
  en_cours: 'bg-brand-500',
  en_retard: 'bg-red-500',
  termine: 'bg-emerald-500',
}

export function ActionPlansPage() {
  const { data } = useGrc()
  const { openForm } = useUi()
  const scope = useScope()
  const [view, setView] = useState<'kanban' | 'gantt'>('kanban')
  const actions = data.actions.filter((a) => scope.visible(a.riskId, a.title, a.owner))

  const done = actions.filter((a) => a.status === 'termine').length
  const late = actions.filter((a) => effectiveActionStatus(a) === 'en_retard').length
  const budget = actions.reduce((s, a) => s + a.cost, 0)
  const next30 = actions.filter((a) => a.status !== 'termine' && daysUntil(a.deadline) >= 0 && daysUntil(a.deadline) <= 30).length

  return (
    <div>
      <PageHeader
        title="Plans d'action"
        description="Traitement des risques : suivi des plans par statut, échéance et priorité. Glissez-déposez une carte pour changer son statut."
        actions={
          <>
            <Segmented
              label="Vue"
              value={view}
              onChange={setView}
              options={[
                { value: 'kanban', label: <><Columns3 className="size-3.5" /> Kanban</> },
                { value: 'gantt', label: <><GanttChart className="size-3.5" /> Planning</> },
              ]}
            />
            <Button variant="primary" onClick={() => openForm({ kind: 'action' })}>
              <Plus className="size-4" /> Nouveau plan
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary label="Plans d'action" value={actions.length} hint={`${done} terminés (${actions.length ? Math.round((done / actions.length) * 100) : 0} %)`} />
        <Summary label="En retard" value={late} hint="Échéance dépassée, non terminés" tone={late ? 'text-red-600' : undefined} />
        <Summary label="Échéance sous 30 jours" value={next30} hint="Plans à surveiller" tone={next30 ? 'text-amber-600' : undefined} />
        <Summary label="Budget engagé" value={formatEurCompact(budget)} hint="Coût estimé cumulé" />
      </div>

      {view === 'kanban' ? <Kanban actions={actions} /> : <Gantt actions={actions} />}
    </div>
  )
}

function Summary({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={clsx('mt-1.5 text-2xl font-semibold tabular-nums', tone ?? 'text-slate-900')}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
    </Card>
  )
}

// ─── Kanban ─────────────────────────────────────────────────

function Kanban({ actions }: { actions: ActionPlan[] }) {
  const { upsert } = useGrc()
  const { notify } = useUi()
  const [over, setOver] = useState<ActionStatus | null>(null)

  const onDrop = (e: DragEvent, status: ActionStatus) => {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData('text/plain')
    const a = actions.find((x) => x.id === id)
    if (!a || effectiveActionStatus(a) === status) return
    const updated = { ...a, status }
    upsert('actions', updated)
    if (status !== 'termine' && status !== 'en_retard' && effectiveActionStatus(updated) === 'en_retard') {
      notify(`${a.id} reste en retard : son échéance est dépassée. Reportez-la pour le replanifier.`, 'info')
    } else {
      notify(`${a.id} → ${ACTION_STATUS_LABEL[status]}`)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = actions
          .filter((a) => effectiveActionStatus(a) === col.status)
          .sort((a, b) => a.deadline.localeCompare(b.deadline))
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.status)
            }}
            onDragLeave={() => setOver((o) => (o === col.status ? null : o))}
            onDrop={(e) => onDrop(e, col.status)}
            className={clsx(
              'flex min-h-[420px] flex-col rounded-xl border bg-slate-100/70 p-2.5 transition-colors',
              over === col.status ? 'border-brand-400 bg-brand-50/70' : 'border-transparent',
            )}
          >
            <div className="mb-2.5 flex items-center justify-between px-1.5 pt-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className={clsx('size-2 rounded-full', col.accent)} />
                {ACTION_STATUS_LABEL[col.status]}
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums shadow-xs">{items.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {items.map((a) => (
                <ActionCard key={a.id} action={a} />
              ))}
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-[11px] text-slate-400">Déposez une carte ici</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActionCard({ action: a }: { action: ActionPlan }) {
  const { rel } = useGrc()
  const { openDrawer, openForm } = useUi()
  const status = effectiveActionStatus(a)
  const days = daysUntil(a.deadline)
  const risk = rel.riskById.get(a.riskId)

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', a.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="group cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-xs transition hover:-translate-y-px hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-slate-300" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[10px] text-slate-400">{a.id}</span>
            <IconButton label={`Modifier ${a.id}`} className="size-6 opacity-0 group-hover:opacity-100" onClick={() => openForm({ kind: 'action', id: a.id })}>
              <Pencil className="size-3" />
            </IconButton>
          </div>
          <p className="text-[13px] leading-snug font-medium text-slate-800">{a.title}</p>
          {risk && (
            <button
              type="button"
              onClick={() => openDrawer({ kind: 'risk', id: risk.id })}
              className="mt-1.5 block max-w-full cursor-pointer truncate text-left text-[11px] text-brand-700 hover:underline"
              title={risk.name}
            >
              {risk.id} · {risk.name}
            </button>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge value={a.priority} />
            <span className="text-[10px] text-slate-500">Cible : {CRITICALITY_LABEL[a.targetCriticality].toLowerCase()}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            <span className="truncate">{a.owner}</span>
            <span
              className={clsx(
                'flex shrink-0 items-center gap-1 font-medium',
                status === 'en_retard' ? 'text-red-600' : status !== 'termine' && days <= 30 ? 'text-amber-600' : '',
              )}
            >
              <CalendarDays className="size-3" />
              {status === 'termine' ? formatDate(a.deadline) : days < 0 ? `${-days} j de retard` : days === 0 ? "Aujourd'hui" : `J-${days}`}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Planning (Gantt léger) ─────────────────────────────────

function Gantt({ actions }: { actions: ActionPlan[] }) {
  const { rel } = useGrc()
  const { openForm } = useUi()
  const sorted = [...actions].sort((a, b) => a.startDate.localeCompare(b.startDate))
  if (!sorted.length) return <Card className="p-10 text-center text-sm text-slate-400">Aucun plan d'action pour ces filtres.</Card>

  const t = (iso: string) => new Date(iso).getTime()
  const now = t(todayIso())
  const min = new Date(Math.min(...sorted.map((a) => t(a.startDate)), now))
  min.setDate(1)
  const maxD = new Date(Math.max(...sorted.map((a) => t(a.deadline)), now))
  const max = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 1)
  const span = max.getTime() - min.getTime()
  const pct = (ms: number) => ((ms - min.getTime()) / span) * 100

  const months: Date[] = []
  for (let d = new Date(min); d < max; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d)
  const today = pct(now)

  return (
    <Card className="overflow-hidden">
      <div className="flex border-b border-slate-200 bg-slate-50/80">
        <div className="w-80 shrink-0 px-5 py-2.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Plan d'action</div>
        <div className="relative h-9 flex-1">
          {months.map((m) => (
            <span key={m.toISOString()} className="absolute top-0 h-full border-l border-slate-200 pt-2.5 pl-1.5 text-[10px] text-slate-500" style={{ left: `${pct(m.getTime())}%` }}>
              {formatMonth(m)}
            </span>
          ))}
        </div>
      </div>
      <div className="relative">
        {sorted.map((a) => {
          const st = effectiveActionStatus(a)
          const left = pct(t(a.startDate))
          const width = Math.max(1.2, pct(t(a.deadline)) - left)
          return (
            <div key={a.id} className="group flex border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
              <div className="w-80 shrink-0 px-5 py-2.5">
                <p className="truncate text-[13px] font-medium text-slate-800">{a.title}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {a.riskId} · {rel.riskById.get(a.riskId)?.name ?? '—'} · {a.owner}
                </p>
              </div>
              <div className="relative flex-1">
                {months.map((m) => (
                  <span key={m.toISOString()} className="absolute inset-y-0 border-l border-slate-100" style={{ left: `${pct(m.getTime())}%` }} />
                ))}
                <button
                  type="button"
                  onClick={() => openForm({ kind: 'action', id: a.id })}
                  title={`${a.title} — ${formatDate(a.startDate)} → ${formatDate(a.deadline)} (${ACTION_STATUS_LABEL[st]})`}
                  className={clsx(
                    'absolute top-1/2 flex h-6 -translate-y-1/2 cursor-pointer items-center overflow-hidden rounded-md px-2 text-[10px] font-semibold whitespace-nowrap text-white shadow-sm transition hover:brightness-110',
                    BAR_COLOR[st],
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  {formatDate(a.deadline)}
                </button>
              </div>
            </div>
          )
        })}
        <div className="pointer-events-none absolute inset-y-0 right-0 left-80">
          <div className="absolute inset-y-0 w-px bg-red-500" style={{ left: `${today}%` }}>
            <span className="absolute -top-0 -translate-x-1/2 rounded-b bg-red-500 px-1 text-[9px] font-semibold text-white">Aujourd'hui</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-500">
        {COLUMNS.map((c) => (
          <span key={c.status} className="flex items-center gap-1.5">
            <span className={clsx('h-2.5 w-5 rounded', BAR_COLOR[c.status])} />
            {ACTION_STATUS_LABEL[c.status]}
          </span>
        ))}
        <span className="ml-auto">Cliquez une barre pour modifier le plan.</span>
      </div>
    </Card>
  )
}
