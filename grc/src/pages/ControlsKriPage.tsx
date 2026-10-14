import clsx from 'clsx'
import { Gauge, Pencil, Plus, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { KriGauge, Sparkline } from '../components/charts/KriVisuals'
import { MiniSelect, SortableTable, type Column } from '../components/ui/SortableTable'
import { ControlTypeBadge, EffectivenessBadge, KriLight } from '../components/ui/badges'
import { RowActions } from '../components/ui/overlays'
import { Button, Card, IconButton, PageHeader, ProgressBar, Segmented } from '../components/ui/primitives'
import { daysFromToday, formatDate, formatNumber } from '../lib/format'
import { CONTROL_TYPE_LABEL, EFFECTIVENESS_LABEL, FREQUENCY_LABEL, KRI_STATUS_LABEL, options } from '../lib/labels'
import { KRI_STYLE, kriStatus } from '../lib/risk'
import { useGrc } from '../store/GrcStore'
import { useScope, useUi } from '../store/UiStore'
import type { Control, ControlEffectiveness, Kri, KriStatus } from '../types'

type Tab = 'controles' | 'kri'

export function ControlsKriPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('vue') === 'kri' ? 'kri' : 'controles'
  const { openForm } = useUi()

  return (
    <div>
      <PageHeader
        title="Contrôles & KRI"
        description="Dispositif de maîtrise (contrôles et leur efficacité) et indicateurs clés de risque avec seuils d'alerte."
        actions={
          <>
            <Segmented
              label="Vue"
              value={tab}
              onChange={(v) => setParams(v === 'kri' ? { vue: 'kri' } : {})}
              options={[
                { value: 'controles', label: <><ShieldCheck className="size-3.5" /> Contrôles</> },
                { value: 'kri', label: <><Gauge className="size-3.5" /> Tableau de bord KRI</> },
              ]}
            />
            <Button variant="primary" onClick={() => openForm({ kind: tab === 'kri' ? 'kri' : 'control' })}>
              <Plus className="size-4" /> {tab === 'kri' ? 'Nouveau KRI' : 'Nouveau contrôle'}
            </Button>
          </>
        }
      />
      {tab === 'controles' ? <ControlsView /> : <KriView />}
    </div>
  )
}

// ─── Contrôles ──────────────────────────────────────────────

const EFF_COLOR: Record<ControlEffectiveness, string> = { suffisant: 'bg-emerald-500', partiel: 'bg-amber-500', insuffisant: 'bg-red-500' }

