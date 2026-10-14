import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import clsx from 'clsx'
import { LayoutGrid, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useFlowNodes } from '../components/charts/useFlowNodes'
import { Badge, Button, PageHeader } from '../components/ui/primitives'
import { CRIT_STYLE, criticalityOf, maxCriticality, residualScore } from '../lib/risk'
import { useGrc } from '../store/GrcStore'
import { useScope, useUi } from '../store/UiStore'
import type { Criticality, Process, Risk } from '../types'

// ─── Types de nœuds ─────────────────────────────────────────

type ProcessNodeData = {
  process: Process
  crit: Criticality | null
  counts: Record<Criticality, number>
  onOpen: () => void
}
type ActivityNodeData = {
  step: number
  name: string
  owner: string
  risks: Risk[]
  crit: Criticality | null
  onOpenProcess: () => void
  onOpenRisk: (id: string) => void
}
type ProcessNode = Node<ProcessNodeData, 'process'>
type ActivityNode = Node<ActivityNodeData, 'activity'>

const CRIT_BORDER: Record<Criticality, string> = { H: 'border-l-red-500', M: 'border-l-amber-500', L: 'border-l-emerald-500' }

function ProcessNodeView({ data }: NodeProps<ProcessNode>) {
  const { process, crit, counts, onOpen } = data
  return (
    <div
      onClick={onOpen}
      className="w-[260px] cursor-pointer rounded-xl bg-brand-900 p-3.5 text-white shadow-lg ring-1 ring-brand-800 transition hover:shadow-xl hover:ring-2 hover:ring-brand-400"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-brand-300">{process.id}</span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-brand-100">{process.domain}</span>
      </div>
      <p className="mt-1.5 text-sm leading-snug font-semibold">{process.name}</p>
      <div className="mt-2.5 flex items-center gap-2 text-[10px]">
        {crit && <span className={clsx('size-2.5 rounded-full ring-2 ring-white/30', CRIT_STYLE[crit].bg)} title="Criticité maximale" />}
        <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-semibold text-red-200">{counts.H} H</span>
        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-semibold text-amber-200">{counts.M} M</span>
        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-semibold text-emerald-200">{counts.L} L</span>
        <span className="ml-auto text-brand-300">Détail →</span>
      </div>
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-brand-400" />
    </div>
  )
}

