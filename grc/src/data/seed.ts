import { daysFromToday } from '../lib/format'
import { buildExecutions, CONTROL_PROCEDURES } from './seedExecutions'
import type {
  ActionPlan,
  ActionStatus,
  AuditRecommendation,
  AuditSeverity,
  AuditStatus,
  Control,
  ControlEffectiveness,
  ControlType,
  Criticality,
  Frequency,
  GrcData,
  Kri,
  KriDirection,
  Loss,
  Priority,
  Process,
  Risk,
  RiskCategory,
  Score,
  Treatment,
} from '../types'

// ─────────────────────────────────────────────────────────────
// Données de démonstration — banque de réseau fictive.
// Les dates sont relatives à « aujourd'hui » pour que la démo
// reste cohérente quelle que soit la date de présentation.
// ─────────────────────────────────────────────────────────────

const O = {
  ci: 'Direction du Contrôle Interne',
  dpo: 'DPO',
  r2: 'Direction des Risques (R2)',
  credit: 'Direction du Crédit',
  conf: 'Direction de la Conformité',
  lcb: 'Responsable LCB-FT',
  rssi: 'RSSI',
  ops: 'Direction des Opérations',
  dsi: 'DSI',
  alm: 'Direction ALM & Trésorerie',
  jur: 'Direction Juridique',
  fin: 'Direction Financière',
  tf: 'Direction Trade Finance',
  bdd: 'Direction de la Banque de Détail',
  rh: 'Direction des Ressources Humaines',
  dg: 'Direction Générale',
}

// ─── Processus & activités ──────────────────────────────────

type ActSeed = [name: string, description: string, owner: string]

function proc(
  id: string,
  name: string,
  domain: string,
  description: string,
  owner: string,
  status: Process['status'],
  maturity: Score,
  acts: ActSeed[],
): Process {
  return {
    id,
    name,
    domain,
    description,
    owner,
    status,
    maturity,
    activities: acts.map(([n, d, o], i) => ({ id: `${id}-A${i + 1}`, name: n, description: d, owner: o })),
  }
}

