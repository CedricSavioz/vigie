import { CriticalityBadge, ScorePill } from '../ui/badges'
import {
  ACTION_STATUS_LABEL,
  AUDIT_SEVERITY_LABEL,
  AUDIT_STATUS_LABEL,
  CATEGORY_LABEL,
  CONTROL_TYPE_LABEL,
  CRITICALITY_LABEL,
  EFFECTIVENESS_LABEL,
  FREQUENCY_LABEL,
  IMPACT_SCALE,
  KRI_DIRECTION_LABEL,
  MATURITY_SCALE,
  options,
  PRIORITY_LABEL,
  PROBABILITY_SCALE,
  PROCESS_STATUS_LABEL,
  TREATMENT_LABEL,
} from '../../lib/labels'
import { daysFromToday } from '../../lib/format'
import { scoreToCriticality, todayIso } from '../../lib/risk'
import type { CollectionKey, EntityKind, GrcData } from '../../types'
import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────
// Configuration déclarative des formulaires : un seul composant
// de modale sait créer / éditer toutes les entités.
// Ajouter un champ = ajouter une ligne ici.
// ─────────────────────────────────────────────────────────────

export type FormValues = Record<string, string | number>
type Opt = { value: string; label: string }

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'score'
  required?: boolean
  /** Occupe toute la largeur de la grille */
  full?: boolean
  hint?: string
  placeholder?: string
  step?: number
  options?: Opt[] | ((values: FormValues, data: GrcData) => Opt[])
  scaleLabels?: Record<number, string>
}

export interface EntityConfig {
  label: string
  /** Genre grammatical, pour « Nouveau / Nouvelle » */
  feminine?: boolean
  collection: CollectionKey | null
  prefix: string
  fields: FieldDef[]
  defaults: (data: GrcData) => FormValues
  preview?: (values: FormValues) => ReactNode
}

const processOptions = (_: FormValues, data: GrcData) =>
  data.processes.map((p) => ({ value: p.id, label: `${p.id} — ${p.name}` }))

const riskOptions = (_: FormValues, data: GrcData) =>
  data.risks.map((r) => ({ value: r.id, label: `${r.id} — ${r.name}` }))

const optionalRiskOptions = (v: FormValues, data: GrcData) => [{ value: '', label: '— Non rattaché —' }, ...riskOptions(v, data)]

const activityOptions = (values: FormValues, data: GrcData) => {
  const proc = data.processes.find((p) => p.id === values.processId)
  return [{ value: '', label: '— Aucune activité précise —' }, ...(proc?.activities ?? []).map((a) => ({ value: a.id, label: a.name }))]
}

const ownerHint = 'Ex. Direction du Contrôle Interne, DPO, Direction des Risques (R2)…'

