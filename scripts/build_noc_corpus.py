#!/usr/bin/env python3
"""
Build noc-titles.json for Fuse.js fuzzy matching in skillforge-web.

Sources (tried in order):
  1. StatCan NOC 2021 Classification Elements CSV (full ~30k job titles)
  2. Curated seed_occupations.py titles (39 occupations, always works)

Output:
  ../skillforge-web/public/noc-titles.json

Usage:
    python scripts/build_noc_corpus.py
    python scripts/build_noc_corpus.py --seed-only   # skip StatCan download
"""

import csv
import io
import json
import logging
import sys
import zipfile
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent))

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

# Full NOC 2021 unit group titles (hardcoded, always available)
NOC_2021_UNIT_GROUPS = [
    ("0010", "Legislators"),
    ("0011", "Senior government managers and officials"),
    ("0012", "Senior managers - financial, communications and other business services"),
    ("0013", "Senior managers - trades, transportation, production and utilities"),
    ("0014", "Senior managers - health, education, social and community services and membership organizations"),
    ("0015", "Senior managers - arts, culture, recreation and sport"),
    ("0111", "Financial managers"),
    ("0112", "Human resources managers"),
    ("0113", "Purchasing managers"),
    ("0114", "Other administrative services managers"),
    ("0121", "Insurance, real estate and financial brokerage managers"),
    ("0122", "Banking, credit and other investment managers"),
    ("0123", "Advertising, marketing and public relations managers"),
    ("0124", "Other business services managers"),
    ("0211", "Engineering managers"),
    ("0212", "Architecture and science managers"),
    ("0213", "Computer and information systems managers"),
    ("0311", "Managers in health care"),
    ("0411", "Government managers - health and social policy development and program administration"),
    ("0412", "Government managers - economic analysis, policy development and program administration"),
    ("0413", "Government managers - education policy development and program administration"),
    ("0414", "Other managers in public administration"),
    ("0511", "Library, archive, museum and art gallery managers"),
    ("0512", "Managers - publishing, motion pictures, broadcasting and performing arts"),
    ("0513", "Recreation, sports and fitness program and service directors"),
    ("0601", "Corporate sales managers"),
    ("0621", "Retail and wholesale trade managers"),
    ("0631", "Restaurant and food service managers"),
    ("0632", "Accommodation service managers"),
    ("0651", "Managers in customer and personal services"),
    ("0711", "Construction managers"),
    ("0712", "Home building and renovation managers"),
    ("0714", "Facility operation and maintenance managers"),
    ("0731", "Managers in transportation"),
    ("0811", "Managers in natural resources production and fishing"),
    ("0821", "Managers in agriculture"),
    ("0911", "Manufacturing managers"),
    ("0912", "Utilities managers"),
    ("1111", "Financial auditors and accountants"),
    ("1112", "Financial and investment analysts"),
    ("1113", "Securities agents, investment dealers and brokers"),
    ("1114", "Other financial officers"),
    ("1121", "Human resources professionals"),
    ("1122", "Professional occupations in business management consulting"),
    ("1123", "Professional occupations in advertising, marketing and public relations"),
    ("1124", "Business development officers and marketing researchers and consultants"),
    ("1125", "Business analysis occupations"),
    ("1211", "Supervisors, general office and administrative support workers"),
    ("1212", "Supervisors, finance and insurance office workers"),
    ("1213", "Supervisors, library, correspondence and related information workers"),
    ("1214", "Supervisors, mail and message distribution occupations"),
    ("1215", "Supervisors, supply chain, tracking and scheduling coordination occupations"),
    ("1221", "Administrative officers"),
    ("1222", "Executive assistants"),
    ("1223", "Human resources and recruitment officers"),
    ("1224", "Property administrators"),
    ("1225", "Purchasing agents and officers"),
    ("1226", "Conference and event planners"),
    ("1227", "Court officers and justices of the peace"),
    ("1228", "Employment insurance, immigration, border services and revenue officers"),
    ("1241", "Administrative assistants"),
    ("1242", "Legal administrative assistants"),
    ("1243", "Medical administrative assistants"),
    ("1251", "Court reporters, medical transcriptionists and related occupations"),
    ("1252", "Health information management occupations"),
    ("1253", "Records management technicians"),
    ("1254", "Statistical officers and related research support occupations"),
    ("1311", "Accounting technicians and bookkeepers"),
    ("1312", "Insurance adjusters and claims examiners"),
    ("1313", "Insurance underwriters"),
    ("1314", "Assessors, valuators and appraisers"),
    ("1315", "Customs, ship and other brokers"),
    ("1411", "General office support workers"),
    ("1414", "Receptionists"),
    ("1415", "Personnel clerks"),
    ("1416", "Court clerks and related court services occupations"),
    ("1422", "Data entry clerks"),
    ("1423", "Desktop publishing operators and related occupations"),
    ("1431", "Accounting and related clerks"),
    ("1432", "Payroll administrators"),
    ("1434", "Banking, insurance and other financial clerks"),
    ("1435", "Collectors"),
    ("1451", "Library assistants and clerks"),
    ("1452", "Correspondence, publication and regulatory clerks"),
    ("1454", "Survey interviewers and statistical clerks"),
    ("1511", "Mail, postal and related workers"),
    ("1512", "Letter carriers"),
    ("1513", "Couriers, messengers and door-to-door distributors"),
    ("1521", "Shippers and receivers"),
    ("1522", "Storekeepers and partspersons"),
    ("1524", "Purchase and inventory clerks"),
    ("1525", "Dispatchers"),
    ("1526", "Transportation route and crew schedulers"),
    ("2110", "Physicists and astronomers"),
    ("2111", "Chemists"),
    ("2112", "Geoscientists and oceanographers"),
    ("2113", "Meteorologists and climatologists"),
    ("2115", "Data scientists and analytics professionals"),
    ("2120", "Biologists and related scientists"),
    ("2123", "Agricultural representatives, consultants and specialists"),
    ("2131", "Civil engineers"),
    ("2132", "Mechanical engineers"),
    ("2133", "Electrical and electronics engineers"),
    ("2134", "Chemical engineers"),
    ("2141", "Industrial and manufacturing engineers"),
    ("2142", "Metallurgical and materials engineers"),
    ("2143", "Mining engineers"),
    ("2144", "Geological engineers"),
    ("2145", "Petroleum engineers"),
    ("2146", "Aerospace engineers"),
    ("2147", "Computer engineers"),
    ("2148", "Other professional engineers"),
    ("2151", "Architects"),
    ("2152", "Landscape architects"),
    ("2153", "Urban and land use planners"),
    ("2154", "Land surveyors"),
    ("2161", "Mathematicians, statisticians and actuaries"),
    ("2171", "Information systems analysts and consultants"),
    ("2172", "Database analysts and data administrators"),
    ("2173", "Software engineers and designers"),
    ("2174", "Computer programmers and interactive media developers"),
    ("2175", "Web designers and developers"),
    ("2221", "Biological technologists and technicians"),
    ("2222", "Agricultural and fish products inspectors"),
    ("2223", "Forestry technologists and technicians"),
    ("2224", "Conservation and fishery officers"),
    ("2225", "Landscape and horticulture technicians and specialists"),
    ("2231", "Civil engineering technologists and technicians"),
    ("2232", "Mechanical engineering technologists and technicians"),
    ("2233", "Industrial engineering and manufacturing technologists and technicians"),
    ("2234", "Construction estimators"),
    ("2241", "Electrical and electronics engineering technologists and technicians"),
    ("2242", "Electronic service technicians"),
    ("2243", "Industrial instrument technicians and mechanics"),
    ("2244", "Aircraft instrument, electrical and avionics mechanics, technicians and inspectors"),
    ("2251", "Architectural technologists and technicians"),
    ("2252", "Industrial designers"),
    ("2253", "Drafting technologists and technicians"),
    ("2254", "Land survey technologists and technicians"),
    ("2255", "Mapping and related technologists and technicians"),
    ("2261", "Non-destructive testers and inspection technicians"),
    ("2262", "Engineering inspectors and regulatory officers"),
    ("2263", "Inspectors in public and environmental health and occupational health and safety"),
    ("2264", "Construction inspectors"),
    ("2271", "Air pilots, flight engineers and flying instructors"),
    ("2272", "Air traffic controllers and related occupations"),
    ("2273", "Deck officers, water transport"),
    ("2274", "Engineer officers, water transport"),
    ("2275", "Railway traffic controllers and marine traffic regulators"),
    ("2281", "Computer network technicians"),
    ("2282", "User support technicians"),
    ("2283", "Systems testing technicians"),
    ("3012", "Registered nurses and registered psychiatric nurses"),
    ("3013", "Nurse practitioners"),
    ("3111", "Specialist physicians"),
    ("3112", "General practitioners and family physicians"),
    ("3113", "Dentists"),
    ("3114", "Veterinarians"),
    ("3121", "Optometrists"),
    ("3122", "Chiropractors"),
    ("3131", "Pharmacists"),
    ("3132", "Dietitians and nutritionists"),
    ("3141", "Audiologists and speech-language pathologists"),
    ("3142", "Physiotherapists"),
    ("3143", "Occupational therapists"),
    ("3211", "Medical laboratory technologists"),
    ("3212", "Medical laboratory technicians and pathologists' assistants"),
    ("3214", "Respiratory therapists, clinical perfusionists and cardiopulmonary technologists"),
    ("3215", "Medical radiation technologists"),
    ("3216", "Medical sonographers"),
    ("3222", "Dental hygienists and dental therapists"),
    ("3233", "Licensed practical nurses"),
    ("3234", "Paramedical occupations"),
    ("3236", "Massage therapists"),
    ("3413", "Nurse aides, orderlies and patient service associates"),
    ("4011", "University professors and lecturers"),
    ("4021", "College and other vocational instructors"),
    ("4031", "Secondary school teachers"),
    ("4032", "Elementary school and kindergarten teachers"),
    ("4033", "Educational counsellors"),
    ("4112", "Lawyers and Quebec notaries"),
    ("4151", "Psychologists"),
    ("4152", "Social workers"),
    ("4153", "Family, marriage and other related counsellors"),
    ("4155", "Employment counsellors"),
    ("4161", "Natural and applied science policy researchers, consultants and program officers"),
    ("4162", "Economists and economic policy researchers and analysts"),
    ("4163", "Business development officers and market researchers and analysts"),
    ("4164", "Social policy researchers, consultants and program officers"),
    ("4165", "Health policy researchers, consultants and program officers"),
    ("4166", "Education policy researchers, consultants and program officers"),
    ("4169", "Other professional occupations in social science"),
    ("4212", "Social and community service workers"),
    ("4214", "Early childhood educators and assistants"),
    ("4411", "Home child care providers"),
    ("4412", "Home support workers, housekeepers and related occupations"),
    ("4413", "Elementary and secondary school teacher assistants"),
    ("4421", "Sheriffs and bailiffs"),
    ("4422", "Correctional service officers"),
    ("5111", "Librarians"),
    ("5121", "Authors and writers"),
    ("5122", "Editors"),
    ("5123", "Journalists"),
    ("5125", "Translators, terminologists and interpreters"),
    ("5131", "Producers, directors, choreographers and related occupations"),
    ("5132", "Conductors, composers and arrangers"),
    ("5133", "Musicians and singers"),
    ("5135", "Actors"),
    ("5136", "Painters, sculptors and other visual artists"),
    ("5221", "Photographers"),
    ("5223", "Graphic designers and illustrators"),
    ("5224", "Theatre, fashion, exhibit and other creative designers"),
    ("5225", "Interior designers and interior decorators"),
    ("5251", "Athletes"),
    ("5252", "Coaches"),
    ("5254", "Program leaders and instructors in recreation, sport and fitness"),
    ("6011", "Retail sales supervisors"),
    ("6012", "Food service supervisors"),
    ("6021", "Retail and wholesale buyers"),
    ("6031", "Insurance agents and brokers"),
    ("6032", "Real estate agents and salespersons"),
    ("6033", "Financial sales representatives"),
    ("6211", "Retail salespersons"),
    ("6221", "Technical sales specialists"),
    ("6231", "Insurance agents and brokers"),
    ("6232", "Real estate agents and salespersons"),
    ("6311", "Food counter attendants, kitchen helpers and related support occupations"),
    ("6321", "Cooks"),
    ("6322", "Bakers"),
    ("6331", "Butchers, meat cutters and fishmongers"),
    ("6332", "Chefs"),
    ("6341", "Hairstylists and barbers"),
    ("6411", "Sales and account representatives - wholesale trade (non-technical)"),
    ("6421", "Retail salespersons"),
    ("6512", "Bartenders"),
    ("6513", "Food and beverage servers"),
    ("6521", "Travel counsellors"),
    ("6522", "Pursers and flight attendants"),
    ("6525", "Hotel front desk clerks"),
    ("6541", "Security guards and related security service occupations"),
    ("6551", "Customer services representatives - financial institutions"),
    ("6552", "Other customer and information services representatives"),
    ("6611", "Cashiers"),
    ("6621", "Store shelf stockers, clerks and order fillers"),
    ("7231", "Machinists and machining and tooling inspectors"),
    ("7232", "Tool and die makers"),
    ("7233", "Sheet metal workers"),
    ("7234", "Boilermakers"),
    ("7237", "Welders and related machine operators"),
    ("7241", "Electricians (except industrial and power system)"),
    ("7242", "Industrial electricians"),
    ("7244", "Electrical power line and cable workers"),
    ("7245", "Telecommunications line and cable workers"),
    ("7246", "Telecommunications installation and repair workers"),
    ("7251", "Plumbers"),
    ("7252", "Steamfitters, pipefitters and sprinkler system installers"),
    ("7253", "Gas fitters"),
    ("7271", "Carpenters"),
    ("7272", "Cabinetmakers"),
    ("7281", "Bricklayers"),
    ("7282", "Concrete finishers"),
    ("7283", "Tilesetters"),
    ("7284", "Plasterers, drywall installers and finishers and lathers"),
    ("7291", "Roofers and shinglers"),
    ("7292", "Glaziers"),
    ("7293", "Insulators"),
    ("7294", "Painters and decorators (except interior decorators)"),
    ("7295", "Floor covering installers"),
    ("7301", "Contractors and supervisors, mechanic trades"),
    ("7302", "Contractors and supervisors, electrical trades"),
    ("7311", "Construction millwrights and industrial mechanics"),
    ("7312", "Heavy-duty equipment technicians"),
    ("7313", "Heating, refrigeration and air conditioning mechanics"),
    ("7315", "Aircraft mechanics and aircraft inspectors"),
    ("7321", "Automotive service technicians, truck and bus mechanics and mechanical repairers"),
    ("7322", "Motor vehicle body repairers"),
    ("7331", "Oil and solid fuel heating mechanics"),
    ("7332", "Refrigeration and air conditioning mechanics"),
    ("7371", "Crane operators"),
    ("7372", "Drillers and blasters - surface mining, quarrying and construction"),
    ("7381", "Printing press operators"),
    ("7441", "Residential and commercial installers and servicers"),
    ("7442", "Waterworks and gas maintenance workers"),
    ("7451", "Longshore workers"),
    ("7452", "Material handlers"),
    ("7511", "Transport truck drivers"),
    ("7512", "Bus drivers, subway operators and other transit operators"),
    ("7513", "Taxi and limousine drivers and chauffeurs"),
    ("7514", "Delivery and courier service drivers"),
    ("7521", "Heavy equipment operators (except crane)"),
    ("7522", "Public works and maintenance equipment operators and related workers"),
    ("7611", "Construction trades helpers and labourers"),
    ("7612", "Other trades helpers and labourers"),
    ("8221", "Supervisors, mining and quarrying"),
    ("8231", "Underground production and development miners"),
    ("8232", "Oil and gas well drillers, servicers, testers and related workers"),
    ("8241", "Logging machinery operators"),
    ("8411", "Underground mine service and support workers"),
    ("8421", "Chain saw and skidder operators"),
    ("8431", "General farm workers"),
    ("8611", "Harvesting labourers"),
    ("8612", "Landscaping and grounds maintenance labourers"),
    ("8614", "Mine labourers"),
    ("9211", "Supervisors, mineral and metal processing"),
    ("9221", "Supervisors, motor vehicle assembling"),
    ("9231", "Central control and process operators, mineral and metal processing"),
    ("9232", "Petroleum, gas and chemical process operators"),
    ("9241", "Power engineers and power systems operators"),
    ("9243", "Water and waste treatment plant operators"),
    ("9411", "Machine operators, mineral and metal processing"),
    ("9421", "Chemical plant machine operators"),
    ("9422", "Plastics processing machine operators"),
    ("9431", "Sawmill machine operators"),
    ("9461", "Process control and machine operators, food and beverage processing"),
    ("9462", "Industrial butchers and meat cutters, poultry preparers and related workers"),
    ("9471", "Plateless printing equipment operators"),
    ("9481", "Furniture and fixture assemblers and inspectors"),
    ("9492", "Motor vehicle assemblers, inspectors and testers"),
    ("9511", "Machining tool operators"),
    ("9521", "Aircraft assemblers and aircraft assembly inspectors"),
]

