"""Point d'entrée de Vigie.

Usage :
    python run.py fetch              # collecte les nouvelles publications
    python run.py analyze [--limit N]  # analyse IA des publications en attente
    python run.py render             # régénère le site statique
    python run.py all                # fetch + analyze + render
"""

import argparse
import sys

from vigie import store
from vigie.fetch import fetch_all_sources


def cmd_fetch(data: dict) -> None:
    print("Collecte des sources...")
    fetched = fetch_all_sources()
    added = store.merge_new_items(data, fetched)
    store.save(data)
    print(f"{len(fetched)} publications lues, {added} nouvelles ajoutées.")


def cmd_analyze(data: dict, limit: int | None) -> None:
    from vigie.analyze import analyze_pending  # import tardif : nécessite le package anthropic

    pending = sum(1 for i in data["items"] if not i.get("analyse"))
    if not pending:
        print("Aucune publication en attente d'analyse.")
        return
    print(f"Analyse de {min(pending, limit) if limit else pending} publication(s) via Claude...")
    done, errors = analyze_pending(data, limit)
    store.save(data)
    print(f"{done} analysée(s), {errors} erreur(s).")


def cmd_render(data: dict) -> None:
    from vigie.render import render_site

    path = render_site(data)
    print(f"Site généré : {path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Vigie — veille réglementaire assistée par IA")
    parser.add_argument("command", choices=["fetch", "analyze", "render", "all"])
    parser.add_argument("--limit", type=int, default=None, help="Nombre max d'items à analyser")
    args = parser.parse_args()

    data = store.load()

    if args.command in ("fetch", "all"):
        cmd_fetch(data)
    if args.command in ("analyze", "all"):
        cmd_analyze(data, args.limit)
    if args.command in ("render", "all"):
        cmd_render(data)


if __name__ == "__main__":
    sys.exit(main())
