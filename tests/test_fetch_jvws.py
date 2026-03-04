# tests/test_fetch_jvws.py
"""Tests for JVWS ETL script. Uses mocking — no real HTTP calls."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import io
import zipfile
from scripts.fetch_statcan_jvws import parse_jvws_zip


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
    assert "7271" in result
    assert "7241" in result
    assert result["7271"] == 350
    assert result["7241"] == 420


def test_parse_jvws_zip_ignores_wage_rows():
    zip_bytes = make_zip_with_csv(SAMPLE_CSV)
    result = parse_jvws_zip(zip_bytes)
    # Only 2 NOC codes — wage row for 7271 must be excluded
    assert len(result) == 2


def test_parse_jvws_zip_empty_csv():
    header_only = '"REF_DATE","GEO","DGUID","NOC","Wages","Job vacancies","UOM","UOM_ID","SCALAR_FACTOR","SCALAR_ID","VECTOR","COORDINATE","VALUE","STATUS","SYMBOL","TERMINATED","DECIMALS"\n'
    zip_bytes = make_zip_with_csv(header_only)
    result = parse_jvws_zip(zip_bytes)
    assert result == {}
