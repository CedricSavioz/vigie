"""Analyse d'impact des publications réglementaires via l'API Claude."""

from typing import Literal, Optional

import anthropic
from pydantic import BaseModel, Field

from . import config
from .fetch import fetch_article_text

ProfilId = Literal[
    "banque-universelle",
    "banque-privee",
    "gerant-fortune",
    "gestionnaire-placements",
    "direction-fonds",
    "maison-titres",
    "assurance",
    "intermediaire-assurance",
    "caisse-pension",
    "fintech-crypto",
    "trustee",
    "family-office",
    "bpo-outsourcing",
]

NiveauImpact = Literal["eleve", "moyen", "faible", "informatif"]


class ImpactProfil(BaseModel):
    """Niveau d'impact pour un profil d'établissement donné."""

    profil: ProfilId
    niveau: NiveauImpact


class AnalyseReglementaire(BaseModel):
    """Sortie structurée attendue du modèle pour chaque publication."""

    resume: str = Field(description="Résumé en 2 à 3 phrases, en français, orienté praticien du risque")
    domaines: list[str] = Field(description="1 à 3 domaines réglementaires concernés")
    niveau_impact: NiveauImpact = Field(
        description="Niveau d'impact global pour la place financière suisse (le plus élevé des profils concernés)"
    )
    impacts_par_profil: list[ImpactProfil] = Field(
        description="Niveau d'impact par profil d'établissement, uniquement pour les profils réellement concernés (liste vide si publication purement institutionnelle)"
    )
    etablissements_concernes: str = Field(
        description="Qui est concerné, en une phrase (ex. banques de détail, gestionnaires de fortune, assureurs)"
    )
    actions_risk_manager: list[str] = Field(
        description="2 à 4 actions concrètes recommandées pour un Risk Manager / contrôleur interne"
    )
    echeance: Optional[str] = Field(
        default=None,
        description="Échéance ou date d'entrée en vigueur si mentionnée, sinon null",
    )


PROFILS_TXT = "\n".join(f"- {p['id']} : {p['label']}" for p in config.PROFILS)

SYSTEM_PROMPT = f"""Tu es un expert en gestion des risques et contrôle interne dans le secteur \
financier suisse (banques, assurances, gestionnaires de fortune), avec une connaissance \
approfondie du cadre réglementaire FINMA (circulaires, ordonnances, LSFin, LEFin, LBA, LSA, \
exigences prudentielles bâloises) et des cadres internationaux (Comité de Bâle, BCE/MSU, EBA, \
ESMA, DORA).

On te transmet une publication d'un régulateur ou d'une banque centrale. Analyse-la du point \
de vue d'un Risk Manager en poste dans un établissement financier suisse : que faut-il retenir, \
qui est concerné, et quelles actions concrètes en découlent (mise à jour de la cartographie des \
risques, revue du SCI, gap analysis, information au management, formation, veille renforcée...).

Choisis les domaines parmi cette liste : {", ".join(config.DOMAINES)}.

Attribue ensuite un niveau d'impact PAR PROFIL d'établissement, uniquement pour les profils \
réellement concernés (les identifiants valides sont à gauche) :
{PROFILS_TXT}

Règles :
- Réponds en français, même si la publication est en anglais ou en allemand.
- Reste factuel : ne déduis que ce que la publication permet de déduire.
- "eleve" = action requise à court terme pour les établissements concernés ; \
"moyen" = à intégrer dans la roadmap conformité/risques ; "faible" = à connaître ; \
"informatif" = pas d'action attendue (communication institutionnelle, nomination, statistique).
- Une même publication peut être "eleve" pour un profil et absente pour un autre : n'inclus \
dans impacts_par_profil que les profils pour lesquels la publication a une pertinence réelle. \
Pour les publications suisses (FINMA, BNS), pense aussi aux profils non bancaires \
(assurances, caisses de pension, trustees, fintechs). Pour les publications européennes ou \
internationales, évalue l'impact indirect sur les établissements suisses (standards de Bâle \
repris par la FINMA, groupes actifs dans l'UE, sous-traitance, accès au marché).
- niveau_impact (global) = le niveau le plus élevé parmi les profils concernés, ou "informatif" \
si aucun profil n'est concerné."""


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
    # Aplatis impacts_par_profil en map {profil: niveau} pour le dashboard
    analyse["impacts_par_profil"] = {
        i["profil"]: i["niveau"] for i in analyse["impacts_par_profil"]
    }
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
