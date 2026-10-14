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
  name: string
  type: ControlType
  frequency: Frequency
  owner: string
  effectiveness: ControlEffectiveness
  riskId: string
  testResult: string
  lastTestDate: string
}

export interface Kri {
  id: string
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

export interface Filters {
  domain: string
  criticality: '' | Criticality
  category: '' | RiskCategory
  search: string
}
