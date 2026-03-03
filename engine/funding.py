"""
LMDA/WDA funding eligibility checker.

Labour Market Development Agreements (LMDA) provide Employment Insurance-funded
training for displaced workers. Provincial WDA programs extend this to non-EI clients.

Priority groups (highest to lowest funding score):
  1. EI-eligible displaced workers
  2. Youth (15-29) — Canada Youth Skills Initiative
  3. Newcomers to Canada (within 5 years)
  4. Indigenous people
  5. Visible minorities
  6. Persons with disabilities
"""

from .models import UserProfile, OccupationMatch


# Approximate LMDA-funded training available by TEER level
TEER_TRAINING_MAP = {
    0: ["Executive MBA", "Board Director certification"],
    1: ["College diploma program", "Apprenticeship technical training"],
    2: ["Red Seal apprenticeship", "College certificate", "CEGEP"],
    3: ["Trade school program", "Apprenticeship (4-year)", "College pre-apprenticeship"],
    4: ["On-the-job training", "Industry certification", "Micro-credential"],
    5: ["Workplace training", "WHMIS/safety certification"],
}

# Known AI-adjacent tools by NOC broad category
AI_TOOLS_BY_CATEGORY = {
    "trades": ["AutoCAD AI", "BuiltIn AI estimating", "RoofLink AI", "Procore"],
    "health": ["Epic AI (EHR)", "Babylon Health assist", "Nuance DAX transcription"],
    "natural_resources": ["Trimble AgriData", "AeroFarms sensor AI"],
    "business": ["Copilot for Finance", "Xero AI", "Sage AI"],
    "it": ["GitHub Copilot", "AWS CodeWhisperer", "Tabnine"],
    "manufacturing": ["Siemens Opcenter AI", "Rockwell FactoryTalk"],
    "other": ["Microsoft Copilot", "ChatGPT"],
}

_TEER_TO_CAT = {
    "3": "health", "7": "trades", "8": "natural_resources",
    "1": "business", "2": "it", "9": "manufacturing",
}


def _broad_cat(noc_code: str) -> str:
    return _TEER_TO_CAT.get(noc_code[0], "other")


def funding_eligibility_score(profile: UserProfile) -> float:
    """
    Compute a 0.0-1.0 LMDA/WDA priority score for a user profile.
    Higher = more likely to receive funding and faster intake.
    """
    score = 0.0
    # Base: everyone displaced by AI qualifies for WDA at minimum
    score += 0.30
    # Priority group bonuses (additive, capped at 1.0)
    if profile.is_youth:
        score += 0.25
    if profile.is_newcomer:
        score += 0.20
    if profile.is_indigenous:
        score += 0.20
    if profile.is_visible_minority:
        score += 0.10
    if profile.is_person_with_disability:
        score += 0.15
    return min(score, 1.0)


def enrich_match(match: OccupationMatch, profile: UserProfile) -> OccupationMatch:
    """
    Enrich a match result with funding eligibility and training/AI tool data.
    Mutates and returns the match.
    """
    eli_score = funding_eligibility_score(profile)
    match.funding_eligible = eli_score >= 0.30  # all displaced workers qualify

    teer = match.teer
    match.training_programs = TEER_TRAINING_MAP.get(teer, TEER_TRAINING_MAP[4])

    cat = _broad_cat(match.noc_code)
    match.ai_tools = AI_TOOLS_BY_CATEGORY.get(cat, AI_TOOLS_BY_CATEGORY["other"])

    return match
