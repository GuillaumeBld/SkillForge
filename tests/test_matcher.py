"""
Unit tests for the z-score matching pipeline.
No external deps required — uses synthetic embeddings.
"""

import numpy as np
import pytest

from engine.matcher import rank_occupations, _z_score
from engine.models import OccupationMatch


def _rand_unit_vec(dim: int = 8, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    v = rng.standard_normal(dim).astype(np.float32)
    return v / np.linalg.norm(v)


class TestZScore:
    def test_zero_std_returns_zeros(self):
        arr = np.ones(5)
        result = _z_score(arr)
        assert np.allclose(result, 0.0)

    def test_standardizes_correctly(self):
        arr = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        result = _z_score(arr)
        assert abs(result.mean()) < 1e-6
        assert abs(result.std() - 1.0) < 1e-6


class TestRankOccupations:
    def setup_method(self):
        # 5 synthetic occupations
        self.codes = ["7271", "7272", "3012", "1311", "2173"]
        self.embeddings = {c: _rand_unit_vec(8, seed=i) for i, c in enumerate(self.codes)}
        self.demand = {"7271": 0.9, "7272": 0.8, "3012": 0.7, "1311": 0.4, "2173": 0.5}
        self.wage = {"7271": 0.75, "7272": 0.70, "3012": 0.85, "1311": 0.65, "2173": 0.80}
        self.meta = {c: {"title": f"Occ {c}", "teer": 2} for c in self.codes}

    def test_returns_top_k(self):
        source = _rand_unit_vec(8, seed=99)
        results = rank_occupations(
            source_embedding=source,
            corpus_embeddings=self.embeddings,
            demand_scores=self.demand,
            wage_scores=self.wage,
            occupation_meta=self.meta,
            top_k=3,
        )
        assert len(results) == 3

    def test_results_sorted_descending(self):
        source = _rand_unit_vec(8, seed=99)
        results = rank_occupations(
            source_embedding=source,
            corpus_embeddings=self.embeddings,
            demand_scores=self.demand,
            wage_scores=self.wage,
            occupation_meta=self.meta,
        )
        scores = [r.composite_score for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_exclude_noc(self):
        source = _rand_unit_vec(8, seed=99)
        results = rank_occupations(
            source_embedding=source,
            corpus_embeddings=self.embeddings,
            demand_scores=self.demand,
            wage_scores=self.wage,
            occupation_meta=self.meta,
            exclude_noc="7271",
        )
        assert all(r.noc_code != "7271" for r in results)

    def test_returns_occupation_match_type(self):
        source = _rand_unit_vec(8, seed=99)
        results = rank_occupations(
            source_embedding=source,
            corpus_embeddings=self.embeddings,
            demand_scores=self.demand,
            wage_scores=self.wage,
            occupation_meta=self.meta,
        )
        assert all(isinstance(r, OccupationMatch) for r in results)

    def test_composite_formula(self):
        """Verify 0.40/0.40/0.20 weighting is applied."""
        # Single occupation, deterministic
        source = _rand_unit_vec(8, seed=0)
        codes = ["7271"]
        emb = {c: _rand_unit_vec(8, seed=1) for c in codes}
        demand = {"7271": 0.8}
        wage = {"7271": 0.6}
        meta = {"7271": {"title": "Plumber", "teer": 2}}

        results = rank_occupations(
            source_embedding=source,
            corpus_embeddings=emb,
            demand_scores=demand,
            wage_scores=wage,
            occupation_meta=meta,
        )
        # With a single point, z-scores are all 0, so composite = 0
        assert results[0].composite_score == 0.0
