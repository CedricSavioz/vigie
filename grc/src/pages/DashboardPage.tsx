import clsx from 'clsx'
import { AlertTriangle, ArrowUpRight, CalendarClock, Gauge, Grid3x3, TrendingDown, Wallet, Workflow } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RiskHeatmap, risksInCell, type HeatCell, type HeatMode } from '../components/charts/RiskHeatmap'
import { CategoryBadge, CriticalityBadge, ScorePill } from '../components/ui/badges'
import { Card, CardHeader, PageHeader, ProgressBar, Segmented } from '../components/ui/primitives'
import { lossesLast12Months, monthlyLosses } from '../lib/analytics'
import { formatEur, formatEurCompact } from '../lib/format'
import { CATEGORY_LABEL, CRITICALITY_LABEL } from '../lib/labels'
import { CRIT_STYLE, criticalityOf, effectiveActionStatus, inherentScore, kriStatus, residualScore } from '../lib/risk'
import { useGrc } from '../store/GrcStore'
import { useScope, useUi } from '../store/UiStore'
import type { Criticality, RiskCategory } from '../types'

const tooltipStyle = { fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px -8px rgb(15 23 42 / .18)' }

export function DashboardPage() {
  const { data, rel } = useGrc()
  const { openDrawer } = useUi()
  const navigate = useNavigate()
  const scope = useScope()
  const [mode, setMode] = useState<HeatMode>('residuel')
  const [cell, setCell] = useState<HeatCell | null>(null)

  const risks = scope.risks
  const actions = data.actions.filter((a) => scope.visible(a.riskId, a.title))
  const kris = data.kris.filter((k) => scope.visible(k.riskId, k.name))
  const losses = data.losses.filter((l) => scope.visible(l.riskId, l.description))

  const stats = useMemo(() => {
    const byCrit: Record<Criticality, number> = { H: 0, M: 0, L: 0 }
    risks.forEach((r) => byCrit[criticalityOf(r)]++)
    const open = actions.filter((a) => effectiveActionStatus(a) !== 'termine')
    const late = open.filter((a) => effectiveActionStatus(a) === 'en_retard')
    const onTime = actions.length ? Math.round(((actions.length - late.length) / actions.length) * 100) : 100
    const red = kris.filter((k) => kriStatus(k) === 'rouge').length
    const orange = kris.filter((k) => kriStatus(k) === 'orange').length
    const l12 = lossesLast12Months(losses)
    const total12 = l12.reduce((s, l) => s + l.amount, 0)
    const avgReduction = risks.length
      ? Math.round((risks.reduce((s, r) => s + (inherentScore(r) - residualScore(r)) / inherentScore(r), 0) / risks.length) * 100)
      : 0
    return { byCrit, late: late.length, onTime, red, orange, total12, count12: l12.length, avgReduction }
  }, [risks, actions, kris, losses])

  const monthly = useMemo(() => monthlyLosses(losses), [losses])

  const byCategory = useMemo(() => {
    const m = new Map<RiskCategory, number>()
    risks.forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + 1))
    return [...m.entries()].map(([k, n]) => ({ name: CATEGORY_LABEL[k], n })).sort((a, b) => b.n - a.n)
  }, [risks])

  const critPie = (['H', 'M', 'L'] as Criticality[]).map((c) => ({ c, name: CRITICALITY_LABEL[c], value: stats.byCrit[c] }))

  const topRisks = [...risks].sort((a, b) => residualScore(b) - residualScore(a) || inherentScore(b) - inherentScore(a)).slice(0, 6)
  const cellRisks = cell ? risksInCell(risks, mode, cell) : []

  const exposure = scope.processes.map((p) => {
    const pr = (rel.risksByProcess.get(p.id) ?? []).filter((r) => scope.riskIds.has(r.id))
    const c = { H: 0, M: 0, L: 0 }
    pr.forEach((r) => c[criticalityOf(r)]++)
    return { p, c, total: pr.length }
  })
  const maxExposure = Math.max(1, ...exposure.map((e) => e.total))

  return (
    <div>
      <PageHeader
        title="Vue d'ensemble"
        description="Synthèse du profil de risque de la banque : exposition, dispositif de maîtrise, indicateurs et pertes opérationnelles."
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi icon={<Workflow />} label="Processus cartographiés" value={scope.processes.length} onClick={() => navigate('/cartographie')}>
          <span>{scope.processes.filter((p) => p.status === 'operationnel').length} opérationnels</span>
        </Kpi>
        <Kpi icon={<AlertTriangle />} label="Risques ouverts" value={risks.length} onClick={() => navigate('/risques')}>
          <span className="flex gap-2 font-medium">
            <span className="text-red-600">{stats.byCrit.H} élevés</span>
            <span className="text-amber-600">{stats.byCrit.M} moyens</span>
            <span className="text-emerald-600">{stats.byCrit.L} faibles</span>
          </span>
        </Kpi>
        <Kpi icon={<CalendarClock />} label="Plans d'action à temps" value={`${stats.onTime} %`} onClick={() => navigate('/plans')}>
          <div className="w-full">
            <ProgressBar value={stats.onTime} color={stats.onTime >= 80 ? 'bg-emerald-500' : stats.onTime >= 60 ? 'bg-amber-500' : 'bg-red-500'} />
            <span className="mt-1.5 block">{stats.late} plan(s) en retard</span>
          </div>
        </Kpi>
        <Kpi
          icon={<Gauge />}
          label="KRI au rouge"
          value={<span className={stats.red ? 'text-red-600' : ''}>{stats.red}</span>}
          onClick={() => navigate('/controles?vue=kri')}
        >
          <span>
            sur {kris.length} suivis · {stats.orange} en alerte
          </span>
        </Kpi>
        <Kpi icon={<Wallet />} label="Pertes sur 12 mois" value={formatEurCompact(stats.total12)} onClick={() => navigate('/audit')}>
          <span>{stats.count12} incidents déclarés</span>
        </Kpi>
      </div>

      {/* Heatmap + top risques */}
      <div className="mt-5 grid grid-cols-12 gap-5">
        <Card className="col-span-12 xl:col-span-7">
          <CardHeader
            icon={<Grid3x3 className="size-4" />}
            title="Matrice des risques"
            subtitle="Probabilité × impact. Cliquez une case pour lister les risques correspondants."
            action={
              <Segmented
                label="Type de risque affiché"
                value={mode}
                onChange={(m) => {
                  setMode(m)
                  setCell(null)
                }}
                options={[
                  { value: 'residuel', label: 'Résiduel' },
                  { value: 'intrinseque', label: 'Intrinsèque' },
                ]}
              />
            }
          />
          <div className="px-5 pb-5">
            <RiskHeatmap risks={risks} mode={mode} selected={cell} onSelect={setCell} />
            <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-500">
              <TrendingDown className="size-3.5 text-emerald-600" />
              <span>
                Les contrôles réduisent en moyenne le score de risque de <strong className="text-slate-800">{stats.avgReduction} %</strong>
              </span>
            </div>
            {cell && (
              <div className="mt-3 animate-fade-in rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-600">
                  Probabilité {cell.p} × impact {cell.i} — {cellRisks.length} risque(s)
                </p>
                {cellRisks.length === 0 && <p className="text-xs text-slate-400">Aucun risque dans cette case.</p>}
                <div className="space-y-1">
                  {cellRisks.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openDrawer({ kind: 'risk', id: r.id })}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm transition hover:shadow-sm"
                    >
                      <span className="font-mono text-[11px] text-slate-400">{r.id}</span>
                      <span className="flex-1 truncate text-slate-700">{r.name}</span>
                      <CategoryBadge value={r.category} />
                      <ArrowUpRight className="size-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="col-span-12 xl:col-span-5">
          <CardHeader icon={<AlertTriangle className="size-4" />} title="Risques résiduels les plus élevés" subtitle="Classés par score net (après contrôles)" />
          <div className="divide-y divide-slate-100 px-2 pb-2">
            {topRisks.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => openDrawer({ kind: 'risk', id: r.id })}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50"
              >
                <ScorePill score={residualScore(r)} title="Score résiduel" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{r.name}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {rel.processById.get(r.processId)?.name} · {r.owner}
                  </p>
                </div>
                <CriticalityBadge value={criticalityOf(r)} compact />
                <ArrowUpRight className="size-3.5 text-slate-300 transition group-hover:text-brand-600" />
              </button>
            ))}
            {topRisks.length === 0 && <p className="p-4 text-sm text-slate-400">Aucun risque pour ces filtres.</p>}
          </div>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="mt-5 grid grid-cols-12 gap-5">
        <Card className="col-span-12 xl:col-span-6">
          <CardHeader icon={<Wallet className="size-4" />} title="Évolution des pertes opérationnelles" subtitle="Montant mensuel sur 12 mois glissants" />
          <div className="h-64 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1f5fe0" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#1f5fe0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => formatEurCompact(v)} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={64} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatEur(Number(v)), 'Pertes']} />
                <Area type="monotone" dataKey="montant" stroke="#1f5fe0" strokeWidth={2} fill="url(#lossFill)" activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-3">
          <CardHeader title="Risques par catégorie" subtitle={`${risks.length} risques`} />
          <div className="h-64 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} formatter={(v) => [v, 'Risques']} />
                <Bar dataKey="n" fill="#1f5fe0" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#334155' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 xl:col-span-3">
          <CardHeader title="Répartition par criticité" subtitle="Criticité résiduelle" />
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={critPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                  {critPie.map((d) => (
                    <Cell key={d.c} fill={CRIT_STYLE[d.c].hex} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-slate-900">{risks.length}</span>
              <span className="text-[11px] text-slate-500">risques</span>
            </div>
          </div>
          <div className="space-y-1.5 px-5 pb-5">
            {critPie.map((d) => (
              <div key={d.c} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={clsx('size-2.5 rounded-sm', CRIT_STYLE[d.c].dot)} />
                  {d.name}
                </span>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {d.value} <span className="font-normal text-slate-400">({risks.length ? Math.round((d.value / risks.length) * 100) : 0} %)</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Exposition par processus */}
      <Card className="mt-5">
        <CardHeader icon={<Workflow className="size-4" />} title="Exposition par processus" subtitle="Nombre de risques par criticité résiduelle — cliquez pour ouvrir la fiche processus" />
        <div className="grid grid-cols-1 gap-x-10 gap-y-1 px-5 pb-5 lg:grid-cols-2">
          {exposure.map(({ p, c, total }) => (
            <button
              key={p.id}
              type="button"
              onClick={() => openDrawer({ kind: 'process', id: p.id })}
              className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
            >
              <span className="w-56 truncate text-sm text-slate-700 group-hover:text-brand-700">{p.name}</span>
              <div className="flex h-2.5 flex-1 gap-0.5">
                {(['H', 'M', 'L'] as Criticality[]).map((k) =>
                  c[k] ? (
                    <div
                      key={k}
                      title={`${c[k]} risque(s) ${CRITICALITY_LABEL[k].toLowerCase()}(s)`}
                      className={clsx('h-full rounded-[3px] transition-all', CRIT_STYLE[k].bg)}
                      style={{ width: `${(c[k] / maxExposure) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
              <span className="w-6 text-right text-xs font-semibold text-slate-700 tabular-nums">{total}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Kpi({ icon, label, value, children, onClick }: { icon: ReactNode; label: string; value: ReactNode; children?: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-slate-200/80 bg-white p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 [&>svg]:size-4">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <div className="mt-1.5 flex text-[11px] text-slate-500">{children}</div>
    </button>
  )
}
