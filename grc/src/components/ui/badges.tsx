import { Ticket } from 'lucide-react'
import clsx from 'clsx'
import {
  ACTION_STATUS_LABEL,
  AUDIT_SEVERITY_LABEL,
  AUDIT_STATUS_LABEL,
  CATEGORY_LABEL,
  CONCLUSION_LABEL,
  CONTROL_TYPE_LABEL,
  CRITICALITY_LABEL,
  EFFECTIVENESS_LABEL,
  EXECUTION_STATUS_LABEL,
  KRI_STATUS_LABEL,
  PRIORITY_LABEL,
  PROCESS_STATUS_LABEL,
  TREATMENT_LABEL,
} from '../../lib/labels'
import { CRIT_STYLE, heatColor, KRI_STYLE, scoreToCriticality } from '../../lib/risk'
import type {
  ActionStatus,
  AuditSeverity,
  AuditStatus,
  ControlEffectiveness,
  ControlType,
  Criticality,
  ExecutionConclusion,
  ExecutionStatus,
  KriStatus,
  Priority,
  ProcessStatus,
  RiskCategory,
  Treatment,
} from '../../types'
import { Badge, type BadgeTone } from './primitives'

// Badges métier : la couleur porte toujours la même signification
// (rouge = élevé/critique, orange = moyen/alerte, vert = faible/OK).

const CRIT_TONE: Record<Criticality, BadgeTone> = { H: 'red', M: 'amber', L: 'green' }

export function CriticalityBadge({ value, compact }: { value: Criticality; compact?: boolean }) {
  return (
    <Badge tone={CRIT_TONE[value]}>
      <span className={clsx('size-1.5 rounded-full', CRIT_STYLE[value].dot)} />
      {compact ? value : CRITICALITY_LABEL[value]}
    </Badge>
  )
}

/** Pastille de score P × I colorée selon la heatmap. */
export function ScorePill({ score, title }: { score: number; title?: string }) {
  const crit = scoreToCriticality(score)
  return (
    <span
      title={title}
      className="inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums"
      style={{ backgroundColor: heatColor(score), color: crit === 'L' ? '#065f46' : crit === 'M' ? '#78350f' : '#fff' }}
    >
      {score}
    </span>
  )
}

const CATEGORY_TONE: Record<RiskCategory, BadgeTone> = {
  operationnel: 'slate',
  conformite: 'violet',
  cyber: 'sky',
  credit: 'brand',
  liquidite: 'green',
  reputationnel: 'amber',
  juridique: 'slate',
}
export function CategoryBadge({ value }: { value: RiskCategory }) {
  return <Badge tone={CATEGORY_TONE[value]}>{CATEGORY_LABEL[value]}</Badge>
}

const EFF_TONE: Record<ControlEffectiveness, BadgeTone> = { suffisant: 'green', partiel: 'amber', insuffisant: 'red' }
export function EffectivenessBadge({ value }: { value: ControlEffectiveness }) {
  return <Badge tone={EFF_TONE[value]}>{EFFECTIVENESS_LABEL[value]}</Badge>
}

export function ControlTypeBadge({ value }: { value: ControlType }) {
  return <Badge tone={value === 'preventif' ? 'brand' : value === 'detectif' ? 'violet' : 'slate'}>{CONTROL_TYPE_LABEL[value]}</Badge>
}

export function KriLight({ status, withLabel }: { status: KriStatus; withLabel?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium', KRI_STYLE[status].text)}>
      <span className="relative flex size-2.5">
        {status === 'rouge' && <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-60" />}
        <span className={clsx('relative inline-flex size-2.5 rounded-full', KRI_STYLE[status].dot)} />
      </span>
      {withLabel && KRI_STATUS_LABEL[status]}
    </span>
  )
}

const ACTION_TONE: Record<ActionStatus, BadgeTone> = { a_faire: 'slate', en_cours: 'brand', termine: 'green', en_retard: 'red' }
export function ActionStatusBadge({ value }: { value: ActionStatus }) {
  return <Badge tone={ACTION_TONE[value]}>{ACTION_STATUS_LABEL[value]}</Badge>
}

const PRIORITY_TONE: Record<Priority, BadgeTone> = { haute: 'red', moyenne: 'amber', basse: 'slate' }
export function PriorityBadge({ value }: { value: Priority }) {
  return <Badge tone={PRIORITY_TONE[value]}>Priorité {PRIORITY_LABEL[value].toLowerCase()}</Badge>
}

const SEVERITY_TONE: Record<AuditSeverity, BadgeTone> = { critique: 'red', elevee: 'amber', moyenne: 'sky', faible: 'slate' }
export function SeverityBadge({ value }: { value: AuditSeverity }) {
  return <Badge tone={SEVERITY_TONE[value]}>{AUDIT_SEVERITY_LABEL[value]}</Badge>
}

const AUDIT_STATUS_TONE: Record<AuditStatus, BadgeTone> = { ouverte: 'amber', en_cours: 'brand', cloturee: 'green' }
export function AuditStatusBadge({ value }: { value: AuditStatus }) {
  return <Badge tone={AUDIT_STATUS_TONE[value]}>{AUDIT_STATUS_LABEL[value]}</Badge>
}

const PROCESS_STATUS_TONE: Record<ProcessStatus, BadgeTone> = { concu: 'slate', en_cours: 'amber', operationnel: 'green' }
export function ProcessStatusBadge({ value }: { value: ProcessStatus }) {
  return <Badge tone={PROCESS_STATUS_TONE[value]}>{PROCESS_STATUS_LABEL[value]}</Badge>
}

export function TreatmentBadge({ value }: { value: Treatment }) {
  return <Badge tone="slate">{TREATMENT_LABEL[value]}</Badge>
}

/** Indicateur de maturité sur 5 niveaux. */
export function MaturityDots({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Maturité ${value} sur 5`} title={`Maturité ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={clsx('h-1.5 w-3 rounded-full', i <= value ? 'bg-brand-600' : 'bg-slate-200')} />
      ))}
    </span>
  )
}

/** Clé du ticket Jira lié (intégration simulée dans la démo). */
export function JiraBadge({ jiraKey }: { jiraKey?: string }) {
  if (!jiraKey) return null
  return (
    <span
      title={`Ticket Jira ${jiraKey} (démo : connexion simulée)`}
      className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap text-sky-700 ring-1 ring-sky-200 ring-inset"
    >
      <Ticket className="size-3" aria-hidden />
      {jiraKey}
    </span>
  )
}

const EXEC_TONE: Record<ExecutionStatus, BadgeTone> = {
  a_realiser: 'slate',
  en_cours: 'brand',
  soumis: 'violet',
  a_reprendre: 'amber',
  valide: 'green',
}
export function ExecutionStatusBadge({ value, overdue }: { value: ExecutionStatus; overdue?: boolean }) {
  if (overdue) return <Badge tone="red">En retard · {EXECUTION_STATUS_LABEL[value].toLowerCase()}</Badge>
  return <Badge tone={EXEC_TONE[value]}>{EXECUTION_STATUS_LABEL[value]}</Badge>
}

const CONCLUSION_TONE: Record<ExecutionConclusion, BadgeTone> = { conforme: 'green', anomalie_mineure: 'amber', anomalie_majeure: 'red' }
export function ConclusionBadge({ value }: { value: '' | ExecutionConclusion }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>
  return <Badge tone={CONCLUSION_TONE[value]}>{CONCLUSION_LABEL[value]}</Badge>
}
