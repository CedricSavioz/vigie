"""Configuration centrale de Vigie."""

import os
from pathlib import Path

# Chemins
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "items.json"
SITE_DIR = PROJECT_ROOT / "site"
SITE_FILE = SITE_DIR / "index.html"

# Sources de veille (extensible : ajouter un dict par source).
# "max_items" limite le nombre d'items conservés par collecte (les plus récents),
# pour éviter d'avaler tout l'historique d'un flux la première fois.
SOURCES = [
    {
        "id": "finma-news",
        "nom": "FINMA",
        "pays": "Suisse",
        "type": "rss",
        "url": "https://www.finma.ch/fr/rss/news/",
        "max_items": 50,
    },
    {
        "id": "snb-news",
        "nom": "BNS",
        "pays": "Suisse",
        "type": "rss",
        "url": "https://www.snb.ch/public/en/rss/news",
        "max_items": 15,
    },
    {
        "id": "bis-press",
        "nom": "BRI / Bâle",
        "pays": "International",
        "type": "rss",
        "url": "https://www.bis.org/doclist/all_pressrels.rss",
        "max_items": 15,
    },
    {
        "id": "ecb-ssm",
        "nom": "BCE Supervision",
        "pays": "UE",
        "type": "rss",
        "url": "https://www.bankingsupervision.europa.eu/rss/press.xml",
        "max_items": 15,
    },
    {
        "id": "eba-news",
        "nom": "EBA",
        "pays": "UE",
        "type": "rss",
        "url": "https://www.eba.europa.eu/rss.xml",
        "max_items": 15,
    },
    {
        "id": "esma-news",
        "nom": "ESMA",
        "pays": "UE",
        "type": "rss",
        "url": "https://www.esma.europa.eu/rss.xml",
        "max_items": 15,
    },
    # Candidat écarté : FATF/GAFI (le site bloque les accès automatisés, HTTP 403).
]

# Modèle Claude utilisé pour l'analyse.
# Surchargeable via la variable d'environnement VIGIE_MODEL
# (ex. claude-haiku-4-5 pour réduire les coûts).
MODEL = os.environ.get("VIGIE_MODEL", "claude-sonnet-5")

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
    "Cyber / Résilience",
    "Liquidités",
    "Fonds propres",
    "Enforcement",
    "FinTech / Crypto",
    "Gouvernance",
    "Marchés",
    "Politique monétaire",
]

NIVEAUX_IMPACT = ["eleve", "moyen", "faible", "informatif"]

# Profils d'établissement (alignés sur la maquette produit Vigie v2).
# L'analyse IA attribue un niveau d'impact PAR PROFIL : une même publication
# peut être "élevé" pour une banque privée et absente pour une caisse de pension.
PROFILS = [
    {"id": "banque-universelle", "label": "Banque universelle / de détail"},
    {"id": "banque-privee", "label": "Banque privée"},
    {"id": "gerant-fortune", "label": "Gestionnaire de fortune (LEFin)"},
    {"id": "gestionnaire-placements", "label": "Gestionnaire de placements collectifs"},
    {"id": "direction-fonds", "label": "Direction de fonds"},
    {"id": "maison-titres", "label": "Maison de titres"},
    {"id": "assurance", "label": "Assurance / Réassurance"},
    {"id": "intermediaire-assurance", "label": "Intermédiaire d'assurance"},
    {"id": "caisse-pension", "label": "Caisse de pension"},
    {"id": "fintech-crypto", "label": "Fintech / Crypto"},
    {"id": "trustee", "label": "Trustee"},
    {"id": "family-office", "label": "Family office"},
    {"id": "bpo-outsourcing", "label": "BPO / Outsourcing bancaire"},
]

PROFIL_IDS = [p["id"] for p in PROFILS]
