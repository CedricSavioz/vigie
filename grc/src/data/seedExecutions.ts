import { daysFromToday } from '../lib/format'
import type { Control, ControlExecution, ExecutionStatus, SampleItem, SampleResult } from '../types'

// ─────────────────────────────────────────────────────────────
// Démo : modes opératoires de quelques contrôles et fiches de
// réalisation à différents stades du circuit
// (à réaliser → en cours → soumis → validé / à reprendre).
// Personnes et clients fictifs.
// ─────────────────────────────────────────────────────────────

type Procedure = Pick<Control, 'objective' | 'procedure' | 'criterion' | 'expectedEvidence'>

export const CONTROL_PROCEDURES: Record<string, Procedure> = {
  'C-05': {
    objective: 'S’assurer que les dossiers des clients à risque élevé disposent d’une revue KYC à jour.',
    procedure:
      'Extraire de l’outil KYC la liste des clients à risque élevé au dernier jour du mois.\nIdentifier les dossiers dont la date de revue périodique est échue.\nTirer l’échantillon et vérifier pour chaque dossier : pièce d’identité valide, justificatif de domicile < 3 mois, questionnaire KYC signé.\nDocumenter toute anomalie et relancer le conseiller concerné.',
    criterion: 'Pièces en cours de validité et revue périodique datée de moins de 12 mois.',
    expectedEvidence: 'Extraction datée de l’outil KYC + liste de l’échantillon annotée.',
  },
  'C-26': {
    objective: 'Détecter et justifier les écarts entre les comptes nostro et la comptabilité.',
    procedure:
      'Lancer le rapprochement automatique pour chaque compte nostro.\nAnalyser les suspens non rapprochés.\nPour chaque suspens de l’échantillon, obtenir la justification et la date de résolution prévue.\nEscalader tout suspens > 30 jours ou > 10 000 €.',
    criterion: 'Aucun suspens non justifié ; aucun suspens > 30 jours sans plan de résolution.',
    expectedEvidence: 'État de rapprochement signé + justificatifs des suspens.',
  },
  'C-40': {
    objective: 'Garantir la désactivation des accès des collaborateurs ayant quitté la banque.',
    procedure:
      'Extraire du SIRH la liste des départs du mois.\nPour chaque départ de l’échantillon, vérifier dans l’annuaire et les applications critiques que le compte est désactivé.\nVérifier que la désactivation est intervenue au plus tard le jour du départ.',
    criterion: 'Compte désactivé au plus tard à J0 du départ.',
    expectedEvidence: 'Extraction SIRH + captures de l’annuaire montrant le statut des comptes.',
  },
  'C-21': {
    objective: 'S’assurer que les virements de plus de 50 000 € ont fait l’objet d’une double validation.',
    procedure:
      'Extraire de l’outil de paiement les ordres > 50 000 € de la période.\nTirer un échantillon aléatoire.\nVérifier pour chaque ordre la présence de deux validations par deux personnes distinctes habilitées.',
    criterion: 'Deux validations par deux personnes distinctes, toutes deux habilitées.',
    expectedEvidence: 'Extraction de l’outil de paiement avec journal des validations.',
  },
  'C-15': {
    objective: 'Vérifier qu’aucun crédit n’est décaissé avant la levée des conditions suspensives.',
    procedure:
      'Lister les décaissements du mois.\nPour chaque dossier de l’échantillon, comparer la date de décaissement aux dates de réception des pièces suspensives (garanties, assurance, acte notarié).\nVérifier la double signature de la check-list.',
    criterion: 'Toutes les conditions suspensives levées avant le décaissement, check-list doublement signée.',
    expectedEvidence: 'Check-lists de décaissement signées + preuves de réception des pièces.',
  },
  'C-33': {
    objective: 'Piloter le stock d’alertes LCB-FT et déclencher une escalade en cas de dépassement.',
    procedure:
      'Extraire chaque semaine le stock d’alertes par ancienneté.\nComparer le stock > 30 jours aux seuils du KRI.\nEn cas de dépassement, documenter l’escalade au Responsable LCB-FT.',
    criterion: 'Stock > 30 jours sous le seuil d’alerte, ou escalade documentée.',
    expectedEvidence: 'Extraction hebdomadaire du stock + preuve d’escalade le cas échéant.',
  },
  'C-14': {
    objective: 'S’assurer que chaque dérogation au schéma délégataire est justifiée et approuvée.',
    procedure:
      'Extraire la liste des dérogations du mois.\nVérifier pour chaque dérogation la justification écrite et l’approbation du niveau supérieur.',
    criterion: 'Justification écrite et approbation du niveau hiérarchique supérieur.',
    expectedEvidence: 'Registre des dérogations + approbations.',
  },
  'C-31': {
    objective: 'Vérifier le respect des limites d’exposition sur les contreparties bancaires.',
    procedure: 'Extraire les expositions quotidiennes par contrepartie.\nComparer aux limites validées en comité.\nDocumenter tout dépassement et son traitement.',
    criterion: 'Aucun dépassement de limite non autorisé.',
    expectedEvidence: 'Reporting quotidien des limites.',
  },
  'C-18': {
    objective: 'S’assurer que tout changement de coordonnées bancaires est confirmé par contre-appel.',
    procedure:
      'Extraire les demandes de changement de RIB du mois.\nPour chaque demande de l’échantillon, vérifier la trace du contre-appel (date, numéro appelé issu du référentiel, collaborateur).\nVérifier que le numéro appelé ne provient pas de la demande elle-même.',
    criterion: 'Contre-appel tracé vers un numéro connu avant la mise à jour du RIB.',
    expectedEvidence: 'Extraction des demandes + journal des contre-appels.',
  },
}

