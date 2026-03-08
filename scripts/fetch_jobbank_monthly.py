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
    "https://open.canada.ca/data/api/3/action/package_show"
    "?id=ea639e28-c0fc-48bf-b5dd-b8899bd43072"
)


def get_latest_resource(ckan_url: str) -> tuple:
    """Return (download_url, ref_key) for the most recent English monthly CSV.

    ref_key is the best available string to derive a YYYY-MM month from —
    we try the resource URL first (contains 'jan2026' etc.), then last_modified.
    """
    with httpx.Client(timeout=30) as client:
        resp = client.get(ckan_url)
        resp.raise_for_status()
    data = resp.json()
    resources = data["result"]["resources"]
    # Prefer English CSVs (URL or name contains '-en-')
    csvs = [r for r in resources if r.get("format", "").upper() == "CSV"
            and "-en-" in r.get("url", "").lower()]
    if not csvs:
        csvs = [r for r in resources if r.get("format", "").upper() == "CSV"]
    if not csvs:
        raise RuntimeError("No CSV resources found in Job Bank dataset")
    csvs.sort(key=lambda r: r.get("last_modified", ""), reverse=True)
    latest = csvs[0]
    # Use URL as ref key (contains mon+year like 'jan2026') with last_modified fallback
    ref_key = latest["url"] + " " + latest.get("last_modified", "")
    return latest["url"], ref_key


def aggregate_postings_by_noc(csv_bytes: bytes) -> dict:
    """Sum Vacancy Count by NOC 2016 Code from a Job Bank monthly CSV.

    The CSV is UTF-16LE tab-delimited with 65 columns.
    We use 'NOC 2016 Code' (4-digit, matches our NOC corpus) and
    sum 'Vacancy Count' per code.
    """
    result = {}
    text = csv_bytes.decode("utf-16-le", errors="replace")
    reader = csv.DictReader(io.StringIO(text), delimiter="\t")
    for row in reader:
        noc = (row.get("NOC 2016 Code") or "").strip()
        if not noc or noc in ("NA", "*No data"):
            continue
        raw = (row.get("Vacancy Count") or "").strip()
        try:
            count = int(raw) if raw and raw not in ("NA", "*No data") else 1
        except ValueError:
            count = 1
        result[noc] = result.get(noc, 0) + count
    return result


_MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "oct": "10", "nov": "11", "dec": "12",
}


def extract_reference_month(filename: str):
    """Extract YYYY-MM from filenames like:
      - 'job-bank-open-data-all-job-postings-en-jan2026'  (open.canada.ca format)
      - 'JobBankPostings_2025-01.csv'                     (legacy format)
    Returns None if not found.
    """
    # Try YYYY-MM format first
    match = re.search(r"(\d{4}-\d{2})", filename)
    if match:
        return match.group(1)
    # Try mon+year format (e.g. jan2026, dec2025)
    match = re.search(r"([a-z]{3})(\d{4})", filename.lower())
    if match:
        mon, year = match.group(1), match.group(2)
        if mon in _MONTH_MAP:
            return f"{year}-{_MONTH_MAP[mon]}"
    return None


def main(dry_run: bool = False):
    db.init_db()

    logger.info("Fetching Job Bank dataset metadata from open.canada.ca...")
    try:
        download_url, resource_name = get_latest_resource(CKAN_API_URL)
    except Exception as exc:
        logger.error(f"CKAN API error: {exc}")
        sys.exit(1)

    reference_month = extract_reference_month(resource_name)
    if reference_month is None:
        logger.error(f"Could not extract reference month from resource name: {resource_name!r}")
        sys.exit(1)
    logger.info(f"Latest resource: {resource_name} (month: {reference_month})")

    # Check if we already have this month's data
    with db.db() as conn:
        existing = conn.execute(
            "SELECT reference_month FROM jobbank_postings ORDER BY rowid DESC LIMIT 1"
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
