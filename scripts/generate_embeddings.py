#!/usr/bin/env python3
"""
Generate sentence-transformer embeddings for all NOC occupations in the DB.

Usage:
    python scripts/generate_embeddings.py [--model all-MiniLM-L6-v2]

Typical run time: ~2 min for 516 occupations on CPU (MiniLM), ~8 min (mpnet).
"""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import db
from engine.embeddings import embed_occupation, save_embeddings

import argparse
import numpy as np


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model", default="all-mpnet-base-v2",
        choices=["all-mpnet-base-v2", "all-MiniLM-L6-v2"],
        help="Sentence-transformer model to use"
    )
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()

    # Override model in embeddings module
    import engine.embeddings as emb_mod
    from sentence_transformers import SentenceTransformer
    emb_mod._model = SentenceTransformer(args.model)

    print(f"Generating embeddings with {args.model}...")

    with db.db() as conn:
        occupations = db.get_all_occupations(conn)
        print(f"  Found {len(occupations)} occupations")

        embeddings: dict[str, np.ndarray] = {}
        for i, occ in enumerate(occupations):
            noc = occ["noc_code"]
            skills = db.get_skills_for_noc(conn, noc)
            vec = embed_occupation(occ["title"], skills)
            embeddings[noc] = vec

            if (i + 1) % 50 == 0:
                print(f"  {i + 1}/{len(occupations)} done")

        # Persist to DB
        for noc, vec in embeddings.items():
            db.upsert_embedding(conn, noc, vec.tolist(), args.model)

    # Also save to JSON cache for fast startup
    cache_path = Path(__file__).parent.parent / "data" / "embeddings_cache.json"
    save_embeddings(embeddings, cache_path)

    print(f"Done. {len(embeddings)} embeddings saved.")
    print(f"Cache: {cache_path}")


if __name__ == "__main__":
    main()
