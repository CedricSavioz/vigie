"""Analyse d'impact des publications réglementaires via l'API Claude."""

from typing import Literal, Optional

import anthropic
from pydantic import BaseModel, Field

from . import config
from .fetch import fetch_article_text


class AnalyseReglementaire(BaseModel):
    """Sortie structurée attendue du modèle pour chaque publication."""

    resume: str = Field(description="Résumé en 2 à 3 phrases, orienté praticien du risque")
    domaines: list[str] = Field(description="1 à 3 domaines réglementaires concernés")
    niveau_impact: Literal["eleve", "moyen", "faible", "informatif"] = Field(
        description="Niveau d'impact pour un établissement financier suisse type"
    )
    etablissements_concernes: str = Field(
        description="Qui est concerné (ex. banques de détail, gestionnaires de fortune, assureurs)"
    )
    actions_risk_manager: list[str] = Field(
        description="2 à 4 actions concrètes recommandées pour un Risk Manager / contrôleur interne"
    )
    echeance: Optional[str] = Field(
        default=None,
        description="Échéance ou date d'entrée en vigueur si mentionnée, sinon null",
    )


SYSTEM_PROMPT = f"""Tu es un expert en gestion des risques et contrôle interne dans le secteur \
financier suisse (banques, assurances, gestionnaires de fortune), avec une connaissance \
approfondie du cadre réglementaire FINMA (circulaires, ordonnances, LSFin, LEFin, LBA, LSA, \
exigences prudentielles bâloises).

On te transmet une publication d'un régulateur. Analyse-la du point de vue d'un Risk Manager \
en poste dans un établissement financier suisse : que faut-il retenir, qui est concerné, et \
quelles actions concrètes en découlent (mise à jour de la cartographie des risques, revue du \
SCI, gap analysis, information au management, formation, veille renforcée...).

Choisis les domaines parmi cette liste : {", ".join(config.DOMAINES)}.

Règles :
- Réponds en français.
- Reste factuel : ne déduis que ce que la publication permet de déduire.
- "eleve" = action requise à court terme pour les établissements concernés ; \
"moyen" = à intégrer dans la roadmap conformité/risques ; "faible" = à connaître ; \
"informatif" = pas d'action attendue (communication institutionnelle, nomination, etc.)."""


def build_user_prompt(item: dict, article_text: str) -> str:
    parts = [
        f"Source : {item['source']}",
        f"Type : {item['categorie']}",
        f"Date : {item['date']}",
        f"Titre : {item['titre']}",
        f"Résumé officiel : {item['description']}",
    ]
    if article_text:
        parts.append(f"Texte de la publication :\n{article_text}")
    return "\n".join(parts)


def analyze_item(client: anthropic.Anthropic, item: dict) -> dict:
    """Analyse une publication et retourne le dict d'analyse validé."""
    article_text = fetch_article_text(item["lien"])
    response = client.messages.parse(
        model=config.MODEL,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(item, article_text)}],
        output_format=AnalyseReglementaire,
    )
    analyse = response.parsed_output.model_dump()
    analyse["modele"] = config.MODEL
    return analyse


def analyze_pending(data: dict, limit: int | None = None) -> tuple[int, int]:
    """Analyse les items sans analyse. Retourne (analysés, erreurs)."""
    client = anthropic.Anthropic()
    pending = [i for i in data["items"] if not i.get("analyse")]
    if limit:
        pending = pending[:limit]

    done, errors = 0, 0
    for item in pending:
        try:
            item["analyse"] = analyze_item(client, item)
            done += 1
            print(f"  OK  {item['titre'][:80]}")
        except anthropic.AuthenticationError:
            print("  ERREUR : clé API invalide ou absente (variable ANTHROPIC_API_KEY).")
            raise
        except anthropic.RateLimitError:
            print(f"  RATE LIMIT sur : {item['titre'][:60]} (réessayer plus tard)")
            errors += 1
        except anthropic.APIStatusError as e:
            print(f"  ERREUR API {e.status_code} sur : {item['titre'][:60]}")
            errors += 1
        except anthropic.APIConnectionError:
            print(f"  ERREUR réseau sur : {item['titre'][:60]}")
            errors += 1
    return done, errors
