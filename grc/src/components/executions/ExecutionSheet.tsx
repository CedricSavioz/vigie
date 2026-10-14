import clsx from 'clsx'
import { AlertTriangle, Check, CircleCheck, Clock, FileText, Paperclip, Play, Save, Send, Undo2, Upload, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { daysFromToday, daysUntil, formatDate, nextId } from '../../lib/format'
import { CONCLUSION_TO_EFFECTIVENESS, isOverdue, submissionErrors } from '../../lib/execution'
import { CONCLUSION_LABEL, CONTROL_TYPE_LABEL, EFFECTIVENESS_LABEL, FREQUENCY_LABEL } from '../../lib/labels'
import { criticalityOf, todayIso } from '../../lib/risk'
import { useGrc } from '../../store/GrcStore'
import { useUi } from '../../store/UiStore'
import type { ActionPlan, ControlExecution, ExecutionConclusion, ExecutionStatus, SampleResult } from '../../types'
import { ConclusionBadge, CriticalityBadge, ExecutionStatusBadge, JiraBadge } from '../ui/badges'
import { Button, Modal } from '../ui/primitives'

export type ExecRole = 'executant' | 'valideur'

const STEPS: { status: ExecutionStatus; label: string }[] = [
  { status: 'a_realiser', label: 'À réaliser' },
  { status: 'en_cours', label: 'En cours' },
  { status: 'soumis', label: 'Soumis' },
  { status: 'valide', label: 'Validé' },
]
const STEP_INDEX: Record<ExecutionStatus, number> = { a_realiser: 0, en_cours: 1, a_reprendre: 1, soumis: 2, valide: 3 }

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-xs transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-3 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50 disabled:text-slate-600'

/**
 * Fiche de réalisation d'un contrôle : ce que reçoit le métier (1re ligne)
 * à chaque échéance, puis ce que revoit le valideur.
 * En production, cette fiche correspond à un ticket Jira.
 */
export function ExecutionSheet({ id, role, onClose }: { id: string; role: ExecRole; onClose: () => void }) {
  const { data, rel, upsert } = useGrc()
  const { notify, openDrawer, closeDrawer } = useUi()
  const saved = data.executions.find((e) => e.id === id)
  const [draft, setDraft] = useState<ControlExecution | null>(saved ? structuredClone(saved) : null)
  const [errors, setErrors] = useState<string[]>([])
  const [review, setReview] = useState('')
  const [reviewError, setReviewError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!saved || !draft) return null
  const control = data.controls.find((c) => c.id === draft.controlId)
  const risk = control ? rel.riskById.get(control.riskId) : undefined
  const editable = role === 'executant' && (draft.status === 'en_cours' || draft.status === 'a_reprendre')
  const overdue = isOverdue(draft)
  const actor = role === 'executant' ? draft.executor : draft.reviewer
  const tested = draft.sample.filter((s) => s.result).length
  const anomalies = draft.sample.filter((s) => s.result === 'anomalie').length
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const set = <K extends keyof ControlExecution>(key: K, value: ControlExecution[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d))
  const setItem = (i: number, patch: { result?: SampleResult; comment?: string }) =>
    setDraft((d) => (d ? { ...d, sample: d.sample.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : d))
  const log = (e: ControlExecution, action: string, who = actor): ControlExecution => ({
    ...e,
    history: [...e.history, { date: todayIso(), who, action }],
  })

  const start = () => {
    const next = log({ ...draft, status: 'en_cours', performedDate: draft.performedDate || todayIso() }, 'Réalisation démarrée')
    upsert('executions', next)
    setDraft(next)
    notify(`${draft.jiraKey ?? draft.id} : réalisation démarrée`, 'info')
  }

  const saveDraft = () => {
    upsert('executions', draft)
    notify('Brouillon enregistré')
  }

  const submit = () => {
    const errs = submissionErrors(draft)
    setErrors(errs)
    if (errs.length) return
    upsert('executions', log({ ...draft, status: 'soumis' }, 'Fiche soumise à validation'))
    notify(`Fiche soumise à ${draft.reviewer.split(' · ')[0]} pour validation`)
    onClose()
  }

  const sendBack = () => {
    if (!review.trim()) {
      setReviewError(true)
      return
    }
    upsert('executions', log({ ...draft, status: 'a_reprendre', reviewComment: review.trim() }, 'Fiche renvoyée pour correction'))
    notify('Fiche renvoyée à l’exécutant pour correction', 'info')
    onClose()
  }

  const validate = () => {
    if (!control || !draft.conclusion) return
    const conclusion = draft.conclusion as ExecutionConclusion
    const effectiveness = CONCLUSION_TO_EFFECTIVENESS[conclusion]
    // 1. Le référentiel est mis à jour à partir du résultat validé.
    upsert('controls', {
      ...control,
      effectiveness,
      lastTestDate: draft.performedDate || todayIso(),
      testResult: `${draft.period} : ${anomalies} anomalie(s) sur ${draft.sample.length} élément(s) testé(s) — ${CONCLUSION_LABEL[conclusion].toLowerCase()}.`,
    })
    // 2. Une anomalie majeure déclenche un plan d'action rattaché au risque.
    let actionId = draft.actionId
    if (conclusion === 'anomalie_majeure' && !actionId) {
      actionId = nextId('PA', data.actions)
      const plan: ActionPlan = {
        id: actionId,
        title: `Remédiation : ${control.name} (${draft.period})`,
        description: draft.correctiveAction || draft.rootCause,
        riskId: control.riskId,
        owner: control.owner,
        priority: 'haute',
        startDate: todayIso(),
        deadline: daysFromToday(60),
        status: 'a_faire',
        cost: 0,
        targetCriticality: 'M',
      }
      upsert('actions', plan)
    }
    let next = log({ ...draft, status: 'valide', actionId, reviewComment: review.trim() || draft.reviewComment }, 'Fiche validée')
    if (actionId && actionId !== draft.actionId) next = log(next, `Plan d'action ${actionId} créé automatiquement`, 'Vigie GRC')
    upsert('executions', next)
    notify(
      `Fiche validée · ${control.id} : efficacité « ${EFFECTIVENESS_LABEL[effectiveness].toLowerCase()} »${actionId && actionId !== draft.actionId ? ` · plan ${actionId} créé` : ''}`,
    )
    onClose()
  }

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    set('evidence', [...draft.evidence, ...[...files].map((f) => f.name).filter((n) => !draft.evidence.includes(n))])
  }

  const steps = control?.procedure?.split('\n').filter(Boolean) ?? []
  const currentStep = STEP_INDEX[draft.status]

  // ─── Pied de fiche : actions selon le rôle et le statut ───
  let footer: ReactNode
  if (role === 'executant' && draft.status === 'a_realiser') {
    footer = (
      <>
        <Button onClick={onClose}>Fermer</Button>
        <Button variant="primary" onClick={start}>
          <Play className="size-4" /> Démarrer la réalisation
        </Button>
      </>
    )
  } else if (editable) {
    footer = (
      <>
        <Button onClick={onClose}>Fermer</Button>
        <Button onClick={saveDraft} disabled={!dirty}>
          <Save className="size-4" /> Enregistrer le brouillon
        </Button>
        <Button variant="primary" onClick={submit}>
          <Send className="size-4" /> Soumettre à validation
        </Button>
      </>
    )
  } else if (role === 'valideur' && draft.status === 'soumis') {
    footer = (
      <>
        <Button onClick={onClose}>Fermer</Button>
        <Button onClick={sendBack}>
          <Undo2 className="size-4" /> Renvoyer pour correction
        </Button>
        <Button variant="primary" onClick={validate}>
          <CircleCheck className="size-4" /> Valider la fiche
        </Button>
      </>
    )
  } else {
    footer = (
      <>
        <span className="mr-auto self-center text-xs text-slate-500">{readOnlyReason(draft.status, role)}</span>
        <Button onClick={onClose}>Fermer</Button>
      </>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-6xl"
      title={
        <span className="flex flex-wrap items-center gap-2">
          Fiche de réalisation · {control?.name ?? draft.controlId}
        </span>
      }
      subtitle={
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <JiraBadge jiraKey={draft.jiraKey} />
          <span className="font-mono text-xs text-slate-400">{draft.id}</span>
          <span>· Période contrôlée : {draft.period}</span>
          <ExecutionStatusBadge value={draft.status} overdue={overdue} />
        </span>
      }
      footer={footer}
    >
      {/* Circuit */}
      <ol className="mb-5 flex items-center gap-2" aria-label="Circuit de la fiche">
        {STEPS.map((s, i) => (
          <li key={s.status} className="flex flex-1 items-center gap-2">
            <span
              className={clsx(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                i < currentStep || draft.status === 'valide'
                  ? 'bg-emerald-500 text-white'
                  : i === currentStep
                    ? draft.status === 'a_reprendre'
                      ? 'bg-amber-500 text-white'
                      : 'bg-brand-900 text-white'
                    : 'bg-slate-200 text-slate-500',
              )}
            >
              {i < currentStep || draft.status === 'valide' ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={clsx('text-xs whitespace-nowrap', i === currentStep ? 'font-semibold text-slate-900' : 'text-slate-500')}>
              {i === 1 && draft.status === 'a_reprendre' ? 'À reprendre' : s.label}
            </span>
            {i < STEPS.length - 1 && <span className={clsx('h-px flex-1', i < currentStep ? 'bg-emerald-300' : 'bg-slate-200')} />}
          </li>
        ))}
      </ol>

      {draft.status === 'a_reprendre' && draft.reviewComment && (
        <Callout tone="amber" title={`Renvoyée par ${draft.reviewer.split(' · ')[0]}`}>
          {draft.reviewComment}
        </Callout>
      )}
      {role === 'executant' && draft.status === 'a_realiser' && (
        <Callout tone="brand" title="Nouvelle fiche à réaliser">
          Prenez connaissance du mode opératoire puis cliquez sur « Démarrer la réalisation » pour renseigner l’échantillon.
        </Callout>
      )}
      {errors.length > 0 && (
        <Callout tone="red" title="La fiche ne peut pas encore être soumise">
          <ul className="list-disc pl-4">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Callout>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Le contrôle */}
          <Section n={1} title="Le contrôle à réaliser">
            <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <Info label="Objectif">{control?.objective ?? 'Objectif non documenté dans le référentiel.'}</Info>
              <div>
                <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Mode opératoire</p>
                {steps.length ? (
                  <ol className="space-y-1.5">
                    {steps.map((s, i) => (
                      <li key={i} className="flex gap-2 text-slate-700">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-brand-700 ring-1 ring-slate-200">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-slate-500">Mode opératoire non documenté : à compléter dans la fiche du contrôle.</p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Critère de conformité">{control?.criterion ?? '—'}</Info>
                <Info label="Preuves attendues">{control?.expectedEvidence ?? '—'}</Info>
              </div>
            </div>
          </Section>

          {/* 2. Réalisation */}
          <Section
            n={2}
            title="Réalisation et échantillon"
            aside={
              <span className="text-xs text-slate-500 tabular-nums">
                {tested}/{draft.sample.length} évalués · <span className={anomalies ? 'font-semibold text-red-600' : ''}>{anomalies} anomalie(s)</span>
              </span>
            }
          >
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-700">
                Date de réalisation
                <input
                  id="exec-date"
                  type="date"
                  disabled={!editable}
                  className={clsx(inputCls, 'mt-1')}
                  value={draft.performedDate}
                  onChange={(e) => set('performedDate', e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-slate-700">
                Taille de la population contrôlée
                <input
                  id="exec-population"
                  type="number"
                  min={0}
                  disabled={!editable}
                  className={clsx(inputCls, 'mt-1')}
                  value={draft.population || ''}
                  placeholder="Ex. 312"
                  onChange={(e) => set('population', Number(e.target.value))}
                />
              </label>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Élément testé</th>
                    <th className="w-52 px-3 py-2 text-left">Résultat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draft.sample.map((s, i) => (
                    <tr key={s.ref} className={clsx(s.result === 'anomalie' && 'bg-red-50/40')}>
                      <td className="px-3 py-2 align-top">
                        <p className="font-mono text-[11px] text-slate-400">{s.ref}</p>
                        <p className="text-slate-700">{s.label}</p>
                        {(s.result === 'anomalie' || s.comment) && (
                          <input
                            aria-label={`Commentaire pour ${s.ref}`}
                            disabled={!editable}
                            className={clsx(inputCls, 'mt-1.5 py-1.5 text-xs', s.result === 'anomalie' && !s.comment.trim() && editable && 'border-red-300')}
                            placeholder="Décrivez l’anomalie constatée…"
                            value={s.comment}
                            onChange={(e) => setItem(i, { comment: e.target.value })}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div role="radiogroup" aria-label={`Résultat pour ${s.ref}`} className="inline-flex rounded-lg bg-slate-100 p-0.5">
                          {(['conforme', 'anomalie'] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              role="radio"
                              aria-checked={s.result === r}
                              disabled={!editable}
                              onClick={() => setItem(i, { result: s.result === r ? '' : r })}
                              className={clsx(
                                'rounded-md px-2.5 py-1 text-xs font-medium transition enabled:cursor-pointer',
                                s.result === r
                                  ? r === 'conforme'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-red-600 text-white shadow-sm'
                                  : 'text-slate-500 enabled:hover:text-slate-800',
                              )}
                            >
                              {r === 'conforme' ? 'Conforme' : 'Anomalie'}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 3. Conclusion */}
          <Section n={3} title="Conclusion de l'exécutant">
            {editable && tested === draft.sample.length && (
              <p className="mb-2 text-xs text-slate-500">
                Suggestion au vu de l’échantillon : <strong>{anomalies ? 'anomalie (mineure ou majeure selon l’impact)' : 'conforme'}</strong>
              </p>
            )}
            <div role="radiogroup" aria-label="Conclusion" className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(CONCLUSION_LABEL) as ExecutionConclusion[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={draft.conclusion === c}
                  disabled={!editable}
                  onClick={() => set('conclusion', c)}
                  className={clsx(
                    'rounded-xl border-2 px-3 py-2.5 text-left transition enabled:cursor-pointer',
                    draft.conclusion === c
                      ? c === 'conforme'
                        ? 'border-emerald-500 bg-emerald-50'
                        : c === 'anomalie_mineure'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-red-500 bg-red-50'
                      : 'border-slate-200 bg-white enabled:hover:border-slate-300',
                  )}
                >
                  <p className="text-sm font-semibold text-slate-800">{CONCLUSION_LABEL[c]}</p>
                  <p className="text-[11px] text-slate-500">
                    {c === 'conforme' ? 'Contrôle efficace' : c === 'anomalie_mineure' ? 'Contrôle partiellement efficace' : 'Contrôle inefficace → plan d’action'}
                  </p>
                </button>
              ))}
            </div>
            {draft.conclusion && draft.conclusion !== 'conforme' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">
                  Cause de l’anomalie
                  <textarea id="exec-cause" rows={3} disabled={!editable} className={clsx(inputCls, 'mt-1')} value={draft.rootCause} onChange={(e) => set('rootCause', e.target.value)} />
                </label>
                <label className="text-xs font-medium text-slate-700">
                  Action corrective proposée
                  <textarea
                    id="exec-action"
                    rows={3}
                    disabled={!editable}
                    className={clsx(inputCls, 'mt-1')}
                    value={draft.correctiveAction}
                    onChange={(e) => set('correctiveAction', e.target.value)}
                  />
                </label>
              </div>
            )}
          </Section>

          {/* 4. Validation */}
          {(role === 'valideur' && draft.status === 'soumis') || draft.status === 'valide' ? (
            <Section n={4} title="Validation">
              {draft.status === 'soumis' ? (
                <>
                  <p className="mb-2 text-xs text-slate-500">
                    En validant, l’efficacité du contrôle passera à{' '}
                    <strong>{draft.conclusion ? EFFECTIVENESS_LABEL[CONCLUSION_TO_EFFECTIVENESS[draft.conclusion]].toLowerCase() : '—'}</strong>
                    {draft.conclusion === 'anomalie_majeure' && ' et un plan d’action sera créé sur le risque'}.
                  </p>
                  <label className="text-xs font-medium text-slate-700">
                    Commentaire du valideur {reviewError && <span className="text-red-600">(obligatoire pour renvoyer la fiche)</span>}
                    <textarea
                      id="exec-review"
                      rows={2}
                      className={clsx(inputCls, 'mt-1', reviewError && 'border-red-400')}
                      placeholder="Obligatoire en cas de renvoi, facultatif en cas de validation"
                      value={review}
                      onChange={(e) => {
                        setReview(e.target.value)
                        setReviewError(false)
                      }}
                    />
                  </label>
                </>
              ) : (
                <Callout tone="green" title={`Validée par ${draft.reviewer.split(' · ')[0]}`}>
                  {draft.reviewComment || 'Aucun commentaire.'}
                  {draft.actionId && <span className="mt-1 block">Plan d’action créé : {draft.actionId}.</span>}
                </Callout>
              )}
            </Section>
          ) : null}
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-5">
          <div className="space-y-2.5 rounded-xl border border-slate-200 p-4 text-sm">
            <Meta label="Échéance">
              <span className={clsx(overdue && 'font-semibold text-red-600')}>
                {formatDate(draft.dueDate)}
                {draft.status !== 'valide' && draft.status !== 'soumis' && (
                  <span className="ml-1 text-xs">({daysUntil(draft.dueDate) < 0 ? `${-daysUntil(draft.dueDate)} j de retard` : `J-${daysUntil(draft.dueDate)}`})</span>
                )}
              </span>
            </Meta>
            <Meta label="Exécutant">{draft.executor}</Meta>
            <Meta label="Valideur">{draft.reviewer}</Meta>
            {control && (
              <Meta label="Contrôle">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs text-slate-400">{control.id}</span>
                  <JiraBadge jiraKey={control.jiraKey} />
                </span>
                <span className="text-xs text-slate-500">
                  {CONTROL_TYPE_LABEL[control.type]} · {FREQUENCY_LABEL[control.frequency].toLowerCase()} · efficacité actuelle :{' '}
                  {EFFECTIVENESS_LABEL[control.effectiveness].toLowerCase()}
                </span>
              </Meta>
            )}
            {risk && (
              <Meta label="Risque couvert">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    closeDrawer()
                    openDrawer({ kind: 'risk', id: risk.id })
                  }}
                  className="cursor-pointer text-left font-medium text-brand-700 hover:underline"
                >
                  {risk.id} · {risk.name}
                </button>
                <span className="mt-1 block">
                  <CriticalityBadge value={criticalityOf(risk)} />
                </span>
              </Meta>
            )}
            {draft.conclusion && (
              <Meta label="Conclusion">
                <ConclusionBadge value={draft.conclusion} />
              </Meta>
            )}
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <Paperclip className="size-3.5" /> Pièces justificatives
            </h4>
            <ul className="space-y-1.5">
              {draft.evidence.map((f) => (
                <li key={f} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700">
                  <FileText className="size-3.5 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate" title={f}>
                    {f}
                  </span>
                  {editable && (
                    <button
                      type="button"
                      aria-label={`Retirer ${f}`}
                      onClick={() => set('evidence', draft.evidence.filter((x) => x !== f))}
                      className="cursor-pointer text-slate-400 hover:text-red-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
              {!draft.evidence.length && <li className="text-xs text-slate-400">Aucune pièce jointe.</li>}
            </ul>
            {editable && (
              <>
                <input ref={fileRef} id="exec-files" type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                <Button size="sm" className="mt-2 w-full" onClick={() => fileRef.current?.click()}>
                  <Upload className="size-3.5" /> Ajouter des preuves
                </Button>
                <p className="mt-1 text-[10px] text-slate-400">Démo : seul le nom du fichier est conservé.</p>
              </>
            )}
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <Clock className="size-3.5" /> Historique
            </h4>
            <ol className="relative space-y-3 border-l border-slate-200 pl-4">
              {[...draft.history].reverse().map((h, i) => (
                <li key={i} className="relative text-xs">
                  <span className="absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-white bg-brand-500" />
                  <p className="text-slate-700">{h.action}</p>
                  <p className="text-[11px] text-slate-400">
                    {formatDate(h.date)} · {h.who}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </Modal>
  )
}

function readOnlyReason(status: ExecutionStatus, role: ExecRole) {
  if (status === 'valide') return 'Fiche validée : lecture seule.'
  if (status === 'soumis') return role === 'executant' ? 'Fiche soumise : en attente de validation.' : ''
  if (role === 'valideur') return 'La fiche est chez l’exécutant. Passez en vue « Exécutant » pour la compléter.'
  return ''
}

function Section({ n, title, aside, children }: { n: number; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="flex size-5 items-center justify-center rounded-md bg-brand-900 text-[11px] text-white">{n}</span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="text-slate-700">{children}</p>
    </div>
  )
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400">{label}</p>
      <div className="text-slate-800">{children}</div>
    </div>
  )
}

const CALLOUT = {
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  red: 'border-red-200 bg-red-50 text-red-900',
  brand: 'border-brand-200 bg-brand-50 text-brand-900',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}
function Callout({ tone, title, children }: { tone: keyof typeof CALLOUT; title: string; children: ReactNode }) {
  return (
    <div className={clsx('mb-5 flex gap-2.5 rounded-xl border px-4 py-3 text-sm', CALLOUT[tone])}>
      {tone === 'green' ? (
        <CircleCheck className="mt-0.5 size-4 shrink-0 opacity-70" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 opacity-70" />
      )}
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-0.5 text-[13px] opacity-90">{children}</div>
      </div>
    </div>
  )
}
