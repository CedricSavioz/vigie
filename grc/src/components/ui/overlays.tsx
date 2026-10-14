import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Info, Pencil, Trash2 } from 'lucide-react'
import { useGrc } from '../../store/GrcStore'
import { useUi } from '../../store/UiStore'
import type { CollectionKey, EntityKind } from '../../types'
import { Button, IconButton, Modal } from './primitives'

export function Toasts() {
  const { toasts } = useUi()
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-5 bottom-5 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            'pointer-events-auto flex animate-slide-in items-center gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg',
            t.tone === 'danger' ? 'border-red-200' : 'border-slate-200',
          )}
        >
          {t.tone === 'success' && <CheckCircle2 className="size-4 text-emerald-600" />}
          {t.tone === 'info' && <Info className="size-4 text-brand-600" />}
          {t.tone === 'danger' && <Trash2 className="size-4 text-red-600" />}
          <span className="text-slate-700">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export function ConfirmDialog() {
  const { confirmReq, closeConfirm } = useUi()
  return (
    <Modal
      open={Boolean(confirmReq)}
      onClose={() => closeConfirm(false)}
      width="max-w-md"
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-red-600" />
          {confirmReq?.title}
        </span>
      }
      footer={
        <>
          <Button onClick={() => closeConfirm(false)}>Annuler</Button>
          <Button variant="danger" onClick={() => closeConfirm(true)}>
            {confirmReq?.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{confirmReq?.message}</p>
    </Modal>
  )
}

const KIND_COLLECTION: Record<Exclude<EntityKind, 'activity'>, CollectionKey> = {
  process: 'processes',
  risk: 'risks',
  control: 'controls',
  kri: 'kris',
  action: 'actions',
  audit: 'audits',
  loss: 'losses',
  execution: 'executions',
}

const CASCADE_HINT: Partial<Record<EntityKind, string>> = {
  process: ' Ses risques et leurs contrôles, KRI et plans d’action seront également supprimés.',
  risk: ' Ses contrôles, KRI et plans d’action seront également supprimés ; les recommandations d’audit et pertes seront conservées, détachées.',
}

/** Boutons « Modifier / Supprimer » standards pour une ligne d'entité. */
export function RowActions({ kind, id, label }: { kind: Exclude<EntityKind, 'activity'>; id: string; label: string }) {
  const { remove } = useGrc()
  const { openForm, confirm, notify } = useUi()
  return (
    <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
      <IconButton label={`Modifier ${id}`} onClick={() => openForm({ kind, id })}>
        <Pencil className="size-3.5" />
      </IconButton>
      <IconButton
        label={`Supprimer ${id}`}
        className="hover:bg-red-50 hover:text-red-600"
        onClick={async () => {
          const ok = await confirm({
            title: `Supprimer ${id} ?`,
            message: `« ${label} » sera définitivement supprimé.${CASCADE_HINT[kind] ?? ''}`,
            confirmLabel: 'Supprimer',
          })
          if (ok) {
            remove(KIND_COLLECTION[kind], id)
            notify(`${id} supprimé`, 'danger')
          }
        }}
      >
        <Trash2 className="size-3.5" />
      </IconButton>
    </div>
  )
}
