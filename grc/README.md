# Vigie GRC — outil de Gouvernance, Risques & Conformité (démo bancaire)

Application web de démonstration et **projet de référence** pour les équipes de développement :
cartographie des processus, registre des risques, contrôles, KRI, plans d'action, audit et pertes,
le tout relié et mis à jour en direct. Interface 100 % en français, données fictives.

## Lancer

```bash
cd grc
npm install
npm run dev        # http://localhost:5173
npm run build      # vérification TypeScript + build de production (dist/)
npm run build:fichier  # toute l’app dans un seul fichier dist-fichier/index.html, à ouvrir par double-clic
```

Node 20+ recommandé. Aucune API ni base de données : tout est stocké dans le navigateur (`localStorage`).

## Naviguer

| Vue | Contenu |
|---|---|
| **A. Vue d'ensemble** | KPI (processus, risques par criticité, % plans à temps, KRI au rouge, pertes 12 mois), heatmap probabilité × impact cliquable (résiduel / intrinsèque), top risques, pertes, répartitions. |
| **B. Cartographie des processus** | React Flow : chaque processus et le tracé de ses activités, colorées par criticité. Clic processus/activité → fiche processus ; clic `R-xx` → fiche risque. |
| **C. Registre des risques** | Tableau triable et filtrable (porteur, traitement + filtres globaux), export CSV. Clic ligne → fiche risque. |
| **D. Contrôles & KRI** | Couverture et efficacité des contrôles ; tableau de bord KRI (feu tricolore, jauge vs seuils, tendance 12 mesures). |
| **E. Plans d'action** | Kanban glisser-déposer (à faire / en cours / en retard / terminé) ou planning type Gantt. |
| **F. Audit & pertes** | Recommandations d'audit (sévérité, statut, échéance) et registre des pertes avec graphiques. |
| **G. Graphe des relations** | Processus → risques → contrôles / KRI / plans / audit / pertes, filtrable par type d'élément. |

- **Header** : recherche (`/`), filtres domaine / criticité / catégorie appliqués à toutes les vues, bouton **Créer**.
- **Fiches latérales** : processus ↔ risque, navigables avec « Retour » ; chaque section a un bouton **Ajouter** pré-rempli.
- **Réinitialiser les données de démo** : en bas de la barre latérale.

## Intégration Jira (simulée)

Pour illustrer la cible « Jira pour la saisie, Vigie GRC pour le pilotage », chaque risque, contrôle, KRI,
plan d'action et recommandation d'audit porte la clé du ticket Jira qui le représenterait (`GRC-142`…).
Les nouvelles entités reçoivent automatiquement la clé suivante. L'indicateur « Jira · GRC » de l'en-tête
et son bouton de synchronisation sont **simulés** : aucune donnée n'est échangée avec Jira.
Toute la logique est isolée dans `src/lib/jira.ts`, à remplacer par l'API Jira ou une application Forge.

## Architecture

```
src/
  types.ts                  Modèle de données (toutes les entités et leurs liens)
  data/seed.ts              Données de démo (7 processus, 30 risques, 49 contrôles, 13 KRI…)
  store/GrcStore.tsx        État + persistance localStorage + index de relations + suppression en cascade
  store/UiStore.tsx         Filtres globaux, panneau latéral, modale, notifications, useScope()
  lib/                      Scoring et règles métier (risk.ts), libellés FR (labels.ts), formats
  components/forms/         Formulaires déclaratifs : entityConfig.tsx + une modale générique
  components/panels/        Fiches processus et risque
  components/charts/        Heatmap, jauge KRI, sparkline, hook React Flow
  components/ui/            Primitives (bouton, carte, badge, modale, tableau triable)
  pages/                    Une page par vue (A → G), chargée à la demande
```

**Ajouter un champ à une entité** : le déclarer dans `types.ts`, `entityConfig.tsx` (formulaire) et `seed.ts`.

## Règles métier retenues

- Risque **intrinsèque** = probabilité × impact ; risque **résiduel** = probabilité résiduelle × impact résiduel (échelles 1–5).
- **Criticité** dérivée du score résiduel : ≥ 15 Élevée (H), ≥ 8 Moyenne (M), sinon Faible (L).
- **KRI** : statut calculé à partir de deux seuils (alerte, critique) et du sens de lecture (hausse ou baisse défavorable).
  Modifier la valeur ajoute une nouvelle mesure à la série de 12 points.
- **Plan d'action** non terminé dont l'échéance est dépassée ⇒ affiché « En retard ».
- Suppression d'un processus ⇒ suppression de ses risques ; d'un risque ⇒ de ses contrôles, KRI et plans.
  Recommandations d'audit et pertes sont conservées (détachées), car ce sont des faits historiques.
- Les dates de démo sont relatives au jour de lancement, pour que la démo reste cohérente dans le temps.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS 4 · React Flow (`@xyflow/react`) · Recharts · lucide-react · React Router (hash).
Composants UI maison dans l'esprit shadcn/ui, sans dépendance supplémentaire.
