import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import clsx from 'clsx'
import { AlertTriangle, ClipboardCheck, Gauge, LayoutGrid, ListChecks, ShieldCheck, Wallet, Workflow, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useFlowNodes } from '../components/charts/useFlowNodes'
import { Button, PageHeader } from '../components/ui/primitives'
import { formatEurCompact, formatNumber } from '../lib/format'
import { ACTION_STATUS_LABEL, AUDIT_SEVERITY_LABEL, EFFECTIVENESS_LABEL } from '../lib/labels'
import { CRIT_STYLE, criticalityOf, effectiveActionStatus, KRI_STYLE, kriStatus, residualScore } from '../lib/risk'
import { useGrc } from '../store/GrcStore'
import { useScope, useUi } from '../store/UiStore'
import type { Criticality } from '../types'

// ─── Nœuds ──────────────────────────────────────────────────

type LeafKind = 'control' | 'kri' | 'action' | 'audit' | 'loss'
type Tone = 'red' | 'amber' | 'green' | 'slate' | 'brand'

const LEAF_META: Record<LeafKind, { label: string; plural: string; icon: LucideIcon; verb: string }> = {
  control: { label: 'Contrôle', plural: 'Contrôles', icon: ShieldCheck, verb: 'maîtrisé par' },
  kri: { label: 'KRI', plural: 'KRI', icon: Gauge, verb: 'mesuré par' },
  action: { label: "Plan d'action", plural: "Plans d'action", icon: ListChecks, verb: 'traité par' },
  audit: { label: 'Reco. audit', plural: "Recos d'audit", icon: ClipboardCheck, verb: 'audité par' },
  loss: { label: 'Perte', plural: 'Pertes', icon: Wallet, verb: 'a causé' },
}

const TONE: Record<Tone, { dot: string; hex: string }> = {
  red: { dot: 'bg-red-500', hex: '#dc2626' },
  amber: { dot: 'bg-amber-500', hex: '#f59e0b' },
  green: { dot: 'bg-emerald-500', hex: '#10b981' },
  slate: { dot: 'bg-slate-400', hex: '#94a3b8' },
  brand: { dot: 'bg-brand-500', hex: '#337dff' },
}

type ProcNodeData = { name: string; domain: string; count: number; onOpen: () => void }
type RiskNodeData = { id: string; name: string; crit: Criticality; score: number; onOpen: () => void }
type LeafNodeData = { kind: LeafKind; title: string; status: string; tone: Tone; onOpen: () => void }

function ProcNode({ data }: NodeProps<Node<ProcNodeData>>) {
  return (
    <div onClick={data.onOpen} className="w-[220px] cursor-pointer rounded-xl bg-brand-900 p-3 text-white shadow-lg transition hover:ring-2 hover:ring-brand-400">
      <div className="flex items-center gap-1.5 text-[10px] text-brand-300">
        <Workflow className="size-3" /> Processus · {data.domain}
      </div>
      <p className="mt-1 text-sm leading-snug font-semibold">{data.name}</p>
      <p className="mt-1 text-[10px] text-brand-200">{data.count} risque(s)</p>
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-brand-400" />
    </div>
  )
}

function RiskNode({ data }: NodeProps<Node<RiskNodeData>>) {
  const s = CRIT_STYLE[data.crit]
  return (
    <div
      onClick={data.onOpen}
      className={clsx('w-[230px] cursor-pointer rounded-xl border-2 bg-white p-2.5 shadow-md transition hover:shadow-lg', RISK_BORDER[data.crit])}
    >
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-slate-400" />
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
          <AlertTriangle className={clsx('size-3', s.text)} /> {data.id}
        </span>
        <span className={clsx('rounded px-1.5 py-px text-[10px] font-bold text-white', s.bg)}>Résiduel {data.score}</span>
      </div>
      <p className="mt-1 text-xs leading-snug font-semibold text-slate-800">{data.name}</p>
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-slate-400" />
    </div>
  )
}

