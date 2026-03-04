# Resume Drop + Live Demand Signals — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the manual intake form with a resume upload that auto-extracts occupation data, and replace mocked demand scores with real Statistics Canada and Job Bank data refreshed via n8n.

**Architecture:** Next.js API route extracts resume text (unpdf/mammoth), Claude Haiku 4.5 returns structured JSON, Fuse.js matches the extracted title to a NOC code — pre-filling the existing form. Two new Python ETL scripts fetch real vacancy data (StatCan JVWS + Job Bank monthly CSV) and upsert into new SQLite tables; `engine/demand.py` blends them into a 0-1 signal replacing the mocked `0.75/0.40` binary. n8n workflows on the VPS automate monthly and quarterly refreshes.

**Tech Stack:** unpdf, mammoth, @anthropic-ai/sdk, fuse.js, zod-to-json-schema (web); httpx, csv, zipfile (engine); n8n SSH nodes (automation)

---

## Part A — Python Engine: Live Demand Signals

### Task 1: Add live demand tables to db.py

**Files:**
- Modify: `db.py` (in `init_db()`)
- Test: `tests/test_db_live_demand.py` (create)

**Step 1: Write the failing test**

```python
# tests/test_db_live_demand.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import sqlite3
import db


@pytest.fixture
def conn(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    db.init_db()
    with db.db() as c:
        yield c


def test_jvws_table_created(conn):
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='jvws_vacancies'"
    ).fetchone()
    assert row is not None


def test_jobbank_table_created(conn):
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='jobbank_postings'"
    ).fetchone()
    assert row is not None


def test_upsert_jvws(conn):
    db.upsert_jvws(conn, "7271", 0.065, "2024-Q4")
    row = conn.execute(
        "SELECT vacancy_rate, reference_period FROM jvws_vacancies WHERE noc_code='7271'"
    ).fetchone()
    assert row["vacancy_rate"] == pytest.approx(0.065)
    assert row["reference_period"] == "2024-Q4"


def test_upsert_jobbank(conn):
    db.upsert_jobbank(conn, "7241", 342, "2025-01")
    row = conn.execute(
        "SELECT posting_count FROM jobbank_postings WHERE noc_code='7241'"
    ).fetchone()
    assert row["posting_count"] == 342


def test_get_live_vacancy_signal_no_data_returns_none(conn):
    result = db.get_live_vacancy_data(conn, "9999")
    assert result == (None, None)


def test_get_live_vacancy_signal_returns_values(conn):
    db.upsert_jvws(conn, "7271", 0.05, "2024-Q4")
    db.upsert_jobbank(conn, "7271", 500, "2025-01")
    vr, count = db.get_live_vacancy_data(conn, "7271")
    assert vr == pytest.approx(0.05)
    assert count == 500
```