const processes: Process[] = [
  proc('PR-01', 'Onboarding & ouverture de compte', 'Banque de détail',
    "Entrée en relation des clients particuliers et professionnels : collecte des pièces, vérification d'identité (KYC), screening et ouverture du compte.",
    O.bdd, 'operationnel', 3, [
      ['Collecte des pièces', "Recueil des justificatifs d'identité, de domicile et de revenus (agence ou parcours digital).", 'Conseiller clientèle'],
      ["Vérification d'identité (KYC)", "Contrôle d'authenticité des pièces et vérification biométrique pour le parcours en ligne.", 'Back-office KYC'],
      ['Screening sanctions & PEP', 'Filtrage du nom du client contre les listes de sanctions (UE, ONU, OFAC) et de personnes politiquement exposées.', O.conf],
      ['Profilage de risque LCB-FT', 'Attribution du niveau de risque client (faible, standard, élevé) selon la matrice de classification.', O.conf],
      ['Validation & ouverture', 'Validation du dossier par le niveau habilité puis création du compte dans le système cœur.', 'Back-office KYC'],
      ['Revue périodique du dossier', 'Mise à jour du dossier KYC selon la périodicité liée au niveau de risque (1, 3 ou 5 ans).', O.bdd],
    ]),
  proc('PR-02', 'Analyse & octroi de crédit', 'Crédit',
    "Instruction des demandes de crédit (immobilier, consommation, entreprises), de l'analyse à la mise en place et au suivi des encours.",
    O.credit, 'operationnel', 4, [
      ['Réception de la demande', 'Constitution du dossier de crédit et contrôle de complétude.', 'Chargé de clientèle'],
      ['Analyse financière & notation', 'Analyse de la capacité de remboursement et calcul de la note interne (modèle IRB).', 'Analyste crédit'],
      ['Évaluation des garanties', 'Valorisation des sûretés (hypothèques, cautions, nantissements) et application des décotes.', 'Analyste crédit'],
      ['Comité de crédit & décision', 'Décision selon le schéma de délégation de pouvoirs ; avis risque indépendant au-delà des seuils.', O.credit],
      ['Mise en place & décaissement', 'Vérification de la levée des conditions suspensives puis déblocage des fonds.', 'Middle-office crédit'],
      ['Suivi & recouvrement', 'Surveillance des signaux faibles, watchlist, passage en défaut et recouvrement amiable.', O.credit],
    ]),
  proc('PR-03', 'Paiements & règlements', 'Paiements',
    'Traitement des virements SEPA et internationaux (SWIFT), de leur initiation à la réconciliation comptable.',
    O.ops, 'operationnel', 4, [
      ["Initiation de l'ordre", 'Saisie ou réception de l’ordre de paiement (banque en ligne, agence, fichiers EBICS).', 'Front-office'],
      ['Contrôle & validation (4 yeux)', "Double validation des ordres au-delà de 50 000 € et des ordres manuels.", O.ops],
      ['Filtrage sanctions', 'Filtrage temps réel des messages contre les listes de sanctions et d’embargos.', O.conf],
      ['Émission SWIFT / SEPA', 'Transmission des messages aux infrastructures de marché (TARGET2, STEP2, SWIFT).', O.ops],
      ['Rapprochement & réconciliation', 'Rapprochement quotidien des comptes nostro et des comptes d’attente.', O.fin],
      ['Gestion des rejets & exceptions', 'Traitement des rejets, retours et demandes d’investigation.', O.ops],
    ]),
  proc('PR-04', 'Trade finance & garanties', 'Banque de financement',
    "Émission de crédits documentaires et de garanties internationales pour la clientèle entreprises.",
    O.tf, 'en_cours', 3, [
      ['Réception de la demande client', 'Analyse de la demande et de l’opération commerciale sous-jacente.', 'Chargé d’affaires'],
      ['Analyse documentaire', 'Examen de conformité des documents (connaissements, factures, certificats d’origine).', 'Back-office Trade'],
      ['Contrôle sanctions & double usage', 'Vérification des pays, navires, ports et biens à double usage.', O.conf],
      ['Émission de la garantie / LC', 'Rédaction et émission de la garantie ou du crédit documentaire (MT700/MT760).', 'Back-office Trade'],
      ['Suivi des engagements & appels', 'Suivi des échéances, mainlevées et traitement des appels en garantie.', O.tf],
    ]),
  proc('PR-05', 'Conformité LCB-FT & déclarations de soupçon', 'Conformité',
    'Surveillance des opérations, analyse des alertes et déclarations de soupçon à TRACFIN.',
    O.conf, 'operationnel', 3, [
      ['Génération des alertes', 'Scénarios de détection automatisés sur les opérations et profils clients.', O.conf],
      ['Analyse de premier niveau', 'Qualification des alertes par les analystes : classement ou escalade.', 'Analyste LCB-FT'],
      ['Investigation approfondie', 'Enquête sur les alertes escaladées : flux, contreparties, justificatifs.', 'Enquêteur LCB-FT'],
      ['Décision de déclaration', 'Décision du responsable LCB-FT de déclarer ou non le soupçon.', O.lcb],
      ['Déclaration TRACFIN', 'Rédaction et télédéclaration via ERMES dans les délais réglementaires.', O.lcb],
      ['Archivage & reporting', 'Conservation des pièces (5 ans) et reporting au comité de conformité.', O.conf],
    ]),
  proc('PR-06', 'Sécurité & gestion des accès SI', 'IT & Sécurité',
    'Cycle de vie des habilitations aux systèmes d’information et supervision de la sécurité.',
    O.rssi, 'en_cours', 2, [
      ["Demande d'habilitation", 'Expression du besoin d’accès via le portail IAM.', 'Manager demandeur'],
      ['Validation manager & propriétaire', 'Double validation par le manager et le propriétaire applicatif.', 'Propriétaire applicatif'],
      ['Provisionnement des droits', 'Attribution technique des droits selon les profils métiers.', O.dsi],
      ['Revue périodique des habilitations', 'Recertification semestrielle des droits par les propriétaires applicatifs.', O.rssi],
      ['Révocation (départs & mobilités)', 'Désactivation des comptes à J0 du départ, ajustement en cas de mobilité.', O.rh],
      ['Supervision SOC', 'Détection et réponse aux incidents de sécurité 24/7.', O.rssi],
    ]),
  proc('PR-07', 'Pilotage de la liquidité', 'Finance & Trésorerie',
    'Prévision des flux, gestion du coussin de liquidité et production des ratios réglementaires LCR / NSFR.',
    O.alm, 'operationnel', 4, [
      ['Prévision des flux de trésorerie', 'Projection quotidienne des entrées et sorties de trésorerie à 30 jours.', O.alm],
      ['Calcul LCR / NSFR', 'Calcul des ratios de liquidité réglementaires.', O.fin],
      ['Gestion du coussin HQLA', 'Pilotage du stock d’actifs liquides de haute qualité.', O.alm],
      ['Stress tests de liquidité', 'Scénarios de crise idiosyncratique et systémique.', O.r2],
      ['Reporting réglementaire', 'Production des états COREP liquidité transmis au superviseur.', O.fin],
    ]),
]

// ─── Risques ────────────────────────────────────────────────

type RiskSeed = [
  id: string, name: string, description: string, category: RiskCategory,
  processId: string, activity: number, owner: string,
  p: Score, i: Score, controlsSummary: string, rp: Score, ri: Score, treatment: Treatment,
]

