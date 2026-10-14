import { ArrowLeft, X } from 'lucide-react'
import { useEffect } from 'react'
import { useUi } from '../../store/UiStore'
import { IconButton } from '../ui/primitives'
import { ProcessPanel } from './ProcessPanel'
import { RiskPanel } from './RiskPanel'

/**
 * Panneau latéral unique, empilable : processus → risque → retour.
 * Ouvert depuis n'importe quelle vue via useUi().openDrawer().
 */
export function DetailDrawer() {
  const { drawer, backDrawer, closeDrawer, form, confirmReq } = useUi()
  const top = drawer[drawer.length - 1]

  useEffect(() => {
    if (!top) return
    const onKey = (e: KeyboardEvent) => {
      // La touche Échap ferme d'abord les modales ouvertes au-dessus du panneau.
      if (e.key === 'Escape' && !form && !confirmReq) closeDrawer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [top, form, confirmReq, closeDrawer])

  if (!top) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/20" onClick={closeDrawer} />
      <aside
        key={`${top.kind}-${top.id}`}
        aria-label={top.kind === 'risk' ? 'Détail du risque' : 'Détail du processus'}
        className="relative flex h-full w-full max-w-[640px] animate-slide-in flex-col bg-slate-50 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex items-center gap-1">
            {drawer.length > 1 ? (
              <button
                type="button"
                onClick={backDrawer}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft className="size-3.5" />
                Retour
              </button>
            ) : (
              <span className="px-2 text-xs font-medium tracking-wide text-slate-400 uppercase">
                {top.kind === 'risk' ? 'Fiche risque' : 'Fiche processus'}
              </span>
            )}
          </div>
          <IconButton label="Fermer le panneau" onClick={closeDrawer}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto">
          {top.kind === 'risk' ? <RiskPanel id={top.id} /> : <ProcessPanel id={top.id} />}
        </div>
      </aside>
    </div>
  )
}
