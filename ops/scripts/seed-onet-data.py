#!/usr/bin/env python3
"""Seed O*NET/JAAT reference data into PostgreSQL.

This script loads curated fixture files from ``ops/fixtures/onet/<env>``
and upserts them into the reference tables described in ``docs/DATA.md``.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence

try:
    import psycopg
    from psycopg import sql
except ImportError as exc:  # pragma: no cover - dependency guard
    raise SystemExit(
        "psycopg package is required. Install with `pip install psycopg[binary]`."
    ) from exc


DEFAULT_FIXTURE_ROOT = Path("ops/fixtures/onet")


@dataclass
class DatasetConfig:
    """Configuration derived from the fixture manifest for a single dataset."""

    name: str
    table: str
    columns: List[str]
    conflict_columns: List[str]
    fixture_path: Path
    update_columns: List[str] = field(default_factory=list)
    static_columns: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, base_dir: Path, raw: Dict[str, Any]) -> "DatasetConfig":
        missing = [field for field in ("name", "table", "columns", "fixture") if field not in raw]
        if missing:
            raise ValueError(f"Dataset manifest entry missing keys: {', '.join(missing)}")

        columns = list(raw["columns"])
        conflict_columns = list(raw.get("primary_key") or raw.get("conflict_columns", []))
        if not conflict_columns:
            raise ValueError(f"Dataset '{raw['name']}' requires primary_key/conflict_columns in manifest.")

        update_columns = raw.get("update_columns")
        if update_columns is None:
            update_columns = [col for col in columns if col not in conflict_columns]

        fixture_path = (base_dir / raw["fixture"]).resolve()
        static_columns = dict(raw.get("static_columns", {}))

        return cls(
            name=raw["name"],
            table=raw["table"],
            columns=columns,
            conflict_columns=conflict_columns,
            fixture_path=fixture_path,
            update_columns=list(update_columns),
            static_columns=static_columns,
        )


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed O*NET and JAAT reference data.")
    parser.add_argument(
        "--env",
        default="local",
        choices=["local", "ci", "staging", "production"],
        help="Fixture environment to load (default: local).",
    )
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURE_ROOT),
        help="Path to the fixture root directory (default: ops/fixtures/onet).",
    )
    parser.add_argument(
        "--dsn",
        default=None,
        help=(
            "PostgreSQL connection string. "
            "If omitted, the script resolves it from SKILLFORGE_<ENV>_DATABASE_URL, "
            "then DATABASE_URL, falling back to a local development DSN."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate fixtures and show intended actions without modifying the database.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging.",
    )
    return parser.parse_args(argv)


def resolve_dsn(selected_env: str, explicit_dsn: str | None) -> str:
    if explicit_dsn:
        return explicit_dsn

    env_specific = os.getenv(f"SKILLFORGE_{selected_env.upper()}_DATABASE_URL")
    if env_specific:
        return env_specific

    generic = os.getenv("DATABASE_URL") or os.getenv("SKILLFORGE_DATABASE_URL")
    if generic:
        return generic

    return "postgresql://postgres:postgres@localhost:5432/skillforge"


def load_manifest(manifest_path: Path) -> List[DatasetConfig]:
    if not manifest_path.exists():
        raise FileNotFoundError(f"Fixture manifest not found: {manifest_path}")

    try:
        manifest = json.loads(manifest_path.read_text())
    except json.JSONDecodeError as exc:  # pragma: no cover - dataset configuration failure
        raise ValueError(f"Unable to parse manifest {manifest_path}: {exc}") from exc

    datasets = manifest.get("datasets")
    if not isinstance(datasets, list):
        raise ValueError(f"Manifest {manifest_path} must define a 'datasets' list.")

    base_dir = manifest_path.parent
    return [DatasetConfig.from_dict(base_dir, dataset) for dataset in datasets]


def load_fixture_records(dataset: DatasetConfig) -> List[Dict[str, Any]]:
    if not dataset.fixture_path.exists():
        raise FileNotFoundError(f"Fixture for dataset '{dataset.name}' not found: {dataset.fixture_path}")

    try:
        payload = json.loads(dataset.fixture_path.read_text())
    except json.JSONDecodeError as exc:  # pragma: no cover - data failure
        raise ValueError(f"Unable to parse fixture {dataset.fixture_path}: {exc}") from exc

    if not isinstance(payload, list):
        raise ValueError(f"Fixture {dataset.fixture_path} must be a JSON list of objects.")

    records: List[Dict[str, Any]] = []
    for record in payload:
        if not isinstance(record, dict):
            raise ValueError(
                f"Dataset '{dataset.name}' includes a non-object record: {record!r}"
            )

        enriched = {**dataset.static_columns, **record}
        missing_columns = [column for column in dataset.columns if column not in enriched]
        if missing_columns:
            raise ValueError(
                f"Dataset '{dataset.name}' record missing columns {missing_columns}. "
                f"Record: {record}"
            )

        records.append(enriched)

    return records


def ensure_records_have_keys(dataset: DatasetConfig, records: Iterable[Dict[str, Any]]) -> None:
    for record in records:
        if any(record.get(column) is None for column in dataset.conflict_columns):
            missing_keys = [column for column in dataset.conflict_columns if record.get(column) is None]
            raise ValueError(
                f"Dataset '{dataset.name}' record missing required key values: {missing_keys}. "
                f"Record: {record}"
            )


def upsert_records(
    cursor: "psycopg.Cursor[Any]",
    dataset: DatasetConfig,
    records: Iterable[Dict[str, Any]],
) -> None:
    sql_columns = sql.SQL(", ").join(sql.Identifier(column) for column in dataset.columns)
    sql_placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in dataset.columns)
    conflict_target = sql.SQL(", ").join(sql.Identifier(column) for column in dataset.conflict_columns)
    update_assignments = sql.SQL(", ").join(
        sql.Composed(
            [sql.Identifier(column), sql.SQL(" = EXCLUDED."), sql.Identifier(column)]
        )
        for column in dataset.update_columns
    )

    if dataset.update_columns:
        statement = sql.SQL(
            "INSERT INTO {table} ({columns}) "
            "VALUES ({placeholders}) "
            "ON CONFLICT ({conflict}) DO UPDATE SET {updates}"
        ).format(
            table=sql.Identifier(dataset.table),
            columns=sql_columns,
            placeholders=sql_placeholders,
            conflict=conflict_target,
            updates=update_assignments,
        )
    else:
        statement = sql.SQL(
            "INSERT INTO {table} ({columns}) "
            "VALUES ({placeholders}) "
            "ON CONFLICT ({conflict}) DO NOTHING"
        ).format(
            table=sql.Identifier(dataset.table),
            columns=sql_columns,
            placeholders=sql_placeholders,
            conflict=conflict_target,
        )

    values = [
        tuple(record[column] for column in dataset.columns)
        for record in records
    ]
    cursor.executemany(statement, values)


def run_seed(manifest: List[DatasetConfig], dsn: str, dry_run: bool = False) -> None:
    datasets_payload: Dict[str, List[Dict[str, Any]]] = {}
    for dataset in manifest:
        records = load_fixture_records(dataset)
        ensure_records_have_keys(dataset, records)
        datasets_payload[dataset.name] = records
        logging.info("Loaded %s records for dataset '%s'.", len(records), dataset.name)

    if dry_run:
        logging.info("Dry run complete. No database changes were made.")
        return

    logging.info("Connecting to %s", dsn)
    with psycopg.connect(dsn) as connection:
        with connection.transaction():
            with connection.cursor() as cursor:
                for dataset in manifest:
                    records = datasets_payload[dataset.name]
                    if not records:
                        logging.info("Dataset '%s' has no records. Skipping.", dataset.name)
                        continue

                    logging.info(
                        "Upserting %s record(s) into %s (%s).",
                        len(records),
                        dataset.table,
                        ", ".join(dataset.columns),
                    )
                    upsert_records(cursor, dataset, records)

        logging.info("Seed transaction committed successfully.")


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    fixtures_root = Path(args.fixtures_root)
    manifest_path = fixtures_root / args.env / "manifest.json"
    logging.info("Loading manifest: %s", manifest_path)
    manifest = load_manifest(manifest_path)

    dsn = resolve_dsn(args.env, args.dsn)
    try:
        run_seed(manifest, dsn, dry_run=args.dry_run)
    except Exception as exc:  # pragma: no cover - user facing error handling
        logging.error("Seeding failed: %s", exc)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
