import { Download, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MiniSelect, SortableTable, type Column } from '../components/ui/SortableTable'
import { CategoryBadge, CriticalityBadge, ScorePill, TreatmentBadge } from '../components/ui/badges'
import { RowActions } from '../components/ui/overlays'
import { Button, Card, PageHeader } from '../components/ui/primitives'
import { CATEGORY_LABEL, CRITICALITY_LABEL, options, TREATMENT_LABEL } from '../lib/labels'
import { criticalityOf, inherentScore, residualScore } from '../lib/risk'
import { useGrc } from '../store/GrcStore'
import { useScope, useUi } from '../store/UiStore'
import type { Risk } from '../types'

export function RiskRegisterPage() {
  const { rel } = useGrc()
  const { openDrawer, openForm, notify } = useUi()
  const scope = useScope()
  const [owner, setOwner] = useState('')
  const [treatment, setTreatment] = useState('')

  const owners = useMemo(() => [...new Set(scope.risks.map((r) => r.owner))].sort().map((o) => ({ value: o, label: o })), [scope.risks])
  const rows = scope.risks.filter((r) => (!owner || r.owner === owner) && (!treatment || r.treatment === treatment))

  const columns: Column<Risk>[] = [
    { key: 'id', header: 'Réf.', render: (r) => <span className="font-mono text-xs whitespace-nowrap text-slate-500">{r.id}</span>, sort: (r) => r.id },
    {
      key: 'name',
      header: 'Risque',
      sort: (r) => r.name,
      className: 'max-w-[320px]',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 group-hover:text-brand-700">{r.name}</p>
          <p className="truncate text-[11px] text-slate-500">
            {rel.processById.get(r.processId)?.name}
            {rel.activityById.get(r.activityId) && ` › ${rel.activityById.get(r.activityId)!.name}`}
          </p>
        </div>
      ),
    },
    {
      key: 'domain',
      header: 'Domaine',
      sort: (r) => rel.processById.get(r.processId)?.domain ?? '',
      render: (r) => <span className="text-xs whitespace-nowrap text-slate-600">{rel.processById.get(r.processId)?.domain}</span>,
    },
    { key: 'cat', header: 'Catégorie', sort: (r) => CATEGORY_LABEL[r.category], render: (r) => <CategoryBadge value={r.category} /> },
    { key: 'owner', header: 'Porteur', sort: (r) => r.owner, render: (r) => <span className="text-xs text-slate-600">{r.owner}</span> },
    { key: 'p', header: 'P', align: 'center', sort: (r) => r.probability, render: (r) => <span className="tabular-nums">{r.probability}</span> },
    { key: 'i', header: 'I', align: 'center', sort: (r) => r.impact, render: (r) => <span className="tabular-nums">{r.impact}</span> },
    { key: 'inh', header: 'Intrinsèque', align: 'center', sort: inherentScore, render: (r) => <ScorePill score={inherentScore(r)} /> },
    { key: 'res', header: 'Résiduel', align: 'center', sort: residualScore, render: (r) => <ScorePill score={residualScore(r)} /> },
    {
      key: 'crit',
      header: 'Criticité',
      sort: (r) => ({ H: 3, M: 2, L: 1 })[criticalityOf(r)],
      render: (r) => <CriticalityBadge value={criticalityOf(r)} />,
    },
    { key: 'treat', header: 'Traitement', sort: (r) => r.treatment, render: (r) => <TreatmentBadge value={r.treatment} /> },
    {
      key: 'cov',
      header: 'Ctrl · KRI · PA',
      align: 'center',
      sort: (r) => (rel.controlsByRisk.get(r.id) ?? []).length,
      render: (r) => {
        const c = (rel.controlsByRisk.get(r.id) ?? []).length
        return (
          <span className="text-xs whitespace-nowrap text-slate-500 tabular-nums">
            <span className={c === 0 ? 'font-semibold text-red-600' : 'text-slate-700'}>{c}</span> · {(rel.krisByRisk.get(r.id) ?? []).length} ·{' '}
            {(rel.actionsByRisk.get(r.id) ?? []).length}
          </span>
        )
      },
    },
    { key: 'actions', header: '', render: (r) => <RowActions kind="risk" id={r.id} label={r.name} /> },
  ]

  const exportCsv = () => {
    const header = ['Référence', 'Risque', 'Processus', 'Domaine', 'Catégorie', 'Porteur', 'P', 'I', 'Intrinsèque', 'P rés.', 'I rés.', 'Résiduel', 'Criticité', 'Traitement']
    const lines = rows.map((r) => {
      const p = rel.processById.get(r.processId)
      return [r.id, r.name, p?.name, p?.domain, CATEGORY_LABEL[r.category], r.owner, r.probability, r.impact, inherentScore(r), r.residualProbability, r.residualImpact, residualScore(r), CRITICALITY_LABEL[criticalityOf(r)], TREATMENT_LABEL[r.treatment]]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(';')
    })
    const blob = new Blob(['﻿' + [header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'registre-des-risques.csv'
    a.click()
    URL.revokeObjectURL(a.href)
    notify(`${rows.length} risques exportés`, 'info')
  }

  const crits = { H: 0, M: 0, L: 0 }
  rows.forEach((r) => crits[criticalityOf(r)]++)

  return (
    <div>
      <PageHeader
        title="Registre des risques"
        description="Inventaire des risques par processus avec cotation intrinsèque et résiduelle. Cliquez une ligne pour ouvrir le détail : contrôles, KRI, plans d'action, audit et pertes."
        actions={
          <>
            <Button onClick={exportCsv}>
              <Download className="size-4" /> Exporter (CSV)
            </Button>
            <Button variant="primary" onClick={() => openForm({ kind: 'risk' })}>
              <Plus className="size-4" /> Nouveau risque
            </Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-3">
          <MiniSelect label="Porteur" value={owner} onChange={setOwner} options={owners} />
          <MiniSelect label="Traitement" value={treatment} onChange={setTreatment} options={options(TREATMENT_LABEL)} />
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            <span>
              <strong className="text-slate-800">{rows.length}</strong> risques
            </span>
            {(['H', 'M', 'L'] as const).map((c) => (
              <span key={c} className="flex items-center gap-1">
                <CriticalityBadge value={c} compact />
                <span className="tabular-nums">{crits[c]}</span>
              </span>
            ))}
          </div>
        </div>
        <SortableTable
          rows={rows}
          columns={columns}
          initialSort={{ key: 'res', dir: 'desc' }}
          onRowClick={(r) => openDrawer({ kind: 'risk', id: r.id })}
        />
      </Card>
    </div>
  )
}