const items = (list: [ref: string, label: string, result?: SampleResult, comment?: string][]): SampleItem[] =>
  list.map(([ref, label, result = '', comment = '']) => ({ ref, label, result, comment }))

function ex(
  n: number,
  controlId: string,
  period: string,
  due: number,
  executor: string,
  reviewer: string,
  status: ExecutionStatus,
  rest: Partial<ControlExecution> = {},
): ControlExecution {
  const created = daysFromToday(due - 12)
  const history = [{ date: created, who: 'Vigie GRC', action: 'Fiche générée automatiquement selon la fréquence du contrôle' }]
  if (status !== 'a_realiser') history.push({ date: daysFromToday(due - 6), who: executor, action: 'Réalisation démarrée' })
  if (['soumis', 'a_reprendre', 'valide'].includes(status)) history.push({ date: rest.performedDate ?? daysFromToday(due - 3), who: executor, action: 'Fiche soumise à validation' })
  if (status === 'a_reprendre') history.push({ date: daysFromToday(due - 2), who: reviewer, action: 'Fiche renvoyée pour correction' })
  if (status === 'valide') history.push({ date: daysFromToday(due - 1), who: reviewer, action: 'Fiche validée' })
  return {
    id: `EX-${String(n).padStart(2, '0')}`,
    controlId,
    period,
    dueDate: daysFromToday(due),
    executor,
    reviewer,
    status,
    performedDate: '',
    population: 0,
    sample: [],
    conclusion: '',
    rootCause: '',
    correctiveAction: '',
    evidence: [],
    reviewComment: '',
    history,
    ...rest,
  }
}

