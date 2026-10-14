import clsx from 'clsx'
import { useMemo, useState, type FormEvent } from 'react'
import { nextId } from '../../lib/format'
import { useGrc } from '../../store/GrcStore'
import { useUi, type FormRequest } from '../../store/UiStore'
import type { Activity, CollectionKey, ControlExecution, EntityOf, GrcData, Kri, RiskCategory } from '../../types'
import { Button, Modal } from '../ui/primitives'
import { ENTITY_CONFIG, NUMERIC_TYPES, type FieldDef, type FormValues } from './entityConfig'

// ─────────────────────────────────────────────────────────────
// Modale générique de création / édition, pilotée par ENTITY_CONFIG.
// ─────────────────────────────────────────────────────────────

export function EntityFormModal() {
  const { form, closeForm } = useUi()
  if (!form) return null
  // La clé force un formulaire neuf à chaque ouverture.
  return <FormBody key={`${form.kind}-${form.id ?? 'new'}`} req={form} onClose={closeForm} />
}

function findExisting(data: GrcData, req: FormRequest): FormValues | null {
  if (!req.id) return null
  if (req.kind === 'activity') {
    for (const p of data.processes) {
      const a = p.activities.find((x) => x.id === req.id)
      if (a) return { ...a, processId: p.id }
    }
    return null
  }
  const key = ENTITY_CONFIG[req.kind].collection as CollectionKey
  const found = (data[key] as { id: string }[]).find((e) => e.id === req.id)
  return found ? ({ ...found } as unknown as FormValues) : null
}

function useSuggestions(data: GrcData) {
  return useMemo(() => {
    const owners = new Set<string>()
    data.processes.forEach((p) => {
      owners.add(p.owner)
      p.activities.forEach((a) => owners.add(a.owner))
    })
    ;[...data.risks, ...data.controls, ...data.actions].forEach((e) => owners.add(e.owner))
    return {
      owner: [...owners].filter(Boolean).sort(),
      domain: [...new Set(data.processes.map((p) => p.domain))].sort(),
      auditor: [...new Set(data.audits.map((a) => a.auditor))].sort(),
    } as Record<string, string[]>
  }, [data])
}

function FormBody({ req, onClose }: { req: FormRequest; onClose: () => void }) {
  const { data, upsert, upsertActivity } = useGrc()
  const { notify } = useUi()
  const cfg = ENTITY_CONFIG[req.kind]
  const existing = findExisting(data, req)
  const isEdit = Boolean(existing)
  const suggestions = useSuggestions(data)

  const [values, setValues] = useState<FormValues>(() => ({
    ...cfg.defaults(data),
    ...(existing ?? {}),
    ...((req.preset as FormValues) ?? {}),
  }))
  const [touched, setTouched] = useState(false)

  const missing = cfg.fields.filter((f) => f.required && String(values[f.key] ?? '').trim() === '')

  const set = (key: string, v: string | number) =>
    setValues((prev) => {
      const next = { ...prev, [key]: v }
      // Cohérence des liens : changer de processus réinitialise l'activité.
      if (key === 'processId' && req.kind === 'risk') next.activityId = ''
      // Une perte rattachée hérite de la catégorie de son risque.
      if (key === 'riskId' && req.kind === 'loss') {
        const r = data.risks.find((x) => x.id === v)
        if (r) next.category = r.category
      }
      return next
    })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (missing.length) return

    const clean: Record<string, unknown> = { ...values }
    for (const f of cfg.fields) {
      if (NUMERIC_TYPES.has(f.type)) clean[f.key] = Number(values[f.key]) || 0
      else if (typeof clean[f.key] === 'string') clean[f.key] = (clean[f.key] as string).trim()
    }

    if (req.kind === 'activity') {
      const processId = String(clean.processId)
      const proc = data.processes.find((p) => p.id === processId)
      const id = existing ? String(existing.id) : nextActivityId(processId, proc?.activities ?? [])
      const activity: Activity = { id, name: String(clean.name), description: String(clean.description), owner: String(clean.owner) }
      upsertActivity(processId, activity)
      notify(isEdit ? `Activité « ${activity.name} » mise à jour` : `Activité « ${activity.name} » ajoutée au processus`)
      onClose()
      return
    }

    const key = cfg.collection as CollectionKey
    const id = existing ? String(existing.id) : nextId(cfg.prefix, data[key] as { id: string }[])
    let entity: Record<string, unknown> = { ...clean, id }

    if (req.kind === 'process') {
      entity.activities = (existing as unknown as { activities?: Activity[] })?.activities ?? []
    }
    if (req.kind === 'kri') entity = withHistory(entity, existing as unknown as Kri | null)
    if (req.kind === 'execution') {
      const size = Math.max(1, Math.min(30, Number(clean.sampleSize) || 1))
      delete entity.sampleSize
      if (!existing) entity = { ...newExecution(size), ...entity }
    }
    if (req.kind === 'loss' && entity.riskId) {
      const r = data.risks.find((x) => x.id === entity.riskId)
      if (r) entity.category = r.category as RiskCategory
    }

    upsert(key, entity as unknown as EntityOf<typeof key>)
    const name = String(entity.name ?? entity.title ?? entity.description ?? id)
    notify(isEdit ? `${capitalize(cfg.label)} ${id} mis à jour` : `${capitalize(cfg.label)} ${id} créé${cfg.feminine ? 'e' : ''} : ${truncate(name)}`)
    onClose()
  }

  const title = isEdit
    ? `Modifier ${cfg.feminine ? 'la' : 'le'} ${cfg.label}`
    : `${cfg.feminine ? 'Nouvelle' : 'Nouveau'} ${cfg.label}`

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={isEdit ? `Référence ${existing?.id}` : 'Les visuels se mettent à jour dès l’enregistrement.'}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="submit" form="entity-form">
            {isEdit ? 'Enregistrer les modifications' : 'Créer'}
          </Button>
        </>
      }
    >
      <form id="entity-form" onSubmit={submit} className="grid grid-cols-2 gap-x-4 gap-y-4" noValidate>
        {cfg.fields.map((f) => (
          <Field
            key={f.key}
            def={f}
            value={values[f.key] ?? ''}
            values={values}
            data={data}
            suggestions={suggestions[f.key]}
            invalid={touched && missing.includes(f)}
            onChange={(v) => set(f.key, v)}
          />
        ))}
        {cfg.preview && <div className="col-span-2 rounded-lg bg-slate-50 px-4 py-3">{cfg.preview(values)}</div>}
      </form>
    </Modal>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-3 focus:ring-brand-100 focus:outline-none'

