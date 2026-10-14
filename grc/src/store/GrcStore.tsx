import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { buildSeed } from '../data/seed'
import { withJiraKeys } from '../lib/jira'
import type {
  Activity,
  ActionPlan,
  AuditRecommendation,
  CollectionKey,
  Control,
  EntityOf,
  GrcData,
  Kri,
  Loss,
  Process,
  Risk,
} from '../types'

// ─────────────────────────────────────────────────────────────
// Store applicatif : état unique + persistance localStorage.
// Toute mise à jour déclenche un nouveau rendu de l'ensemble
// des vues (cartographie, heatmap, graphes) — « on remplit,
// ça devient visuel ».
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vigie-grc:data:v1'

function load(): GrcData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as GrcData
      // Données enregistrées avant l'ajout des fiches de réalisation : on complète avec la démo.
      if (!saved.executions) {
        const seed = buildSeed()
        saved.executions = seed.executions
        saved.controls = saved.controls.map((c) => ({ ...seed.controls.find((s) => s.id === c.id), ...c }))
      }
      return withJiraKeys(saved)
    }
  } catch {
    /* stockage indisponible ou corrompu : on repart des données de démo */
  }
  return withJiraKeys(buildSeed())
}

export interface Relations {
  processById: Map<string, Process>
  riskById: Map<string, Risk>
  activityById: Map<string, Activity & { processId: string }>
  risksByProcess: Map<string, Risk[]>
  risksByActivity: Map<string, Risk[]>
  controlsByRisk: Map<string, Control[]>
  krisByRisk: Map<string, Kri[]>
  actionsByRisk: Map<string, ActionPlan[]>
  auditsByRisk: Map<string, AuditRecommendation[]>
  lossesByRisk: Map<string, Loss[]>
}

function groupBy<T>(items: T[], key: (t: T) => string) {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = map.get(k)
    if (list) list.push(item)
    else map.set(k, [item])
  }
  return map
}

function buildRelations(data: GrcData): Relations {
  const activityById = new Map<string, Activity & { processId: string }>()
  for (const p of data.processes) for (const a of p.activities) activityById.set(a.id, { ...a, processId: p.id })
  return {
    processById: new Map(data.processes.map((p) => [p.id, p])),
    riskById: new Map(data.risks.map((r) => [r.id, r])),
    activityById,
    risksByProcess: groupBy(data.risks, (r) => r.processId),
    risksByActivity: groupBy(data.risks, (r) => r.activityId),
    controlsByRisk: groupBy(data.controls, (c) => c.riskId),
    krisByRisk: groupBy(data.kris, (k) => k.riskId),
    actionsByRisk: groupBy(data.actions, (a) => a.riskId),
    auditsByRisk: groupBy(data.audits, (a) => a.riskId),
    lossesByRisk: groupBy(data.losses, (l) => l.riskId),
  }
}

interface GrcStore {
  data: GrcData
  rel: Relations
  upsert: <K extends CollectionKey>(key: K, item: EntityOf<K>) => void
  remove: (key: CollectionKey, id: string) => void
  upsertActivity: (processId: string, activity: Activity) => void
  removeActivity: (processId: string, activityId: string) => void
  reset: () => void
}

const Ctx = createContext<GrcStore | null>(null)

export function GrcProvider({ children }: { children: ReactNode }) {
  const [data, setDataRaw] = useState<GrcData>(load)
  // Toute nouvelle entité reçoit sa clé de ticket Jira.
  const setData = useCallback((fn: (d: GrcData) => GrcData) => setDataRaw((d) => withJiraKeys(fn(d))), [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* quota dépassé ou navigation privée : l'app reste utilisable en mémoire */
    }
  }, [data])

  const upsert = useCallback(<K extends CollectionKey>(key: K, item: EntityOf<K>) => {
    setData((d) => {
      const list = d[key] as EntityOf<K>[]
      const exists = list.some((e) => e.id === item.id)
      const next = exists ? list.map((e) => (e.id === item.id ? item : e)) : [...list, item]
      return { ...d, [key]: next }
    })
  }, [setData])

  /** Suppression avec cascade : un processus emporte ses risques, un risque ses contrôles, KRI et plans. */
  const remove = useCallback((key: CollectionKey, id: string) => {
    setData((d) => {
      if (key === 'processes') {
        const riskIds = new Set(d.risks.filter((r) => r.processId === id).map((r) => r.id))
        return cascadeRisks({ ...d, processes: d.processes.filter((p) => p.id !== id) }, riskIds)
      }
      if (key === 'risks') return cascadeRisks(d, new Set([id]))
      if (key === 'controls')
        return { ...d, controls: d.controls.filter((c) => c.id !== id), executions: d.executions.filter((e) => e.controlId !== id) }
      return { ...d, [key]: (d[key] as { id: string }[]).filter((e) => e.id !== id) }
    })
  }, [setData])

  const upsertActivity = useCallback((processId: string, activity: Activity) => {
    setData((d) => ({
      ...d,
      processes: d.processes.map((p) => {
        if (p.id !== processId) return p
        const exists = p.activities.some((a) => a.id === activity.id)
        return {
          ...p,
          activities: exists ? p.activities.map((a) => (a.id === activity.id ? activity : a)) : [...p.activities, activity],
        }
      }),
    }))
  }, [setData])

  const removeActivity = useCallback((processId: string, activityId: string) => {
    setData((d) => ({
      ...d,
      processes: d.processes.map((p) =>
        p.id === processId ? { ...p, activities: p.activities.filter((a) => a.id !== activityId) } : p,
      ),
      // Les risques rattachés restent liés au processus, sans activité.
      risks: d.risks.map((r) => (r.activityId === activityId ? { ...r, activityId: '' } : r)),
    }))
  }, [setData])

  const reset = useCallback(() => setDataRaw(withJiraKeys(buildSeed())), [])

  const rel = useMemo(() => buildRelations(data), [data])

  const value = useMemo(
    () => ({ data, rel, upsert, remove, upsertActivity, removeActivity, reset }),
    [data, rel, upsert, remove, upsertActivity, removeActivity, reset],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function cascadeRisks(d: GrcData, riskIds: Set<string>): GrcData {
  const keep = <T extends { riskId: string }>(list: T[]) => list.filter((e) => !riskIds.has(e.riskId))
  // Les recommandations d'audit et les pertes sont des faits historiques : on les conserve, détachées.
  const detach = <T extends { riskId: string }>(list: T[]) =>
    list.map((e) => (riskIds.has(e.riskId) ? { ...e, riskId: '' } : e))
  const removedControls = new Set(d.controls.filter((c) => riskIds.has(c.riskId)).map((c) => c.id))
  return {
    ...d,
    risks: d.risks.filter((r) => !riskIds.has(r.id)),
    controls: keep(d.controls),
    executions: d.executions.filter((e) => !removedControls.has(e.controlId)),
    kris: keep(d.kris),
    actions: keep(d.actions),
    audits: detach(d.audits),
    losses: detach(d.losses),
  }
}

export function useGrc() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useGrc doit être utilisé dans <GrcProvider>')
  return ctx
}
