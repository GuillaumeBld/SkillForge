#!/usr/bin/env python3
"""
Seed demand signals for all NOC occupations.

Uses static signals for MVP (COPS shortage list + Express Entry priority codes).
Replace with live Job Bank API calls for production.

Usage:
    python scripts/seed_demand.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import db
from engine.demand import build_demand_signal


def main():
    db.init_db()
    with db.db() as conn:
        occupations = db.get_all_occupations(conn)
        print(f"Seeding demand signals for {len(occupations)} occupations...")

        for occ in occupations:
            sig = build_demand_signal(occ["noc_code"])
            db.upsert_demand(
                conn,
                occ["noc_code"],
                vacancy_rate=sig.vacancy_rate,
                cops_shortage=sig.cops_shortage,
                express_entry_priority=sig.express_entry_priority,
                retirement_replacement=sig.retirement_replacement,
                composite=sig.composite,
            )

    print("Done.")


if __name__ == "__main__":
    main()
