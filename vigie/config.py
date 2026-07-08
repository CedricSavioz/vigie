"""Configuration centrale de Vigie."""

import os
from pathlib import Path

# Chemins
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "items.json"
SITE_DIR = PROJECT_ROOT / "site"
SITE_FILE = SITE_DIR / "index.html"

# Sources de veille (extensible : ajouter un dict par source)
SOURCES = [
    {
        "id": "finma-news",
        "nom": "FINMA",
        "type": "rss",
        "url": "https://www.finma.ch/fr/rss/news/",
    },
]

# Modèle Claude utilisé pour l'analyse.
# Surchargeable via la variable d'environnement VIGIE_MODEL
# (ex. claude-haiku-4-5 pour réduire les coûts).
MODEL = os.environ.get("VIGIE_MODEL", "claude-opus-4-8")

# Nombre max de caractères du texte d'article envoyé à l'analyse
MAX_ARTICLE_CHARS = 12_000

# Domaines réglementaires reconnus (utilisés pour guider la classification)
DOMAINES = [
    "Banques",
    "Assurances",
    "Gestion d'actifs",
    "LSFin / LEFin",
    "LBA / Blanchiment",
    "Sanctions / Embargos",
    "Risques opérationnels",
    "Liquidités",
    "Fonds propres",
    "Enforcement",
    "FinTech / Crypto",
    "Gouvernance",
    "Marchés",
]

NIVEAUX_IMPACT = ["eleve", "moyen", "faible", "informatif"]
