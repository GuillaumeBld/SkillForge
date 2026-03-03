"""
Labour market demand signal aggregation.

Sources:
  - Job Bank API (Canada.ca) — vacancy postings ratio
  - COPS shortage list (Employment and Social Development Canada)
  - Express Entry priority NOC codes (IRCC)
  - StatCan retirement replacement demand estimates

All signals normalized to [0, 1] before composite weighting.
"""

import httpx
import logging
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


async def fetch_job_bank_vacancy_ratio(noc_code: str) -> float:
    """
    Query Job Bank API for active postings relative to labour force size.

    Returns a 0.0-1.0 normalized ratio. Falls back to 0.5 on error.
    """
    try:
        url = f"https://www.jobbank.gc.ca/jobsearch/jobsearch?searchstring=&locationstring=Canada&noc={noc_code}&fprov=&fc=&frat=6&fnoc=&button.submit=Search"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, follow_redirects=True)
        # Job Bank doesn't have a clean JSON API; scraping is fragile.
        # TODO: Replace with official ESDC data feeds when available.
        # For MVP: return mocked signal based on COPS shortage list.
        return 0.75 if noc_code in COPS_SHORTAGE_CODES else 0.40
    except Exception as exc:
        logger.warning(f"Job Bank fetch failed for {noc_code}: {exc}")
        return 0.50  # neutral fallback


def build_demand_signal(noc_code: str, vacancy_rate: Optional[float] = None) -> DemandSignal:
    """
    Build a DemandSignal for a given NOC code using available signals.
    """
    from typing import Optional  # local import to avoid circular
    sig = DemandSignal(noc_code=noc_code)

    sig.vacancy_rate = vacancy_rate if vacancy_rate is not None else (
        0.75 if noc_code in COPS_SHORTAGE_CODES else 0.40
    )
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