function Field({
  def,
  value,
  values,
  data,
  suggestions,
  invalid,
  onChange,
}: {
  def: FieldDef
  value: string | number
  values: FormValues
  data: GrcData
  suggestions?: string[]
  invalid: boolean
  onChange: (v: string | number) => void
}) {
  const id = `f-${def.key}`
  const listId = suggestions ? `${id}-list` : undefined
  const opts = typeof def.options === 'function' ? def.options(values, data) : def.options

  return (
    <div className={clsx(def.full || def.type === 'textarea' ? 'col-span-2' : 'col-span-2 sm:col-span-1')}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">
        {def.label}
        {def.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {def.type === 'textarea' && (
        <textarea id={id} rows={2} className={clsx(inputCls, 'resize-y')} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {(def.type === 'text' || def.type === 'number' || def.type === 'date') && (
        <>
          <input
            id={id}
            type={def.type}
            step={def.step}
            list={listId}
            placeholder={def.placeholder}
            aria-invalid={invalid}
            className={clsx(inputCls, invalid && 'border-red-400 ring-3 ring-red-100')}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {listId && (
            <datalist id={listId}>
              {suggestions!.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </>
      )}
      {def.type === 'select' && (
        <select
          id={id}
          aria-invalid={invalid}
          className={clsx(inputCls, 'cursor-pointer', invalid && 'border-red-400')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {opts?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {def.type === 'score' && (
        <div role="radiogroup" aria-labelledby={id} className="flex gap-1">
          <span id={id} className="sr-only">
            {def.label}
          </span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={Number(value) === n}
              title={def.scaleLabels?.[n]}
              onClick={() => onChange(n)}
              className={clsx(
                'flex h-9 flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border text-sm font-semibold transition',
                Number(value) === n
                  ? 'border-brand-600 bg-brand-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:bg-brand-50',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      {def.type === 'score' && def.scaleLabels && (
        <p className="mt-1 text-[11px] text-slate-500">{def.scaleLabels[Number(value)]}</p>
      )}
      {invalid ? (
        <p className="mt-1 text-[11px] text-red-600">Ce champ est obligatoire.</p>
      ) : (
        def.hint && <p className="mt-1 text-[11px] text-slate-400">{def.hint}</p>
      )}
    </div>
  )
}

/** Valeurs initiales d'une fiche de réalisation planifiée manuellement. */
function newExecution(size: number): Omit<ControlExecution, 'id' | 'controlId' | 'period' | 'dueDate' | 'executor' | 'reviewer'> {
  return {
    status: 'a_realiser',
    performedDate: '',
    population: 0,
    sample: Array.from({ length: size }, (_, i) => ({ ref: `ELT-${i + 1}`, label: `Élément n° ${i + 1} (à identifier)`, result: '' as const, comment: '' })),
    conclusion: '',
    rootCause: '',
    correctiveAction: '',
    evidence: [],
    reviewComment: '',
    history: [{ date: new Date().toISOString().slice(0, 10), who: 'Direction du Contrôle Interne', action: 'Exécution planifiée manuellement' }],
  }
}

/** Une nouvelle valeur de KRI est ajoutée en fin de série (fenêtre glissante de 12 mesures). */
function withHistory(entity: Record<string, unknown>, prev: Kri | null) {
  const value = Number(entity.value)
  if (!prev) return { ...entity, history: Array.from({ length: 12 }, () => value) }
  const history = prev.value === value ? prev.history : [...prev.history.slice(1), value]
  return { ...entity, history }
}

function nextActivityId(processId: string, acts: Activity[]) {
  const max = acts.reduce((m, a) => Math.max(m, Number(a.id.split('-A')[1]) || 0), 0)
  return `${processId}-A${max + 1}`
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const truncate = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n)}…` : s)