function ControlsView() {
  const { data, rel } = useGrc()
  const { openDrawer } = useUi()
  const scope = useScope()
  const [type, setType] = useState('')
  const [eff, setEff] = useState('')

  const all = data.controls.filter((c) => scope.visible(c.riskId, c.name, c.owner))
  const rows = all.filter((c) => (!type || c.type === type) && (!eff || c.effectiveness === eff))

  const covered = scope.risks.filter((r) => (rel.controlsByRisk.get(r.id) ?? []).length > 0)
  const wellCovered = scope.risks.filter((r) => (rel.controlsByRisk.get(r.id) ?? []).some((c) => c.effectiveness === 'suffisant'))
  const coverage = scope.risks.length ? Math.round((covered.length / scope.risks.length) * 100) : 0
  const effCount = (['suffisant', 'partiel', 'insuffisant'] as ControlEffectiveness[]).map((e) => ({
    e,
    n: all.filter((c) => c.effectiveness === e).length,
  }))
  const staleLimit = daysFromToday(-365)
  const stale = all.filter((c) => c.lastTestDate < staleLimit).length

  const columns: Column<Control>[] = [
    { key: 'id', header: 'Réf.', sort: (c) => c.id, render: (c) => <span className="font-mono text-xs whitespace-nowrap text-slate-500">{c.id}</span> },
    {
      key: 'name',
      header: 'Contrôle',
      sort: (c) => c.name,
      className: 'max-w-[300px]',
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 group-hover:text-brand-700">{c.name}</p>
          <p className="truncate text-[11px] text-slate-500">{c.testResult}</p>
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Risque couvert',
      sort: (c) => c.riskId,
      className: 'max-w-[220px]',
      render: (c) => (
        <p className="truncate text-xs text-slate-600">
          <span className="font-mono text-slate-400">{c.riskId}</span> {rel.riskById.get(c.riskId)?.name}
        </p>
      ),
    },
    { key: 'type', header: 'Type', sort: (c) => c.type, render: (c) => <ControlTypeBadge value={c.type} /> },
    { key: 'freq', header: 'Fréquence', sort: (c) => c.frequency, render: (c) => <span className="text-xs text-slate-600">{FREQUENCY_LABEL[c.frequency]}</span> },
    { key: 'owner', header: 'Responsable', sort: (c) => c.owner, render: (c) => <span className="text-xs text-slate-600">{c.owner}</span> },
    {
      key: 'eff',
      header: 'Efficacité',
      sort: (c) => ({ suffisant: 3, partiel: 2, insuffisant: 1 })[c.effectiveness],
      render: (c) => <EffectivenessBadge value={c.effectiveness} />,
    },
    { key: 'test', header: 'Dernier test', sort: (c) => c.lastTestDate, render: (c) => <span className="text-xs whitespace-nowrap text-slate-500">{formatDate(c.lastTestDate)}</span> },
    { key: 'a', header: '', render: (c) => <RowActions kind="control" id={c.id} label={c.name} /> },
  ]

  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Couverture des risques</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">{coverage} %</p>
          <ProgressBar value={coverage} color={coverage >= 90 ? 'bg-emerald-500' : 'bg-amber-500'} />
          <p className="mt-1.5 text-[11px] text-slate-500">
            {covered.length}/{scope.risks.length} risques avec au moins un contrôle
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Couverture efficace</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {scope.risks.length ? Math.round((wellCovered.length / scope.risks.length) * 100) : 0} %
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Risques couverts par au moins un contrôle jugé suffisant</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Efficacité des {all.length} contrôles</p>
          <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
            {effCount.map(({ e, n }) =>
              n ? <div key={e} className={clsx('h-full transition-all', EFF_COLOR[e])} style={{ width: `${(n / Math.max(1, all.length)) * 100}%` }} title={`${EFFECTIVENESS_LABEL[e]} : ${n}`} /> : null,
            )}
          </div>
          <div className="mt-2.5 flex justify-between text-[11px] text-slate-600">
            {effCount.map(({ e, n }) => (
              <span key={e} className="flex items-center gap-1">
                <span className={clsx('size-2 rounded-full', EFF_COLOR[e])} />
                {EFFECTIVENESS_LABEL[e]} <strong className="tabular-nums">{n}</strong>
              </span>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Répartition par type</p>
          <div className="mt-2 space-y-1.5">
            {options(CONTROL_TYPE_LABEL).map((t) => {
              const n = all.filter((c) => c.type === t.value).length
              return (
                <div key={t.value} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 text-slate-600">{t.label}</span>
                  <div className="flex-1">
                    <ProgressBar value={(n / Math.max(1, all.length)) * 100} />
                  </div>
                  <span className="w-5 text-right font-semibold text-slate-700 tabular-nums">{n}</span>
                </div>
              )
            })}
            <p className="pt-0.5 text-[11px] text-slate-500">{stale} contrôle(s) non testé(s) depuis plus d'un an</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3">
          <MiniSelect label="Type" value={type} onChange={setType} options={options(CONTROL_TYPE_LABEL)} />
          <MiniSelect label="Efficacité" value={eff} onChange={setEff} options={options(EFFECTIVENESS_LABEL)} />
          <span className="ml-auto text-xs text-slate-500">
            <strong className="text-slate-800">{rows.length}</strong> contrôles
          </span>
        </div>
        <SortableTable rows={rows} columns={columns} initialSort={{ key: 'eff', dir: 'asc' }} onRowClick={(c) => openDrawer({ kind: 'risk', id: c.riskId })} />
      </Card>
    </>
  )
}

// ─── KRI ────────────────────────────────────────────────────

const STATUS_ORDER: Record<KriStatus, number> = { rouge: 0, orange: 1, vert: 2 }

function KriView() {
  const { data } = useGrc()
  const scope = useScope()
  const [status, setStatus] = useState<'' | KriStatus>('')
  const kris = useMemo(
    () =>
      data.kris
        .filter((k) => scope.visible(k.riskId, k.name))
        .sort((a, b) => STATUS_ORDER[kriStatus(a)] - STATUS_ORDER[kriStatus(b)]),
    [data.kris, scope],
  )
  const counts = { rouge: 0, orange: 0, vert: 0 }
  kris.forEach((k) => counts[kriStatus(k)]++)
  const shown = kris.filter((k) => !status || kriStatus(k) === status)

  return (
    <>
      <div className="mb-5 grid grid-cols-3 gap-4">
        {(['rouge', 'orange', 'vert'] as KriStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => setStatus((cur) => (cur === s ? '' : s))}
            className={clsx(
              'flex cursor-pointer items-center gap-4 rounded-xl border bg-white p-4 text-left shadow-xs transition hover:shadow-md',
              status === s ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200',
            )}
          >
            <span className={clsx('flex size-11 items-center justify-center rounded-full', KRI_STYLE[s].soft)}>
              <span className={clsx('size-4 rounded-full', KRI_STYLE[s].dot)} />
            </span>
            <div>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums">{counts[s]}</p>
              <p className="text-xs text-slate-500">KRI — {KRI_STATUS_LABEL[s].toLowerCase()}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {shown.map((k) => (
          <KriCard key={k.id} kri={k} />
        ))}
      </div>
      {shown.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Aucun KRI pour ces filtres.</p>}
    </>
  )
}

function KriCard({ kri }: { kri: Kri }) {
  const { rel } = useGrc()
  const { openDrawer, openForm } = useUi()
  const st = kriStatus(kri)
  const risk = rel.riskById.get(kri.riskId)
  const prev = kri.history[kri.history.length - 2]
  const delta = prev !== undefined ? kri.value - prev : 0

  return (
    <Card className={clsx('group relative overflow-hidden transition hover:shadow-md')}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: KRI_STYLE[st].hex }} />
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-slate-400">{kri.id}</span>
            <KriLight status={st} withLabel />
          </div>
          <h3 className="mt-1 text-sm leading-snug font-semibold text-slate-900">{kri.name}</h3>
        </div>
        <IconButton label={`Modifier ${kri.id}`} onClick={() => openForm({ kind: 'kri', id: kri.id })}>
          <Pencil className="size-3.5" />
        </IconButton>
      </div>

      <div className="flex items-end gap-3 px-4 pt-2">
        <KriGauge kri={kri} size={140} />
        <div className="pb-1">
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">
            {formatNumber(kri.value)}
            <span className="ml-1 text-sm font-normal text-slate-500">{kri.unit}</span>
          </p>
          <p className="text-[11px] text-slate-500">
            {delta === 0 ? 'Stable' : `${delta > 0 ? '+' : ''}${formatNumber(delta)} ${kri.unit} vs mesure précédente`}
          </p>
          <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
            <p>
              <span className="mr-1 inline-block size-1.5 rounded-full bg-amber-500" />
              Alerte {kri.direction === 'hausse_defavorable' ? '≥' : '≤'} {formatNumber(kri.thresholdOrange)} {kri.unit}
            </p>
            <p>
              <span className="mr-1 inline-block size-1.5 rounded-full bg-red-500" />
              Critique {kri.direction === 'hausse_defavorable' ? '≥' : '≤'} {formatNumber(kri.thresholdRed)} {kri.unit}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 pt-1">
        <Sparkline kri={kri} height={56} />
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
        <span>Tendance 12 mesures · {FREQUENCY_LABEL[kri.frequency].toLowerCase()}</span>
        {risk && (
          <button type="button" onClick={() => openDrawer({ kind: 'risk', id: risk.id })} className="max-w-[50%] cursor-pointer truncate font-medium text-brand-700 hover:underline">
            {risk.id} · {risk.name}
          </button>
        )}
      </div>
    </Card>
  )
}