const riskSeeds: RiskSeed[] = [
  ['R-01', "Usurpation d'identité à l'entrée en relation", 'Ouverture de compte à l’aide de pièces falsifiées ou volées, notamment via le parcours 100 % digital.', 'operationnel', 'PR-01', 2, O.bdd, 4, 4, 'Vérification biométrique, contrôle UV des pièces en agence.', 3, 3, 'reduire'],
  ['R-02', 'Défaut de détection sanctions / PEP', 'Entrée en relation avec une personne sanctionnée ou une PEP non identifiée comme telle.', 'conformite', 'PR-01', 3, O.conf, 3, 5, 'Screening automatisé à l’entrée en relation et filtrage quotidien de la base.', 2, 5, 'reduire'],
  ['R-03', 'Dossiers KYC incomplets ou obsolètes', 'Dossiers clients non mis à jour selon la périodicité requise, pièces manquantes ou expirées.', 'conformite', 'PR-01', 6, O.bdd, 4, 4, 'Requêtes mensuelles de complétude, relances automatiques.', 4, 4, 'reduire'],
  ['R-04', 'Classification de risque client erronée', 'Niveau de risque LCB-FT sous-évalué, entraînant une vigilance insuffisante.', 'conformite', 'PR-01', 4, O.conf, 3, 4, 'Matrice de classification paramétrée, revue des clients à risque élevé.', 2, 3, 'reduire'],
  ['R-05', 'Non-conformité RGPD de la collecte', 'Collecte de données excessives ou conservation au-delà des durées légales.', 'juridique', 'PR-01', 1, O.dpo, 3, 3, 'Registre des traitements, purge automatisée annuelle.', 2, 3, 'reduire'],

  ['R-06', 'Défaillance du modèle de notation', 'Modèle de scoring mal calibré conduisant à une sous-estimation du risque de défaut.', 'credit', 'PR-02', 2, O.r2, 3, 5, 'Backtesting annuel, validation indépendante des modèles.', 3, 4, 'reduire'],
  ['R-07', 'Surévaluation des garanties immobilières', 'Valorisation des biens supérieure à leur valeur de marché, décotes insuffisantes.', 'credit', 'PR-02', 3, O.credit, 3, 4, 'Expertise indépendante au-delà de 500 k€, revalorisation indicielle.', 3, 4, 'reduire'],
  ['R-08', 'Contournement des délégations de pouvoir', 'Octroi de crédits au-delà des limites de délégation sans passage en comité.', 'conformite', 'PR-02', 4, O.credit, 2, 5, 'Blocage applicatif selon la grille de délégation.', 2, 4, 'reduire'],
  ['R-09', 'Décaissement avant levée des conditions', 'Déblocage des fonds avant réception des garanties ou des pièces suspensives.', 'operationnel', 'PR-02', 5, 'Middle-office crédit', 3, 4, 'Check-list de décaissement, double validation.', 2, 3, 'reduire'],
  ['R-10', 'Détection tardive des dégradations', 'Signaux d’alerte précoce non exploités, provisionnement tardif (IFRS 9).', 'credit', 'PR-02', 6, O.credit, 4, 5, 'Watchlist mensuelle, revue annuelle des dossiers.', 4, 4, 'reduire'],

  ['R-11', 'Fraude au faux ordre de virement', 'Ingénierie sociale (fraude au président, changement de RIB) conduisant à un virement frauduleux.', 'operationnel', 'PR-03', 1, O.ops, 4, 5, 'Contre-appel client, scoring de fraude temps réel.', 3, 4, 'reduire'],
  ['R-12', 'Erreur de saisie de paiement', 'Erreur de montant ou de bénéficiaire sur les ordres manuels.', 'operationnel', 'PR-03', 2, O.ops, 4, 3, 'Contrôle 4 yeux au-delà de 50 k€.', 2, 3, 'reduire'],
  ['R-13', 'Indisponibilité de la plateforme de paiement', 'Panne prolongée empêchant l’émission des paiements critiques.', 'operationnel', 'PR-03', 4, O.dsi, 3, 5, 'Site de secours, PCA testé annuellement.', 3, 4, 'reduire'],
  ['R-14', 'Compromission de l’environnement SWIFT', 'Prise de contrôle des accès SWIFT par un attaquant (cf. cas Bangladesh Bank).', 'cyber', 'PR-03', 4, O.rssi, 2, 5, 'Conformité SWIFT CSP, MFA, zone sécurisée.', 2, 5, 'reduire'],
  ['R-15', 'Écarts de réconciliation non résolus', 'Suspens anciens sur comptes nostro et comptes d’attente.', 'operationnel', 'PR-03', 5, O.fin, 3, 3, 'Rapprochement quotidien automatisé.', 2, 2, 'accepter'],

  ['R-16', 'Fraude documentaire', 'Présentation de faux documents (connaissements, factures) dans le cadre d’un crédit documentaire.', 'operationnel', 'PR-04', 2, O.tf, 3, 5, 'Vérification des navires et des connaissements via bases externes.', 3, 4, 'reduire'],
  ['R-17', "Violation d'embargo / biens à double usage", 'Financement d’une opération impliquant un pays sous embargo ou des biens à double usage.', 'conformite', 'PR-04', 3, O.conf, 3, 5, 'Filtrage des pays, ports et navires ; avis conformité obligatoire.', 3, 5, 'eviter'],
  ['R-18', 'Appel abusif de garantie', 'Appel à première demande abusif sans recours effectif contre le donneur d’ordre.', 'juridique', 'PR-04', 5, O.jur, 2, 4, 'Clauses types validées par le juridique.', 2, 3, 'transferer'],
  ['R-19', 'Défaut de la banque confirmatrice', 'Défaillance d’une banque correspondante sur une LC confirmée.', 'credit', 'PR-04', 4, O.r2, 2, 4, 'Limites par contrepartie bancaire.', 2, 3, 'accepter'],

  ['R-20', "Stock d'alertes LCB-FT non traitées", 'Backlog d’alertes dépassant la capacité de traitement des équipes.', 'conformite', 'PR-05', 2, O.conf, 5, 4, 'Priorisation par score, renfort ponctuel.', 4, 4, 'reduire'],
  ['R-21', 'Scénarios de détection inadaptés', 'Paramétrage générant trop de faux positifs ou ne couvrant pas certaines typologies.', 'conformite', 'PR-05', 1, O.conf, 3, 4, 'Revue annuelle des scénarios.', 3, 3, 'reduire'],
  ['R-22', 'Déclaration de soupçon tardive', 'Transmission à TRACFIN hors délai ou après exécution de l’opération.', 'conformite', 'PR-05', 5, O.lcb, 3, 5, 'Suivi des délais par tableau de bord.', 3, 4, 'reduire'],
  ['R-23', 'Atteinte réputationnelle (sanction ACPR)', 'Sanction publique de la Commission des sanctions de l’ACPR pour carences LCB-FT.', 'reputationnel', 'PR-05', 6, O.dg, 2, 5, 'Plan de remédiation suivi en comité.', 2, 4, 'reduire'],

  ['R-24', 'Droits excessifs (moindre privilège)', 'Accumulation de droits non justifiés et conflits de séparation des tâches.', 'cyber', 'PR-06', 3, O.rssi, 4, 4, 'Profils métiers types, matrice de SoD.', 3, 4, 'reduire'],
  ['R-25', 'Comptes de collaborateurs partis actifs', 'Comptes non désactivés après départ, exploitables pour une intrusion.', 'cyber', 'PR-06', 5, O.rssi, 4, 4, 'Désactivation manuelle sur notification RH.', 4, 4, 'reduire'],
  ['R-26', 'Attaque par rançongiciel', 'Chiffrement des systèmes et des sauvegardes, interruption d’activité prolongée.', 'cyber', 'PR-06', 6, O.rssi, 3, 5, 'EDR, sauvegardes hors ligne, SOC 24/7.', 3, 5, 'reduire'],
  ['R-27', 'Exfiltration de données clients', 'Fuite de données personnelles ou bancaires (interne ou externe).', 'cyber', 'PR-06', 6, O.dpo, 3, 5, 'DLP sur la messagerie, chiffrement des postes.', 2, 5, 'reduire'],

  ['R-28', 'Coussin de liquidité insuffisant', 'Stock HQLA insuffisant pour couvrir 30 jours de sorties en stress.', 'liquidite', 'PR-07', 3, O.alm, 2, 5, 'Limites internes au-dessus du minimum réglementaire.', 2, 4, 'reduire'],
  ['R-29', 'Erreur de calcul du LCR', 'Erreur de classification des actifs ou des flux dans le calcul réglementaire.', 'conformite', 'PR-07', 2, O.fin, 3, 4, 'Contrôles de cohérence, revue par le contrôle financier.', 2, 3, 'reduire'],
  ['R-30', 'Concentration du refinancement', 'Dépendance à un nombre restreint de contreparties de refinancement.', 'liquidite', 'PR-07', 1, O.alm, 3, 4, 'Suivi mensuel des concentrations.', 3, 3, 'reduire'],
]