export const ENTITY_CONFIG: Record<EntityKind, EntityConfig> = {
  process: {
    label: 'processus',
    collection: 'processes',
    prefix: 'PR',
    defaults: () => ({ name: '', domain: '', description: '', owner: '', status: 'concu', maturity: 2 }),
    fields: [
      { key: 'name', label: 'Nom du processus', type: 'text', required: true, full: true, placeholder: 'Ex. Gestion des réclamations clients' },
      {
        key: 'domain',
        label: 'Domaine',
        type: 'text',
        required: true,
        hint: 'Saisissez un domaine existant ou nouveau',
        placeholder: 'Ex. Banque de détail',
      },
      { key: 'owner', label: 'Propriétaire', type: 'text', required: true, placeholder: ownerHint },
      { key: 'status', label: 'Statut', type: 'select', options: options(PROCESS_STATUS_LABEL) },
      { key: 'maturity', label: 'Niveau de maturité', type: 'score', scaleLabels: MATURITY_SCALE },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
    ],
  },
  activity: {
    label: 'activité',
    feminine: true,
    collection: null,
    prefix: 'A',
    defaults: (data) => ({ processId: data.processes[0]?.id ?? '', name: '', description: '', owner: '' }),
    fields: [
      { key: 'processId', label: 'Processus', type: 'select', required: true, full: true, options: processOptions },
      { key: 'name', label: "Nom de l'activité", type: 'text', required: true, placeholder: 'Ex. Contrôle de complétude' },
      { key: 'owner', label: 'Responsable', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
    ],
  },
  risk: {
    label: 'risque',
    collection: 'risks',
    prefix: 'R',
    defaults: (data) => ({
      name: '',
      description: '',
      category: 'operationnel',
      processId: data.processes[0]?.id ?? '',
      activityId: '',
      owner: '',
      probability: 3,
      impact: 3,
      controlsSummary: '',
      residualProbability: 2,
      residualImpact: 3,
      treatment: 'reduire',
    }),
    fields: [
      { key: 'name', label: 'Intitulé du risque', type: 'text', required: true, full: true },
      { key: 'processId', label: 'Processus', type: 'select', required: true, options: processOptions },
      { key: 'activityId', label: 'Activité', type: 'select', options: activityOptions },
      { key: 'category', label: 'Catégorie', type: 'select', options: options(CATEGORY_LABEL) },
      { key: 'owner', label: 'Porteur du risque', type: 'text', required: true, placeholder: ownerHint },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
      { key: 'probability', label: 'Probabilité intrinsèque', type: 'score', scaleLabels: PROBABILITY_SCALE },
      { key: 'impact', label: 'Impact intrinsèque', type: 'score', scaleLabels: IMPACT_SCALE },
      { key: 'controlsSummary', label: 'Contrôles en place (résumé)', type: 'textarea', full: true },
      { key: 'residualProbability', label: 'Probabilité résiduelle', type: 'score', scaleLabels: PROBABILITY_SCALE },
      { key: 'residualImpact', label: 'Impact résiduel', type: 'score', scaleLabels: IMPACT_SCALE },
      { key: 'treatment', label: 'Stratégie de traitement', type: 'select', full: true, options: options(TREATMENT_LABEL) },
    ],
    preview: (v) => {
      const inh = Number(v.probability) * Number(v.impact)
      const res = Number(v.residualProbability) * Number(v.residualImpact)
      return (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
          <span className="flex items-center gap-2">Risque intrinsèque <ScorePill score={inh} /></span>
          <span className="flex items-center gap-2">Risque résiduel <ScorePill score={res} /></span>
          <span className="flex items-center gap-2">Criticité calculée <CriticalityBadge value={scoreToCriticality(res)} /></span>
        </div>
      )
    },
  },
  control: {
    label: 'contrôle',
    collection: 'controls',
    prefix: 'C',
    defaults: (data) => ({
      name: '',
      type: 'preventif',
      frequency: 'mensuel',
      owner: '',
      effectiveness: 'partiel',
      riskId: data.risks[0]?.id ?? '',
      testResult: '',
      lastTestDate: todayIso(),
    }),
    fields: [
      { key: 'name', label: 'Intitulé du contrôle', type: 'text', required: true, full: true },
      { key: 'riskId', label: 'Risque couvert', type: 'select', required: true, full: true, options: riskOptions },
      { key: 'type', label: 'Type', type: 'select', options: options(CONTROL_TYPE_LABEL) },
      { key: 'frequency', label: 'Fréquence', type: 'select', options: options(FREQUENCY_LABEL) },
      { key: 'owner', label: 'Responsable', type: 'text', required: true },
      { key: 'effectiveness', label: 'Efficacité', type: 'select', options: options(EFFECTIVENESS_LABEL) },
      { key: 'lastTestDate', label: 'Date du dernier test', type: 'date' },
      { key: 'testResult', label: 'Résultat du test', type: 'textarea', full: true },
      { key: 'objective', label: 'Objectif du contrôle', type: 'textarea', full: true, hint: 'Repris dans chaque fiche de réalisation' },
      { key: 'procedure', label: 'Mode opératoire (une étape par ligne)', type: 'textarea', full: true },
      { key: 'criterion', label: 'Critère de conformité', type: 'textarea', full: true },
      { key: 'expectedEvidence', label: 'Preuves attendues', type: 'textarea', full: true },
    ],
  },
  execution: {
    label: 'exécution de contrôle',
    feminine: true,
    collection: 'executions',
    prefix: 'EX',
    defaults: (data) => ({
      controlId: data.controls[0]?.id ?? '',
      period: '',
      dueDate: daysFromToday(15),
      executor: '',
      reviewer: '',
      sampleSize: 5,
    }),
    fields: [
      {
        key: 'controlId',
        label: 'Contrôle à réaliser',
        type: 'select',
        required: true,
        full: true,
        options: (_, data) => data.controls.map((c) => ({ value: c.id, label: `${c.id} — ${c.name}` })),
      },
      { key: 'period', label: 'Période contrôlée', type: 'text', required: true, placeholder: 'Ex. Octobre 2026' },
      { key: 'dueDate', label: 'Échéance', type: 'date', required: true },
      { key: 'executor', label: 'Exécutant (1re ligne)', type: 'text', required: true, placeholder: 'Prénom Nom · Service' },
      { key: 'reviewer', label: 'Valideur', type: 'text', required: true, placeholder: 'Prénom Nom · Fonction' },
      { key: 'sampleSize', label: "Taille de l'échantillon", type: 'number', step: 1, hint: "Nombre d'éléments à tester (à la création uniquement)" },
    ],
  },
  kri: {
    label: 'KRI',
    collection: 'kris',
    prefix: 'KRI',
    defaults: (data) => ({
      name: '',
      definition: '',
      riskId: data.risks[0]?.id ?? '',
      unit: '%',
      thresholdOrange: 5,
      thresholdRed: 10,
      direction: 'hausse_defavorable',
      value: 3,
      frequency: 'mensuel',
    }),
    fields: [
      { key: 'name', label: "Nom de l'indicateur", type: 'text', required: true, full: true },
      { key: 'riskId', label: 'Risque suivi', type: 'select', required: true, full: true, options: riskOptions },
      { key: 'definition', label: 'Formule / définition', type: 'textarea', full: true },
      { key: 'direction', label: 'Sens de lecture', type: 'select', options: options(KRI_DIRECTION_LABEL) },
      { key: 'unit', label: 'Unité', type: 'text', placeholder: '%, nb, k€, jours…' },
      { key: 'thresholdOrange', label: "Seuil d'alerte (orange)", type: 'number', step: 0.01 },
      { key: 'thresholdRed', label: 'Seuil critique (rouge)', type: 'number', step: 0.01 },
      { key: 'value', label: 'Valeur actuelle', type: 'number', step: 0.01, hint: 'Une valeur modifiée est ajoutée comme nouvelle mesure' },
      { key: 'frequency', label: 'Fréquence de mesure', type: 'select', options: options(FREQUENCY_LABEL) },
    ],
  },
  action: {
    label: "plan d'action",
    collection: 'actions',
    prefix: 'PA',
    defaults: (data) => ({
      title: '',
      description: '',
      riskId: data.risks[0]?.id ?? '',
      owner: '',
      priority: 'moyenne',
      startDate: todayIso(),
      deadline: daysFromToday(90),
      status: 'a_faire',
      cost: 0,
      targetCriticality: 'L',
    }),
    fields: [
      { key: 'title', label: 'Intitulé', type: 'text', required: true, full: true },
      { key: 'riskId', label: 'Risque traité', type: 'select', required: true, full: true, options: riskOptions },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
      { key: 'owner', label: 'Responsable', type: 'text', required: true },
      { key: 'priority', label: 'Priorité', type: 'select', options: options(PRIORITY_LABEL) },
      { key: 'startDate', label: 'Date de début', type: 'date' },
      { key: 'deadline', label: 'Échéance', type: 'date', required: true },
      { key: 'status', label: 'Statut', type: 'select', options: options(ACTION_STATUS_LABEL) },
      { key: 'cost', label: 'Coût estimé (€)', type: 'number', step: 1000 },
      { key: 'targetCriticality', label: 'Risque résiduel cible', type: 'select', options: options(CRITICALITY_LABEL) },
    ],
  },
  audit: {
    label: "recommandation d'audit",
    feminine: true,
    collection: 'audits',
    prefix: 'AUD',
    defaults: (data) => ({
      title: '',
      description: '',
      auditor: 'Audit interne',
      severity: 'moyenne',
      riskId: data.risks[0]?.id ?? '',
      status: 'ouverte',
      deadline: daysFromToday(90),
    }),
    fields: [
      { key: 'title', label: 'Intitulé', type: 'text', required: true, full: true },
      { key: 'description', label: 'Constat / recommandation', type: 'textarea', full: true },
      { key: 'auditor', label: 'Organe / auditeur', type: 'text', required: true, placeholder: 'Inspection Générale, ACPR, CAC…' },
      { key: 'severity', label: 'Sévérité', type: 'select', options: options(AUDIT_SEVERITY_LABEL) },
      { key: 'riskId', label: 'Risque lié', type: 'select', full: true, options: optionalRiskOptions },
      { key: 'status', label: 'Statut', type: 'select', options: options(AUDIT_STATUS_LABEL) },
      { key: 'deadline', label: 'Échéance', type: 'date', required: true },
    ],
  },
  loss: {
    label: 'perte',
    feminine: true,
    collection: 'losses',
    prefix: 'PE',
    defaults: () => ({ description: '', amount: 0, date: todayIso(), riskId: '', category: 'operationnel' }),
    fields: [
      { key: 'description', label: "Description de l'incident", type: 'textarea', required: true, full: true },
      { key: 'amount', label: 'Montant de la perte (€)', type: 'number', required: true, step: 100 },
      { key: 'date', label: 'Date de survenance', type: 'date', required: true },
      { key: 'riskId', label: 'Risque lié', type: 'select', full: true, options: optionalRiskOptions },
      {
        key: 'category',
        label: 'Catégorie',
        type: 'select',
        options: options(CATEGORY_LABEL),
        hint: 'Reprise automatiquement du risque lié, le cas échéant',
      },
    ],
  },
}

/** Champs numériques à convertir à l'enregistrement. */
export const NUMERIC_TYPES = new Set<FieldDef['type']>(['number', 'score'])
