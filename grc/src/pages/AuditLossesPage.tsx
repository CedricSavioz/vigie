import clsx from 'clsx'
import { ClipboardCheck, Plus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MiniSelect, SortableTable, type Column } from '../components/ui/SortableTable'
import { AuditStatusBadge, CategoryBadge, JiraBadge, SeverityBadge } from '../components/ui/badges'
import { RowActions } from '../components/ui/overlays'
import { Button, Card, CardHeader, PageHeader } from '../components/ui/primitives'
import { lossesLast12Months, monthlyLosses } from '../lib/analytics'
import { daysUntil, formatDate, formatEur, formatEurCompact } from '../lib/format'
import { AUDIT_SEVERITY_LABEL, AUDIT_STATUS_LABEL, CATEGORY_LABEL, options } from '../lib/labels'
import { useGrc } from '../store/GrcStore'
import { useScope, useUi } from '../store/UiStore'
import type { AuditRecommendation, AuditSeverity, Loss } from '../types'

const tooltipStyle = { fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }
const SEV_RANK: Record<AuditSeverity, number> = { critique: 4, elevee: 3, moyenne: 2, faible: 1 }

export function AuditLossesPage() {
  const { openForm } = useUi()
  return (
    <div>
      <PageHeader
        title="Audit & pertes"
        description="Recommandations émises par l'audit interne, l'inspection et le superviseur, et registre des pertes opérationnelles rattachées aux risques."
        actions={
          <>
            <Button onClick={() => openForm({ kind: 'audit' })}>
              <Plus className="size-4" /> Recommandation
            </Button>
            <Button variant="primary" onClick={() => openForm({ kind: 'loss' })}>
              <Plus className="size-4" /> Déclarer une perte
            </Button>
          </>
        }
      />
      <AuditSection />
      <LossSection />
    </div>
  )
}

