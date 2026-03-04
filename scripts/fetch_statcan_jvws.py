#!/usr/bin/env python3
"""
Download Statistics Canada JVWS table 14-10-0441-01 and upsert vacancy rates
into the jvws_vacancies SQLite table.

Source: https://www150.statcan.gc.ca/t1/tbl1/en/dtbl/downloadGET?pid=1410044101
No API key required. Quarterly release.

Usage:
    python scripts/fetch_statcan_jvws.py
    python scripts/fetch_statcan_jvws.py --dry-run
"""

import csv
import io
import logging
import re
import sys
import zipfile
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent))
import db

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

JVWS_BULK_URL = "https://www150.statcan.gc.ca/t1/tbl1/en/dtbl/downloadGET?pid=1410044101"

# National employment estimates by 4-digit NOC for normalization (JVWS 2022 base).
# Used to convert vacancy count → vacancy rate. Updated annually.
NOC_EMPLOYMENT_BASE = {
    "7271": 45000, "7241": 72000, "7311": 28000, "7312": 21000,
    "7321": 88000, "7231": 18000, "7232": 6000, "7247": 14000,
    "8411": 12000, "8231": 8000, "8232": 15000,
    "1111": 95000, "1311": 125000, "1221": 82000, "1241": 180000,
    "2173": 110000, "2171": 65000, "2281": 48000,
    "3012": 310000, "3233": 55000, "3413": 145000,
    "4155": 18000, "4212": 88000, "0711": 42000,
}
DEFAULT_EMPLOYMENT = 30000  # fallback for NOC codes not in map


def parse_jvws_zip(zip_bytes: bytes) -> dict:
    """
    Parse JVWS bulk download ZIP. Returns {noc_code: vacancy_count}.
    Only keeps rows where UOM == "Number" and Wages contains "All wages".
    """
    result = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        # Find the data CSV (not the MetaData CSV)
        data_file = next(
            (n for n in zf.namelist() if n.endswith(".csv") and "MetaData" not in n),
            None,
        )
        if data_file is None:
            logger.warning("No data CSV found in JVWS ZIP")
            return result

        with zf.open(data_file) as f:
            reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
            for row in reader:
                # Only vacancy count rows (not wage rows)
                if row.get("UOM", "").strip() != "Number":
                    continue
                if "All wages" not in row.get("Wages", ""):
                    continue
                raw_value = row.get("VALUE", "").strip()
                if not raw_value:
                    continue
                # Extract 4-digit NOC from "7271 [Plumbers]" format
                noc_field = row.get("NOC", "")
                match = re.match(r"(\d{4})", noc_field.strip())
                if not match:
                    continue
                noc_code = match.group(1)
                try:
                    result[noc_code] = int(float(raw_value))
                except ValueError:
                    continue
    return result


def vacancies_to_rate(noc_code: str, vacancy_count: int) -> float:
    """Convert vacancy count to a 0-1 normalized vacancy rate."""
    employment = NOC_EMPLOYMENT_BASE.get(noc_code, DEFAULT_EMPLOYMENT)
    raw_rate = vacancy_count / employment
    VR_MIN, VR_MAX = 0.005, 0.08
    return min(max((raw_rate - VR_MIN) / (VR_MAX - VR_MIN), 0.0), 1.0)


def get_latest_reference_period(zip_bytes: bytes) -> str:
    """Extract the reference period (e.g. '2024-Q4') from the ZIP data."""
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        data_file = next(
            (n for n in zf.namelist() if n.endswith(".csv") and "MetaData" not in n),
            None,
        )
        if data_file is None:
            return "unknown"
        with zf.open(data_file) as f:
            reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
            for row in reader:
                date_str = row.get("REF_DATE", "")
                if date_str:
                    try:
                        from datetime import date
                        d = date.fromisoformat(date_str)
                        q = (d.month - 1) // 3 + 1
                        return f"{d.year}-Q{q}"
                    except ValueError:
                        return date_str
    return "unknown"


def main(dry_run: bool = False):
    db.init_db()

    # Check if we already have this quarter's data
    with db.db() as conn:
        existing = conn.execute(
            "SELECT reference_period FROM jvws_vacancies LIMIT 1"
        ).fetchone()

    logger.info("Downloading JVWS table 14-10-0441-01 from StatCan...")
    try:
        with httpx.Client(timeout=120, follow_redirects=True) as client:
            resp = client.get(JVWS_BULK_URL)
            resp.raise_for_status()
            zip_bytes = resp.content
    except Exception as exc:
        logger.error(f"Download failed: {exc}")
        sys.exit(1)

    reference_period = get_latest_reference_period(zip_bytes)
    logger.info(f"Reference period: {reference_period}")

    if existing and existing["reference_period"] == reference_period:
        logger.info(f"No new data (already have {reference_period}). Exiting.")
        return

    vacancies = parse_jvws_zip(zip_bytes)
    logger.info(f"Parsed {len(vacancies)} NOC vacancy counts from ZIP")

    if dry_run:
        for noc, count in sorted(vacancies.items(), key=lambda x: -x[1])[:5]:
            rate = vacancies_to_rate(noc, count)
            print(f"  {noc}: {count} vacancies → rate {rate:.3f}")
        return

    with db.db() as conn:
        for noc_code, vacancy_count in vacancies.items():
            rate = vacancies_to_rate(noc_code, vacancy_count)
            db.upsert_jvws(conn, noc_code, rate, reference_period)

    logger.info(f"Upserted {len(vacancies)} NOC codes into jvws_vacancies")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    main(dry_run=args.dry_run)
