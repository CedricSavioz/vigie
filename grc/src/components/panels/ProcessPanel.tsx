import clsx from 'clsx'
import { AlertTriangle, ChevronRight, Gauge, ListChecks, Pencil, Trash2, Workflow, X } from 'lucide-react'
import { formatDate, formatEurCompact, formatNumber } from '../../lib/format'
import { MATURITY_SCALE } from '../../lib/labels'
import { CRIT_STYLE, criticalityOf, effectiveActionStatus, kriStatus, maxCriticality, residualScore } from '../../lib/risk'
import { useGrc } from '../../store/GrcStore'
import { useUi } from '../../store/UiStore'
import { ActionStatusBadge, CategoryBadge, CriticalityBadge, KriLight, MaturityDots, ProcessStatusBadge, ScorePill } from '../ui/badges'
import { Badge, Button, IconButton } from '../ui/primitives'
import { EditButton, Empty, PanelItem, PanelSection, Stat } from './shared'

export function ProcessPanel({ id }: { id: string }) {
  const { rel, remove, removeActivity } = useGrc()
  const { openForm, openDrawer, confirm, notify, backDrawer } = useUi()
  const proc = rel.processById.get(id)
  if (!proc) return <div className="p-6 text-sm text-slate-500">Ce processus n’existe plus.</div>

  const risks = (rel.risksByProcess.get(id) ?? []).slice().sort((a, b) => residualScore(b) - residualScore(a))
  const controls = risks.flatMap((r) => rel.controlsByRisk.get(r.id) ?? [])
  const kris = risks.flatMap((r) => rel.krisByRisk.get(r.id) ?? [])
  const actions = risks.flatMap((r) => rel.actionsByRisk.get(r.id) ?? [])
  const losses = risks.flatMap((r) => rel.lossesByRisk.get(r.id) ?? [])
  const byCrit = { H: 0, M: 0, L: 0 }
  risks.forEach((r) => byCrit[criticalityOf(r)]++)
  const redKris = kris.filter((k) => kriStatus(k) === 'rouge').length
  const openActions = actions.filter((a) => effectiveActionStatus(a) !== 'termine')

  return (
    <div className="pb-8">
      <div className="border-b border-slate-200 bg-white px-5 pt-4 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-slate-500">{proc.id}</span>
              <Badge tone="brand">{proc.domain}</Badge>
              <ProcessStatusBadge value={proc.status} />
            </div>
            <h2 className="text-lg leading-snug font-semibold text-slate-900">{proc.name}</h2>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" onClick={() => openForm({ kind: 'process', id })}>
              <Pencil className="size-3.5" /> Modifier
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Supprimer le processus"
              className="hover:bg-red-50 hover:text-red-600"
              onClick={async () => {
                const ok = await confirm({
                  title: `Supprimer ${id} ?`,
                  message: `« ${proc.name} », ses ${risks.length} risques et leurs éléments rattachés seront supprimés.`,
                  confirmLabel: 'Supprimer',
                })
                if (ok) {
                  remove('processes', id)
                  backDrawer()
                  notify(`${id} supprimé`, 'danger')
                }
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600">{proc.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
          <span>
            Propriétaire : <span className="font-medium text-slate-700">{proc.owner}</span>
          </span>
          <span className="flex items-center gap-1.5">
            Maturité <MaturityDots value={proc.maturity} />
            <span className="font-medium text-slate-700">{MATURITY_SCALE[proc.maturity]}</span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <Stat
            label="Risques"
            value={
              <span className="flex items-baseline gap-2">
                {risks.length}
                <span className="flex gap-1 text-[11px] font-medium">
                  <span className="text-red-600">{byCrit.H}H</span>
                  <span className="text-amber-600">{byCrit.M}M</span>
                  <span className="text-emerald-600">{byCrit.L}L</span>
                </span>
              </span>
            }
          />
          <Stat label="Contrôles" value={controls.length} />
          <Stat label="KRI au rouge" value={`${redKris}/${kris.length}`} tone={redKris ? 'text-red-600' : 'text-slate-900'} />
          <Stat label="Pertes cumulées" value={formatEurCompact(losses.reduce((s, l) => s + l.amount, 0))} />
        </div>
      </div>

      <PanelSection
        title="Tracé des activités"
        count={proc.activities.length}
        icon={<Workflow className="size-3.5" />}
        onAdd={() => openForm({ kind: 'activity', preset: { processId: id } })}
        addLabel="Ajouter une activité"
      >
        {proc.activities.length === 0 && <Empty>Aucune activité : ajoutez les étapes du processus.</Empty>}
        <ol className="relative">
          {proc.activities.map((a, idx) => {
            const ar = rel.risksByActivity.get(a.id) ?? []
            const crit = maxCriticality(ar.map(criticalityOf))
            return (
              <li key={a.id} className="group relative flex gap-3 pb-3 last:pb-0">
                {idx < proc.activities.length - 1 && <span className="absolute top-7 left-[13px] h-[calc(100%-20px)] w-px bg-slate-200" />}
                <span
                  className={clsx(
                    'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-slate-50',
                    crit ? `${CRIT_STYLE[crit].bg} text-white` : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{a.name}</p>
                      <p className="text-[11px] text-slate-500">{a.owner}</p>
                    </div>
                    <div className="flex opacity-0 transition group-hover:opacity-100">
                      <IconButton label={`Modifier l'activité ${a.name}`} className="size-6" onClick={() => openForm({ kind: 'activity', id: a.id })}>
                        <Pencil className="size-3" />
                      </IconButton>
                      <IconButton
                        label={`Supprimer l'activité ${a.name}`}
                        className="size-6 hover:text-red-600"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Supprimer cette activité ?',
                            message: `« ${a.name} » sera retirée du processus. Les risques rattachés seront conservés au niveau du processus.`,
                            confirmLabel: 'Supprimer',
                          })
                          if (ok) {
                            removeActivity(id, a.id)
                            notify('Activité supprimée', 'danger')
                          }
                        }}
                      >
                        <X className="size-3" />
                      </IconButton>
                    </div>
                  </div>
                  {ar.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {ar.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => openDrawer({ kind: 'risk', id: r.id })}
                          className={clsx(
                            'cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 transition ring-inset hover:brightness-95',
                            CRIT_STYLE[criticalityOf(r)].soft,
                            CRIT_STYLE[criticalityOf(r)].text,
                            CRIT_STYLE[criticalityOf(r)].ring,
                          )}
                          title={r.name}
                        >
                          {r.id}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </PanelSection>

      <PanelSection
        title="Risques"
        count={risks.length}
        icon={<AlertTriangle className="size-3.5" />}
        onAdd={() => openForm({ kind: 'risk', preset: { processId: id } })}
      >
        {risks.length === 0 && <Empty>Aucun risque identifié sur ce processus.</Empty>}
        {risks.map((r) => (
          <PanelItem key={r.id} onClick={() => openDrawer({ kind: 'risk', id: r.id })}>
            <div className="flex items-center gap-3">
              <ScorePill score={residualScore(r)} title="Score résiduel" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  <span className="mr-1.5 font-mono text-[11px] text-slate-400">{r.id}</span>
                  {r.name}
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <CriticalityBadge value={criticalityOf(r)} />
                  <CategoryBadge value={r.category} />
                  <span className="truncate">· {r.owner}</span>
                </div>
              </div>
              <span className="text-[11px] whitespace-nowrap text-slate-400">
                {(rel.controlsByRisk.get(r.id) ?? []).length} ctrl · {(rel.actionsByRisk.get(r.id) ?? []).length} PA
              </span>
              <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </div>
          </PanelItem>
        ))}
      </PanelSection>

      <PanelSection title="KRI du processus" count={kris.length} icon={<Gauge className="size-3.5" />}>
        {kris.length === 0 && <Empty>Aucun KRI.</Empty>}
        {kris.map((k) => (
          <PanelItem key={k.id} onClick={() => openDrawer({ kind: 'risk', id: k.riskId })}>
            <div className="flex items-center gap-3">
              <KriLight status={kriStatus(k)} />
              <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{k.name}</p>
              <p className="text-sm font-semibold text-slate-900 tabular-nums">
                {formatNumber(k.value)} <span className="text-[11px] font-normal text-slate-500">{k.unit}</span>
              </p>
              <EditButton kind="kri" id={k.id} />
            </div>
          </PanelItem>
        ))}
      </PanelSection>

      <PanelSection title="Plans d'action ouverts" count={openActions.length} icon={<ListChecks className="size-3.5" />}>
        {openActions.length === 0 && <Empty>Aucun plan d’action ouvert.</Empty>}
        {openActions.map((a) => (
          <PanelItem key={a.id} onClick={() => openDrawer({ kind: 'risk', id: a.riskId })}>
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm text-slate-700">{a.title}</p>
              <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-500">
                {formatDate(a.deadline)}
                <ActionStatusBadge value={effectiveActionStatus(a)} />
                <EditButton kind="action" id={a.id} />
              </div>
            </div>
          </PanelItem>
        ))}
      </PanelSection>
    </div>
  )
}
