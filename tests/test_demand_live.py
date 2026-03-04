# tests/test_demand_live.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from unittest.mock import patch
from engine.demand import get_vacancy_signal, SEASONAL_WEIGHT


def test_vacancy_signal_falls_back_to_static_when_no_data():
    with patch("engine.demand._read_live_vacancy_data", return_value=(None, None)):
        # 7271 is in COPS_SHORTAGE_CODES → static fallback = 0.75
        result = get_vacancy_signal("7271")
        assert result == pytest.approx(0.75)


def test_vacancy_signal_falls_back_for_non_shortage():
    with patch("engine.demand._read_live_vacancy_data", return_value=(None, None)):
        result = get_vacancy_signal("1234")
        assert result == pytest.approx(0.40)


def test_vacancy_signal_uses_live_data():
    # vr=0.08 (raw 8% vacancy rate) → _normalize_vr → 1.0
    with patch("engine.demand._read_live_vacancy_data", return_value=(0.08, 1000)):
        with patch("engine.demand._log_normalize_jobbank", return_value=1.0):
            result = get_vacancy_signal("7271", month=6)  # summer, no seasonal adj
            # 0.65 * 1.0 + 0.35 * 1.0 = 1.0
            assert result == pytest.approx(1.0)


def test_vacancy_signal_clamped_to_01():
    with patch("engine.demand._read_live_vacancy_data", return_value=(0.20, 9999)):
        result = get_vacancy_signal("7271", month=6)
        assert 0.0 <= result <= 1.0


def test_seasonal_weight_applied_to_trades_in_winter():
    with patch("engine.demand._read_live_vacancy_data", return_value=(0.04, 300)):
        result_jan = get_vacancy_signal("7271", month=1)   # winter
        result_jun = get_vacancy_signal("7271", month=6)   # summer
        # January gets 1.25× seasonal multiplier
        assert result_jan > result_jun


def test_seasonal_weight_not_applied_to_non_trades():
    with patch("engine.demand._read_live_vacancy_data", return_value=(0.04, 300)):
        result_jan = get_vacancy_signal("1311", month=1)   # business, no seasonal
        result_jun = get_vacancy_signal("1311", month=6)
        assert result_jan == pytest.approx(result_jun)


def test_seasonal_weight_dict_has_12_months():
    assert set(SEASONAL_WEIGHT.keys()) == set(range(1, 13))
