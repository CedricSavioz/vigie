"""Stockage local des publications et de leurs analyses (JSON)."""

import json

from . import config
from .fetch import now_iso


def load() -> dict:
    if not config.DATA_FILE.exists():
        return {"updated_at": None, "items": []}
    with open(config.DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def save(data: dict) -> None:
    config.DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    data["updated_at"] = now_iso()
    with open(config.DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def merge_new_items(data: dict, fetched: list[dict]) -> int:
    """Ajoute les items inédits (dédoublonnage par guid). Retourne le nombre ajouté."""
    known = {item["guid"] for item in data["items"]}
    added = 0
    for item in fetched:
        if item["guid"] not in known:
            data["items"].append(item)
            known.add(item["guid"])
            added += 1
    # Tri anté-chronologique
    data["items"].sort(key=lambda i: i.get("date") or "", reverse=True)
    return added
