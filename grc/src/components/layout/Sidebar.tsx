import clsx from 'clsx'
import {
  AlertTriangle,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  Network,
  RotateCcw,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { criticalityOf, effectiveActionStatus, kriStatus } from '../../lib/risk'
import logoUrl from '../../assets/logo.svg'
import { useGrc } from '../../store/GrcStore'
import { useUi } from '../../store/UiStore'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  letter: string
}

const NAV: NavItem[] = [
  { to: '/', label: "Vue d'ensemble", icon: LayoutDashboard, letter: 'A' },
  { to: '/cartographie', label: 'Cartographie des processus', icon: Workflow, letter: 'B' },
  { to: '/risques', label: 'Registre des risques', icon: AlertTriangle, letter: 'C' },
  { to: '/controles', label: 'Contrôles & KRI', icon: ShieldCheck, letter: 'D' },
  { to: '/plans', label: "Plans d'action", icon: ListChecks, letter: 'E' },
  { to: '/audit', label: 'Audit & pertes', icon: ClipboardCheck, letter: 'F' },
  { to: '/relations', label: 'Graphe des relations', icon: Network, letter: 'G' },
]

export function Sidebar() {
  const { data, reset } = useGrc()
  const { confirm, notify, closeDrawer, resetFilters } = useUi()

  // Pastilles d'alerte dans la navigation
  const badges: Record<string, number> = {
    '/risques': data.risks.filter((r) => criticalityOf(r) === 'H').length,
    '/controles': data.kris.filter((k) => kriStatus(k) === 'rouge').length,
    '/plans': data.actions.filter((a) => effectiveActionStatus(a) === 'en_retard').length,
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-brand-950 text-slate-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <img src={logoUrl} alt="" className="size-9" />
        <div>
          <p className="text-[15px] leading-tight font-semibold text-white">Vigie GRC</p>
          <p className="text-[11px] text-slate-400">Gouvernance · Risques · Conformité</p>
        </div>
      </div>

      <nav aria-label="Navigation principale" className="mt-2 flex-1 space-y-0.5 px-3">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">Pilotage</p>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all',
                isActive ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={clsx('size-4 shrink-0', isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300')} />
                <span className="flex-1 truncate">{item.label}</span>
                {badges[item.to] ? (
                  <span className="rounded-full bg-red-500/90 px-1.5 py-px text-[10px] font-semibold text-white tabular-nums">
                    {badges[item.to]}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-600">{item.letter}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="m-3 rounded-xl bg-white/5 p-3.5">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Données de démonstration fictives, enregistrées dans ce navigateur (localStorage).
        </p>
        <button
          type="button"
          onClick={async () => {
            const ok = await confirm({
              title: 'Réinitialiser les données de démo ?',
              message: 'Toutes vos saisies seront perdues et remplacées par le jeu de données de démonstration.',
              confirmLabel: 'Réinitialiser',
            })
            if (ok) {
              reset()
              closeDrawer()
              resetFilters()
              notify('Données de démonstration rechargées', 'info')
            }
          }}
          className="mt-2.5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
        >
          <RotateCcw className="size-3.5" />
          Réinitialiser les données de démo
        </button>
      </div>
    </aside>
  )
}
