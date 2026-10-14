// ─────────────────────────────────────────────────────────────
// Modèle de données GRC — toutes les entités sont reliées par id
// Processus ─< Activité
// Processus ─< Risque ─< Contrôle | KRI | Plan d'action | Reco d'audit | Perte
// ─────────────────────────────────────────────────────────────

export type Score = 1 | 2 | 3 | 4 | 5
export type Criticality = 'H' | 'M' | 'L'

export type ProcessStatus = 'concu' | 'en_cours' | 'operationnel'

export type RiskCategory =
  | 'operationnel'
  | 'conformite'
  | 'cyber'
  | 'credit'
  | 'liquidite'
  | 'reputationnel'
  | 'juridique'

export type Treatment = 'eviter' | 'reduire' | 'transferer' | 'accepter'

export type ControlType = 'preventif' | 'detectif' | 'correctif'
export type ControlEffectiveness = 'suffisant' | 'partiel' | 'insuffisant'
export type Frequency =
  | 'continu'
  | 'quotidien'
  | 'hebdomadaire'
  | 'mensuel'
  | 'trimestriel'
  | 'semestriel'
  | 'annuel'

export type KriDirection = 'hausse_defavorable' | 'baisse_defavorable'
export type KriStatus = 'vert' | 'orange' | 'rouge'

export type ActionStatus = 'a_faire' | 'en_cours' | 'termine' | 'en_retard'
export type Priority = 'haute' | 'moyenne' | 'basse'

export type AuditSeverity = 'critique' | 'elevee' | 'moyenne' | 'faible'
export type AuditStatus = 'ouverte' | 'en_cours' | 'cloturee'

export interface Activity {
  id: string
  name: string
  description: string
  owner: string
}

export interface Process {
  id: string
  name: string
  domain: string
  description: string
  owner: string
  status: ProcessStatus
  /** Niveau de maturité 1 (initial) à 5 (optimisé) */
  maturity: Score
  activities: Activity[]
}

export interface Risk {
  id: string
  /** Clé du ticket Jira correspondant (ex. GRC-142) */
  jiraKey?: string
  name: string
  description: string
  category: RiskCategory
  processId: string
  activityId: string
  owner: string
  /** Risque intrinsèque (brut) = probabilité × impact */
  probability: Score
  impact: Score
  controlsSummary: string
  /** Risque résiduel (net) après contrôles */
  residualProbability: Score
  residualImpact: Score
  treatment: Treatment
}

export interface Control {
  id: string
  /** Clé du ticket Jira correspondant (ex. GRC-142) */
  jiraKey?: string
  name: string
  type: ControlType
  frequency: Frequency
  owner: string
  effectiveness: ControlEffectiveness
  riskId: string
  testResult: string
  lastTestDate: string
  /** Mode opératoire, repris dans chaque fiche de réalisation */
  objective?: string
  procedure?: string
  criterion?: string
  expectedEvidence?: string
}

// ─── Réalisation des contrôles (1re ligne) ─────────────────

export type ExecutionStatus = 'a_realiser' | 'en_cours' | 'soumis' | 'a_reprendre' | 'valide'
export type ExecutionConclusion = 'conforme' | 'anomalie_mineure' | 'anomalie_majeure'
export type SampleResult = '' | 'conforme' | 'anomalie'

export interface SampleItem {
  ref: string
  label: string
  result: SampleResult
  comment: string
}

export interface ExecutionEvent {
  date: string
  who: string
  action: string
}

/** Une occurrence d'un contrôle : la « fiche de réalisation » reçue par le métier. */
export interface ControlExecution {
  id: string
  jiraKey?: string
  controlId: string
  period: string
  dueDate: string
  executor: string
  reviewer: string
  status: ExecutionStatus
  performedDate: string
  population: number
  sample: SampleItem[]
  conclusion: '' | ExecutionConclusion
  rootCause: string
  correctiveAction: string
  /** Noms des pièces justificatives (démo : seul le nom est conservé) */
  evidence: string[]
  reviewComment: string
  /** Plan d'action créé automatiquement en cas d'anomalie majeure */
  actionId?: string
  history: ExecutionEvent[]
}

export interface Kri {
  id: string
  /** Clé du ticket Jira correspondant (ex. GRC-142) */
  jiraKey?: string
  name: string
  definition: string
  riskId: string
  unit: string
  /** Seuil d'alerte (passage à l'orange) */
  thresholdOrange: number
  /** Seuil critique (passage au rouge) */
  thresholdRed: number
  direction: KriDirection
  value: number
  frequency: Frequency
  /** 12 dernières mesures, la dernière = valeur actuelle */
  history: number[]
}

export interface ActionPlan {
  id: string
  /** Clé du ticket Jira correspondant (ex. GRC-142) */
  jiraKey?: string
  title: string
  description: string
  riskId: string
  owner: string
  priority: Priority
  startDate: string
  deadline: string
  status: ActionStatus
  cost: number
  targetCriticality: Criticality
}

export interface AuditRecommendation {
  id: string
  /** Clé du ticket Jira correspondant (ex. GRC-142) */
  jiraKey?: string
  title: string
  description: string
  auditor: string
  severity: AuditSeverity
  riskId: string
  status: AuditStatus
  deadline: string
}

export interface Loss {
  id: string
  description: string
  amount: number
  date: string
  riskId: string
  category: RiskCategory
}

export interface GrcData {
  processes: Process[]
  risks: Risk[]
  controls: Control[]
  kris: Kri[]
  actions: ActionPlan[]
  audits: AuditRecommendation[]
  losses: Loss[]
  executions: ControlExecution[]
}

export type CollectionKey = keyof GrcData
export type EntityOf<K extends CollectionKey> = GrcData[K][number]

/** Types d'entités éditables via formulaire (activité = sous-entité d'un processus) */
export type EntityKind =
  | 'process'
  | 'activity'
  | 'risk'
  | 'control'
  | 'kri'
  | 'action'
  | 'audit'
  | 'loss'
  | 'execution'

export interface Filters {
  domain: string
  criticality: '' | Criticality
  category: '' | RiskCategory
  search: string
}