**Step 2: Run test to verify it fails**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge
python -m pytest tests/test_db_live_demand.py -v
```
Expected: FAIL — `AttributeError: module 'db' has no attribute 'upsert_jvws'`

**Step 3: Add tables and helpers to db.py**

In `init_db()`, add to the `executescript` string (after the `demand_signals` table):

```python
            CREATE TABLE IF NOT EXISTS jvws_vacancies (
                noc_code         TEXT PRIMARY KEY,
                vacancy_rate     REAL NOT NULL,
                reference_period TEXT NOT NULL,
                updated_at       TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS jobbank_postings (
                noc_code         TEXT PRIMARY KEY,
                posting_count    INTEGER NOT NULL,
                reference_month  TEXT NOT NULL,
                updated_at       TEXT DEFAULT (datetime('now'))
            );
```

At the end of `db.py`, add:

```python
def upsert_jvws(conn, noc_code: str, vacancy_rate: float, reference_period: str) -> None:
    conn.execute(
        """
        INSERT INTO jvws_vacancies (noc_code, vacancy_rate, reference_period)
        VALUES (?, ?, ?)
        ON CONFLICT(noc_code) DO UPDATE SET
            vacancy_rate=excluded.vacancy_rate,
            reference_period=excluded.reference_period,
            updated_at=datetime('now')
        """,
        (noc_code, vacancy_rate, reference_period),
    )


def upsert_jobbank(conn, noc_code: str, posting_count: int, reference_month: str) -> None:
    conn.execute(
        """
        INSERT INTO jobbank_postings (noc_code, posting_count, reference_month)
        VALUES (?, ?, ?)
        ON CONFLICT(noc_code) DO UPDATE SET
            posting_count=excluded.posting_count,
            reference_month=excluded.reference_month,
            updated_at=datetime('now')
        """,
        (noc_code, posting_count, reference_month),
    )


def get_live_vacancy_data(conn, noc_code: str) -> tuple[float | None, int | None]:
    """Return (jvws_vacancy_rate, jobbank_posting_count) or (None, None) if no data."""
    vr_row = conn.execute(
        "SELECT vacancy_rate FROM jvws_vacancies WHERE noc_code=?", (noc_code,)
    ).fetchone()
    jb_row = conn.execute(
        "SELECT posting_count FROM jobbank_postings WHERE noc_code=?", (noc_code,)
    ).fetchone()
    return (
        vr_row["vacancy_rate"] if vr_row else None,
        jb_row["posting_count"] if jb_row else None,
    )
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_db_live_demand.py -v
```
Expected: 6 tests PASS

**Step 5: Run existing tests to confirm no regressions**

```bash
python -m pytest tests/ -v
```
Expected: All tests pass.

**Step 6: Commit**

```bash
git add db.py tests/test_db_live_demand.py
git commit -m "feat: add jvws_vacancies and jobbank_postings tables to db"
```

---

### Task 2: Create `scripts/fetch_statcan_jvws.py`

**Files:**
- Create: `scripts/fetch_statcan_jvws.py`
- Test: `tests/test_fetch_jvws.py` (create)

**Step 1: Write the failing test**

```python
# tests/test_fetch_jvws.py
"""Tests for JVWS ETL script. Uses mocking — no real HTTP calls."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import io
import zipfile
import csv
from unittest.mock import patch, MagicMock
import db
from scripts.fetch_statcan_jvws import parse_jvws_zip, noc4_to_noc_map


def make_zip_with_csv(csv_content: str) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("14100441-eng.csv", csv_content)
    return buf.getvalue()


SAMPLE_CSV = """\
"REF_DATE","GEO","DGUID","NOC","Wages","Job vacancies","UOM","UOM_ID","SCALAR_FACTOR","SCALAR_ID","VECTOR","COORDINATE","VALUE","STATUS","SYMBOL","TERMINATED","DECIMALS"
"2024-10-01","Canada","2016A000011124","7271 [Plumbers]","All wages","Job vacancies (number)","Number","223","units","0","v123","1.2","350","","","",""
"2024-10-01","Canada","2016A000011124","7271 [Plumbers]","Median offered hourly wage","Job vacancies (number)","Dollars","81","units","0","v124","1.3","35.50","","","",""
"2024-10-01","Canada","2016A000011124","7241 [Electricians]","All wages","Job vacancies (number)","Number","223","units","0","v125","1.4","420","","","",""
"""


def test_parse_jvws_zip_extracts_vacancy_counts():
    zip_bytes = make_zip_with_csv(SAMPLE_CSV)
    result = parse_jvws_zip(zip_bytes)
    # 7271 and 7241 should be found
    assert "7271" in result
    assert "7241" in result
    # Values are vacancy counts as integers
    assert result["7271"] == 350
    assert result["7241"] == 420


def test_parse_jvws_zip_ignores_wage_rows():
    zip_bytes = make_zip_with_csv(SAMPLE_CSV)
    result = parse_jvws_zip(zip_bytes)
    # Should only have one entry per NOC (the vacancy count, not the wage row)
    assert len(result) == 2


def test_parse_jvws_zip_empty_csv():
    header_only = '"REF_DATE","GEO","DGUID","NOC","Wages","Job vacancies","UOM","UOM_ID","SCALAR_FACTOR","SCALAR_ID","VECTOR","COORDINATE","VALUE","STATUS","SYMBOL","TERMINATED","DECIMALS"\n'
    zip_bytes = make_zip_with_csv(header_only)
    result = parse_jvws_zip(zip_bytes)
    assert result == {}
```

**Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_fetch_jvws.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.fetch_statcan_jvws'`

**Step 3: Create `scripts/fetch_statcan_jvws.py`**

```python
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
import json
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
# Source: StatCan JVWS documentation. Used to compute vacancy RATE from count.
# Updated annually — good enough for MVP normalization.
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


def parse_jvws_zip(zip_bytes: bytes) -> dict[str, int]:
    """
    Parse JVWS bulk download ZIP. Returns {noc_code: vacancy_count}.
    Only keeps rows where Wages == "All wages" and UOM == "Number".
    """
    result = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        # Find the data CSV (not the metadata CSV)
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
    # Normalize: 0.5% → 0.0, 8%+ → 1.0
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
                    # Convert "2024-10-01" → "2024-Q4"
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

    logger.info(f"Downloading JVWS table 14-10-0441-01 from StatCan...")
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
        for noc, count in list(vacancies.items())[:5]:
            rate = vacancies_to_rate(noc, count)
            print(f"  {noc}: {count} vacancies → rate {rate:.3f}")
        return

    with db.db() as conn:
        updated = 0
        for noc_code, vacancy_count in vacancies.items():
            rate = vacancies_to_rate(noc_code, vacancy_count)
            db.upsert_jvws(conn, noc_code, rate, reference_period)
            updated += 1

    logger.info(f"Upserted {updated} NOC codes into jvws_vacancies")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    main(dry_run=args.dry_run)
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_fetch_jvws.py -v
```
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add scripts/fetch_statcan_jvws.py tests/test_fetch_jvws.py
git commit -m "feat: add fetch_statcan_jvws ETL script"
```

---

### Task 3: Create `scripts/fetch_jobbank_monthly.py`

**Files:**
- Create: `scripts/fetch_jobbank_monthly.py`
- Test: `tests/test_fetch_jobbank.py` (create)

**Step 1: Write the failing test**

```python
# tests/test_fetch_jobbank.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import io
import csv
from scripts.fetch_jobbank_monthly import aggregate_postings_by_noc, extract_reference_month


SAMPLE_CSV_ROWS = [
    {"noc": "7271", "num_vacancies": "3", "employment_terms": "Permanent"},
    {"noc": "7271", "num_vacancies": "1", "employment_terms": "Seasonal"},
    {"noc": "7241", "num_vacancies": "5", "employment_terms": "Permanent"},
    {"noc": "", "num_vacancies": "2", "employment_terms": "Permanent"},
    {"noc": "7241", "num_vacancies": "", "employment_terms": "Permanent"},
]


def make_csv_bytes(rows: list[dict]) -> bytes:
    buf = io.StringIO()
    if rows:
        writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    return buf.getvalue().encode()


def test_aggregate_sums_by_noc():
    csv_bytes = make_csv_bytes(SAMPLE_CSV_ROWS)
    result = aggregate_postings_by_noc(csv_bytes)
    assert result["7271"] == 4   # 3 + 1
    assert result["7241"] == 5   # only the non-empty row


def test_aggregate_skips_empty_noc():
    csv_bytes = make_csv_bytes(SAMPLE_CSV_ROWS)
    result = aggregate_postings_by_noc(csv_bytes)
    assert "" not in result


def test_aggregate_skips_empty_vacancies():
    csv_bytes = make_csv_bytes(SAMPLE_CSV_ROWS)
    result = aggregate_postings_by_noc(csv_bytes)
    # 7241 has 2 rows: one with "5", one with ""; only "5" is counted
    assert result["7241"] == 5


def test_extract_reference_month_from_filename():
    assert extract_reference_month("JobBankPostings_2025-01.csv") == "2025-01"
    assert extract_reference_month("some_file.csv") is None
```

**Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_fetch_jobbank.py -v
```
Expected: FAIL

**Step 3: Create `scripts/fetch_jobbank_monthly.py`**

```python
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
import json
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


def get_latest_resource(ckan_url: str) -> tuple[str, str]:
    """Return (download_url, resource_name) for the most recent monthly CSV."""
    with httpx.Client(timeout=30) as client:
        resp = client.get(ckan_url)
        resp.raise_for_status()
    data = resp.json()
    resources = data["result"]["resources"]
    # Filter to CSV resources, sort by last_modified descending
    csvs = [r for r in resources if r.get("format", "").upper() == "CSV"]
    if not csvs:
        raise RuntimeError("No CSV resources found in Job Bank dataset")
    csvs.sort(key=lambda r: r.get("last_modified", ""), reverse=True)
    latest = csvs[0]
    return latest["url"], latest["name"]


def aggregate_postings_by_noc(csv_bytes: bytes) -> dict[str, int]:
    """Sum num_vacancies by noc from a Job Bank monthly CSV."""
    result: dict[str, int] = {}
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


def extract_reference_month(filename: str) -> str | None:
    """Extract YYYY-MM from a filename like 'JobBankPostings_2025-01.csv'."""
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
```

**Step 4: Run tests to verify they pass**

```bash
python -m pytest tests/test_fetch_jobbank.py -v
```
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add scripts/fetch_jobbank_monthly.py tests/test_fetch_jobbank.py
git commit -m "feat: add fetch_jobbank_monthly ETL script"
```

---

### Task 4: Update `engine/demand.py` with live vacancy signal

**Files:**
- Modify: `engine/demand.py`
- Test: `tests/test_demand_live.py` (create)

**Step 1: Write the failing test**

```python
# tests/test_demand_live.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from unittest.mock import patch
from engine.demand import get_vacancy_signal, SEASONAL_WEIGHT


def test_vacancy_signal_falls_back_to_static_when_no_data():
    with patch("engine.demand._read_live_vacancy_data", return_value=(None, None)):
        # 7271 is in COPS_SHORTAGE_CODES → static fallback = 0.75
        result = get_vacancy_signal("7271")
        assert result == pytest.approx(0.75)


def test_vacancy_signal_falls_back_for_non_shortage():
    with patch("engine.demand._read_live_vacancy_data", return_value=(None, None)):
        result = get_vacancy_signal("1234")
        assert result == pytest.approx(0.40)


def test_vacancy_signal_uses_live_data():
    # High JVWS rate + high job bank count → should give high signal
    with patch("engine.demand._read_live_vacancy_data", return_value=(0.08, 1000)):
        with patch("engine.demand._log_normalize_jobbank", return_value=1.0):
            result = get_vacancy_signal("7271", month=6)  # summer, no seasonal adj
            # 0.65 * 1.0 (vr normalized = 1.0 at 8%) + 0.35 * 1.0 = 1.0
            assert result == pytest.approx(1.0)


def test_vacancy_signal_clamped_to_01():
    with patch("engine.demand._read_live_vacancy_data", return_value=(0.20, 9999)):
        result = get_vacancy_signal("7271", month=6)
        assert 0.0 <= result <= 1.0


def test_seasonal_weight_applied_to_trades_in_winter():
    with patch("engine.demand._read_live_vacancy_data", return_value=(0.04, 300)):
        result_jan = get_vacancy_signal("7271", month=1)   # winter
        result_jun = get_vacancy_signal("7271", month=6)   # summer
        # January gets 1.25× seasonal multiplier
        assert result_jan > result_jun


def test_seasonal_weight_not_applied_to_non_trades():
    with patch("engine.demand._read_live_vacancy_data", return_value=(0.04, 300)):
        result_jan = get_vacancy_signal("1311", month=1)   # business, no seasonal
        result_jun = get_vacancy_signal("1311", month=6)
        assert result_jan == pytest.approx(result_jun)


def test_seasonal_weight_dict_has_12_months():
    assert set(SEASONAL_WEIGHT.keys()) == set(range(1, 13))
```

**Step 2: Run tests to verify they fail**

```bash
python -m pytest tests/test_demand_live.py -v
```
Expected: FAIL — `ImportError: cannot import name 'get_vacancy_signal'`

**Step 3: Update `engine/demand.py`**

Replace the existing `fetch_job_bank_vacancy_ratio` function and add the new helpers. The complete replacement section (after the `_broad_cat` function) is:

```python
import math
from datetime import date as _date

# Seasonal correction for trades (NOC 7xxx) and natural resources (NOC 8xxx).
# Multiplies the blended vacancy signal to correct for construction seasonality.
# December and January have the fewest postings but structural demand is unchanged.
SEASONAL_WEIGHT: dict[int, float] = {
    1: 1.25, 2: 1.20, 3: 1.10,
    4: 1.00, 5: 1.00, 6: 1.00,
    7: 1.00, 8: 1.00, 9: 1.00,
    10: 1.05, 11: 1.15, 12: 1.25,
}

_VR_MIN = 0.005   # 0.5% vacancy rate → score 0.0
_VR_MAX = 0.08    # 8.0% vacancy rate → score 1.0


def _normalize_vr(vr: float) -> float:
    return min(max((vr - _VR_MIN) / (_VR_MAX - _VR_MIN), 0.0), 1.0)


def _log_normalize_jobbank(posting_count: int, max_count: int = 5000) -> float:
    """Log-normalize a posting count to [0, 1]. max_count is the assumed universe max."""
    if posting_count <= 0:
        return 0.0
    log_val = math.log(1 + posting_count)
    log_max = math.log(1 + max_count)
    return min(log_val / log_max, 1.0)


def _read_live_vacancy_data(noc_code: str) -> tuple[float | None, int | None]:
    """Read live JVWS and Job Bank data from SQLite. Returns (vr, posting_count)."""
    try:
        import db
        with db.db() as conn:
            return db.get_live_vacancy_data(conn, noc_code)
    except Exception as exc:
        logger.debug(f"Live vacancy data unavailable for {noc_code}: {exc}")
        return None, None


def get_vacancy_signal(noc_code: str, month: int | None = None) -> float:
    """
    Return a 0-1 vacancy demand signal for a NOC code.

    Priority: live JVWS + Job Bank data → static COPS fallback.
    Applies seasonal correction for trades (7xxx) and natural resources (8xxx).
    """
    if month is None:
        month = _date.today().month

    vr, posting_count = _read_live_vacancy_data(noc_code)

    if vr is None and posting_count is None:
        # Static fallback (original behaviour)
        return 0.75 if noc_code in COPS_SHORTAGE_CODES else 0.40

    vr_score = _normalize_vr(vr) if vr is not None else 0.5
    jb_score = _log_normalize_jobbank(posting_count) if posting_count is not None else 0.5

    signal = 0.65 * vr_score + 0.35 * jb_score

    # Apply seasonal correction only for trades and natural resources
    if noc_code and noc_code[0] in ("7", "8"):
        signal *= SEASONAL_WEIGHT.get(month, 1.0)

    return min(max(signal, 0.0), 1.0)
```

Also update `build_demand_signal` to use `get_vacancy_signal` instead of the old mock. Replace the line:

```python
    sig.vacancy_rate = vacancy_rate if vacancy_rate is not None else (
        0.75 if noc_code in COPS_SHORTAGE_CODES else 0.40
    )
```

With:

```python
    sig.vacancy_rate = vacancy_rate if vacancy_rate is not None else get_vacancy_signal(noc_code)
```

Remove the now-unused `fetch_job_bank_vacancy_ratio` async function and the `import httpx` at the top (check if httpx is used elsewhere first — it is not).

**Step 4: Run tests**

```bash
python -m pytest tests/test_demand_live.py tests/test_matcher.py -v
```
Expected: All PASS

**Step 5: Commit**

```bash
git add engine/demand.py tests/test_demand_live.py
git commit -m "feat: replace mocked vacancy signal with live JVWS+JobBank blend"
```

---

### Task 5: Update Makefile with new ETL targets

**Files:**
- Modify: `Makefile`

**Step 1: Open Makefile**

Current targets: `install ingest seed embed embed-full demand setup test run run-prod`

**Step 2: Add new targets** — add after the `demand` target:

```makefile
fetch-jvws:
	python3 scripts/fetch_statcan_jvws.py

fetch-jobbank:
	python3 scripts/fetch_jobbank_monthly.py

update-demand: fetch-jobbank fetch-jvws demand
	@echo "Demand signals updated from live sources."

build-noc-corpus:
	python3 scripts/build_noc_corpus.py
```

Also update the `.PHONY` line to include the new targets:

```makefile
.PHONY: install ingest seed embed embed-full demand fetch-jvws fetch-jobbank update-demand build-noc-corpus test run run-prod
```

**Step 3: Test**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge
make --dry-run update-demand
```
Expected: prints the three commands without executing them.

**Step 4: Commit**

```bash
git add Makefile
git commit -m "feat: add update-demand and fetch-jvws/jobbank Makefile targets"
```

---

### Task 6: Build NOC titles corpus JSON for Fuse.js

**Files:**
- Create: `scripts/build_noc_corpus.py`
- Output: `../skillforge-web/public/noc-titles.json`

**Step 1: Understand the goal**

The Fuse.js matcher in the Next.js app needs a JSON file like:
```json
[
  { "code": "7271", "title": "Plumbers" },
  { "code": "7241", "title": "Electricians (except industrial and power system)" },
  ...
]
```

The script builds this from `seed_occupations.py` data (immediate, always works), and optionally enriches it with the full NOC 2021 elements CSV from StatCan (30k entries, best for coverage).

**Step 2: Create `scripts/build_noc_corpus.py`**

```python
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
        # Try to parse as ZIP first, then as direct CSV
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
            # Not a ZIP, try direct CSV
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
```

**Step 3: Run it to generate the corpus**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge
python scripts/build_noc_corpus.py --seed-only
```
Expected: Creates `/Volumes/SanDisk/dev/projects/skillforge-web/public/noc-titles.json` with 39 entries. Also try without `--seed-only` to attempt the full StatCan download.

**Step 4: Verify the output**

```bash
python -c "import json; d=json.load(open('../skillforge-web/public/noc-titles.json')); print(len(d), 'entries'); print(d[:3])"
```
Expected: `39 entries` (seed) or `1000+` entries (StatCan), followed by sample entries.

**Step 5: Commit**

```bash
git add scripts/build_noc_corpus.py
git commit -m "feat: add build_noc_corpus script for Fuse.js NOC matching corpus"
```

---

## Part B — Next.js Web: Resume Upload + AI Extraction

### Task 7: Install dependencies

**Files:**
- Modify: `skillforge-web/package.json`

**Step 1: Install new packages**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge-web
npm install unpdf mammoth @anthropic-ai/sdk fuse.js zod-to-json-schema
npm install --save-dev @types/mammoth
```

**Step 2: Verify installations**

```bash
node -e "require('unpdf'); require('mammoth'); require('@anthropic-ai/sdk'); require('fuse.js'); require('zod-to-json-schema'); console.log('all ok')"
```
Expected: `all ok`

**Step 3: Add ANTHROPIC_API_KEY to .env.local**

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> /Volumes/SanDisk/dev/projects/skillforge-web/.env.local
```
Replace `sk-ant-...` with your actual key. The key must have access to `claude-haiku-4-5-20251001`.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add unpdf mammoth anthropic fuse.js zod-to-json-schema dependencies"
```

---

### Task 8: Create `/api/parse-resume` route

**Files:**
- Create: `skillforge-web/app/api/parse-resume/route.ts`

This is a Next.js App Router API route. There is no test framework set up; test manually with curl after creation.

**Step 1: Create the file**

```typescript
// app/api/parse-resume/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const ResumeSchema = z.object({
  currentTitle: z.string().describe("The person's most recent job title"),
  yearsExperience: z.number().int().min(0).max(50).describe("Total years of professional experience"),
  skills: z.array(z.string()).max(20).describe("Key professional skills extracted from resume"),
});

type ResumeData = z.infer<typeof ResumeSchema>;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const uint8 = new Uint8Array(buffer);
  const { text } = await extractText(uint8, { mergePages: true });
  return text;
}

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value;
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("resume") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
  }

  // Validate file type and size (max 5 MB)
  const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
    return NextResponse.json({ error: "Only PDF and DOCX files are supported" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  // Extract text
  let resumeText: string;
  try {
    const buffer = await file.arrayBuffer();
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    resumeText = isPdf
      ? await extractTextFromPdf(buffer)
      : await extractTextFromDocx(buffer);
  } catch (err) {
    console.error("Text extraction failed:", err);
    return NextResponse.json({ error: "Could not read file. Ensure it is a valid PDF or DOCX." }, { status: 422 });
  }

  if (resumeText.trim().length < 50) {
    return NextResponse.json({ error: "Resume appears to be empty or unreadable." }, { status: 422 });
  }

  // Truncate to first 6000 chars (enough for Haiku, avoids token waste)
  const truncated = resumeText.slice(0, 6000);

  // Call Claude Haiku with forced tool use (structured output)
  const toolSchema = zodToJsonSchema(ResumeSchema, { $refStrategy: "none" });
  let extracted: ResumeData;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Extract structured information from this resume. Be conservative: if years of experience is unclear, estimate from work history.\n\n---\n${truncated}\n---`,
        },
      ],
      tools: [
        {
          name: "extract_resume",
          description: "Extract structured resume data",
          input_schema: toolSchema as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: "extract_resume" },
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("No tool_use block in response");
    }
    extracted = ResumeSchema.parse(toolUse.input);
  } catch (err) {
    console.error("Claude extraction failed:", err);
    return NextResponse.json({ error: "Could not extract resume data. Please fill in the form manually." }, { status: 422 });
  }

  return NextResponse.json(extracted);
}
```

**Step 2: Test manually with curl**

Start the dev server first: `npm run dev`

```bash
# Create a simple test PDF (or use any real PDF/DOCX)
curl -X POST http://localhost:3000/api/parse-resume \
  -F "resume=@/path/to/test-resume.pdf" | python -m json.tool
```
Expected response:
```json
{
  "currentTitle": "...",
  "yearsExperience": 5,
  "skills": ["...", "..."]
}
```

**Step 3: Commit**

```bash
git add app/api/parse-resume/route.ts
git commit -m "feat: add /api/parse-resume route with Claude Haiku structured extraction"
```

---

### Task 9: Create `lib/noc-matcher.ts` with Fuse.js

**Files:**
- Create: `skillforge-web/lib/noc-matcher.ts`

This replaces the simple dictionary in `noc-lookup.ts` with Fuse.js fuzzy matching.

**Step 1: Create `lib/noc-matcher.ts`**

```typescript
// lib/noc-matcher.ts
// Fuse.js fuzzy NOC matching against the corpus built by scripts/build_noc_corpus.py
// Falls back to the existing NOC_LOOKUP dictionary if corpus is not loaded.

import Fuse from "fuse.js";
import { NOC_LOOKUP } from "./noc-lookup"; // keep as fallback

export interface NocMatch {
  code: string;
  title: string;
  score: number; // 0 = perfect, 1 = worst
}

interface NocEntry {
  code: string;
  title: string;
}

let _fuse: Fuse<NocEntry> | null = null;
let _loading = false;
let _loadPromise: Promise<void> | null = null;

async function loadCorpus(): Promise<void> {
  if (_fuse || _loading) return;
  _loading = true;
  try {
    const resp = await fetch("/noc-titles.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const entries: NocEntry[] = await resp.json();
    _fuse = new Fuse(entries, {
      keys: ["title"],
      threshold: 0.4,        // 0 = exact, 1 = match anything
      distance: 100,
      minMatchCharLength: 3,
      includeScore: true,
    });
  } catch (err) {
    console.warn("NOC corpus not loaded, will use dictionary fallback:", err);
  } finally {
    _loading = false;
  }
}

// Eagerly start loading on module import
_loadPromise = loadCorpus();

export async function matchNoc(title: string, topK = 3): Promise<NocMatch[]> {
  await _loadPromise;

  const query = title.trim();
  if (!query) return [];

  if (_fuse) {
    const results = _fuse.search(query, { limit: topK });
    return results.map((r) => ({
      code: r.item.code,
      title: r.item.title,
      score: r.score ?? 1,
    }));
  }

  // Fallback to existing dictionary
  const key = query.toLowerCase();
  const exact = NOC_LOOKUP[key];
  if (exact) return [{ code: exact.code, title: exact.title, score: 0 }];
  for (const [k, v] of Object.entries(NOC_LOOKUP)) {
    if (key.includes(k) || k.includes(key)) {
      return [{ code: v.code, title: v.title, score: 0.3 }];
    }
  }
  return [];
}

export function matchNocSync(title: string): NocMatch | null {
  // Synchronous fallback using dictionary only — for use before corpus loads
  const key = title.toLowerCase().trim();
  if (NOC_LOOKUP[key]) {
    return { code: NOC_LOOKUP[key].code, title: NOC_LOOKUP[key].title, score: 0 };
  }
  for (const [k, v] of Object.entries(NOC_LOOKUP)) {
    if (key.includes(k) || k.includes(key)) {
      return { code: v.code, title: v.title, score: 0.3 };
    }
  }
  return null;
}
```

**Step 2: Verify it compiles**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge-web
npx tsc --noEmit
```
Expected: No errors.

**Step 3: Commit**

```bash
git add lib/noc-matcher.ts
git commit -m "feat: add Fuse.js NOC matcher with dictionary fallback"
```

---

### Task 10: Update `components/IntakeForm.tsx` with resume upload

**Files:**
- Modify: `skillforge-web/components/IntakeForm.tsx`

**Step 1: Read the current IntakeForm.tsx**

Already read above. Key state: `jobTitle`, `nocHint`, `form`.

**Step 2: Write the updated component**

Replace the entire contents of `components/IntakeForm.tsx`:

```tsx
// components/IntakeForm.tsx
"use client";
import { useState, useRef } from "react";
import { matchNoc, matchNocSync } from "@/lib/noc-matcher";
import type { IntakeFormData } from "@/types/skillforge";

interface Props {
  onSubmit: (data: IntakeFormData) => void;
  loading: boolean;
}

type UploadState = "idle" | "parsing" | "done" | "error";

export function IntakeForm({ onSubmit, loading }: Props) {
  const [jobTitle, setJobTitle] = useState("");
  const [nocHint, setNocHint] = useState<string | null>(null);
  const [selectedNoc, setSelectedNoc] = useState<string>("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Omit<IntakeFormData, "jobTitle" | "noc">>({
    province: "ON",
    yearsExperience: 5,
    isYouth: false,
    isNewcomer: false,
    isIndigenous: false,
    isVisibleMinority: false,
    isDisability: false,
    isEiEligible: null,
  });

  const handleTitleChange = async (v: string) => {
    setJobTitle(v);
    const syncMatch = matchNocSync(v);
    if (syncMatch) {
      setNocHint(`→ NOC ${syncMatch.code}: ${syncMatch.title}`);
      setSelectedNoc(syncMatch.code);
    } else {
      setNocHint(null);
      setSelectedNoc("");
    }
    // Async Fuse.js match (will update if corpus is loaded)
    const matches = await matchNoc(v, 1);
    if (matches.length > 0) {
      setNocHint(`→ NOC ${matches[0].code}: ${matches[0].title}`);
      setSelectedNoc(matches[0].code);
    }
  };

  const handleResumeUpload = async (file: File) => {
    setUploadState("parsing");
    setUploadError(null);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const resp = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const data = await resp.json();

      // Pre-populate form fields
      if (data.currentTitle) {
        await handleTitleChange(data.currentTitle);
        setJobTitle(data.currentTitle);
      }
      if (typeof data.yearsExperience === "number") {
        setForm((f) => ({ ...f, yearsExperience: data.yearsExperience }));
      }
      setUploadState("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not parse resume";
      setUploadError(msg);
      setUploadState("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleResumeUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleResumeUpload(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      jobTitle,
      noc: selectedNoc,
      ...form,
    });
  };

  const toggle = (field: "isYouth" | "isNewcomer" | "isIndigenous" | "isVisibleMinority" | "isDisability") =>
    setForm((f) => ({ ...f, [field]: !f[field] }));

  const PROVINCES = ["ON","BC","AB","QC","MB","SK","NS","NB","NL","PE","NT","NU","YT"];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-900">SkillForge Intake</h1>

      {/* Resume upload */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
        {uploadState === "idle" && (
          <>
            <p className="text-sm font-medium text-gray-700">Drop your resume here</p>
            <p className="text-xs text-gray-500 mt-1">PDF or DOCX — fields will auto-fill</p>
          </>
        )}
        {uploadState === "parsing" && (
          <p className="text-sm text-blue-600">Parsing resume…</p>
        )}
        {uploadState === "done" && (
          <p className="text-sm text-green-600">Resume parsed — review fields below</p>
        )}
        {uploadState === "error" && (
          <p className="text-sm text-red-600">{uploadError}</p>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs text-gray-400">
          <span className="bg-white px-2">or fill in manually</span>
        </div>
      </div>

      {/* Job title */}
      <div>
        <label htmlFor="jobTitle" className="block text-sm font-medium mb-1">Current job title *</label>
        <input
          id="jobTitle"
          required
          value={jobTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. Financial Analyst, Software Developer"
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {nocHint && <p className="text-xs text-blue-600 mt-1">{nocHint}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="province" className="block text-sm font-medium mb-1">Province</label>
          <select
            id="province"
            value={form.province}
            onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="yearsExp" className="block text-sm font-medium mb-1">Years experience</label>
          <input
            id="yearsExp"
            type="number" min={0} max={40}
            value={form.yearsExperience}
            onChange={(e) => setForm((f) => ({ ...f, yearsExperience: Number(e.target.value) }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium mb-2">Priority groups (check all that apply)</legend>
        <div className="space-y-2">
          {[
            ["isYouth", "Youth (age 15-29)"],
            ["isNewcomer", "Newcomer to Canada (<5 years)"],
            ["isIndigenous", "Indigenous"],
            ["isVisibleMinority", "Visible minority"],
            ["isDisability", "Person with disability"],
          ].map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form[field as keyof typeof form] as boolean}
                onChange={() => toggle(field as "isYouth" | "isNewcomer" | "isIndigenous" | "isVisibleMinority" | "isDisability")}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label id="eiGroup" className="block text-sm font-medium mb-1">EI eligible?</label>
        <div aria-labelledby="eiGroup" className="flex gap-4">
          {[["yes", true], ["no", false], ["unknown", null]].map(([label, val]) => (
            <label key={String(label)} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="radio"
                name="ei"
                checked={form.isEiEligible === val}
                onChange={() => setForm((f) => ({ ...f, isEiEligible: val as boolean | null }))}
              />
              {String(label).charAt(0).toUpperCase() + String(label).slice(1)}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !jobTitle}
        className="w-full bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
      >
        {loading ? "Matching…" : "Find Trade Pathways →"}
      </button>
    </form>
  );
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge-web
npx tsc --noEmit
```
Expected: No errors.

**Step 4: Manual browser test**

```bash
npm run dev
```
Open http://localhost:3000. Verify:
- Resume drop zone renders above the divider
- Uploading a PDF/DOCX auto-populates the job title and years experience fields
- NOC hint appears below the job title
- Manual form entry still works without uploading a resume
- Submit still works as before

**Step 5: Commit**

```bash
git add components/IntakeForm.tsx lib/noc-matcher.ts
git commit -m "feat: add resume drop zone with Claude Haiku auto-fill to IntakeForm"
```

---

### Task 11: Build and deploy to VPS

**Step 1: Ensure ANTHROPIC_API_KEY is set on VPS**

```bash
ssh vps "grep ANTHROPIC_API_KEY /projets/skillforge-web/.env.local || echo 'MISSING'"
```
If missing:
```bash
ssh vps "echo 'ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE' >> /projets/skillforge-web/.env.local"
```

**Step 2: Sync the noc-titles.json corpus to VPS**

The corpus file lives in `skillforge-web/public/` and is synced as part of the code.

**Step 3: Sync code and rebuild on VPS**

```bash
# From local machine
rsync -avz --exclude node_modules --exclude .next \
  /Volumes/SanDisk/dev/projects/skillforge-web/ \
  vps:/projets/skillforge-web/

rsync -avz --exclude __pycache__ --exclude venv --exclude data \
  /Volumes/SanDisk/dev/projects/skillforge/ \
  vps:/projets/skillforge-engine/
```

**Step 4: Run DB migration and rebuild on VPS**

```bash
ssh vps "cd /projets/skillforge-engine && \
  source venv/bin/activate && \
  python db.py 2>/dev/null || python -c 'import db; db.init_db(); print(\"DB migrated\")' && \
  cd /projets/skillforge-web && \
  ENGINE_URL=http://localhost:8001 npm run build"
```

**Step 5: Restart services**

```bash
ssh vps "sudo systemctl restart skillforge-web skillforge-engine"
ssh vps "sudo systemctl status skillforge-web skillforge-engine --no-pager"
```

**Step 6: Smoke test**

```bash
curl -I https://skillforge.qualiaai.fr
```
Expected: HTTP 200. Open the site in a browser and test resume upload end-to-end.

---

## Part C — n8n Automation

### Task 12: n8n Monthly Job Bank Workflow

**Step 1: Open n8n at https://n8n.qualiaai.fr**

**Step 2: Create a new workflow named "SkillForge — Monthly Job Bank Refresh"**

**Step 3: Add nodes in this order**

Node 1 — **Schedule Trigger**
- Trigger type: Cron
- Cron expression: `0 6 5 * *` (6:00 AM on the 5th of each month)

Node 2 — **SSH node** (Execute Command)
- Host: `82.25.112.7`
- Username: `deploy`
- Authentication: Private Key (paste contents of `~/.ssh/id_ed25519_new`)
- Command:
```bash
cd /projets/skillforge-engine && source venv/bin/activate && python scripts/fetch_jobbank_monthly.py 2>&1
```

Node 3 — **SSH node** (Execute Command) — runs only if Node 2 succeeds
- Same SSH credentials
- Command:
```bash
cd /projets/skillforge-engine && source venv/bin/activate && python scripts/seed_demand.py 2>&1
```

Node 4 — **If node** — check for errors
- Condition: `{{ $node["SSH Node 2"].json.stderr }}` is empty

Node 5 (success path) — **Send notification** (email or Slack)
- Subject: `SkillForge: Job Bank refresh complete`
- Body: `Job Bank data updated successfully on {{ $now }}`

Node 6 (error path) — **Send notification**
- Subject: `SkillForge: Job Bank refresh FAILED`
- Body: `Error: {{ $node["SSH Node 2"].json.stderr }}`

**Step 4: Save and activate the workflow**

**Step 5: Test manually**

Click "Execute Workflow" in n8n. Check that:
- SSH command runs without error
- `jobbank_postings` table has new rows (check via: `ssh vps "cd /projets/skillforge-engine && sqlite3 data/skillforge.db 'SELECT COUNT(*) FROM jobbank_postings'"`)

---

### Task 13: n8n Quarterly JVWS Workflow

**Step 1: Create a new workflow named "SkillForge — Quarterly JVWS Refresh"**

**Step 2: Add nodes**

Node 1 — **Schedule Trigger**
- Cron: `0 7 6 * *` (7:00 AM on the 6th of each month — day after Job Bank)

Node 2 — **SSH node**
- Same credentials
- Command (the script exits 0 with "no new data" if nothing changed):
```bash
cd /projets/skillforge-engine && source venv/bin/activate && python scripts/fetch_statcan_jvws.py 2>&1
```

Node 3 — **If node**
- Condition: `{{ $node["SSH JVWS"].json.stdout }}` contains `"no new data"` → skip seed_demand

Node 4 (new data path) — **SSH node**
```bash
cd /projets/skillforge-engine && source venv/bin/activate && python scripts/seed_demand.py 2>&1
```

Node 5 — **Send notification**
- If new data: `JVWS updated — demand signals reseeded`
- If no new data: skip (or send silent success)

**Step 3: Save and activate**

**Step 4: Test**

Click "Execute Workflow". Verify the fetch script runs and returns either "no new data" or updates `jvws_vacancies`.

---

## Deployment Checklist

Before marking the feature complete, verify:

- [ ] `python -m pytest tests/ -v` — all tests pass (engine)
- [ ] `npx tsc --noEmit` — no TypeScript errors (web)
- [ ] Resume PDF upload → form auto-populates on https://skillforge.qualiaai.fr
- [ ] Resume DOCX upload → form auto-populates
- [ ] Manual form entry still works (no regression)
- [ ] NOC hint appears for job title entries
- [ ] `make update-demand --dry-run` shows correct commands
- [ ] n8n Job Bank workflow executes successfully (manual trigger)
- [ ] n8n JVWS workflow executes successfully (manual trigger)
- [ ] `sqlite3 data/skillforge.db 'SELECT COUNT(*) FROM jobbank_postings'` returns > 0 after first run
- [ ] `sqlite3 data/skillforge.db 'SELECT COUNT(*) FROM jvws_vacancies'` returns > 0 after JVWS run
