#!/usr/bin/env python3
"""
Ingest LMIC NOC 2021 → O*NET crosswalk into SkillForge DB.

Source: https://github.com/lmic-cimt/noc-onet-crosswalk
License: MIT
Rows: 1,468

Usage:
    python scripts/ingest_lmic.py
"""

import csv
import io
import sys
from pathlib import Path

import httpx

# Add parent to path so we can import db
sys.path.insert(0, str(Path(__file__).parent.parent))
import db

LMIC_CSV_URL = (
    "https://raw.githubusercontent.com/lmic-cimt/noc-onet-crosswalk/main/data/"
    "NOC2021_ONET_crosswalk.csv"
)

# NOC TEER level extraction: code format is "ABCD" where A = broad category
# TEER embedded in NOC description; use this static map for top-level codes
# (simplified; full list from StatCan)
def _infer_teer(noc_code: str, title: str) -> int:
    """Infer TEER level from NOC code prefix."""
    prefix = noc_code[0] if noc_code else "9"
    teer_map = {
        "0": 0,  # Legislative and senior management
        "1": 1,  # Business, finance, administration
        "2": 2,  # Natural and applied sciences
        "3": 3,  # Health occupations
        "4": 4,  # Education, law, social, community, government
        "5": 3,  # Art, culture, recreation, sport
        "6": 4,  # Sales and service
        "7": 2,  # Trades, transport, equipment operators
        "8": 3,  # Natural resources, agriculture, related
        "9": 4,  # Manufacturing, utilities
    }
    return teer_map.get(prefix, 4)


def _infer_broad_category(noc_code: str) -> str:
    prefix = noc_code[0] if noc_code else "9"
    cat_map = {
        "0": "management", "1": "business", "2": "sciences",
        "3": "health", "4": "social", "5": "culture",
        "6": "sales_service", "7": "trades", "8": "natural_resources",
        "9": "manufacturing",
    }
    return cat_map.get(prefix, "other")


def fetch_crosswalk() -> list[dict]:
    print(f"Fetching LMIC crosswalk from GitHub...")
    resp = httpx.get(LMIC_CSV_URL, follow_redirects=True, timeout=30)
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))
    rows = list(reader)
    print(f"  Downloaded {len(rows)} crosswalk rows")
    return rows


def ingest(rows: list[dict]) -> None:
    db.init_db()
    with db.db() as conn:
        occupations_seen = set()
        skills_inserted = 0

        for row in rows:
            # Column names may vary; try common variants
            noc = (
                row.get("NOC_2021") or row.get("NOC2021") or
                row.get("noc_2021") or row.get("noc") or ""
            ).strip()
            onet = (
                row.get("ONET_2019") or row.get("ONET") or
                row.get("onet") or ""
            ).strip()
            title = (
                row.get("NOC_Title") or row.get("Title") or
                row.get("title") or row.get("NOC_TITLE") or noc
            ).strip()
            skill_label = (
                row.get("Element_Name") or row.get("Skill") or
                row.get("skill_label") or onet
            ).strip()

            if not noc or not onet:
                continue

            if noc not in occupations_seen:
                db.upsert_occupation(
                    conn, noc, title,
                    teer=_infer_teer(noc, title),
                    broad_category=_infer_broad_category(noc),
                )
                occupations_seen.add(noc)

            if skill_label:
                db.upsert_skill(conn, noc, onet, skill_label)
                skills_inserted += 1

    print(f"  Inserted/updated {len(occupations_seen)} occupations")
    print(f"  Inserted {skills_inserted} skill mappings")


def main():
    rows = fetch_crosswalk()
    if rows:
        ingest(rows)
    else:
        print("No rows fetched. Check URL or network.")
        sys.exit(1)


if __name__ == "__main__":
    main()
