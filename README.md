# Vigie — Veille réglementaire suisse assistée par IA

Vigie collecte automatiquement les publications officielles des régulateurs suisses (FINMA),
les analyse avec l'API Claude selon une grille de lecture Risk Management, et publie un
dashboard web : niveau d'impact, établissements concernés, actions recommandées pour la
seconde ligne de défense.

**Démo :** ouvrir `site/index.html` dans un navigateur (fichier autonome, déployable tel quel
sur Netlify Drop ou GitHub Pages).

---

## Ce que fait l'application

1. **Collecte** (`vigie/fetch.py`) : lecture des flux RSS officiels (FINMA), normalisation,
   dédoublonnage. Architecture extensible : ajouter une source = un dict dans `config.SOURCES`.
2. **Analyse IA** (`vigie/analyze.py`) : chaque publication est envoyée à Claude (API Anthropic)
   avec un prompt d'expert Risk Management suisse. La sortie est **structurée et validée**
   (Pydantic + structured outputs) : résumé, domaines, niveau d'impact, établissements
   concernés, 2 à 4 actions recommandées, échéance.
3. **Publication** (`vigie/render.py`) : génération d'un dashboard HTML statique autonome
   (zéro dépendance externe) avec baromètre d'impact filtrable, recherche et filtres par domaine.

## Utilisation

```powershell
# Chemin Python de la machine
$py = "C:\Users\cedri\AppData\Local\Programs\Python\Python312\python.exe"

& $py run.py fetch        # collecte les nouvelles publications
& $py run.py analyze      # analyse IA (nécessite ANTHROPIC_API_KEY)
& $py run.py render       # régénère site/index.html
& $py run.py all          # les trois d'affilée
```

### Clé API

L'analyse IA nécessite une clé API Anthropic (console.anthropic.com) :

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

Modèle par défaut : `claude-opus-4-8`. Pour réduire les coûts :

```powershell
$env:VIGIE_MODEL = "claude-haiku-4-5"
```

Note : les 50 premières analyses (déc. 2025 → juil. 2026) ont été générées par Claude
(Fable 5) via Claude Code lors de la construction du projet, avant la mise en place de la
clé API. Le champ `modele` de chaque analyse trace son origine.

## Structure

```
vigie/
├── run.py               # CLI : fetch / analyze / render / all
├── vigie/
│   ├── config.py        # sources, modèle, domaines réglementaires
│   ├── fetch.py         # collecte RSS + texte des articles
│   ├── store.py         # stockage JSON, dédoublonnage
│   ├── analyze.py       # analyse via API Claude (sortie structurée Pydantic)
│   └── render.py        # génération du dashboard statique
├── data/items.json      # base des publications + analyses
└── site/index.html      # dashboard généré (autonome, déployable)
```

## Déploiement du dashboard

Le fichier `site/index.html` est autonome. Pour le publier :
glisser-déposer le dossier `site/` sur [Netlify Drop](https://app.netlify.com/drop),
ou pousser sur GitHub et activer GitHub Pages.

## Pistes d'évolution

- Sources supplémentaires : Comité de Bâle (BRI), DFF/SFI, SECO, CHF Ombudsman
- Digest hebdomadaire par e-mail (résumé des publications à impact élevé/moyen)
- Tâche planifiée Windows pour une mise à jour quotidienne automatique
- Historisation des tendances (volume par domaine, par trimestre)

---

Projet indépendant RegTech — Cédric Savioz, 2026.
Conçu et développé avec Claude Code. Les analyses IA sont fournies à titre indicatif et ne
remplacent ni la lecture des textes officiels, ni un avis juridique ou de conformité.