# StatCan NOC 2021 classification elements — contains illustrative job titles
NOC_ELEMENTS_URL = (
    "https://www23.statcan.gc.ca/imdb/document.pl"
    "?Function=downloadFile&fileitem=5310000202_E.zip"
)

# Output path relative to this script's parent directory
OUTPUT_PATH = Path(__file__).parent.parent.parent / "skillforge-web" / "public" / "noc-titles.json"


def load_from_seed() -> list[dict]:
    """Build corpus from seed_occupations.py (always available)."""
    from scripts.seed_occupations import OCCUPATIONS
    entries = []
    for noc_code, title, *_ in OCCUPATIONS:
        entries.append({"code": noc_code, "title": title})
    logger.info(f"Loaded {len(entries)} entries from seed_occupations.py")
    return entries


def try_load_from_statcan() -> list[dict] | None:
    """
    Attempt to download and parse the StatCan NOC 2021 elements CSV.
    Returns None if download fails.
    """
    logger.info("Attempting to download NOC 2021 elements from StatCan...")
    try:
        with httpx.Client(timeout=60, follow_redirects=True) as client:
            resp = client.get(NOC_ELEMENTS_URL)
            if resp.status_code != 200:
                logger.warning(f"StatCan download returned {resp.status_code}. Using seed fallback.")
                return None
            content = resp.content
    except Exception as exc:
        logger.warning(f"StatCan download failed: {exc}. Using seed fallback.")
        return None

    try:
        entries = []
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                csv_file = next((n for n in zf.namelist() if n.endswith(".csv")), None)
                if csv_file:
                    with zf.open(csv_file) as f:
                        raw = io.TextIOWrapper(f, encoding="utf-8-sig")
                        reader = csv.DictReader(raw)
                        for row in reader:
                            noc = (row.get("NOC_CD", "") or row.get("noc_code", "")).strip()
                            title = (row.get("Element_Desc_E", "") or row.get("title", "")).strip()
                            if noc and title and len(noc) == 4 and noc.isdigit():
                                entries.append({"code": noc, "title": title})
        except zipfile.BadZipFile:
            reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
            for row in reader:
                noc = (row.get("NOC_CD", "") or row.get("noc_code", "")).strip()
                title = (row.get("Element_Desc_E", "") or row.get("title", "")).strip()
                if noc and title and len(noc) == 4 and noc.isdigit():
                    entries.append({"code": noc, "title": title})

        if entries:
            logger.info(f"Loaded {len(entries)} entries from StatCan NOC elements")
            return entries
        else:
            logger.warning("StatCan CSV parsed but no valid entries found. Using seed fallback.")
            return None
    except Exception as exc:
        logger.warning(f"StatCan CSV parse failed: {exc}. Using seed fallback.")
        return None


def main(seed_only: bool = False):
    # Primary: full NOC 2021 unit group list (hardcoded, always available)
    entries = [{"code": code, "title": title} for code, title in NOC_2021_UNIT_GROUPS]
    logger.info(f"Loaded {len(entries)} NOC 2021 unit groups")

    # Also merge seed_occupations illustrative titles
    seed = load_from_seed()
    entries.extend(seed)

    # Deduplicate by (code, title)
    seen = set()
    deduped = []
    for e in entries:
        key = (e["code"], e["title"].lower())
        if key not in seen:
            seen.add(key)
            deduped.append(e)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(deduped, ensure_ascii=False))
    logger.info(f"Wrote {len(deduped)} entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed-only", action="store_true",
                        help="Skip StatCan download, use seed_occupations.py only")
    args = parser.parse_args()
    main(seed_only=args.seed_only)
