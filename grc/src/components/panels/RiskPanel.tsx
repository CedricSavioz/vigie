import clsx from 'clsx'
import { ArrowRight, ClipboardCheck, Gauge, ListChecks, Pencil, ShieldCheck, Trash2, Wallet, Workflow } from 'lucide-react'
import { FREQUENCY_LABEL } from '../../lib/labels'
import { formatDate, formatEur, formatNumber } from '../../lib/format'
import { criticalityOf, effectiveActionStatus, heatColor, inherentScore, kriStatus, residualScore } from '../../lib/risk'
import { useGrc } from '../../store/GrcStore'
import { useUi } from '../../store/UiStore'
import type { Risk } from '../../types'
import { Sparkline } from '../charts/KriVisuals'
import {
  ActionStatusBadge,
  AuditStatusBadge,
  CategoryBadge,
  ControlTypeBadge,
  CriticalityBadge,
  EffectivenessBadge,
  JiraBadge,
  KriLight,
  PriorityBadge,
  ScorePill,
  SeverityBadge,
  TreatmentBadge,
} from '../ui/badges'
import { Button } from '../ui/primitives'
import { EditButton, Empty, PanelItem, PanelSection } from './shared'

export function RiskPanel({ id }: { id: string }) {
  const { rel, remove } = useGrc()
  const { openForm, openDrawer, confirm, notify, backDrawer } = useUi()
  const risk = rel.riskById.get(id)
  if (!risk) return <div className="p-6 text-sm text-slate-500">Ce risque n’existe plus.</div>

  const proc = rel.processById.get(risk.processId)
  const act = rel.activityById.get(risk.activityId)
  const controls = rel.controlsByRisk.get(id) ?? []
  const kris = rel.krisByRisk.get(id) ?? []
  const actions = rel.actionsByRisk.get(id) ?? []
  const audits = rel.auditsByRisk.get(id) ?? []
  const losses = rel.lossesByRisk.get(id) ?? []
  const lossTotal = losses.reduce((s, l) => s + l.amount, 0)
  const crit = criticalityOf(risk)
  const preset = { riskId: id }

  return (
    <div className="pb-8">
      {/* En-tête */}
      <div className="border-b border-slate-200 bg-white px-5 pt-4 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-slate-500">{risk.id}</span>
              <JiraBadge jiraKey={risk.jiraKey} />
              <CriticalityBadge value={crit} />
              <CategoryBadge value={risk.category} />
              <TreatmentBadge value={risk.treatment} />
            </div>
            <h2 className="text-lg leading-snug font-semibold text-slate-900">{risk.name}</h2>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" onClick={() => openForm({ kind: 'risk', id })}>
              <Pencil className="size-3.5" /> Modifier
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Supprimer le risque"
              className="hover:bg-red-50 hover:text-red-600"
              onClick={async () => {
                const ok = await confirm({
                  title: `Supprimer ${id} ?`,
                  message: `« ${risk.name} » et ses contrôles, KRI et plans d’action seront supprimés.`,
                  confirmLabel: 'Supprimer',
                })
                if (ok) {
                  remove('risks', id)
                  backDrawer()
                  notify(`${id} supprimé`, 'danger')
                }
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-600">{risk.description}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-slate-400">Processus</dt>
            <dd>
              {proc ? (
                <button
                  type="button"
                  onClick={() => openDrawer({ kind: 'process', id: proc.id })}
                  className="cursor-pointer text-left font-medium text-brand-700 hover:underline"
                >
                  {proc.name}
                </button>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Activité</dt>
            <dd className="font-medium text-slate-700">{act?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Porteur du risque</dt>
            <dd className="font-medium text-slate-700">{risk.owner}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Pertes associées</dt>
            <dd className="font-medium text-slate-700">{lossTotal ? formatEur(lossTotal) : 'Aucune'}</dd>
          </div>
        </dl>

        <ScoreComparison risk={risk} />
      </div>

      <PanelSection
        title="Contrôles"
        count={controls.length}
        icon={<ShieldCheck className="size-3.5" />}
        onAdd={() => openForm({ kind: 'control', preset })}
      >
        {controls.length === 0 && <Empty>Aucun contrôle : ce risque n’est pas couvert.</Empty>}
        {controls.map((c) => (
          <PanelItem key={c.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  <span className="mr-1.5 font-mono text-[11px] text-slate-400">{c.id}</span>
                  {c.name}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <ControlTypeBadge value={c.type} />
                  <EffectivenessBadge value={c.effectiveness} />
                  <JiraBadge jiraKey={c.jiraKey} />
                  <span>· {FREQUENCY_LABEL[c.frequency]}</span>
                  <span>· {c.owner}</span>
                </div>
                {c.testResult && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Test du {formatDate(c.lastTestDate)} : {c.testResult}
                  </p>
                )}
              </div>
              <EditButton kind="control" id={c.id} />
            </div>
          </PanelItem>
        ))}
      </PanelSection>

      <PanelSection title="Indicateurs de risque (KRI)" count={kris.length} icon={<Gauge className="size-3.5" />} onAdd={() => openForm({ kind: 'kri', preset })}>
        {kris.length === 0 && <Empty>Aucun KRI ne suit ce risque.</Empty>}
        {kris.map((k) => (
          <PanelItem key={k.id}>
            <div className="flex items-center gap-3">
              <KriLight status={kriStatus(k)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{k.name}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <JiraBadge jiraKey={k.jiraKey} />
                  Seuils : {formatNumber(k.thresholdOrange)} / {formatNumber(k.thresholdRed)} {k.unit}
                </p>
              </div>
              <div className="w-24">
                <Sparkline kri={k} height={30} showThresholds={false} />
              </div>
              <p className="w-20 text-right text-sm font-semibold text-slate-900 tabular-nums">
                {formatNumber(k.value)} <span className="text-[11px] font-normal text-slate-500">{k.unit}</span>
              </p>
              <EditButton kind="kri" id={k.id} />
            </div>
          </PanelItem>
        ))}
      </PanelSection>

      <PanelSection title="Plans d'action" count={actions.length} icon={<ListChecks className="size-3.5" />} onAdd={() => openForm({ kind: 'action', preset })}>
        {actions.length === 0 && <Empty>Aucun plan d’action.</Empty>}
        {actions.map((a) => (
          <PanelItem key={a.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <ActionStatusBadge value={effectiveActionStatus(a)} />
                  <PriorityBadge value={a.priority} />
                  <JiraBadge jiraKey={a.jiraKey} />
                  <span>· Échéance {formatDate(a.deadline)}</span>
                  <span>· {a.owner}</span>
                </div>
              </div>
              <EditButton kind="action" id={a.id} />
            </div>
          </PanelItem>
        ))}
      </PanelSection>

      <PanelSection title="Recommandations d'audit" count={audits.length} icon={<ClipboardCheck className="size-3.5" />} onAdd={() => openForm({ kind: 'audit', preset })}>
        {audits.length === 0 && <Empty>Aucune recommandation d’audit.</Empty>}
        {audits.map((a) => (
          <PanelItem key={a.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <SeverityBadge value={a.severity} />
                  <AuditStatusBadge value={a.status} />
                  <JiraBadge jiraKey={a.jiraKey} />
                  <span>· {a.auditor}</span>
                  <span>· Échéance {formatDate(a.deadline)}</span>
                </div>
              </div>
              <EditButton kind="audit" id={a.id} />
            </div>
          </PanelItem>
        ))}
      </PanelSection>

      <PanelSection title="Pertes" count={losses.length} icon={<Wallet className="size-3.5" />} onAdd={() => openForm({ kind: 'loss', preset: { riskId: id, category: risk.category } })}>
        {losses.length === 0 && <Empty>Aucune perte enregistrée.</Empty>}
        {losses
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((l) => (
            <PanelItem key={l.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-700">{l.description}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(l.date)}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-red-700 tabular-nums">{formatEur(l.amount)}</p>
                <EditButton kind="loss" id={l.id} />
              </div>
            </PanelItem>
          ))}
      </PanelSection>

      {proc && (
        <div className="px-5">
          <button
            type="button"
            onClick={() => openDrawer({ kind: 'process', id: proc.id })}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-brand-300"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <Workflow className="size-4 text-brand-600" /> Voir le processus « {proc.name} »
            </span>
            <ArrowRight className="size-4 text-slate-400" />
          </button>
        </div>
      )}
    </div>
  )
}

/** Comparaison intrinsèque → résiduel sur une mini-matrice. */
function ScoreComparison({ risk }: { risk: Risk }) {
  const inh = inherentScore(risk)
  const res = residualScore(risk)
  const reduction = inh ? Math.round(((inh - res) / inh) * 100) : 0
  return (
    <div className="mt-4 flex items-center gap-5 rounded-xl bg-slate-50 p-3.5">
      <div className="grid grid-cols-5 gap-0.5" aria-hidden>
        {[5, 4, 3, 2, 1].flatMap((p) =>
          [1, 2, 3, 4, 5].map((i) => {
            const isInh = risk.probability === p && risk.impact === i
            const isRes = risk.residualProbability === p && risk.residualImpact === i
            return (
              <div
                key={`${p}-${i}`}
                className={clsx('flex size-4 items-center justify-center rounded-[3px]', !(isInh || isRes) && 'opacity-35')}
                style={{ backgroundColor: heatColor(p * i) }}
              >
                {isRes && <span className="size-2 rounded-full bg-slate-900 ring-2 ring-white" />}
                {isInh && !isRes && <span className="size-2 rounded-full border-2 border-slate-900 bg-white" />}
              </div>
            )
          }),
        )}
      </div>
      <div className="flex-1 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="size-2 rounded-full border-2 border-slate-900 bg-white" /> Intrinsèque (P{risk.probability} × I{risk.impact})
          </span>
          <ScorePill score={inh} />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="size-2 rounded-full bg-slate-900" /> Résiduel (P{risk.residualProbability} × I{risk.residualImpact})
          </span>
          <ScorePill score={res} />
        </div>
        <p className="text-slate-500">
          Contrôles en place : <span className="text-slate-700">{risk.controlsSummary || '—'}</span>
          {reduction > 0 && <span className="ml-1 font-medium text-emerald-700">(−{reduction} %)</span>}
        </p>
      </div>
    </div>
  )
}
