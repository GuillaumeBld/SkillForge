"""
SQLite persistence layer for SkillForge MVP.

Tables:
  occupations       — NOC 2021 codes + metadata
  skills_map        — NOC → O*NET skill descriptors (via LMIC crosswalk)
  embeddings        — pre-computed sentence-transformer vectors (JSON)
  demand_signals    — cached labour market demand composites
"""

import json
import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "data" / "skillforge.db"


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


@contextmanager
def db():
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS occupations (
                noc_code        TEXT PRIMARY KEY,
                title           TEXT NOT NULL,
                teer            INTEGER NOT NULL,
                broad_category  TEXT NOT NULL,
                updated_at      TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS skills_map (
                noc_code    TEXT NOT NULL,
                onet_code   TEXT NOT NULL,
                skill_label TEXT NOT NULL,
                PRIMARY KEY (noc_code, skill_label)
            );

            CREATE TABLE IF NOT EXISTS embeddings (
                noc_code    TEXT PRIMARY KEY,
                vector      TEXT NOT NULL,   -- JSON float array
                model       TEXT NOT NULL,
                updated_at  TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS demand_signals (
                noc_code                TEXT PRIMARY KEY,
                vacancy_rate            REAL DEFAULT 0.5,
                cops_shortage           REAL DEFAULT 0.0,
                express_entry_priority  REAL DEFAULT 0.0,
                retirement_replacement  REAL DEFAULT 0.45,
                composite               REAL DEFAULT 0.0,
                updated_at              TEXT DEFAULT (datetime('now'))
            );

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

            CREATE TABLE IF NOT EXISTS intake_records (
                id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
                school_id        TEXT NOT NULL,
                worker_title     TEXT NOT NULL,
                source_noc       TEXT NOT NULL,
                matched_noc      TEXT NOT NULL,
                matched_title    TEXT NOT NULL,
                composite_score  REAL NOT NULL,
                funding_eligible INTEGER NOT NULL,
                province         TEXT NOT NULL,
                created_at       TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_intake_school ON intake_records(school_id, created_at DESC);
        """)


# --- Occupation helpers ---

def upsert_occupation(conn, noc_code: str, title: str, teer: int, broad_category: str) -> None:
    conn.execute(
        """
        INSERT INTO occupations (noc_code, title, teer, broad_category)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(noc_code) DO UPDATE SET
            title=excluded.title, teer=excluded.teer,
            broad_category=excluded.broad_category,
            updated_at=datetime('now')
        """,
        (noc_code, title, teer, broad_category),
    )


def upsert_skill(conn, noc_code: str, onet_code: str, skill_label: str) -> None:
    conn.execute(
        """
        INSERT OR IGNORE INTO skills_map (noc_code, onet_code, skill_label)
        VALUES (?, ?, ?)
        """,
        (noc_code, onet_code, skill_label),
    )


def upsert_embedding(conn, noc_code: str, vector: list[float], model: str) -> None:
    conn.execute(
        """
        INSERT INTO embeddings (noc_code, vector, model)
        VALUES (?, ?, ?)
        ON CONFLICT(noc_code) DO UPDATE SET
            vector=excluded.vector, model=excluded.model,
            updated_at=datetime('now')
        """,
        (noc_code, json.dumps(vector), model),
    )


def upsert_demand(conn, noc_code: str, **kwargs) -> None:
    cols = ["vacancy_rate", "cops_shortage", "express_entry_priority",
            "retirement_replacement", "composite"]
    updates = {k: v for k, v in kwargs.items() if k in cols}
    if not updates:
        return
    set_clause = ", ".join(f"{k}=?" for k in updates)
    conn.execute(
        f"""
        INSERT INTO demand_signals (noc_code, {', '.join(updates.keys())})
        VALUES (?, {', '.join('?' for _ in updates)})
        ON CONFLICT(noc_code) DO UPDATE SET {set_clause}, updated_at=datetime('now')
        """,
        [noc_code] + list(updates.values()) + list(updates.values()),
    )


def get_all_occupations(conn) -> list[dict]:
    rows = conn.execute("SELECT * FROM occupations ORDER BY noc_code").fetchall()
    return [dict(r) for r in rows]


def get_skills_for_noc(conn, noc_code: str) -> list[str]:
    rows = conn.execute(
        "SELECT skill_label FROM skills_map WHERE noc_code=?", (noc_code,)
    ).fetchall()
    return [r["skill_label"] for r in rows]


def get_all_embeddings(conn) -> dict[str, list[float]]:
    rows = conn.execute("SELECT noc_code, vector FROM embeddings").fetchall()
    return {r["noc_code"]: json.loads(r["vector"]) for r in rows}


def get_all_demand_signals(conn) -> dict[str, float]:
    rows = conn.execute("SELECT noc_code, composite FROM demand_signals").fetchall()
    return {r["noc_code"]: r["composite"] for r in rows}


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


def get_live_vacancy_data(conn, noc_code: str) -> tuple:
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
