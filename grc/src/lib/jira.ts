import type { GrcData } from '../types'

// ─────────────────────────────────────────────────────────────
// Intégration Jira — SIMULÉE pour la démo.
// Chaque risque, contrôle, KRI, plan d'action et recommandation
// d'audit porte la clé du ticket Jira qui le représenterait.
// Aucune connexion réelle : à remplacer par l'API Jira (ou Forge).
// ─────────────────────────────────────────────────────────────

export const JIRA_PROJECT = 'GRC'
const FIRST_NUMBER = 101

const keyNumber = (key?: string) => (key ? Number(key.split('-')[1]) || 0 : 0)

/**
 * Attribue une clé Jira aux entités qui n'en ont pas, dans un ordre
 * réaliste : chaque risque puis ses contrôles, KRI, plans et audits.
 * Les clés existantes ne sont jamais modifiées.
 */
export function withJiraKeys(d: GrcData): GrcData {
  const all = [...d.risks, ...d.controls, ...d.kris, ...d.actions, ...d.audits, ...d.executions]
  if (all.every((e) => e.jiraKey)) return d

  let next = Math.max(FIRST_NUMBER - 1, ...all.map((e) => keyNumber(e.jiraKey))) + 1
  const assigned = new Map<string, string>()
  const give = (e: { id: string; jiraKey?: string }) => {
    if (!e.jiraKey && !assigned.has(e.id)) assigned.set(e.id, `${JIRA_PROJECT}-${next++}`)
  }
  for (const r of d.risks) {
    give(r)
    d.controls.filter((c) => c.riskId === r.id).forEach((c) => {
      give(c)
      d.executions.filter((e) => e.controlId === c.id).forEach(give)
    })
    d.kris.filter((k) => k.riskId === r.id).forEach(give)
    d.actions.filter((a) => a.riskId === r.id).forEach(give)
    d.audits.filter((a) => a.riskId === r.id).forEach(give)
  }
  all.forEach(give) // éléments non rattachés à un risque

  const fill = <T extends { id: string; jiraKey?: string }>(list: T[]) =>
    list.map((e) => (e.jiraKey ? e : { ...e, jiraKey: assigned.get(e.id) }))
  return {
    ...d,
    risks: fill(d.risks),
    controls: fill(d.controls),
    kris: fill(d.kris),
    actions: fill(d.actions),
    audits: fill(d.audits),
    executions: fill(d.executions),
  }
}