const risks: Risk[] = riskSeeds.map(([id, name, description, category, processId, act, owner, p, i, controlsSummary, rp, ri, treatment]) => ({
  id, name, description, category, processId, activityId: `${processId}-A${act}`, owner,
  probability: p, impact: i, controlsSummary, residualProbability: rp, residualImpact: ri, treatment,
}))

// ─── Contrôles ──────────────────────────────────────────────

type CtrlSeed = [riskId: string, name: string, type: ControlType, frequency: Frequency, owner: string, eff: ControlEffectiveness, test: string, testedDaysAgo: number]

const ctrlSeeds: CtrlSeed[] = [
  ['R-01', 'Vérification biométrique (selfie + pièce)', 'preventif', 'continu', 'Back-office KYC', 'suffisant', 'Test sur 60 dossiers : aucune anomalie.', 45],
  ['R-01', 'Contrôle a posteriori des ouvertures digitales', 'detectif', 'hebdomadaire', O.ci, 'partiel', '3 dossiers sur 40 sans contrôle tracé.', 70],
  ['R-02', 'Screening automatisé à l’entrée en relation', 'preventif', 'continu', O.conf, 'suffisant', 'Taux de couverture 100 %, listes à jour J+1.', 30],
  ['R-02', 'Filtrage quotidien de la base clients', 'detectif', 'quotidien', O.conf, 'suffisant', 'Aucun écart sur l’échantillon testé.', 30],
  ['R-03', 'Requête mensuelle de complétude KYC', 'detectif', 'mensuel', O.bdd, 'partiel', '12 % des dossiers à risque élevé incomplets.', 25],
  ['R-03', 'Blocage des opérations sur dossier expiré', 'preventif', 'continu', O.dsi, 'insuffisant', 'Blocage non déployé sur le canal mobile.', 60],
  ['R-04', 'Revue annuelle de la matrice de classification', 'preventif', 'annuel', O.conf, 'suffisant', 'Matrice validée en comité conformité.', 120],
  ['R-05', 'Purge automatisée des données expirées', 'correctif', 'annuel', O.dpo, 'partiel', 'Purge non effective sur l’archivage GED.', 200],
  ['R-06', 'Backtesting du modèle de notation', 'detectif', 'annuel', O.r2, 'partiel', 'Dérive constatée sur le segment PME.', 90],
  ['R-06', 'Validation indépendante des modèles', 'preventif', 'annuel', O.r2, 'suffisant', 'Rapport de validation sans réserve majeure.', 150],
  ['R-07', 'Expertise indépendante au-delà de 500 k€', 'preventif', 'continu', O.credit, 'suffisant', 'Conforme sur 25 dossiers testés.', 50],
  ['R-07', 'Revalorisation indicielle annuelle', 'detectif', 'annuel', O.r2, 'partiel', 'Indices non mis à jour pour l’immobilier commercial.', 110],
  ['R-08', 'Blocage applicatif des délégations', 'preventif', 'continu', O.dsi, 'suffisant', 'Aucun contournement détecté.', 40],
  ['R-08', 'Revue a posteriori des dérogations', 'detectif', 'mensuel', O.ci, 'suffisant', 'Dérogations toutes justifiées.', 35],
  ['R-09', 'Check-list de décaissement à double validation', 'preventif', 'continu', 'Middle-office crédit', 'suffisant', '1 anomalie mineure sur 50.', 20],
  ['R-10', 'Comité watchlist mensuel', 'detectif', 'mensuel', O.credit, 'partiel', 'Signaux faibles non intégrés pour 8 % des contreparties.', 15],
  ['R-10', 'Indicateurs d’alerte précoce automatisés', 'detectif', 'quotidien', O.r2, 'insuffisant', 'Outil en cours de déploiement.', 0],
  ['R-11', 'Contre-appel systématique (changement de RIB)', 'preventif', 'continu', O.ops, 'partiel', 'Contre-appel non tracé dans 5 % des cas.', 28],
  ['R-11', 'Scoring de fraude temps réel', 'detectif', 'continu', O.ops, 'suffisant', 'Taux de détection 92 %.', 28],
  ['R-11', 'Sensibilisation des clients entreprises', 'preventif', 'semestriel', O.bdd, 'partiel', 'Campagne réalisée sur 60 % du portefeuille.', 100],
  ['R-12', 'Contrôle 4 yeux au-delà de 50 k€', 'preventif', 'continu', O.ops, 'suffisant', 'Conforme.', 30],
  ['R-13', 'Test annuel du plan de continuité', 'correctif', 'annuel', O.dsi, 'partiel', 'RTO de 6 h constaté pour un objectif de 4 h.', 180],
  ['R-13', 'Supervision de la disponibilité', 'detectif', 'continu', O.dsi, 'suffisant', 'Alerting opérationnel.', 60],
  ['R-14', 'Auto-évaluation SWIFT CSP', 'preventif', 'annuel', O.rssi, 'suffisant', 'Attestation KYC-SA publiée.', 210],
  ['R-14', 'MFA sur les postes opérateurs SWIFT', 'preventif', 'continu', O.rssi, 'suffisant', '100 % des opérateurs couverts.', 90],
  ['R-15', 'Rapprochement nostro quotidien', 'detectif', 'quotidien', O.fin, 'suffisant', 'Suspens > 30 j : 4 lignes.', 10],
  ['R-16', 'Vérification des navires (bases externes)', 'detectif', 'continu', 'Back-office Trade', 'partiel', 'Contrôle non systématique sur les LC < 100 k€.', 75],
  ['R-17', 'Filtrage pays / ports / navires', 'preventif', 'continu', O.conf, 'partiel', 'Couverture incomplète des biens à double usage.', 40],
  ['R-17', 'Avis conformité obligatoire (pays sensibles)', 'preventif', 'continu', O.conf, 'suffisant', 'Avis tracé sur 100 % des dossiers testés.', 40],
  ['R-18', 'Clauses types validées par le juridique', 'preventif', 'continu', O.jur, 'suffisant', 'Conforme.', 140],
  ['R-19', 'Limites par contrepartie bancaire', 'preventif', 'quotidien', O.r2, 'suffisant', 'Aucun dépassement.', 30],
  ['R-20', 'Priorisation des alertes par score', 'preventif', 'continu', O.conf, 'partiel', 'Backlog de 1 850 alertes > 30 jours.', 12],
  ['R-20', 'Pilotage hebdomadaire du stock', 'detectif', 'hebdomadaire', O.lcb, 'insuffisant', 'Pas de plan de résorption formalisé.', 12],
  ['R-21', 'Revue annuelle des scénarios', 'detectif', 'annuel', O.conf, 'partiel', 'Taux de faux positifs de 97 %.', 160],
  ['R-22', 'Tableau de bord des délais de déclaration', 'detectif', 'hebdomadaire', O.lcb, 'partiel', 'Délai moyen de 38 jours.', 20],
  ['R-22', 'Contrôle de second niveau des DS', 'detectif', 'trimestriel', O.ci, 'suffisant', 'Qualité rédactionnelle conforme.', 65],
  ['R-23', 'Suivi du plan de remédiation en comité', 'correctif', 'mensuel', O.dg, 'suffisant', 'Comité tenu mensuellement.', 25],
  ['R-24', 'Matrice de séparation des tâches (SoD)', 'preventif', 'continu', O.rssi, 'partiel', '47 conflits SoD non résolus.', 55],
  ['R-24', 'Recertification semestrielle des droits', 'detectif', 'semestriel', O.rssi, 'partiel', 'Taux de recertification de 78 %.', 95],
  ['R-25', 'Désactivation sur notification RH', 'correctif', 'quotidien', O.rh, 'insuffisant', '23 comptes actifs de collaborateurs partis.', 18],
  ['R-26', 'EDR sur l’ensemble du parc', 'detectif', 'continu', O.rssi, 'suffisant', 'Couverture de 99,2 %.', 35],
  ['R-26', 'Sauvegardes hors ligne immuables', 'correctif', 'quotidien', O.dsi, 'partiel', 'Test de restauration incomplet.', 85],
  ['R-26', 'Exercice de crise cyber', 'correctif', 'annuel', O.rssi, 'suffisant', 'Exercice réalisé avec le COMEX.', 230],
  ['R-27', 'DLP sur la messagerie', 'preventif', 'continu', O.rssi, 'suffisant', 'Règles à jour.', 50],
  ['R-27', 'Revue des accès aux données sensibles', 'detectif', 'trimestriel', O.dpo, 'partiel', 'Accès non revus pour 2 applications.', 70],
  ['R-28', 'Limites internes LCR (> 130 %)', 'preventif', 'quotidien', O.alm, 'suffisant', 'Aucun dépassement.', 10],
  ['R-28', 'Stress test de liquidité mensuel', 'detectif', 'mensuel', O.r2, 'suffisant', 'Horizon de survie de 94 jours.', 10],
  ['R-29', 'Contrôles de cohérence COREP', 'detectif', 'mensuel', O.fin, 'suffisant', 'Conforme.', 22],
  ['R-30', 'Suivi des concentrations de refinancement', 'detectif', 'mensuel', O.alm, 'partiel', 'Top 5 contreparties = 46 % du refinancement.', 22],
]

