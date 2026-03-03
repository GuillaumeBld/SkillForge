"""
Sentence-transformer wrapper for occupation embedding.

Uses all-mpnet-base-v2 (domain-adapted; best MRR per CareerBERT 2025 findings).
Falls back to all-MiniLM-L6-v2 for speed if running on CPU without GPU.
"""

import json
import logging
import numpy as np
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_model = None


import os

DEFAULT_MODEL = os.environ.get("SKILLFORGE_MODEL", "all-MiniLM-L6-v2")


def _get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(DEFAULT_MODEL)
            logger.info(f"Loaded {DEFAULT_MODEL}")
        except ImportError:
            raise RuntimeError(
                "sentence-transformers not installed. Run: pip install sentence-transformers"
            )
    return _model


def embed_text(text: str) -> np.ndarray:
    """Embed a single text string. Returns a 1-D float32 array."""
    model = _get_model()
    return model.encode(text, normalize_embeddings=True)


def embed_occupation(title: str, skills: list[str]) -> np.ndarray:
    """
    Embed an occupation as title + skills joined.
    Matches the CareerBERT concatenation strategy.
    """
    text = f"{title}. Skills: {', '.join(skills[:30])}"  # cap at 30 skills
    return embed_text(text)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity for unit-normalized vectors (dot product)."""
    return float(np.dot(a, b))


def batch_similarities(
    query: np.ndarray,
    corpus: dict[str, np.ndarray],  # noc_code -> embedding
) -> dict[str, float]:
    """Compute cosine similarity from query to all corpus embeddings."""
    if not corpus:
        return {}
    codes = list(corpus.keys())
    matrix = np.stack([corpus[c] for c in codes])  # (N, D)
    scores = matrix @ query                          # (N,) dot products
    return {code: float(score) for code, score in zip(codes, scores)}


def load_embeddings(path: Path) -> dict[str, np.ndarray]:
    """Load pre-computed embeddings from a JSON file."""
    if not path.exists():
        return {}
    data = json.loads(path.read_text())
    return {code: np.array(vec, dtype=np.float32) for code, vec in data.items()}


def save_embeddings(embeddings: dict[str, np.ndarray], path: Path) -> None:
    """Persist embeddings to JSON (portable, no binary format)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {code: vec.tolist() for code, vec in embeddings.items()}
    path.write_text(json.dumps(data))
    logger.info(f"Saved {len(embeddings)} embeddings to {path}")
