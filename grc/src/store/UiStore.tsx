import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { criticalityOf } from '../lib/risk'
import type { EntityKind, Filters, Process, Risk } from '../types'
import { useGrc } from './GrcStore'

// ─────────────────────────────────────────────────────────────
// État d'interface partagé : filtres globaux, panneau latéral
// (navigation processus ↔ risque), modale de formulaire,
// notifications et confirmation.
// ─────────────────────────────────────────────────────────────

export type DrawerTarget = { kind: 'process' | 'risk'; id: string }

export interface FormRequest {
  kind: EntityKind
  /** Identifiant de l'entité à éditer ; absent = création */
  id?: string
  /** Pré-remplissage (ex. riskId lors d'un ajout depuis la fiche risque) */
  preset?: Record<string, unknown>
}

interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'danger'
}

interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  resolve: (ok: boolean) => void
}

interface UiStore {
  filters: Filters
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  resetFilters: () => void
  drawer: DrawerTarget[]
  openDrawer: (t: DrawerTarget) => void
  backDrawer: () => void
  closeDrawer: () => void
  form: FormRequest | null
  openForm: (f: FormRequest) => void
  closeForm: () => void
  toasts: Toast[]
  notify: (message: string, tone?: Toast['tone']) => void
  confirmReq: ConfirmRequest | null
  confirm: (opts: { title: string; message: string; confirmLabel?: string }) => Promise<boolean>
  closeConfirm: (ok: boolean) => void
}

const EMPTY_FILTERS: Filters = { domain: '', criticality: '', category: '', search: '' }

const Ctx = createContext<UiStore | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [drawer, setDrawer] = useState<DrawerTarget[]>([])
  const [form, setForm] = useState<FormRequest | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null)
  const toastSeq = useRef(0)

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }))
  }, [])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++toastSeq.current
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const confirm = useCallback(
    ({ title, message, confirmLabel = 'Confirmer' }: { title: string; message: string; confirmLabel?: string }) =>
      new Promise<boolean>((resolve) => setConfirmReq({ title, message, confirmLabel, resolve })),
    [],
  )

  const closeConfirm = useCallback(
    (ok: boolean) => {
      confirmReq?.resolve(ok)
      setConfirmReq(null)
    },
    [confirmReq],
  )

  const value = useMemo<UiStore>(
    () => ({
      filters,
      setFilter,
      resetFilters: () => setFilters(EMPTY_FILTERS),
      drawer,
      openDrawer: (t) =>
        setDrawer((s) => {
          const top = s[s.length - 1]
          if (top && top.kind === t.kind && top.id === t.id) return s
          return [...s, t].slice(-8)
        }),
      backDrawer: () => setDrawer((s) => s.slice(0, -1)),
      closeDrawer: () => setDrawer([]),
      form,
      openForm: setForm,
      closeForm: () => setForm(null),
      toasts,
      notify,
      confirmReq,
      confirm,
      closeConfirm,
    }),
    [filters, setFilter, drawer, form, toasts, notify, confirmReq, confirm, closeConfirm],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUi() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUi doit être utilisé dans <UiProvider>')
  return ctx
}

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Vrai si la recherche (insensible aux accents et à la casse) apparaît dans l'un des champs. */
export function matches(search: string, ...fields: (string | undefined)[]) {
  if (!search.trim()) return true
  const q = norm(search.trim())
  return fields.some((f) => f && norm(f).includes(q))
}

/**
 * Périmètre courant après application des filtres globaux du header.
 * Les risques filtrés servent de pivot : les vues contrôles, KRI,
 * plans, audit et pertes se restreignent aux risques visibles.
 */
export function useScope() {
  const { data, rel } = useGrc()
  const { filters } = useUi()

  return useMemo(() => {
    const processes: Process[] = data.processes.filter((p) => !filters.domain || p.domain === filters.domain)
    const processIds = new Set(processes.map((p) => p.id))
    const structuralFilter = Boolean(filters.domain || filters.criticality || filters.category)

    const baseRisks = data.risks.filter((r) => {
      if (!processIds.has(r.processId)) return false
      if (filters.category && r.category !== filters.category) return false
      if (filters.criticality && criticalityOf(r) !== filters.criticality) return false
      return true
    })
    const baseRiskIds = new Set(baseRisks.map((r) => r.id))
    const risks: Risk[] = baseRisks.filter((r) => {
      const proc = rel.processById.get(r.processId)
      return matches(filters.search, r.id, r.name, r.description, r.owner, proc?.name)
    })
    const riskIds = new Set(risks.map((r) => r.id))

    /**
     * Une entité rattachée (contrôle, KRI, plan, audit, perte) est visible si son risque
     * passe les filtres structurels ET si la recherche porte sur le risque ou sur ses propres champs.
     * Sans filtre structurel, les entités non rattachées restent visibles.
     */
    const visible = (riskId: string, ...fields: (string | undefined)[]) => {
      const structuralOk = baseRiskIds.has(riskId) || (!riskId && !structuralFilter)
      if (!structuralOk) return false
      return riskIds.has(riskId) || matches(filters.search, ...fields)
    }
    return { processes, risks, riskIds, visible, filtersActive: structuralFilter || Boolean(filters.search) }
  }, [data, rel, filters])
}