function ActivityNodeView({ data }: NodeProps<ActivityNode>) {
  const { step, name, owner, risks, crit, onOpenProcess, onOpenRisk } = data
  return (
    <div
      onClick={onOpenProcess}
      className={clsx(
        'w-[200px] cursor-pointer rounded-lg border border-l-4 border-slate-200 bg-white px-3 py-2.5 shadow-sm transition hover:shadow-md',
        crit ? CRIT_BORDER[crit] : 'border-l-slate-300',
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-slate-300" />
      <div className="flex items-center gap-1.5">
        <span className="flex size-4 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600">{step}</span>
        <p className="truncate text-xs font-semibold text-slate-800" title={name}>
          {name}
        </p>
      </div>
      <p className="mt-0.5 truncate text-[10px] text-slate-500">{owner}</p>
      <div className="mt-1.5 flex min-h-[18px] flex-wrap gap-1">
        {risks.length === 0 && <span className="text-[10px] text-slate-300">Aucun risque</span>}
        {risks.map((r) => {
          const c = criticalityOf(r)
          return (
            <button
              key={r.id}
              type="button"
              title={`${r.name} (score résiduel ${residualScore(r)})`}
              onClick={(e) => {
                e.stopPropagation()
                onOpenRisk(r.id)
              }}
              className={clsx(
                'nodrag cursor-pointer rounded px-1 py-px text-[9px] font-bold ring-1 transition ring-inset hover:scale-110',
                CRIT_STYLE[c].soft,
                CRIT_STYLE[c].text,
                CRIT_STYLE[c].ring,
              )}
            >
              {r.id}
            </button>
          )
        })}
      </div>
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-slate-300" />
    </div>
  )
}

const nodeTypes = { process: ProcessNodeView, activity: ActivityNodeView }

// ─── Page ───────────────────────────────────────────────────

const ROW_H = 150
const COL_W = 236

export function ProcessMapPage() {
  const { rel } = useGrc()
  const { openDrawer, openForm } = useUi()
  const scope = useScope()

  const { computedNodes, edges } = useMemo(() => {
    const nodes: (ProcessNode | ActivityNode)[] = []
    const edges: Edge[] = []
    const visibleProcesses = scope.processes.filter(
      (p) => !scope.filtersActive || (rel.risksByProcess.get(p.id) ?? []).some((r) => scope.riskIds.has(r.id)),
    )
    visibleProcesses.forEach((p, row) => {
      const pRisks = (rel.risksByProcess.get(p.id) ?? []).filter((r) => scope.riskIds.has(r.id))
      const counts: Record<Criticality, number> = { H: 0, M: 0, L: 0 }
      pRisks.forEach((r) => counts[criticalityOf(r)]++)
      const openProcess = () => openDrawer({ kind: 'process', id: p.id })
      nodes.push({
        id: p.id,
        type: 'process',
        position: { x: 0, y: row * ROW_H },
        data: { process: p, crit: maxCriticality(pRisks.map(criticalityOf)), counts, onOpen: openProcess },
      })
      let prev = p.id
      p.activities.forEach((a, j) => {
        const aRisks = pRisks.filter((r) => r.activityId === a.id)
        nodes.push({
          id: a.id,
          type: 'activity',
          position: { x: 320 + j * COL_W, y: row * ROW_H + 4 },
          data: {
            step: j + 1,
            name: a.name,
            owner: a.owner,
            risks: aRisks,
            crit: maxCriticality(aRisks.map(criticalityOf)),
            onOpenProcess: openProcess,
            onOpenRisk: (id) => openDrawer({ kind: 'risk', id }),
          },
        })
        edges.push({
          id: `${prev}->${a.id}`,
          source: prev,
          target: a.id,
          type: 'smoothstep',
          animated: j === 0,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
          style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        })
        prev = a.id
      })
    })
    return { computedNodes: nodes, edges }
  }, [scope, rel, openDrawer])

  const { nodes, onNodesChange, resetLayout } = useFlowNodes(computedNodes)

  return (
    <div>
      <PageHeader
        title="Cartographie des processus"
        description="Chaque processus et le tracé de ses activités. Les activités sont colorées selon la criticité résiduelle maximale de leurs risques. Cliquez un processus ou une activité pour ouvrir sa fiche, un identifiant de risque pour son détail."
        actions={
          <>
            <Button onClick={resetLayout}>
              <LayoutGrid className="size-4" /> Réorganiser
            </Button>
            <Button onClick={() => openForm({ kind: 'activity' })}>
              <Plus className="size-4" /> Activité
            </Button>
            <Button variant="primary" onClick={() => openForm({ kind: 'process' })}>
              <Plus className="size-4" /> Processus
            </Button>
          </>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-600">
        <span className="font-semibold text-slate-700">Légende</span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-5 rounded bg-brand-900" /> Processus
        </span>
        {(['H', 'M', 'L'] as Criticality[]).map((c) => (
          <span key={c} className="flex items-center gap-2">
            <span className={clsx('h-3 w-5 rounded border border-l-4 border-slate-200 bg-white', CRIT_BORDER[c])} />
            Activité — criticité {c === 'H' ? 'élevée' : c === 'M' ? 'moyenne' : 'faible'}
          </span>
        ))}
        <span className="flex items-center gap-2">
          <Badge tone="red">R-xx</Badge> Risque cliquable
        </span>
        <span className="text-slate-400">· Glissez les nœuds, molette pour zoomer</span>
      </div>
      <div className="h-[calc(100vh-16rem)] min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.2}
          maxZoom={1.8}
          nodesConnectable={false}
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}
