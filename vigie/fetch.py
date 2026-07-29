"""Collecte des publications depuis les flux des régulateurs (RSS 2.0, RSS 1.0/RDF, Atom)."""

import html
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from . import config

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Vigie/2.0 "
    "(veille reglementaire personnelle; contact: cedric.savioz12@gmail.com)"
)


def _http_get(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _clean_text(raw: str) -> str:
    """Supprime les balises HTML et normalise les espaces."""
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _local(tag: str) -> str:
    """Nom local d'un tag XML, sans son namespace."""
    return tag.rsplit("}", 1)[-1]


def _parse_date(raw: str) -> str:
    """Convertit une date RFC 822 (pubDate RSS) ou ISO 8601 (dc:date, Atom) en ISO 8601 UTC."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    try:
        return parsedate_to_datetime(raw).astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError):
        pass
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
    except ValueError:
        return raw


def _child_text(node, *names: str) -> str:
    """Premier texte non vide parmi les enfants dont le nom local figure dans names."""
    for child in node:
        if _local(child.tag) in names and child.text:
            return child.text.strip()
    return ""


def _atom_link(node) -> str:
    """Extrait le lien d'une entrée Atom (attribut href)."""
    for child in node:
        if _local(child.tag) == "link":
            href = child.get("href", "")
            if href and child.get("rel", "alternate") == "alternate":
                return href
    for child in node:
        if _local(child.tag) == "link" and child.get("href"):
            return child.get("href")
    return ""


def fetch_feed(source: dict) -> list[dict]:
    """Récupère et parse un flux (RSS 2.0, RSS 1.0/RDF ou Atom), retourne des items normalisés."""
    root = ET.fromstring(_http_get(source["url"]))

    # Noeuds publication : <item> (RSS 2.0 et RDF) ou <entry> (Atom).
    # Dans un flux RDF, les <item> sont frères de <channel> ; iter() les trouve partout.
    nodes = [n for n in root.iter() if _local(n.tag) in ("item", "entry")]

    items = []
    for node in nodes:
        is_atom = _local(node.tag) == "entry"
        lien = _atom_link(node) if is_atom else _child_text(node, "link")
        # RDF : l'identifiant est l'attribut rdf:about ; sinon guid/id/link
        guid = (
            node.get("{http://www.w3.org/1999/02/22-rdf-syntax-ns#}about")
            or _child_text(node, "guid", "id")
            or lien
        ).strip()
        if not guid:
            continue
        titre = _clean_text(_child_text(node, "title"))
        if not titre:
            continue
        description_raw = _child_text(node, "description", "summary", "content")
        date_raw = _child_text(node, "pubDate", "date", "published", "updated", "issued")
        if not date_raw:
            # Certains flux (ESMA) ne datent l'item que dans le HTML de la description
            m = re.search(r'datetime="([^"]+)"', description_raw)
            if m:
                date_raw = m.group(1)
        items.append(
            {
                "guid": guid,
                "source": source["nom"],
                "source_id": source["id"],
                "titre": titre,
                "lien": (lien or guid).strip(),
                "categorie": _clean_text(_child_text(node, "category", "subject")),
                "description": _clean_text(description_raw),
                "date": _parse_date(date_raw),
                "analyse": None,
            }
        )

    # Tri anté-chronologique puis plafond par source (évite d'avaler tout l'historique)
    items.sort(key=lambda i: i.get("date") or "", reverse=True)
    max_items = source.get("max_items")
    if max_items:
        items = items[:max_items]
    return items


def fetch_all_sources() -> list[dict]:
    """Collecte toutes les sources configurées. Une source en panne n'arrête pas les autres."""
    items = []
    for source in config.SOURCES:
        try:
            fetched = fetch_feed(source)
            print(f"  {source['nom']} : {len(fetched)} publication(s)")
            items.extend(fetched)
        except Exception as e:
            print(f"  {source['nom']} : ERREUR ({e})")
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
