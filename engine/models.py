"""
Core data models for the SkillForge matching engine.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Occupation:
    noc_code: str          # NOC 2021 code (e.g. "7271")
    title: str
    teer: int              # Training, Education, Experience, Responsibilities level (0-5)
    broad_category: str    # NOC broad occupational category
    skills: list[str]      # O*NET skill descriptors via LMIC crosswalk
    embedding: Optional[list[float]] = None  # sentence-transformer vector


@dataclass
class DemandSignal:
    noc_code: str
    # Component signals (each 0.0-1.0 normalized)
    vacancy_rate: float = 0.0          # Job Bank postings ratio — 35% weight
    cops_shortage: float = 0.0        # COPS shortage flag (0 or 1) — 25% weight
    express_entry_priority: float = 0.0  # NOC in Express Entry draws — 20% weight
    retirement_replacement: float = 0.0  # Replacement demand rate — 20% weight
    # Composite: weighted sum
    composite: float = 0.0

    def compute_composite(self) -> float:
        self.composite = (
            0.35 * self.vacancy_rate
            + 0.25 * self.cops_shortage
            + 0.20 * self.express_entry_priority
            + 0.20 * self.retirement_replacement
        )
        return self.composite


@dataclass
class OccupationMatch:
    noc_code: str
    title: str
    teer: int
    # Raw component scores
    skill_similarity: float   # cosine similarity 0.0-1.0
    demand_score: float       # composite demand signal 0.0-1.0
    wage_growth: float        # normalized wage uplift 0.0-1.0
    # Z-scores (across all 516 NOC codes)
    z_skill: float = 0.0
    z_demand: float = 0.0
    z_wage: float = 0.0
    # Final composite score
    composite_score: float = 0.0   # 0.40*z_skill + 0.40*z_demand + 0.20*z_wage
    # Metadata
    funding_eligible: bool = False
    training_programs: list[str] = field(default_factory=list)
    ai_tools: list[str] = field(default_factory=list)


@dataclass
class UserProfile:
    current_noc: str
    current_title: str
    years_experience: int
    education_level: str  # "secondary", "college", "university"
    # LMDA priority group flags
    is_youth: bool = False           # age 15-29
    is_newcomer: bool = False        # newcomer to Canada
    is_indigenous: bool = False
    is_visible_minority: bool = False
    is_person_with_disability: bool = False
    province: str = "ON"             # default Ontario
