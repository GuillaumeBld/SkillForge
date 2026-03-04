# tests/test_db_live_demand.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
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