function LeafNode({ data }: NodeProps<Node<LeafNodeData>>) {
  const meta = LEAF_META[data.kind]
  const Icon = meta.icon
  return (
    <div onClick={data.onOpen} className="flex w-[250px] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-brand-300 hover:shadow-md">
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-slate-300" />
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-slate-800" title={data.title}>
          {data.title}
        </p>
        <p className="flex items-center gap-1 text-[10px] text-slate-500">
          <span className={clsx('size-1.5 rounded-full', TONE[data.tone].dot)} />
          {meta.label} · {data.status}
        </p>
      </div>
    </div>
  )
}

const RISK_BORDER: Record<Criticality, string> = { H: 'border-red-300', M: 'border-amber-300', L: 'border-emerald-300' }

const nodeTypes = { proc: ProcNode, risk: RiskNode, leaf: LeafNode }

// ─── Page ───────────────────────────────────────────────────

const LEAF_H = 56
const RISK_GAP = 28

export function RelationsGraphPage() {
  const { data, rel } = useGrc()
  const { openDrawer } = useUi()
  const scope = useScope()
  const [processId, setProcessId] = useState<string>('')
  const [kinds, setKinds] = useState<Record<LeafKind, boolean>>({ control: true, kri: true, action: true, audit: true, loss: false })

  const available = useMemo(
    () => scope.processes.filter((p) => (rel.risksByProcess.get(p.id) ?? []).some((r) => scope.riskIds.has(r.id))),
    [scope, rel],
  )
  const selected = available.find((p) => p.id === processId) ?? available[0]

  const { computed, edges } = useMemo(() => {
    const procs = processId === '*' ? available : selected ? [selected] : []
    const nodes: Node[] = []
    const edges: Edge[] = []
    let y = 0
    for (const p of procs) {
      const risks = (rel.risksByProcess.get(p.id) ?? []).filter((r) => scope.riskIds.has(r.id)).sort((a, b) => residualScore(b) - residualScore(a))
      const procTop = y
      for (const r of risks) {
        const crit = criticalityOf(r)
        const openRisk = () => openDrawer({ kind: 'risk', id: r.id })
        const leaves: { id: string; data: LeafNodeData }[] = []
        const push = (kind: LeafKind, id: string, title: string, status: string, tone: Tone) =>
          kinds[kind] && leaves.push({ id, data: { kind, title, status, tone, onOpen: openRisk } })

        ;(rel.controlsByRisk.get(r.id) ?? []).forEach((c) =>
          push('control', c.id, c.name, EFFECTIVENESS_LABEL[c.effectiveness], c.effectiveness === 'suffisant' ? 'green' : c.effectiveness === 'partiel' ? 'amber' : 'red'),
        )
        ;(rel.krisByRisk.get(r.id) ?? []).forEach((k) => {
          const st = kriStatus(k)
          push('kri', k.id, k.name, `${formatNumber(k.value)} ${k.unit}`, st === 'rouge' ? 'red' : st === 'orange' ? 'amber' : 'green')
        })
        ;(rel.actionsByRisk.get(r.id) ?? []).forEach((a) => {
          const st = effectiveActionStatus(a)
          push('action', a.id, a.title, ACTION_STATUS_LABEL[st], st === 'en_retard' ? 'red' : st === 'termine' ? 'green' : st === 'en_cours' ? 'brand' : 'slate')
        })
        ;(rel.auditsByRisk.get(r.id) ?? []).forEach((a) =>
          push('audit', a.id, a.title, AUDIT_SEVERITY_LABEL[a.severity], a.status === 'cloturee' ? 'green' : a.severity === 'critique' || a.severity === 'elevee' ? 'red' : 'amber'),
        )
        ;(rel.lossesByRisk.get(r.id) ?? []).forEach((l) => push('loss', l.id, l.description, formatEurCompact(l.amount), 'red'))

        const blockH = Math.max(1, leaves.length) * LEAF_H
        nodes.push({
          id: r.id,
          type: 'risk',
          position: { x: 340, y: y + blockH / 2 - 34 },
          data: { id: r.id, name: r.name, crit, score: residualScore(r), onOpen: openRisk } satisfies RiskNodeData,
        })
        edges.push({
          id: `${p.id}->${r.id}`,
          source: p.id,
          target: r.id,
          type: 'smoothstep',
          style: { stroke: CRIT_STYLE[crit].hex, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: CRIT_STYLE[crit].hex },
        })
        leaves.forEach((leaf, i) => {
          nodes.push({ id: leaf.id, type: 'leaf', position: { x: 700, y: y + i * LEAF_H }, data: leaf.data })
          edges.push({
            id: `${r.id}->${leaf.id}`,
            source: r.id,
            target: leaf.id,
            animated: leaf.data.kind === 'kri',
            style: {
              stroke: leaf.data.kind === 'loss' ? KRI_STYLE.rouge.hex : TONE[leaf.data.tone].hex,
              strokeWidth: 1.3,
              strokeDasharray: leaf.data.kind === 'audit' || leaf.data.kind === 'loss' ? '4 3' : undefined,
              opacity: 0.8,
            },
          })
        })
        y += blockH + RISK_GAP
      }
      const blockMid = risks.length ? (procTop + y - RISK_GAP) / 2 : y
      nodes.push({
        id: p.id,
        type: 'proc',
        position: { x: 0, y: blockMid - 40 },
        data: { name: p.name, domain: p.domain, count: risks.length, onOpen: () => openDrawer({ kind: 'process', id: p.id }) } satisfies ProcNodeData,
      })
      y += 60
    }
    return { computed: nodes, edges }
  }, [available, selected, processId, rel, scope, kinds, openDrawer])

  const { nodes, onNodesChange, resetLayout } = useFlowNodes(computed)

  const counts: Record<LeafKind, number> = {
    control: data.controls.length,
    kri: data.kris.length,
    action: data.actions.length,
    audit: data.audits.length,
    loss: data.losses.length,
  }

  return (
    <div>
      <PageHeader
        title="Graphe des relations"
        description="Chaîne de causalité et de maîtrise : processus → risques → contrôles, KRI, plans d'action, recommandations d'audit et pertes. Cliquez un nœud pour ouvrir sa fiche."
        actions={
          <>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Processus
              <select
                value={processId === '*' ? '*' : selected?.id ?? ''}
                onChange={(e) => setProcessId(e.target.value)}
                className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white pr-8 pl-3 text-sm text-slate-700 shadow-xs focus:border-brand-400 focus:ring-3 focus:ring-brand-100 focus:outline-none"
              >
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name}
                  </option>
                ))}
                <option value="*">Tous les processus</option>
              </select>
            </label>
            <Button onClick={resetLayout}>
              <LayoutGrid className="size-4" /> Réorganiser
            </Button>
          </>
        }
      />

      <div className="h-[calc(100vh-14rem)] min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <ReactFlow
          key={processId === '*' ? '*' : selected?.id}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.1}
          maxZoom={1.8}
          nodesConnectable={false}
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls showInteractive={false} />
          <Panel position="top-left">
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
              <p className="mb-2 text-[11px] font-semibold text-slate-700">Éléments affichés</p>
              <div className="space-y-1">
                {(Object.keys(LEAF_META) as LeafKind[]).map((k) => {
                  const Icon = LEAF_META[k].icon
                  return (
                    <label key={k} className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={kinds[k]}
                        onChange={(e) => setKinds((s) => ({ ...s, [k]: e.target.checked }))}
                        className="size-3.5 cursor-pointer accent-brand-700"
                      />
                      <Icon className="size-3.5 text-slate-400" />
                      <span className="flex-1">{LEAF_META[k].plural}</span>
                      <span className="text-slate-400 tabular-nums">{counts[k]}</span>
                    </label>
                  )
                })}
              </div>
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                <p className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" /> Efficace / sous contrôle / terminé
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" /> Partiel / alerte
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-red-500" /> Insuffisant / critique / en retard
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="w-4 border-t border-dashed border-slate-400" /> Audit et pertes (constats)
                </p>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}
