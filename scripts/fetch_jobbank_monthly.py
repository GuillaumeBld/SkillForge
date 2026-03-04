#!/usr/bin/env python3
"""
Download the latest Job Bank monthly postings CSV from open.canada.ca and
aggregate posting counts by NOC code into jobbank_postings SQLite table.

Dataset: https://open.canada.ca/data/en/dataset/ea639e28-c0fc-48bf-b5dd-b8899bd43072
No API key required. Monthly release.

Usage:
    python scripts/fetch_jobbank_monthly.py
    python scripts/fetch_jobbank_monthly.py --dry-run
"""

import csv
import io
import logging
import re
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent))
import db

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

CKAN_API_URL = (
    "https://open.canada.ca/api/3/action/package_show"
    "?id=ea639e28-c0fc-48bf-b5dd-b8899bd43072"
)


def get_latest_resource(ckan_url: str) -> tuple:
    """Return (download_url, resource_name) for the most recent monthly CSV."""
    with httpx.Client(timeout=30) as client:
        resp = client.get(ckan_url)
        resp.raise_for_status()
    data = resp.json()
    resources = data["result"]["resources"]
    csvs = [r for r in resources if r.get("format", "").upper() == "CSV"]
    if not csvs:
        raise RuntimeError("No CSV resources found in Job Bank dataset")
    csvs.sort(key=lambda r: r.get("last_modified", ""), reverse=True)
    latest = csvs[0]
    return latest["url"], latest["name"]


def aggregate_postings_by_noc(csv_bytes: bytes) -> dict:
    """Sum num_vacancies by noc from a Job Bank monthly CSV."""
    result = {}
    reader = csv.DictReader(io.TextIOWrapper(io.BytesIO(csv_bytes), encoding="utf-8-sig"))
    for row in reader:
        noc = row.get("noc", "").strip()
        if not noc:
            continue
        raw = row.get("num_vacancies", "").strip()
        if not raw:
            continue
        try:
            count = int(raw)
        except ValueError:
            continue
        result[noc] = result.get(noc, 0) + count
    return result


def extract_reference_month(filename: str):
    """Extract YYYY-MM from a filename like 'JobBankPostings_2025-01.csv'. Returns None if not found."""
    match = re.search(r"(\d{4}-\d{2})", filename)
    return match.group(1) if match else None


def main(dry_run: bool = False):
    db.init_db()

    logger.info("Fetching Job Bank dataset metadata from open.canada.ca...")
    try:
        download_url, resource_name = get_latest_resource(CKAN_API_URL)
    except Exception as exc:
        logger.error(f"CKAN API error: {exc}")
        sys.exit(1)

    reference_month = extract_reference_month(resource_name) or "unknown"
    logger.info(f"Latest resource: {resource_name} (month: {reference_month})")

    # Check if we already have this month's data
    with db.db() as conn:
        existing = conn.execute(
            "SELECT reference_month FROM jobbank_postings LIMIT 1"
        ).fetchone()
    if existing and existing["reference_month"] == reference_month:
        logger.info(f"Already have {reference_month} data. Exiting.")
        return

    logger.info(f"Downloading CSV from {download_url}...")
    try:
        with httpx.Client(timeout=120, follow_redirects=True) as client:
            resp = client.get(download_url)
            resp.raise_for_status()
            csv_bytes = resp.content
    except Exception as exc:
        logger.error(f"Download failed: {exc}")
        sys.exit(1)

    postings = aggregate_postings_by_noc(csv_bytes)
    logger.info(f"Aggregated {len(postings)} NOC codes from CSV")

    if dry_run:
        for noc, count in sorted(postings.items(), key=lambda x: -x[1])[:10]:
            print(f"  {noc}: {count} postings")
        return

    with db.db() as conn:
        for noc_code, posting_count in postings.items():
            db.upsert_jobbank(conn, noc_code, posting_count, reference_month)

    logger.info(f"Upserted {len(postings)} NOC codes into jobbank_postings")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    main(dry_run=args.dry_run)
