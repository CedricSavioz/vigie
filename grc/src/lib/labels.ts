import type {
  ActionStatus,
  AuditSeverity,
  AuditStatus,
  ControlEffectiveness,
  ControlType,
  Criticality,
  Frequency,
  KriDirection,
  KriStatus,
  Priority,
  ProcessStatus,
  RiskCategory,
  Treatment,
} from '../types'

// Libellés français centralisés : aucune chaîne métier codée en dur dans les composants.

export const CATEGORY_LABEL: Record<RiskCategory, string> = {
  operationnel: 'Opérationnel',
  conformite: 'Conformité',
  cyber: 'Cyber',
  credit: 'Crédit',
  liquidite: 'Liquidité',
  reputationnel: 'Réputationnel',
  juridique: 'Juridique',
}

export const CRITICALITY_LABEL: Record<Criticality, string> = {
  H: 'Élevée',
  M: 'Moyenne',
  L: 'Faible',
}

export const PROCESS_STATUS_LABEL: Record<ProcessStatus, string> = {
  concu: 'Conçu',
  en_cours: 'En cours de déploiement',
  operationnel: 'Opérationnel',
}

export const TREATMENT_LABEL: Record<Treatment, string> = {
  eviter: 'Éviter',
  reduire: 'Réduire',
  transferer: 'Transférer',
  accepter: 'Accepter',
}

export const CONTROL_TYPE_LABEL: Record<ControlType, string> = {
  preventif: 'Préventif',
  detectif: 'Détectif',
  correctif: 'Correctif',
}

export const EFFECTIVENESS_LABEL: Record<ControlEffectiveness, string> = {
  suffisant: 'Suffisant',
  partiel: 'Partiel',
  insuffisant: 'Insuffisant',
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  continu: 'En continu',
  quotidien: 'Quotidien',
  hebdomadaire: 'Hebdomadaire',
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  semestriel: 'Semestriel',
  annuel: 'Annuel',
}

export const KRI_DIRECTION_LABEL: Record<KriDirection, string> = {
  hausse_defavorable: 'Une hausse est défavorable',
  baisse_defavorable: 'Une baisse est défavorable',
}

export const KRI_STATUS_LABEL: Record<KriStatus, string> = {
  vert: 'Sous contrôle',
  orange: 'Alerte',
  rouge: 'Critique',
}

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  termine: 'Terminé',
  en_retard: 'En retard',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
}

export const AUDIT_SEVERITY_LABEL: Record<AuditSeverity, string> = {
  critique: 'Critique',
  elevee: 'Élevée',
  moyenne: 'Moyenne',
  faible: 'Faible',
}

export const AUDIT_STATUS_LABEL: Record<AuditStatus, string> = {
  ouverte: 'Ouverte',
  en_cours: 'En cours',
  cloturee: 'Clôturée',
}

export const PROBABILITY_SCALE: Record<number, string> = {
  1: 'Rare',
  2: 'Peu probable',
  3: 'Possible',
  4: 'Probable',
  5: 'Quasi certain',
}

export const IMPACT_SCALE: Record<number, string> = {
  1: 'Négligeable',
  2: 'Mineur',
  3: 'Modéré',
  4: 'Majeur',
  5: 'Critique',
}

export const MATURITY_SCALE: Record<number, string> = {
  1: 'Initial',
  2: 'Reproductible',
  3: 'Défini',
  4: 'Maîtrisé',
  5: 'Optimisé',
}

export function options<T extends string>(rec: Record<T, string>) {
  return (Object.keys(rec) as T[]).map((value) => ({ value, label: rec[value] }))
}
