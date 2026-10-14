import type { ControlEffectiveness, ControlExecution, ExecutionConclusion } from '../types'
import { todayIso } from './risk'

// Règles métier des fiches de réalisation de contrôle.

/** Statuts où la fiche attend une action de l'exécutant. */
export const TO_DO_STATUSES = ['a_realiser', 'en_cours', 'a_reprendre'] as const

export const isToDo = (e: ControlExecution) => (TO_DO_STATUSES as readonly string[]).includes(e.status)

/** En retard : la fiche n'a pas été soumise avant l'échéance. */
export const isOverdue = (e: ControlExecution) => isToDo(e) && e.dueDate < todayIso()

/** Effet de la conclusion validée sur l'efficacité du contrôle. */
export const CONCLUSION_TO_EFFECTIVENESS: Record<ExecutionConclusion, ControlEffectiveness> = {
  conforme: 'suffisant',
  anomalie_mineure: 'partiel',
  anomalie_majeure: 'insuffisant',
}

/** Contrôles de complétude avant soumission ; renvoie la liste des points bloquants. */
export function submissionErrors(e: ControlExecution): string[] {
  const errors: string[] = []
  const anomalies = e.sample.filter((s) => s.result === 'anomalie')
  if (!e.performedDate) errors.push('Indiquez la date de réalisation.')
  if (!(e.population > 0)) errors.push('Indiquez la taille de la population contrôlée.')
  const pending = e.sample.filter((s) => !s.result).length
  if (pending) errors.push(`${pending} élément(s) de l'échantillon ne sont pas encore évalués.`)
  if (anomalies.some((s) => !s.comment.trim())) errors.push('Décrivez chaque anomalie relevée dans l’échantillon.')
  if (!e.conclusion) errors.push('Choisissez une conclusion.')
  if (e.conclusion === 'conforme' && anomalies.length) errors.push('La conclusion « conforme » est incohérente avec les anomalies relevées.')
  if (e.conclusion && e.conclusion !== 'conforme' && (!e.rootCause.trim() || !e.correctiveAction.trim()))
    errors.push('Renseignez la cause de l’anomalie et l’action corrective proposée.')
  if (!e.evidence.length) errors.push('Joignez au moins une pièce justificative.')
  return errors
}
