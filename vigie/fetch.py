"""Collecte des publications depuis les flux RSS des régulateurs."""

import html
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from . import config

USER_AGENT = "Vigie/1.0 (veille reglementaire personnelle; contact: cedric.savioz12@gmail.com)"


def _http_get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _clean_text(raw: str) -> str:
    """Supprime les balises HTML et normalise les espaces."""
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _parse_date(raw: str) -> str:
    """Convertit une date RFC 822 (pubDate RSS) en ISO 8601 UTC."""
    try:
        return parsedate_to_datetime(raw).astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError):
        return raw


def fetch_rss(source: dict) -> list[dict]:
    """Récupère et parse un flux RSS, retourne une liste d'items normalisés."""
    root = ET.fromstring(_http_get(source["url"]))
    items = []
    for node in root.iter("item"):
        guid = (node.findtext("guid") or node.findtext("link") or "").strip()
        if not guid:
            continue
        items.append(
            {
                "guid": guid,
                "source": source["nom"],
                "titre": _clean_text(node.findtext("title") or ""),
                "lien": (node.findtext("link") or "").strip(),
                "categorie": _clean_text(node.findtext("category") or ""),
                "description": _clean_text(node.findtext("description") or ""),
                "date": _parse_date(node.findtext("pubDate") or ""),
                "analyse": None,
            }
        )
    return items


def fetch_all_sources() -> list[dict]:
    """Collecte toutes les sources configurées."""
    items = []
    for source in config.SOURCES:
        if source["type"] == "rss":
            items.extend(fetch_rss(source))
    return items


def fetch_article_text(url: str) -> str:
    """Récupère le texte principal d'un article (pour enrichir l'analyse IA)."""
    try:
        raw = _http_get(url).decode("utf-8", errors="replace")
    except Exception:
        return ""
    # Retire scripts, styles et navigation avant d'extraire le texte
    raw = re.sub(r"<(script|style|nav|header|footer)[^>]*>.*?</\1>", " ", raw, flags=re.DOTALL | re.IGNORECASE)
    text = _clean_text(raw)
    return text[: config.MAX_ARTICLE_CHARS]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
