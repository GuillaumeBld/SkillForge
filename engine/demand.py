"""
Labour market demand signal aggregation.

Sources:
  - StatCan JVWS 14-10-0441-01 (quarterly employer vacancy survey)
  - Job Bank monthly postings (open.canada.ca)
  - COPS shortage list (Employment and Social Development Canada)
  - Express Entry priority NOC codes (IRCC)
  - StatCan retirement replacement demand estimates

All signals normalized to [0, 1] before composite weighting.
"""

import logging
import math
from datetime import date as _date
from typing import Optional
from .models import DemandSignal

logger = logging.getLogger(__name__)

# COPS 2023: occupations in shortage (NOC 2021 codes)
# Source: ESDC COPS 2023-2031 projections
COPS_SHORTAGE_CODES = {
    "3012", "3233", "3413",  # health care
    "7271", "7272", "7301",  # construction trades
    "7302", "7311", "7312",
    "7313", "7321", "7322",
    "8411", "8421", "8431",  # natural resources
    "6331", "6332",          # food service supervisors
    "1311", "1431",          # accounting / payroll
}

# Express Entry priority occupations (TEER 0-3 in demand)
# Simplified from IRCC priority draws history
EXPRESS_ENTRY_PRIORITY = {
    "3012", "3233", "3413", "3414",  # health
    "7271", "7272", "7301", "7302",  # trades
    "2173", "2174", "2175",          # IT / software
    "1311", "1431",                  # finance
}

# Rough replacement demand rates by broad category (COPS 2023)
# Source: ESDC Occupational Outlooks
REPLACEMENT_DEMAND = {
    "health": 0.85,
    "trades": 0.70,
    "natural_resources": 0.65,
    "business": 0.55,
    "manufacturing": 0.60,
    "it": 0.50,
    "other": 0.45,
}

# NOC 2021 TEER → broad category mapping (simplified)
_TEER_TO_CAT = {
    "3": "health", "7": "trades", "8": "natural_resources",
    "1": "business", "2": "it", "9": "manufacturing",
}


def _broad_cat(noc_code: str) -> str:
    return _TEER_TO_CAT.get(noc_code[0], "other")


# Seasonal correction for trades (NOC 7xxx) and natural resources (NOC 8xxx).
# Multiplies the blended vacancy signal to correct for construction seasonality.
SEASONAL_WEIGHT: dict[int, float] = {
    1: 1.25, 2: 1.20, 3: 1.10,
    4: 1.00, 5: 1.00, 6: 1.00,
    7: 1.00, 8: 1.00, 9: 1.00,
    10: 1.05, 11: 1.15, 12: 1.25,
}

_VR_MIN = 0.005   # 0.5% raw vacancy rate → score 0.0
_VR_MAX = 0.08    # 8.0% raw vacancy rate → score 1.0


def _normalize_vr(vr: float) -> float:
    """Normalize a raw vacancy rate (e.g. 0.065) to [0, 1]."""
    return min(max((vr - _VR_MIN) / (_VR_MAX - _VR_MIN), 0.0), 1.0)


def _log_normalize_jobbank(posting_count: int, max_count: int = 5000) -> float:
    """Log-normalize a posting count to [0, 1]."""
    if posting_count <= 0:
        return 0.0
    return min(math.log(1 + posting_count) / math.log(1 + max_count), 1.0)


def _read_live_vacancy_data(noc_code: str) -> tuple:
    """Read live JVWS and Job Bank data from SQLite. Returns (raw_vr, posting_count)."""
    try:
        import db
        with db.db() as conn:
            return db.get_live_vacancy_data(conn, noc_code)
    except Exception as exc:
        logger.debug(f"Live vacancy data unavailable for {noc_code}: {exc}")
        return None, None


def get_vacancy_signal(noc_code: str, month: Optional[int] = None) -> float:
    """
    Return a 0-1 vacancy demand signal for a NOC code.

    Priority: live JVWS + Job Bank data → static COPS fallback.
    Applies seasonal correction for trades (7xxx) and natural resources (8xxx).
    """
    if month is None:
        month = _date.today().month

    vr, posting_count = _read_live_vacancy_data(noc_code)

    if vr is None and posting_count is None:
        return 0.75 if noc_code in COPS_SHORTAGE_CODES else 0.40

    vr_score = _normalize_vr(vr) if vr is not None else 0.5
    jb_score = _log_normalize_jobbank(posting_count) if posting_count is not None else 0.5

    signal = 0.65 * vr_score + 0.35 * jb_score

    if noc_code and noc_code[0] in ("7", "8"):
        signal *= SEASONAL_WEIGHT.get(month, 1.0)

    return min(max(signal, 0.0), 1.0)


def build_demand_signal(noc_code: str, vacancy_rate: Optional[float] = None) -> DemandSignal:
    """
    Build a DemandSignal for a given NOC code using available signals.
    """
    sig = DemandSignal(noc_code=noc_code)

    sig.vacancy_rate = vacancy_rate if vacancy_rate is not None else get_vacancy_signal(noc_code)
    sig.cops_shortage = 1.0 if noc_code in COPS_SHORTAGE_CODES else 0.0
    sig.express_entry_priority = 1.0 if noc_code in EXPRESS_ENTRY_PRIORITY else 0.0
    sig.retirement_replacement = REPLACEMENT_DEMAND.get(_broad_cat(noc_code), 0.45)

    sig.compute_composite()
    return sig


def get_demand_scores(noc_codes: list[str]) -> dict[str, float]:
    """Return composite demand scores for a list of NOC codes."""
    return {code: build_demand_signal(code).composite for code in noc_codes}


def get_wage_scores(noc_codes: list[str]) -> dict[str, float]:
    """
    Proxy wage uplift signal.

    Uses TEER level as a wage proxy for MVP (higher TEER = lower wage typically;
    trades (TEER 2-3) often exceed white-collar TEER 4 wages in Canada).

    TODO: Replace with StatCan SEPH average weekly earnings by NOC.
    """
    # Rough wage index by NOC first digit
    WAGE_INDEX = {
        "0": 0.90,  # management
        "1": 0.65,  # business/finance
        "2": 0.80,  # natural/applied sciences
        "3": 0.85,  # health
        "4": 0.50,  # education/law/social
        "5": 0.45,  # art/culture
        "6": 0.55,  # sales/service
        "7": 0.75,  # trades/transport
        "8": 0.70,  # natural resources
        "9": 0.55,  # manufacturing
    }
    return {code: WAGE_INDEX.get(code[0], 0.50) for code in noc_codes}