const controls: Control[] = ctrlSeeds.map(([riskId, name, type, frequency, owner, effectiveness, testResult, ago], idx) => ({
  id: `C-${String(idx + 1).padStart(2, '0')}`,
  name, type, frequency, owner, effectiveness, riskId, testResult,
  lastTestDate: daysFromToday(-ago),
  ...CONTROL_PROCEDURES[`C-${String(idx + 1).padStart(2, '0')}`],
}))

// ─── KRI ────────────────────────────────────────────────────

/** Série déterministe de 12 points allant de `from` à `to` avec un léger bruit. */
function series(from: number, to: number, noise: number, decimals = 1): number[] {
  const f = 10 ** decimals
  return Array.from({ length: 12 }, (_, i) => {
    const base = from + ((to - from) * i) / 11
    const wobble = i === 11 ? 0 : Math.sin(i * 1.7 + from) * noise
    return Math.round((base + wobble) * f) / f
  })
}

type KriSeed = [riskId: string, name: string, definition: string, unit: string, orange: number, red: number, dir: KriDirection, freq: Frequency, from: number, to: number, noise: number, decimals?: number]

const kriSeeds: KriSeed[] = [
  ['R-03', 'Dossiers KYC à risque élevé non à jour', 'Nombre de dossiers clients à risque élevé dont la revue périodique est échue / total des dossiers à risque élevé.', '%', 5, 10, 'hausse_defavorable', 'mensuel', 7, 12.4, 0.8],
  ['R-01', "Tentatives de fraude à l'identité détectées", "Nombre de tentatives d'ouverture frauduleuse bloquées sur le mois.", 'nb', 40, 60, 'hausse_defavorable', 'mensuel', 22, 31, 5, 0],
  ['R-10', 'Encours en watchlist', 'Encours des contreparties sous surveillance renforcée / encours total.', '%', 4, 6, 'hausse_defavorable', 'mensuel', 3.1, 4.6, 0.3],
  ['R-06', 'Taux de défaut observé vs prévu (PME)', 'Ratio entre le taux de défaut observé et la probabilité de défaut moyenne du modèle.', 'x', 1.2, 1.5, 'hausse_defavorable', 'trimestriel', 0.95, 1.31, 0.05, 2],
  ['R-11', 'Montant de fraude aux virements', 'Montant cumulé des virements frauduleux non récupérés sur le mois.', 'k€', 150, 300, 'hausse_defavorable', 'mensuel', 180, 120, 40, 0],
  ['R-13', 'Disponibilité de la plateforme de paiement', 'Taux de disponibilité mensuel des services de paiement critiques.', '%', 99.8, 99.5, 'baisse_defavorable', 'mensuel', 99.93, 99.86, 0.05, 2],
  ['R-16', 'Écarts documentaires (taux de réserves)', 'Part des présentations documentaires comportant des irrégularités.', '%', 15, 25, 'hausse_defavorable', 'mensuel', 18, 13, 2],
  ['R-20', 'Alertes LCB-FT en attente > 30 jours', 'Nombre d’alertes non traitées depuis plus de 30 jours.', 'nb', 500, 1000, 'hausse_defavorable', 'hebdomadaire', 640, 1850, 120, 0],
  ['R-22', 'Délai moyen de déclaration de soupçon', 'Délai moyen entre la détection et la transmission à TRACFIN.', 'jours', 30, 45, 'hausse_defavorable', 'mensuel', 26, 38, 3, 0],
  ['R-25', 'Comptes actifs de collaborateurs partis', 'Nombre de comptes actifs appartenant à des collaborateurs ayant quitté la banque.', 'nb', 5, 15, 'hausse_defavorable', 'mensuel', 9, 23, 3, 0],
  ['R-26', 'Couverture EDR du parc', 'Part des postes et serveurs équipés d’un EDR opérationnel.', '%', 98, 95, 'baisse_defavorable', 'hebdomadaire', 96.5, 99.2, 0.6],
  ['R-28', 'Ratio LCR', 'Liquidity Coverage Ratio : stock HQLA / sorties nettes à 30 jours en stress.', '%', 130, 110, 'baisse_defavorable', 'quotidien', 158, 141, 6, 0],
  ['R-30', 'Concentration du refinancement (top 5)', 'Part du refinancement apportée par les 5 premières contreparties.', '%', 40, 50, 'hausse_defavorable', 'mensuel', 38, 46, 1.5],
]