export function buildExecutions(): ControlExecution[] {
  return [
    ex(1, 'C-05', 'Septembre 2026', 4, 'Claire Morel · Back-office KYC', 'Élodie Petit · Responsable Back-office KYC', 'a_realiser', {
      sample: items([
        ['CLI-204871', 'M. Laurent Garnier — particulier, risque élevé (PEP)'],
        ['CLI-198342', 'SARL Delta Import-Export — professionnel, pays à risque'],
        ['CLI-211509', 'Mme Sofia Andreou — non-résidente'],
        ['CLI-187260', 'SCI Les Tilleuls — montage patrimonial complexe'],
        ['CLI-220415', 'M. Viktor Lenz — activité cash intensive'],
        ['CLI-176833', 'Fondation Horizon Solidaire — association'],
        ['CLI-209977', 'SAS NovaTrade — négoce de matières premières'],
        ['CLI-215640', 'M. Ahmed Karim — virements internationaux fréquents'],
      ]),
    }),
    ex(2, 'C-26', 'Semaine 41 · octobre 2026', 2, 'Julien Faure · Comptabilité nostro', 'Hélène Roux · Direction Financière', 'en_cours', {
      performedDate: daysFromToday(0),
      population: 312,
      sample: items([
        ['NOS-EUR-01', 'Compte nostro EUR — Banque correspondante A', 'conforme'],
        ['NOS-USD-02', 'Compte nostro USD — Banque correspondante B', 'conforme'],
        ['NOS-GBP-01', 'Compte nostro GBP — Banque correspondante C', 'anomalie', 'Écart de 1 250 € non justifié, suspens de 12 jours.'],
        ['NOS-CHF-01', 'Compte nostro CHF — Banque correspondante D', 'conforme'],
        ['NOS-JPY-01', 'Compte nostro JPY — Banque correspondante E'],
        ['NOS-EUR-03', 'Compte nostro EUR — TARGET2'],
      ]),
      evidence: ['Rapprochement_nostro_S41.xlsx'],
    }),
    ex(3, 'C-40', 'Septembre 2026', -3, 'Sophie Lambert · Direction des Ressources Humaines', 'Karim Benali · RSSI', 'a_realiser', {
      sample: items([
        ['DEP-2026-091', 'Départ du 02/09 — Analyste crédit'],
        ['DEP-2026-094', 'Départ du 09/09 — Conseiller clientèle'],
        ['DEP-2026-097', 'Départ du 15/09 — Prestataire DSI'],
        ['DEP-2026-101', 'Départ du 23/09 — Opérateur back-office'],
        ['DEP-2026-104', 'Départ du 30/09 — Chargé d’affaires entreprises'],
      ]),
    }),
    ex(4, 'C-21', 'Septembre 2026', -2, 'Marc Rousseau · Back-office paiements', 'Isabelle Fontaine · Direction des Opérations', 'soumis', {
      performedDate: daysFromToday(-5),
      population: 1284,
      sample: items(
        ([
          ['PAY-883120', 'Virement SWIFT 182 400 € — fournisseur Allemagne'],
          ['PAY-883457', 'Virement SEPA 64 900 € — salaire dirigeant'],
          ['PAY-884012', 'Virement SWIFT 1 250 000 € — acquisition immobilière'],
          ['PAY-884390', 'Virement SEPA 58 300 € — fournisseur France'],
          ['PAY-885101', 'Virement SWIFT 97 650 USD — client import'],
          ['PAY-885664', 'Virement SEPA 75 000 € — placement'],
          ['PAY-886020', 'Virement SWIFT 410 000 € — trade finance'],
          ['PAY-886473', 'Virement SEPA 52 100 € — remboursement'],
          ['PAY-887118', 'Virement SEPA 66 780 € — fournisseur Italie'],
          ['PAY-887509', 'Virement SWIFT 139 000 CHF — succession'],
        ] as [string, string][]).map(([r, l]) => [r, l, 'conforme', ''] as [string, string, SampleResult, string]),
      ),
      conclusion: 'conforme',
      evidence: ['Extraction_paiements_sup50k_sept.csv', 'Journal_validations_sept.pdf'],
    }),
    ex(5, 'C-15', 'Septembre 2026', -1, 'Inès Bernard · Middle-office crédit', 'Olivier Chevalier · Direction du Crédit', 'soumis', {
      performedDate: daysFromToday(-4),
      population: 46,
      sample: items([
        ['CRE-55102', 'Prêt immobilier 320 k€ — M. et Mme Roche', 'conforme'],
        ['CRE-55117', 'Crédit d’investissement 150 k€ — SARL Atelier Bois', 'conforme'],
        ['CRE-55130', 'Prêt immobilier 245 k€ — M. Dumas', 'anomalie', 'Attestation d’assurance emprunteur reçue à J+2 après le décaissement.'],
        ['CRE-55141', 'Crédit-bail 88 k€ — SAS Logistique Ouest', 'conforme'],
        ['CRE-55158', 'Prêt professionnel 60 k€ — Pharmacie Centrale', 'conforme'],
        ['CRE-55163', 'Prêt immobilier 410 k€ — Mme Lefèvre', 'conforme'],
        ['CRE-55177', 'Crédit de trésorerie 200 k€ — SA Méca Précision', 'conforme'],
        ['CRE-55189', 'Prêt relais 180 k€ — M. Perrin', 'conforme'],
      ]),
      conclusion: 'anomalie_mineure',
      rootCause: 'Pression commerciale sur la date de signature ; la check-list a été validée sur une promesse d’envoi de l’attestation.',
      correctiveAction: 'Rappel de la règle aux équipes et blocage applicatif du décaissement tant que l’attestation n’est pas indexée.',
      evidence: ['Checklists_decaissement_sept.pdf'],
    }),
    ex(6, 'C-33', 'Semaine 40 · octobre 2026', 1, 'Thomas Girard · Conformité LCB-FT', 'Camille Dubois · Responsable LCB-FT', 'a_reprendre', {
      performedDate: daysFromToday(-3),
      population: 4,
      sample: items([
        ['SEM-37', 'Stock d’alertes semaine 37', 'conforme'],
        ['SEM-38', 'Stock d’alertes semaine 38', 'conforme'],
        ['SEM-39', 'Stock d’alertes semaine 39', 'conforme'],
        ['SEM-40', 'Stock d’alertes semaine 40', 'conforme'],
      ]),
      conclusion: 'conforme',
      evidence: ['Stock_alertes_S37-S40.xlsx'],
      reviewComment:
        'La conclusion « conforme » n’est pas cohérente avec un stock de 1 850 alertes de plus de 30 jours, au-dessus du seuil critique du KRI. Merci de requalifier les semaines concernées en anomalie et de joindre la preuve d’escalade.',
    }),
    ex(7, 'C-14', 'Août 2026', -35, 'Paul Mercier · Direction du Contrôle Interne', 'Nadia Haddad · Direction des Risques (R2)', 'valide', {
      performedDate: daysFromToday(-38),
      population: 7,
      sample: items([
        ['DER-0812', 'Dérogation — crédit PME 1,2 M€', 'conforme'],
        ['DER-0815', 'Dérogation — taux préférentiel client patrimonial', 'conforme'],
        ['DER-0821', 'Dérogation — garantie réduite', 'conforme'],
      ]),
      conclusion: 'conforme',
      evidence: ['Registre_derogations_aout.pdf'],
    }),
    ex(8, 'C-31', 'Septembre 2026', -6, 'Lucas Moreau · Direction des Risques (R2)', 'Nadia Haddad · Direction des Risques (R2)', 'valide', {
      performedDate: daysFromToday(-9),
      population: 22,
      sample: items([
        ['CPT-BNK-04', 'Banque correspondante — zone euro', 'conforme'],
        ['CPT-BNK-11', 'Banque correspondante — Royaume-Uni', 'conforme'],
        ['CPT-BNK-17', 'Banque confirmatrice — Asie', 'conforme'],
      ]),
      conclusion: 'conforme',
      evidence: ['Reporting_limites_sept.pdf'],
    }),
    ex(9, 'C-18', 'Septembre 2026', 9, 'Marc Rousseau · Back-office paiements', 'Isabelle Fontaine · Direction des Opérations', 'a_realiser', {
      sample: items([
        ['RIB-30211', 'Changement de RIB — fournisseur SAS Batiplus'],
        ['RIB-30244', 'Changement de RIB — client particulier'],
        ['RIB-30279', 'Changement de RIB — SCI Horizon'],
        ['RIB-30302', 'Changement de RIB — fournisseur Medisoft'],
        ['RIB-30338', 'Changement de RIB — association sportive'],
        ['RIB-30361', 'Changement de RIB — SARL Transports Martin'],
      ]),
    }),
  ]
}
