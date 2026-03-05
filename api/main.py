"""
SkillForge REST API — FastAPI application.

Endpoints:
  POST /match          Match a user profile to NOC occupations
  GET  /demand/{noc}   Labour market demand signal for a NOC code
  GET  /funding        Funding eligibility for a user profile
  GET  /occupations    List all indexed NOC occupations
  GET  /health         Service health check
"""

import json
import logging
import numpy as np
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db
from engine.embeddings import embed_occupation, load_embeddings
from engine.matcher import rank_occupations
from engine.demand import get_demand_scores, get_wage_scores
from engine.funding import enrich_match, funding_eligibility_score
from engine.models import UserProfile

logger = logging.getLogger(__name__)

# --- In-memory cache populated at startup ---
_cache: dict = {
    "embeddings": {},    # noc_code -> np.ndarray
    "demand": {},        # noc_code -> float
    "wage": {},          # noc_code -> float
    "occ_meta": {},      # noc_code -> {title, teer, broad_category}
}

EMBEDDING_CACHE = Path(__file__).parent.parent / "data" / "embeddings_cache.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB and load cache
    db.init_db()
    _reload_cache()
    logger.info(f"SkillForge ready. {len(_cache['embeddings'])} occupations indexed.")
    yield


def _reload_cache():
    with db.db() as conn:
        occs = db.get_all_occupations(conn)
        _cache["occ_meta"] = {
            o["noc_code"]: {"title": o["title"], "teer": o["teer"]}
            for o in occs
        }
        codes = list(_cache["occ_meta"].keys())

        # Load embeddings from JSON cache (fast) or DB
        if EMBEDDING_CACHE.exists():
            raw = load_embeddings(EMBEDDING_CACHE)
            _cache["embeddings"] = {
                k: v for k, v in raw.items() if k in _cache["occ_meta"]
            }
        else:
            raw_db = db.get_all_embeddings(conn)
            _cache["embeddings"] = {
                k: np.array(v, dtype=np.float32) for k, v in raw_db.items()
            }

        _cache["demand"] = db.get_all_demand_signals(conn)
        _cache["wage"] = get_wage_scores(codes)