const kris: Kri[] = kriSeeds.map(([riskId, name, definition, unit, orange, red, direction, frequency, from, to, noise, decimals = 1], idx) => {
  const history = series(from, to, noise, decimals)
  return {
    id: `KRI-${String(idx + 1).padStart(2, '0')}`,
    name, definition, riskId, unit,
    thresholdOrange: orange, thresholdRed: red, direction,
    value: history[11], frequency, history,
  }
})

// ─── Plans d'action ─────────────────────────────────────────

type ActionSeed = [riskId: string, title: string, description: string, owner: string, priority: Priority, start: number, deadline: number, status: ActionStatus, cost: number, target: Criticality]

const actionSeeds: ActionSeed[] = [
  ['R-03', 'Campagne de remédiation KYC', 'Mise à jour des 4 200 dossiers à risque élevé échus, avec renfort de 6 ETP pendant 6 mois.', O.bdd, 'haute', -120, 60, 'en_cours', 420_000, 'M'],
  ['R-03', 'Blocage des opérations sur le canal mobile', 'Étendre le blocage des opérations sur dossier expiré à l’application mobile.', O.dsi, 'haute', -60, -10, 'en_cours', 85_000, 'M'],
  ['R-01', 'Déploiement de la détection de deepfakes', 'Ajout d’une détection de vivacité avancée au parcours d’onboarding digital.', O.bdd, 'moyenne', -30, 120, 'a_faire', 160_000, 'L'],
  ['R-06', 'Recalibrage du modèle PME', 'Recalibrer le modèle de notation PME sur les données 2022-2026 et soumettre à validation.', O.r2, 'haute', -90, 45, 'en_cours', 250_000, 'M'],
  ['R-10', "Outil d'alerte précoce (EWS)", 'Déployer un outil d’early warning intégrant données bancaires et externes.', O.credit, 'haute', -150, 30, 'en_cours', 600_000, 'M'],
  ['R-07', 'Mise à jour des indices immobiliers commerciaux', 'Souscrire à une base d’indices et automatiser la revalorisation.', O.r2, 'moyenne', -200, -45, 'termine', 40_000, 'M'],
  ['R-11', 'Généralisation du contre-appel tracé', 'Rendre obligatoire et tracé le contre-appel dans l’outil de paiement.', O.ops, 'haute', -40, 20, 'en_cours', 55_000, 'M'],
  ['R-13', 'Réduction du RTO de la plateforme de paiement', 'Bascule active-active entre les deux datacenters.', O.dsi, 'moyenne', -10, 210, 'a_faire', 900_000, 'M'],
  ['R-16', 'Contrôle systématique des navires', 'Étendre la vérification des navires à toutes les LC sans seuil.', O.tf, 'moyenne', -70, -5, 'en_cours', 30_000, 'M'],
  ['R-17', 'Filtrage des biens à double usage', 'Intégrer la nomenclature UE 2021/821 dans l’outil de filtrage Trade.', O.conf, 'haute', -50, 75, 'en_cours', 120_000, 'M'],
  ['R-20', 'Plan de résorption du backlog LCB-FT', 'Renfort externe de 10 analystes et automatisation du classement des alertes à faible score.', O.conf, 'haute', -20, 90, 'en_cours', 750_000, 'M'],
  ['R-21', 'Optimisation des scénarios (machine learning)', 'Réduire le taux de faux positifs sous 90 % grâce à un modèle de priorisation.', O.conf, 'moyenne', 15, 240, 'a_faire', 380_000, 'L'],
  ['R-22', 'Workflow DS outillé', 'Mettre en place un workflow avec alertes à J+20 et J+30.', O.lcb, 'haute', -100, -20, 'en_cours', 70_000, 'M'],
  ['R-24', 'Résolution des conflits SoD', 'Traiter les 47 conflits de séparation des tâches identifiés.', O.rssi, 'haute', -80, 15, 'en_cours', 45_000, 'M'],
  ['R-25', 'Automatisation de la révocation (IAM ↔ SIRH)', 'Connecter le SIRH à l’IAM pour désactiver les comptes à J0.', O.dsi, 'haute', -130, -30, 'en_cours', 180_000, 'L'],
  ['R-26', 'Test de restauration complet', 'Réaliser un test de restauration intégral des systèmes critiques.', O.dsi, 'haute', -60, -15, 'termine', 60_000, 'M'],
  ['R-26', 'Souscription cyber-assurance', 'Renouveler et étendre la police cyber (plafond 50 M€).', O.jur, 'moyenne', -90, -30, 'termine', 350_000, 'M'],
  ['R-30', 'Diversification du refinancement', 'Lancer un programme d’EMTN et ouvrir 3 nouvelles contreparties.', O.alm, 'basse', -30, 180, 'a_faire', 200_000, 'L'],
  ['R-05', 'Purge de l’archivage GED', 'Étendre la purge automatisée à la GED.', O.dpo, 'basse', -10, 100, 'a_faire', 25_000, 'L'],
]

