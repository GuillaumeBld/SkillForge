# tests/test_fetch_jobbank.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

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


def make_csv_bytes(rows: list) -> bytes:
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
    # 7241 has 2 rows: "5" and ""; only "5" counted
    assert result["7241"] == 5


def test_extract_reference_month_from_filename():
    assert extract_reference_month("JobBankPostings_2025-01.csv") == "2025-01"
    assert extract_reference_month("some_file.csv") is None
