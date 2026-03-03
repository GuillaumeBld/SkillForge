"""
Core z-score matching pipeline.

Formula (DOORS algorithm, Howison et al. 2024):
    composite = 0.40 * Z_skill + 0.40 * Z_demand + 0.20 * Z_wage

Z-scores are computed population-wide across all 516 NOC 2021 codes,
so each component is on the same scale before weighting.
"""

import numpy as np
from typing import Optional
from .models import OccupationMatch, UserProfile
from .embeddings import batch_similarities


def _z_score(values: np.ndarray) -> np.ndarray:
    """Standardize an array. Returns zeros if std == 0."""
    std = values.std()
    if std == 0:
        return np.zeros_like(values)
    return (values - values.mean()) / std


def rank_occupations(
    *,
    source_embedding: np.ndarray,
    corpus_embeddings: dict[str, np.ndarray],    # noc_code -> embedding
    demand_scores: dict[str, float],              # noc_code -> 0.0-1.0
    wage_scores: dict[str, float],                # noc_code -> 0.0-1.0
    occupation_meta: dict[str, dict],             # noc_code -> {title, teer, ...}
    top_k: int = 10,
    exclude_noc: Optional[str] = None,            # exclude current occupation
) -> list[OccupationMatch]:
    """
    Rank all NOC occupations against a source profile embedding.

    Returns the top_k matches sorted by composite score descending.
    """
    # Step 1: Raw similarities
    sims = batch_similarities(source_embedding, corpus_embeddings)
    if exclude_noc and exclude_noc in sims:
        del sims[exclude_noc]

    codes = list(sims.keys())
    if not codes:
        return []

    # Step 2: Align all signal arrays
    skill_arr = np.array([sims[c] for c in codes])
    demand_arr = np.array([demand_scores.get(c, 0.0) for c in codes])
    wage_arr = np.array([wage_scores.get(c, 0.0) for c in codes])

    # Step 3: Z-score each dimension population-wide
    z_skill = _z_score(skill_arr)
    z_demand = _z_score(demand_arr)
    z_wage = _z_score(wage_arr)

    # Step 4: Weighted composite (DOORS formula)
    composite = 0.40 * z_skill + 0.40 * z_demand + 0.20 * z_wage

    # Step 5: Sort descending, take top_k
    ranked_idx = np.argsort(composite)[::-1][:top_k]

    results = []
    for i in ranked_idx:
        code = codes[i]
        meta = occupation_meta.get(code, {})
        results.append(
            OccupationMatch(
                noc_code=code,
                title=meta.get("title", code),
                teer=meta.get("teer", 0),
                skill_similarity=float(skill_arr[i]),
                demand_score=float(demand_arr[i]),
                wage_growth=float(wage_arr[i]),
                z_skill=float(z_skill[i]),
                z_demand=float(z_demand[i]),
                z_wage=float(z_wage[i]),
                composite_score=float(composite[i]),
            )
        )
    return results
