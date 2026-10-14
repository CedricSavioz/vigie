import clsx from 'clsx'
import { ChevronDown, Filter, Plus, RefreshCw, Search, Ticket, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { JIRA_PROJECT } from '../../lib/jira'
import { CATEGORY_LABEL, CRITICALITY_LABEL, options } from '../../lib/labels'
import { useGrc } from '../../store/GrcStore'
import { useUi } from '../../store/UiStore'
import type { Criticality, EntityKind, RiskCategory } from '../../types'
import { Button } from '../ui/primitives'

const CREATE_MENU: { kind: EntityKind; label: string }[] = [
  { kind: 'process', label: 'Processus' },
  { kind: 'activity', label: 'Activité' },
  { kind: 'risk', label: 'Risque' },
  { kind: 'control', label: 'Contrôle' },
  { kind: 'kri', label: 'KRI' },
  { kind: 'execution', label: 'Exécution de contrôle' },
  { kind: 'action', label: "Plan d'action" },
  { kind: 'audit', label: "Recommandation d'audit" },
  { kind: 'loss', label: 'Perte' },
]

const selectCls =
  'h-9 cursor-pointer rounded-lg border border-slate-200 bg-white pr-8 pl-3 text-sm text-slate-700 shadow-xs transition hover:border-slate-300 focus:border-brand-400 focus:ring-3 focus:ring-brand-100 focus:outline-none'

export function Header() {
  const { data } = useGrc()
  const { filters, setFilter, resetFilters, openForm } = useUi()
  const domains = useMemo(() => [...new Set(data.processes.map((p) => p.domain))].sort(), [data.processes])
  const active = Boolean(filters.domain || filters.criticality || filters.category || filters.search)
  const searchRef = useRef<HTMLInputElement>(null)

  // Raccourci « / » pour la recherche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-8">
        <div className="relative w-full max-w-xs min-w-40">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <label htmlFor="global-search" className="sr-only">
            Rechercher
          </label>
          <input
            id="global-search"
            ref={searchRef}
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Rechercher un risque, un porteur…"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-8 pl-9 text-sm transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-3 focus:ring-brand-100 focus:outline-none"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-400">
            /
          </kbd>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-slate-400" aria-hidden />
          <label className="sr-only" htmlFor="f-domain">
            Domaine
          </label>
          <select id="f-domain" className={selectCls} value={filters.domain} onChange={(e) => setFilter('domain', e.target.value)}>
            <option value="">Tous les domaines</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="f-crit">
            Criticité
          </label>
          <select
            id="f-crit"
            className={selectCls}
            value={filters.criticality}
            onChange={(e) => setFilter('criticality', e.target.value as '' | Criticality)}
          >
            <option value="">Toutes criticités</option>
            {options(CRITICALITY_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                Criticité {o.label.toLowerCase()}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="f-cat">
            Catégorie
          </label>
          <select
            id="f-cat"
            className={selectCls}
            value={filters.category}
            onChange={(e) => setFilter('category', e.target.value as '' | RiskCategory)}
          >
            <option value="">Toutes catégories</option>
            {options(CATEGORY_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {active && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex animate-fade-in cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
            >
              <X className="size-3.5" /> Effacer
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <JiraStatus />
          <CreateMenu onPick={(kind) => openForm({ kind })} />
        </div>
      </div>
    </header>
  )
}

function CreateMenu({ onPick }: { onPick: (k: EntityKind) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button variant="primary" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <Plus className="size-4" /> Créer
        <ChevronDown className={clsx('size-3.5 transition-transform', open && 'rotate-180')} />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 animate-pop rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {CREATE_MENU.map((m) => (
            <button
              key={m.kind}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                onPick(m.kind)
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <Plus className="size-3.5 text-slate-400" />
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Indicateur de source Jira. DÉMO : la synchronisation est simulée,
 * aucune donnée n'est échangée avec Jira.
 */
function JiraStatus() {
  const { data } = useGrc()
  const { notify } = useUi()
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(() => new Date())
  const tickets = [data.risks, data.controls, data.kris, data.actions, data.audits].reduce((n, l) => n + l.length, 0)
  const time = lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="hidden shrink-0 items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/70 py-1 pr-1 pl-2.5 text-xs whitespace-nowrap text-sky-900 xl:flex"
      title={`Jira · projet ${JIRA_PROJECT} · ${tickets} tickets · synchronisé à ${time}\nDémo : connexion simulée, aucune donnée n'est échangée`}
    >
      <Ticket className="size-3.5 text-sky-600" aria-hidden />
      <span>
        <span className="font-semibold">Jira · {JIRA_PROJECT}</span>
        <span className="hidden text-sky-700/80 min-[1700px]:inline"> · {tickets} tickets · synchronisé à {time}</span>
      </span>
      <button
        type="button"
        disabled={syncing}
        onClick={() => {
          setSyncing(true)
          setTimeout(() => {
            setSyncing(false)
            setLastSync(new Date())
            notify(`Synchronisation Jira simulée : ${tickets} tickets à jour (démo)`, 'info')
          }, 900)
        }}
        aria-label="Synchroniser avec Jira (simulation)"
        className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-sky-700 transition hover:bg-sky-100 disabled:cursor-wait"
      >
        <RefreshCw className={clsx('size-3.5', syncing && 'animate-spin')} />
      </button>
    </div>
  )
}