const actions: ActionPlan[] = actionSeeds.map(([riskId, title, description, owner, priority, start, deadline, status, cost, target], idx) => ({
  id: `PA-${String(idx + 1).padStart(2, '0')}`,
  title, description, riskId, owner, priority,
  startDate: daysFromToday(start), deadline: daysFromToday(deadline),
  status, cost, targetCriticality: target,
}))

// ─── Recommandations d'audit ────────────────────────────────

type AuditSeed = [riskId: string, title: string, description: string, auditor: string, sev: AuditSeverity, status: AuditStatus, deadline: number]

const auditSeeds: AuditSeed[] = [
  ['R-03', 'Fiabiliser la revue périodique KYC', 'Mettre en place un pilotage de la revue périodique avec des objectifs par réseau et un reporting mensuel au comité.', 'Inspection Générale', 'critique', 'en_cours', 45],
  ['R-20', 'Résorber le stock d’alertes LCB-FT', 'Le stock d’alertes non traitées constitue un manquement aux obligations de vigilance constante.', 'ACPR — mission sur place', 'critique', 'en_cours', 90],
  ['R-22', 'Respecter les délais de déclaration', 'Formaliser les délais cibles et leur suivi pour les déclarations de soupçon.', 'ACPR — mission sur place', 'elevee', 'ouverte', 60],
  ['R-25', 'Automatiser la révocation des accès', 'Supprimer la dépendance à une notification manuelle des RH.', 'Audit interne', 'elevee', 'en_cours', -30],
  ['R-24', 'Traiter les conflits de séparation des tâches', 'Formaliser une matrice SoD et la contrôler lors du provisionnement.', 'Commissaires aux comptes', 'moyenne', 'ouverte', 30],
  ['R-06', 'Documenter le backtesting du modèle PME', 'Compléter la documentation des tests et justifier les ajustements.', 'BCE — Joint Supervisory Team', 'elevee', 'en_cours', 120],
  ['R-13', 'Respecter l’objectif de RTO', 'Le test du PCA a révélé un RTO supérieur à l’objectif.', 'Audit interne', 'moyenne', 'ouverte', 150],
  ['R-17', 'Couvrir les biens à double usage', 'Le dispositif de filtrage ne couvre pas la nomenclature des biens à double usage.', 'Inspection Générale', 'elevee', 'en_cours', 75],
  ['R-07', 'Actualiser les indices de valorisation', 'Les indices utilisés pour l’immobilier commercial sont obsolètes.', 'Audit interne', 'moyenne', 'cloturee', -40],
  ['R-11', 'Tracer le contre-appel', 'Le contre-appel lors des changements de coordonnées bancaires n’est pas tracé.', 'Commissaires aux comptes', 'moyenne', 'en_cours', 20],
  ['R-05', 'Purger les données au-delà des durées légales', 'Données conservées au-delà des durées de conservation dans la GED.', 'DPO — audit RGPD', 'faible', 'ouverte', 100],
]

