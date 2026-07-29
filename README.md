# Vigie — Veille réglementaire assistée par IA

Vigie collecte chaque jour les publications officielles de six régulateurs et banques
centrales (FINMA, BNS, BRI / Comité de Bâle, BCE Supervision, EBA, ESMA), les analyse avec
l'API Claude selon une grille de lecture Risk Management, et publie un dashboard web où le
flux se personnalise par profil d'établissement : niveau d'impact **par profil**, domaines
concernés et actions recommandées pour la seconde ligne de défense.

**Application en ligne : [vigie-veille.netlify.app](https://vigie-veille.netlify.app)**
(mise à jour quotidienne automatique via GitHub Actions)

---

## Ce que fait l'application

1. **Collecte multi-sources** (`vigie/fetch.py`) : lecture des flux officiels (RSS 2.0,
   RSS 1.0/RDF et Atom), normalisation, dédoublonnage. Architecture extensible : ajouter
   une source = un dict dans `config.SOURCES`.
2. **Analyse IA** (`vigie/analyze.py`) : chaque publication est envoyée à Claude (API
   Anthropic) avec un prompt d'expert Risk Management suisse. La sortie est **structurée et
   validée** (Pydantic + structured outputs) : résumé, domaines, niveau d'impact global,
   **impacts par profil d'établissement** (13 profils, de la banque universelle au family
   office), établissements concernés, 2 à 4 actions recommandées, échéance.
3. **Publication** (`vigie/render.py`) : génération d'un dashboard HTML statique autonome
   (zéro dépendance externe). Sélecteur de profil, baromètre d'impact filtrable, filtres par
   source et domaine, recherche. Une même publication peut être « impact élevé » pour une
   banque privée et absente du flux d'une caisse de pension.
4. **Automatisation** (`.github/workflows/veille.yml`) : GitHub Actions exécute chaque matin
   fetch → analyze → render, commite les données et redéploie le site sur Netlify.

## Utilisation locale

```powershell
python run.py fetch        # collecte les nouvelles publications
python run.py analyze      # analyse IA (nécessite ANTHROPIC_API_KEY)
python run.py render       # régénère site/index.html
python run.py all          # les trois d'affilée
```

### Clé API

L'analyse IA nécessite une clé API Anthropic (console.anthropic.com) :

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

Modèle par défaut : `claude-sonnet-5`. Surchargeable via `VIGIE_MODEL`
(ex. `claude-haiku-4-5` pour réduire les coûts).

Pour l'automatisation GitHub Actions, la clé se configure en secret de dépôt :
`gh secret set ANTHROPIC_API_KEY`. Sans clé, le workflow collecte et publie quand même,
les nouvelles publications restent « en attente d'analyse ».

Note : les analyses du stock initial (déc. 2025 → juil. 2026, 118 publications) ont été
générées par Claude (Fable 5) via Claude Code lors de la construction du projet, avant la
mise en place de la clé API. Le champ `modele` de chaque analyse trace son origine.

## Structure

```
vigie/
├── run.py                        # CLI : fetch / analyze / render / all
├── vigie/
│   ├── config.py                 # sources, modèle, domaines, profils d'établissement
│   ├── fetch.py                  # collecte RSS/RDF/Atom + texte des articles
│   ├── store.py                  # stockage JSON, dédoublonnage
│   ├── analyze.py                # analyse via API Claude (sortie structurée Pydantic)
│   └── render.py                 # génération du dashboard statique
├── .github/workflows/veille.yml  # veille quotidienne automatisée
├── data/items.json               # base des publications + analyses
└── site/index.html               # dashboard généré (autonome, déployable)
```

## Sources suivies

| Source | Périmètre |
|---|---|
| FINMA | Surveillance des marchés financiers, Suisse |
| BNS | Banque centrale, Suisse |
| BRI / Comité de Bâle | Standards prudentiels internationaux |
| BCE Supervision (MSU) | Supervision bancaire, zone euro |
| EBA | Autorité bancaire européenne |
| ESMA | Marchés financiers, UE |

Candidat écarté : FATF/GAFI (le site bloque les accès automatisés).

## Pistes d'évolution

- Digest hebdomadaire par e-mail (résumé des publications à impact élevé/moyen par profil)
- Sources supplémentaires : DFF/SFI, SECO, EIOPA, FCA/PRA
- Historisation des tendances (volume par domaine, par trimestre)
- Alertes ciblées pour les gérants de fortune indépendants (LEFin)

---

Projet indépendant RegTech — Cédric Savioz, 2026.
Conçu et développé avec Claude Code. Les analyses IA sont fournies à titre indicatif et ne
remplacent ni la lecture des textes officiels, ni un avis juridique ou de conformité.
