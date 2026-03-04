#!/usr/bin/env python3
"""
Build noc-titles.json for Fuse.js fuzzy matching in skillforge-web.

Sources (tried in order):
  1. StatCan NOC 2021 Classification Elements CSV (full ~30k job titles)
  2. Curated seed_occupations.py titles (39 occupations, always works)

Output:
  ../skillforge-web/public/noc-titles.json

Usage:
    python scripts/build_noc_corpus.py
    python scripts/build_noc_corpus.py --seed-only   # skip StatCan download
"""

import csv
import io
import json
import logging
import sys
import zipfile
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent))

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

# StatCan NOC 2021 classification elements — contains illustrative job titles
NOC_ELEMENTS_URL = (
    "https://www23.statcan.gc.ca/imdb/document.pl"
    "?Function=downloadFile&fileitem=5310000202_E.zip"
)

# Output path relative to this script's parent directory
OUTPUT_PATH = Path(__file__).parent.parent.parent / "skillforge-web" / "public" / "noc-titles.json"


def load_from_seed() -> list[dict]:
    """Build corpus from seed_occupations.py (always available)."""
    from scripts.seed_occupations import OCCUPATIONS
    entries = []
    for noc_code, title, *_ in OCCUPATIONS:
        entries.append({"code": noc_code, "title": title})
    logger.info(f"Loaded {len(entries)} entries from seed_occupations.py")
    return entries


def try_load_from_statcan() -> list[dict] | None:
    """
    Attempt to download and parse the StatCan NOC 2021 elements CSV.
    Returns None if download fails.
    """
    logger.info("Attempting to download NOC 2021 elements from StatCan...")
    try:
        with httpx.Client(timeout=60, follow_redirects=True) as client:
            resp = client.get(NOC_ELEMENTS_URL)
            if resp.status_code != 200:
                logger.warning(f"StatCan download returned {resp.status_code}. Using seed fallback.")
                return None
            content = resp.content
    except Exception as exc:
        logger.warning(f"StatCan download failed: {exc}. Using seed fallback.")
        return None

    try:
        entries = []
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                csv_file = next((n for n in zf.namelist() if n.endswith(".csv")), None)
                if csv_file:
                    with zf.open(csv_file) as f:
                        raw = io.TextIOWrapper(f, encoding="utf-8-sig")
                        reader = csv.DictReader(raw)
                        for row in reader:
                            noc = (row.get("NOC_CD", "") or row.get("noc_code", "")).strip()
                            title = (row.get("Element_Desc_E", "") or row.get("title", "")).strip()
                            if noc and title and len(noc) == 4 and noc.isdigit():
                                entries.append({"code": noc, "title": title})
        except zipfile.BadZipFile:
            reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
            for row in reader:
                noc = (row.get("NOC_CD", "") or row.get("noc_code", "")).strip()
                title = (row.get("Element_Desc_E", "") or row.get("title", "")).strip()
                if noc and title and len(noc) == 4 and noc.isdigit():
                    entries.append({"code": noc, "title": title})

        if entries:
            logger.info(f"Loaded {len(entries)} entries from StatCan NOC elements")
            return entries
        else:
            logger.warning("StatCan CSV parsed but no valid entries found. Using seed fallback.")
            return None
    except Exception as exc:
        logger.warning(f"StatCan CSV parse failed: {exc}. Using seed fallback.")
        return None


def main(seed_only: bool = False):
    entries = None

    if not seed_only:
        entries = try_load_from_statcan()

    if entries is None:
        entries = load_from_seed()

    # Deduplicate by (code, title) — keep first occurrence
    seen = set()
    deduped = []
    for e in entries:
        key = (e["code"], e["title"].lower())
        if key not in seen:
            seen.add(key)
            deduped.append(e)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(deduped, ensure_ascii=False))
    logger.info(f"Wrote {len(deduped)} entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed-only", action="store_true",
                        help="Skip StatCan download, use seed_occupations.py only")
    args = parser.parse_args()
    main(seed_only=args.seed_only)
