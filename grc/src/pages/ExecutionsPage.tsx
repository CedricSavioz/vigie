import clsx from 'clsx'
import { Plus, UserRound } from 'lucide-react'
import { useState } from 'react'
import { ExecutionSheet, type ExecRole } from '../components/executions/ExecutionSheet'
import { SortableTable, type Column } from '../components/ui/SortableTable'
import { ConclusionBadge, ExecutionStatusBadge, JiraBadge } from '../components/ui/badges'
import { Button, Card, PageHeader, Segmented } from '../components/ui/primitives'
import { isOverdue, isToDo } from '../lib/execution'
import { daysUntil, formatDate } from '../lib/format'
import { useGrc } from '../store/GrcStore'
import { useScope, useUi } from '../store/UiStore'
import type { ControlExecution } from '../types'

type Tab = 'a_traiter' | 'a_valider' | 'validees' | 'toutes'

const STATUS_ORDER = { a_reprendre: 0, a_realiser: 1, en_cours: 2, soumis: 3, valide: 4 }

export function ExecutionsPage() {
  const { data, rel } = useGrc()
  const { openForm } = useUi()
  const scope = useScope()
  const [role, setRole] = useState<ExecRole>('executant')
  const [tab, setTab] = useState<Tab>('a_traiter')
  const [openId, setOpenId] = useState<string | null>(null)

  const controlById = new Map(data.controls.map((c) => [c.id, c]))
  const all = data.executions.filter((e) => {
    const c = controlById.get(e.controlId)
    return c && scope.visible(c.riskId, c.name, e.executor, e.reviewer, e.period)
  })

  const toDo = all.filter(isToDo)
  const toValidate = all.filter((e) => e.status === 'soumis')
  const validated = all.filter((e) => e.status === 'valide')
  const overdue = all.filter(isOverdue)
  const conformRate = validated.length ? Math.round((validated.filter((e) => e.conclusion === 'conforme').length / validated.length) * 100) : null

  const rows = { a_traiter: toDo, a_valider: toValidate, validees: validated, toutes: all }[tab]

  const columns: Column<ControlExecution>[] = [
    {
      key: 'jira',
      header: 'Ticket',
      sort: (e) => Number(e.jiraKey?.split('-')[1] ?? 0),
      render: (e) => <JiraBadge jiraKey={e.jiraKey} />,
    },
    {
      key: 'control',
      header: 'Contrôle à réaliser',
      sort: (e) => controlById.get(e.controlId)?.name ?? '',
      className: 'max-w-[300px]',
      render: (e) => {
        const c = controlById.get(e.controlId)
        const r = c ? rel.riskById.get(c.riskId) : undefined
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800 group-hover:text-brand-700">{c?.name}</p>
            <p className="truncate text-[11px] text-slate-500">
              {c?.id} · {r ? `${r.id} ${r.name}` : '—'}
            </p>
          </div>
        )
      },
    },
    { key: 'period', header: 'Période', sort: (e) => e.dueDate, render: (e) => <span className="text-xs text-slate-600">{e.period}</span> },
    {
      key: 'who',
      header: role === 'executant' ? 'Exécutant' : 'Valideur',
      sort: (e) => (role === 'executant' ? e.executor : e.reviewer),
      render: (e) => {
        const [name, service] = (role === 'executant' ? e.executor : e.reviewer).split(' · ')
        return (
          <div className="text-xs whitespace-nowrap">
            <p className="font-medium text-slate-700">{name}</p>
            {service && <p className="text-[11px] text-slate-500">{service}</p>}
          </div>
        )
      },
    },
    {
      key: 'due',
      header: 'Échéance',
      sort: (e) => e.dueDate,
      render: (e) => {
        const d = daysUntil(e.dueDate)
        return (
          <div className={clsx('text-xs whitespace-nowrap', isOverdue(e) ? 'font-semibold text-red-600' : isToDo(e) && d <= 5 ? 'text-amber-700' : 'text-slate-500')}>
            <p>{formatDate(e.dueDate)}</p>
            {isToDo(e) && <p className="text-[11px]">{d < 0 ? `${-d} j de retard` : `J-${d}`}</p>}
          </div>
        )
      },
    },
    {
      key: 'progress',
      header: 'Échantillon',
      align: 'center',
      sort: (e) => e.sample.filter((s) => s.result).length / Math.max(1, e.sample.length),
      render: (e) => {
        const done = e.sample.filter((s) => s.result).length
        const ko = e.sample.filter((s) => s.result === 'anomalie').length
        return (
          <div className="mx-auto w-24">
            <div className="flex h-1.5 gap-px overflow-hidden rounded-full bg-slate-100">
              {e.sample.map((s, i) => (
                <span key={i} className={clsx('h-full flex-1', s.result === 'conforme' ? 'bg-emerald-500' : s.result === 'anomalie' ? 'bg-red-500' : 'bg-slate-200')} />
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-500 tabular-nums">
              {done}/{e.sample.length}
              {ko > 0 && <span className="text-red-600"> · {ko} KO</span>}
            </p>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Statut',
      sort: (e) => (isOverdue(e) ? -1 : STATUS_ORDER[e.status]),
      render: (e) => <ExecutionStatusBadge value={e.status} overdue={isOverdue(e)} />,
    },
    { key: 'conclusion', header: 'Conclusion', sort: (e) => e.conclusion, render: (e) => <ConclusionBadge value={e.conclusion} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Réalisation des contrôles"
        description="Les fiches que reçoit le métier (1re ligne) à chaque échéance d'un contrôle, puis leur validation. En production, chaque fiche est un ticket Jira ; sa validation met à jour le référentiel des contrôles."
        actions={
          <>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <UserRound className="size-3.5" /> Rôle simulé
              </span>
              <Segmented
                label="Rôle simulé"
                value={role}
                onChange={(r) => {
                  setRole(r)
                  setTab(r === 'executant' ? 'a_traiter' : 'a_valider')
                }}
                options={[
                  { value: 'executant', label: 'Exécutant (1re ligne)' },
                  { value: 'valideur', label: 'Valideur' },
                ]}
              />
            </div>
            <Button variant="primary" onClick={() => openForm({ kind: 'execution' })}>
              <Plus className="size-4" /> Planifier une exécution
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="À réaliser" value={toDo.length} hint="Fiches à démarrer, en cours ou à reprendre" onClick={() => setTab('a_traiter')} active={tab === 'a_traiter'} />
        <Kpi label="En retard" value={overdue.length} hint="Non soumises à l'échéance" tone={overdue.length ? 'text-red-600' : undefined} onClick={() => setTab('a_traiter')} />
        <Kpi label="En attente de validation" value={toValidate.length} hint="Soumises par la 1re ligne" tone={toValidate.length ? 'text-violet-700' : undefined} onClick={() => setTab('a_valider')} active={tab === 'a_valider'} />
        <Kpi
          label="Taux de conformité"
          value={conformRate === null ? '—' : `${conformRate} %`}
          hint={`Sur ${validated.length} fiche(s) validée(s)`}
          onClick={() => setTab('validees')}
          active={tab === 'validees'}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
          <Segmented
            label="Filtrer les fiches"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'a_traiter', label: `À traiter (${toDo.length})` },
              { value: 'a_valider', label: `À valider (${toValidate.length})` },
              { value: 'validees', label: `Validées (${validated.length})` },
              { value: 'toutes', label: `Toutes (${all.length})` },
            ]}
          />
          <span className="ml-auto text-xs text-slate-500">Cliquez une ligne pour ouvrir la fiche de réalisation.</span>
        </div>
        <SortableTable
          rows={rows}
          columns={columns}
          initialSort={{ key: 'status', dir: 'asc' }}
          onRowClick={(e) => setOpenId(e.id)}
          empty="Aucune fiche dans cette vue."
        />
      </Card>

      {openId && <ExecutionSheet key={openId} id={openId} role={role} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function Kpi({ label, value, hint, tone, onClick, active }: { label: string; value: string | number; hint: string; tone?: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'cursor-pointer rounded-xl border bg-white p-4 text-left shadow-xs transition hover:shadow-md',
        active ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200/80',
      )}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={clsx('mt-1.5 text-2xl font-semibold tabular-nums', tone ?? 'text-slate-900')}>{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
    </button>
  )
}