const audits: AuditRecommendation[] = auditSeeds.map(([riskId, title, description, auditor, severity, status, dl], idx) => ({
  id: `AUD-${String(idx + 1).padStart(2, '0')}`,
  title, description, auditor, severity, riskId, status, deadline: daysFromToday(dl),
}))

// ─── Pertes ─────────────────────────────────────────────────

type LossSeed = [riskId: string, description: string, amount: number, daysAgo: number]

const lossSeeds: LossSeed[] = [
  ['R-11', 'Fraude au président — virement de 480 k€ vers Hong Kong, 120 k€ récupérés', 360_000, 20],
  ['R-11', 'Fraude au changement de RIB fournisseur (client PME)', 94_500, 75],
  ['R-11', 'Faux ordre de virement par courriel compromis', 212_000, 190],
  ['R-01', 'Ouverture frauduleuse avec pièce volée — découverts et crédits consommés', 38_400, 40],
  ['R-01', 'Réseau de comptes « mules » ouverts en ligne', 126_000, 260],
  ['R-12', 'Virement en double (erreur de saisie) — non récupéré', 18_750, 100],
  ['R-12', 'Erreur de bénéficiaire sur un paiement de masse', 7_200, 300],
  ['R-13', 'Indisponibilité SEPA de 5 h — pénalités et gestes commerciaux', 145_000, 130],
  ['R-15', 'Passage en perte de suspens nostro anciens', 22_300, 60],
  ['R-16', 'Crédit documentaire sur faux connaissement', 640_000, 220],
  ['R-17', 'Amende OFAC — transaction liée à un pays sous embargo', 1_250_000, 330],
  ['R-09', 'Décaissement sans hypothèque inscrite — perte en recouvrement', 185_000, 150],
  ['R-10', 'Défaut non anticipé — provision complémentaire', 920_000, 90],
  ['R-07', 'Moins-value sur réalisation de garantie immobilière', 310_000, 280],
  ['R-22', 'Sanction ACPR — volet LCB-FT (quote-part 2026)', 1_500_000, 160],
  ['R-26', 'Incident rançongiciel sur une filiale — remédiation', 275_000, 240],
  ['R-27', 'Envoi de relevés à un mauvais destinataire — notification CNIL', 12_000, 110],
  ['R-05', 'Contentieux client — droit d’accès RGPD non respecté', 8_500, 50],
  ['R-29', 'Correction d’état COREP — coûts de retraitement', 15_000, 200],
  ['R-03', 'Gel d’activité d’un client : indemnisation après erreur KYC', 26_000, 15],
  ['R-18', 'Appel de garantie contesté — frais de procédure', 64_000, 350],
  ['R-11', 'Fraude à la carte en agence — usurpation', 9_800, 400],
]

const riskCat = new Map(risks.map((r) => [r.id, r.category]))

const losses: Loss[] = lossSeeds.map(([riskId, description, amount, ago], idx) => ({
  id: `PE-${String(idx + 1).padStart(2, '0')}`,
  description, amount, riskId,
  date: daysFromToday(-ago),
  category: riskCat.get(riskId) ?? 'operationnel',
}))

export function buildSeed(): GrcData {
  // Copie profonde : la donnée de démo n'est jamais mutée.
  return structuredClone({ processes, risks, controls, kris, actions, audits, losses, executions: buildExecutions() })
}