function AuditSection() {
  const { data, rel } = useGrc()
  const { openDrawer } = useUi()
  const scope = useScope()
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')

  const all = data.audits.filter((a) => scope.visible(a.riskId, a.title, a.auditor, a.description))
  const rows = all.filter((a) => (!status || a.status === status) && (!severity || a.severity === severity))
  const open = all.filter((a) => a.status !== 'cloturee')
  const overdue = open.filter((a) => daysUntil(a.deadline) < 0)

  const columns: Column<AuditRecommendation>[] = [
    { key: 'id', header: 'Réf.', sort: (a) => a.id, render: (a) => <span className="font-mono text-xs whitespace-nowrap text-slate-500">{a.id}</span> },
    { key: 'jira', header: 'Jira', sort: (a) => Number(a.jiraKey?.split('-')[1] ?? 0), render: (a) => <JiraBadge jiraKey={a.jiraKey} /> },
    {
      key: 'title',
      header: 'Recommandation',
      sort: (a) => a.title,
      className: 'max-w-[360px]',
      render: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 group-hover:text-brand-700">{a.title}</p>
          <p className="truncate text-[11px] text-slate-500">{a.description}</p>
        </div>
      ),
    },
    { key: 'auditor', header: 'Émetteur', sort: (a) => a.auditor, render: (a) => <span className="text-xs whitespace-nowrap text-slate-600">{a.auditor}</span> },
    { key: 'sev', header: 'Sévérité', sort: (a) => SEV_RANK[a.severity], render: (a) => <SeverityBadge value={a.severity} /> },
    {
      key: 'risk',
      header: 'Risque lié',
      sort: (a) => a.riskId,
      className: 'max-w-[200px]',
      render: (a) => (
        <p className="truncate text-xs text-slate-600">
          {a.riskId ? (
            <>
              <span className="font-mono text-slate-400">{a.riskId}</span> {rel.riskById.get(a.riskId)?.name}
            </>
          ) : (
            '—'
          )}
        </p>
      ),
    },
    { key: 'status', header: 'Statut', sort: (a) => a.status, render: (a) => <AuditStatusBadge value={a.status} /> },
    {
      key: 'deadline',
      header: 'Échéance',
      sort: (a) => a.deadline,
      render: (a) => {
        const late = a.status !== 'cloturee' && daysUntil(a.deadline) < 0
        return <span className={clsx('text-xs whitespace-nowrap', late ? 'font-semibold text-red-600' : 'text-slate-500')}>{formatDate(a.deadline)}{late && ' · dépassée'}</span>
      },
    },
    { key: 'a', header: '', render: (a) => <RowActions kind="audit" id={a.id} label={a.title} /> },
  ]

  return (
    <Card className="mb-6">
      <CardHeader
        icon={<ClipboardCheck className="size-4" />}
        title="Recommandations d'audit"
        subtitle={`${open.length} ouvertes · ${overdue.length} en dépassement d'échéance · ${open.filter((a) => a.severity === 'critique').length} critiques`}
      />
      <div className="grid grid-cols-2 gap-3 px-5 pb-4 md:grid-cols-4">
        {(['critique', 'elevee', 'moyenne', 'faible'] as AuditSeverity[]).map((s) => {
          const n = open.filter((a) => a.severity === s).length
          return (
            <button
              key={s}
              type="button"
              aria-pressed={severity === s}
              onClick={() => setSeverity((cur) => (cur === s ? '' : s))}
              className={clsx(
                'flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left transition hover:bg-slate-50',
                severity === s ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-200',
              )}
            >
              <SeverityBadge value={s} />
              <span className="text-lg font-semibold text-slate-900 tabular-nums">{n}</span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 border-y border-slate-100 px-5 py-3">
        <MiniSelect label="Statut" value={status} onChange={setStatus} options={options(AUDIT_STATUS_LABEL)} />
        <MiniSelect label="Sévérité" value={severity} onChange={setSeverity} options={options(AUDIT_SEVERITY_LABEL)} />
      </div>
      <SortableTable rows={rows} columns={columns} initialSort={{ key: 'sev', dir: 'desc' }} onRowClick={(a) => a.riskId && openDrawer({ kind: 'risk', id: a.riskId })} />
    </Card>
  )
}

function LossSection() {
  const { data, rel } = useGrc()
  const { openDrawer } = useUi()
  const scope = useScope()
  const losses = data.losses.filter((l) => scope.visible(l.riskId, l.description))
  const l12 = lossesLast12Months(losses)
  const total12 = l12.reduce((s, l) => s + l.amount, 0)
  const biggest = [...losses].sort((a, b) => b.amount - a.amount)[0]
  const monthly = monthlyLosses(losses)
  const catTotals = new Map<string, number>()
  l12.forEach((l) => catTotals.set(CATEGORY_LABEL[l.category], (catTotals.get(CATEGORY_LABEL[l.category]) ?? 0) + l.amount))
  const byCat = [...catTotals.entries()].map(([name, montant]) => ({ name, montant })).sort((a, b) => b.montant - a.montant)

  const columns: Column<Loss>[] = [
    { key: 'id', header: 'Réf.', sort: (l) => l.id, render: (l) => <span className="font-mono text-xs whitespace-nowrap text-slate-500">{l.id}</span> },
    { key: 'date', header: 'Date', sort: (l) => l.date, render: (l) => <span className="text-xs whitespace-nowrap text-slate-600">{formatDate(l.date)}</span> },
    { key: 'desc', header: 'Incident', sort: (l) => l.description, className: 'max-w-[380px]', render: (l) => <p className="truncate text-slate-800 group-hover:text-brand-700">{l.description}</p> },
    { key: 'cat', header: 'Catégorie', sort: (l) => l.category, render: (l) => <CategoryBadge value={l.category} /> },
    {
      key: 'risk',
      header: 'Risque lié',
      sort: (l) => l.riskId,
      className: 'max-w-[200px]',
      render: (l) => (
        <p className="truncate text-xs text-slate-600">
          {l.riskId ? (
            <>
              <span className="font-mono text-slate-400">{l.riskId}</span> {rel.riskById.get(l.riskId)?.name}
            </>
          ) : (
            '—'
          )}
        </p>
      ),
    },
    { key: 'amount', header: 'Montant', align: 'right', sort: (l) => l.amount, render: (l) => <span className="font-semibold whitespace-nowrap text-slate-900 tabular-nums">{formatEur(l.amount)}</span> },
    { key: 'a', header: '', render: (l) => <RowActions kind="loss" id={l.id} label={l.description} /> },
  ]

  return (
    <Card>
      <CardHeader icon={<Wallet className="size-4" />} title="Registre des pertes" subtitle="Pertes opérationnelles et réglementaires, nettes des récupérations" />
      <div className="grid grid-cols-1 gap-5 px-5 pb-5 xl:grid-cols-12">
        <div className="grid grid-cols-3 gap-3 xl:col-span-12">
          <Metric label="Pertes sur 12 mois" value={formatEur(total12)} />
          <Metric label="Incidents sur 12 mois" value={String(l12.length)} />
          <Metric label="Perte unitaire maximale" value={biggest ? formatEurCompact(biggest.amount) : '—'} hint={biggest?.description} />
        </div>
        <div className="h-60 xl:col-span-7">
          <p className="mb-2 text-xs font-medium text-slate-600">Montant mensuel</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatEurCompact(v)} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={60} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} formatter={(v, _n, p) => [`${formatEur(Number(v))} (${p.payload.nombre} incident(s))`, 'Pertes']} />
              <Bar dataKey="montant" fill="#1f5fe0" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-60 xl:col-span-5">
          <p className="mb-2 text-xs font-medium text-slate-600">Par catégorie (12 mois)</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={byCat} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} formatter={(v) => [formatEur(Number(v)), 'Pertes']} />
              <Bar dataKey="montant" fill="#16397f" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#334155', formatter: (v: unknown) => formatEurCompact(Number(v)) }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <SortableTable rows={losses} columns={columns} initialSort={{ key: 'date', dir: 'desc' }} onRowClick={(l) => l.riskId && openDrawer({ kind: 'risk', id: l.riskId })} />
      </div>
    </Card>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="truncate text-[11px] text-slate-400" title={hint}>{hint}</p>}
    </div>
  )
}