app = FastAPI(
    title="SkillForge Engine",
    description="Canadian occupation matching engine for displaced white-collar workers",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request / Response models ---

class MatchRequest(BaseModel):
    current_noc: str = Field(..., description="Current NOC 2021 code")
    current_title: str = Field(..., description="Current job title")
    years_experience: int = Field(default=5, ge=0, le=50)
    education_level: str = Field(
        default="college",
        pattern="^(secondary|college|university)$"
    )
    is_youth: bool = False
    is_newcomer: bool = False
    is_indigenous: bool = False
    is_visible_minority: bool = False
    is_person_with_disability: bool = False
    province: str = Field(default="ON", max_length=2)
    top_k: int = Field(default=10, ge=1, le=50)


class SkillsMatchRequest(BaseModel):
    current_title: str = Field(..., description="Current job title (free text)")
    skills: list[str] = Field(default_factory=list, description="Skills extracted from resume")
    years_experience: int = Field(default=5, ge=0, le=50)
    education_level: str = Field(
        default="college",
        pattern="^(secondary|college|university)$"
    )
    is_youth: bool = False
    is_newcomer: bool = False
    is_indigenous: bool = False
    is_visible_minority: bool = False
    is_person_with_disability: bool = False
    province: str = Field(default="ON", max_length=2)
    top_k: int = Field(default=10, ge=1, le=50)


class MatchResultItem(BaseModel):
    noc_code: str
    title: str
    teer: int
    composite_score: float
    skill_similarity: float
    demand_score: float
    wage_growth: float
    funding_eligible: bool
    training_programs: list[str]
    ai_tools: list[str]
    transferable_skills: list[str] = []


class MatchResponse(BaseModel):
    source_noc: str
    source_title: str
    matches: list[MatchResultItem]
    engine_version: str = "0.1.0"
    embeddings_loaded: int


class DemandResponse(BaseModel):
    noc_code: str
    composite: float
    vacancy_rate: float
    cops_shortage: float
    express_entry_priority: float
    retirement_replacement: float


# --- Endpoints ---

@app.get("/health")
def health():
    return {
        "status": "ok",
        "occupations_indexed": len(_cache["embeddings"]),
        "demand_signals": len(_cache["demand"]),
    }


@app.get("/occupations")
def list_occupations():
    return {"occupations": list(_cache["occ_meta"].values())}


@app.post("/match", response_model=MatchResponse)
def match_occupations(req: MatchRequest):
    if not _cache["embeddings"]:
        raise HTTPException(
            status_code=503,
            detail="Embeddings not loaded. Run scripts/generate_embeddings.py first.",
        )

    # Get source occupation skills from DB
    with db.db() as conn:
        source_skills = db.get_skills_for_noc(conn, req.current_noc)
        # Pre-fetch target skills for all matches in one pass
        all_noc_skills: dict[str, set[str]] = {}
        rows = conn.execute("SELECT noc_code, skill_label FROM skills_map").fetchall()
        for row in rows:
            all_noc_skills.setdefault(row["noc_code"], set()).add(row["skill_label"])

    source_skill_set = set(source_skills)

    # Embed the source occupation
    source_vec = embed_occupation(req.current_title, source_skills)

    # Run z-score matching
    profile = UserProfile(
        current_noc=req.current_noc,
        current_title=req.current_title,
        years_experience=req.years_experience,
        education_level=req.education_level,
        is_youth=req.is_youth,
        is_newcomer=req.is_newcomer,
        is_indigenous=req.is_indigenous,
        is_visible_minority=req.is_visible_minority,
        is_person_with_disability=req.is_person_with_disability,
        province=req.province,
    )

    matches = rank_occupations(
        source_embedding=source_vec,
        corpus_embeddings=_cache["embeddings"],
        demand_scores=_cache["demand"],
        wage_scores=_cache["wage"],
        occupation_meta=_cache["occ_meta"],
        top_k=req.top_k,
        exclude_noc=req.current_noc,
    )

    # Enrich with funding + training info
    enriched = [enrich_match(m, profile) for m in matches]

    return MatchResponse(
        source_noc=req.current_noc,
        source_title=req.current_title,
        matches=[
            MatchResultItem(
                noc_code=m.noc_code,
                title=m.title,
                teer=m.teer,
                composite_score=round(m.composite_score, 4),
                skill_similarity=round(m.skill_similarity, 4),
                demand_score=round(m.demand_score, 4),
                wage_growth=round(m.wage_growth, 4),
                funding_eligible=m.funding_eligible,
                training_programs=m.training_programs,
                ai_tools=m.ai_tools,
                transferable_skills=sorted(
                    source_skill_set & all_noc_skills.get(m.noc_code, set())
                ),
            )
            for m in enriched
        ],
        embeddings_loaded=len(_cache["embeddings"]),
    )


@app.post("/match-by-skills", response_model=MatchResponse)
def match_by_skills(req: SkillsMatchRequest):
    if not _cache["embeddings"]:
        raise HTTPException(
            status_code=503,
            detail="Embeddings not loaded. Run scripts/generate_embeddings.py first.",
        )

    # Embed directly from provided title + skills (no DB lookup needed)
    source_vec = embed_occupation(req.current_title, req.skills)
    source_skill_set = {s.strip() for s in req.skills}

    # Pre-fetch all target skills
    with db.db() as conn:
        all_noc_skills: dict[str, set[str]] = {}
        rows = conn.execute("SELECT noc_code, skill_label FROM skills_map").fetchall()
        for row in rows:
            all_noc_skills.setdefault(row["noc_code"], set()).add(row["skill_label"])

    profile = UserProfile(
        current_noc="",
        current_title=req.current_title,
        years_experience=req.years_experience,
        education_level=req.education_level,
        is_youth=req.is_youth,
        is_newcomer=req.is_newcomer,
        is_indigenous=req.is_indigenous,
        is_visible_minority=req.is_visible_minority,
        is_person_with_disability=req.is_person_with_disability,
        province=req.province,
    )

    matches = rank_occupations(
        source_embedding=source_vec,
        corpus_embeddings=_cache["embeddings"],
        demand_scores=_cache["demand"],
        wage_scores=_cache["wage"],
        occupation_meta=_cache["occ_meta"],
        top_k=req.top_k,
        exclude_noc=None,  # no current NOC to exclude
    )

    enriched = [enrich_match(m, profile) for m in matches]

    return MatchResponse(
        source_noc="",
        source_title=req.current_title,
        matches=[
            MatchResultItem(
                noc_code=m.noc_code,
                title=m.title,
                teer=m.teer,
                composite_score=round(m.composite_score, 4),
                skill_similarity=round(m.skill_similarity, 4),
                demand_score=round(m.demand_score, 4),
                wage_growth=round(m.wage_growth, 4),
                funding_eligible=m.funding_eligible,
                training_programs=m.training_programs,
                ai_tools=m.ai_tools,
                transferable_skills=sorted(
                    source_skill_set & all_noc_skills.get(m.noc_code, set())
                ),
            )
            for m in enriched
        ],
        embeddings_loaded=len(_cache["embeddings"]),
    )


@app.get("/demand/{noc_code}", response_model=DemandResponse)
def get_demand(noc_code: str):
    with db.db() as conn:
        row = conn.execute(
            "SELECT * FROM demand_signals WHERE noc_code=?", (noc_code,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"No demand signal for {noc_code}")
    return DemandResponse(**dict(row))


@app.get("/funding")
def get_funding_eligibility(
    is_youth: bool = False,
    is_newcomer: bool = False,
    is_indigenous: bool = False,
    is_visible_minority: bool = False,
    is_person_with_disability: bool = False,
    province: str = "ON",
):
    profile = UserProfile(
        current_noc="", current_title="", years_experience=0,
        education_level="college",
        is_youth=is_youth, is_newcomer=is_newcomer,
        is_indigenous=is_indigenous, is_visible_minority=is_visible_minority,
        is_person_with_disability=is_person_with_disability,
        province=province,
    )
    score = funding_eligibility_score(profile)
    return {
        "eligibility_score": round(score, 2),
        "eligible": score >= 0.30,
        "priority_group": score >= 0.50,
        "programs": ["LMDA (EI-funded)", "WDA (non-EI)", "Canada Job Grant"],
    }
