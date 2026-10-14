import type {
  ActionPlan,
  ActionStatus,
  Criticality,
  Kri,
  KriStatus,
  Risk,
} from '../types'

// ─── Scoring ────────────────────────────────────────────────

export const inherentScore = (r: Risk) => r.probability * r.impact
export const residualScore = (r: Risk) => r.residualProbability * r.residualImpact

/** Barème : ≥ 15 Élevée, ≥ 8 Moyenne, sinon Faible (échelle 1–25). */
export function scoreToCriticality(score: number): Criticality {
  if (score >= 15) return 'H'
  if (score >= 8) return 'M'
  return 'L'
}

/** La criticité d'un risque est dérivée de son score RÉSIDUEL. */
export const criticalityOf = (r: Risk) => scoreToCriticality(residualScore(r))

const CRIT_RANK: Record<Criticality, number> = { H: 3, M: 2, L: 1 }

export function maxCriticality(list: Criticality[]): Criticality | null {
  if (!list.length) return null
  return list.reduce((a, b) => (CRIT_RANK[b] > CRIT_RANK[a] ? b : a))
}

export const compareCriticality = (a: Criticality, b: Criticality) =>
  CRIT_RANK[a] - CRIT_RANK[b]

// ─── KRI ────────────────────────────────────────────────────

export function kriStatusFor(kri: Pick<Kri, 'direction' | 'thresholdOrange' | 'thresholdRed'>, value: number): KriStatus {
  if (kri.direction === 'hausse_defavorable') {
    if (value >= kri.thresholdRed) return 'rouge'
    if (value >= kri.thresholdOrange) return 'orange'
    return 'vert'
  }
  if (value <= kri.thresholdRed) return 'rouge'
  if (value <= kri.thresholdOrange) return 'orange'
  return 'vert'
}

export const kriStatus = (kri: Kri) => kriStatusFor(kri, kri.value)

// ─── Plans d'action ─────────────────────────────────────────

export const todayIso = () => new Date().toISOString().slice(0, 10)

/** Un plan non terminé dont l'échéance est dépassée est considéré « en retard ». */
export function effectiveActionStatus(a: ActionPlan): ActionStatus {
  if (a.status !== 'termine' && a.deadline < todayIso()) return 'en_retard'
  return a.status
}

// ─── Couleurs sémantiques (rouge = H, orange = M, vert = L) ─

export const CRIT_STYLE: Record<Criticality, { bg: string; text: string; ring: string; dot: string; hex: string; soft: string }> = {
  H: { bg: 'bg-red-600', text: 'text-red-700', ring: 'ring-red-200', dot: 'bg-red-500', hex: '#dc2626', soft: 'bg-red-50' },
  M: { bg: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500', hex: '#f59e0b', soft: 'bg-amber-50' },
  L: { bg: 'bg-emerald-600', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500', hex: '#10b981', soft: 'bg-emerald-50' },
}

export const KRI_STYLE: Record<KriStatus, { hex: string; text: string; soft: string; dot: string }> = {
  rouge: { hex: '#dc2626', text: 'text-red-700', soft: 'bg-red-50', dot: 'bg-red-500' },
  orange: { hex: '#f59e0b', text: 'text-amber-700', soft: 'bg-amber-50', dot: 'bg-amber-500' },
  vert: { hex: '#10b981', text: 'text-emerald-700', soft: 'bg-emerald-50', dot: 'bg-emerald-500' },
}

/** Couleur d'une case de heatmap selon son score P × I. */
export function heatColor(score: number) {
  if (score >= 20) return '#b91c1c'
  if (score >= 15) return '#ef4444'
  if (score >= 10) return '#f59e0b'
  if (score >= 8) return '#fbbf24'
  if (score >= 4) return '#86efac'
  return '#bbf7d0'
}
