#!/usr/bin/env python3
"""
Seed SkillForge DB with curated NOC 2021 occupations and skill labels.

Replaces the LMIC crosswalk ingest for MVP. Covers 25 white-collar source
occupations and 35 trade/blue-collar target occupations with representative
O*NET skill labels for embedding generation.

Usage:
    python scripts/seed_occupations.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import db

# Each entry: (noc_code, title, teer, broad_category, [skill_labels])
OCCUPATIONS = [
    # ── White-collar source occupations ──────────────────────────────────────
    ("1111", "Financial auditors and accountants", 1, "business", [
        "Accounting", "Financial analysis", "Auditing", "Data analysis",
        "Spreadsheet software", "Attention to detail", "Report writing",
        "Tax compliance", "Regulatory knowledge", "Problem-solving",
    ]),
    ("1112", "Financial and investment analysts", 1, "business", [
        "Financial modeling", "Investment analysis", "Risk assessment", "ESG analysis",
        "Data analysis", "Bloomberg Terminal", "Python", "SQL", "Report writing",
        "Equity research", "Credit risk", "Portfolio analysis", "FP&A",
    ]),
    ("1113", "Securities agents, investment dealers and brokers", 1, "business", [
        "Financial markets", "Securities trading", "Client relationship management",
        "Investment products", "Risk management", "Financial regulation",
        "Portfolio management", "Negotiation",
    ]),
    ("0111", "Financial managers", 0, "management", [
        "Financial planning", "Budgeting", "Financial reporting", "Team leadership",
        "Risk management", "Strategic planning", "Stakeholder communication",
        "Regulatory compliance", "Cash flow management",
    ]),
    ("2172", "Database analysts and data administrators", 1, "sciences", [
        "SQL", "Database design", "Data modeling", "ETL", "Performance tuning",
        "Data governance", "Python", "Snowflake", "Data warehousing",
    ]),
    ("2175", "Web designers and developers", 2, "sciences", [
        "Web development", "HTML", "CSS", "JavaScript", "UI/UX design",
        "Responsive design", "Version control", "CMS", "API integration",
    ]),
    ("2161", "Mathematicians, statisticians and actuaries", 1, "sciences", [
        "Statistical analysis", "R", "Python", "Mathematical modeling",
        "Data analysis", "Machine learning", "Risk modeling", "Report writing",
    ]),
    ("4169", "Other professional occupations in social science", 1, "social", [
        "Research", "Data analysis", "Report writing", "Policy analysis",
        "Stakeholder engagement", "Project management", "Communication",
    ]),
    ("1123", "Professional occupations in advertising, marketing and public relations", 1, "business", [
        "Marketing strategy", "Content creation", "Data analytics", "SEO/SEM",
        "Social media", "Campaign management", "Communication", "Market research",
    ]),
    ("1311", "Accounting technicians and bookkeepers", 2, "business", [
        "Bookkeeping", "Accounts payable and receivable", "Payroll processing",
        "Financial record keeping", "Spreadsheet software", "Data entry",
        "Bank reconciliation", "Invoice processing", "Attention to detail",
    ]),
    ("1221", "Administrative officers", 2, "business", [
        "Office administration", "Scheduling and coordination", "Record keeping",
        "Communication", "Problem-solving", "Database management",
        "Report preparation", "Budget monitoring", "Customer service",
    ]),
    ("1241", "Administrative assistants", 3, "business", [
        "Word processing", "Scheduling", "Communication", "Filing and records",
        "Customer service", "Telephone etiquette", "Data entry",
        "Email management", "Document preparation",
    ]),
    ("2173", "Software engineers and designers", 1, "sciences", [
        "Programming", "Software development", "Systems analysis", "Debugging",
        "Database design", "Version control", "Problem-solving",
        "Algorithm design", "Technical documentation", "Testing",
    ]),
    ("2171", "Information systems analysts and consultants", 1, "sciences", [
        "Systems analysis", "IT consulting", "Business requirements",
        "Data analysis", "Project management", "Technical writing",
        "Process improvement", "Stakeholder communication",
    ]),
    ("2281", "Computer network technicians", 3, "sciences", [
        "Network configuration", "Troubleshooting", "Hardware installation",
        "Cable management", "Security protocols", "Routing and switching",
        "Documentation", "Customer support",
    ]),
    ("4155", "Employment counsellors", 2, "social", [
        "Career counselling", "Labour market knowledge", "Assessment",
        "Communication", "Case management", "Resume writing",
        "Interview coaching", "Referral services", "Report writing",
    ]),
    ("4212", "Social and community service workers", 3, "social", [
        "Case management", "Client assessment", "Counselling",
        "Crisis intervention", "Report writing", "Referral",
        "Community outreach", "Documentation",
    ]),
    ("6221", "Technical sales specialists", 2, "sales_service", [
        "Sales", "Customer relationship management", "Product knowledge",
        "Negotiation", "Presentation", "Communication",
        "Market analysis", "Proposal writing",
    ]),
    ("1431", "Accounting and related clerks", 4, "business", [
        "Data entry", "Accounts payable", "Accounts receivable",
        "Spreadsheets", "Filing", "Customer service", "Attention to detail",
    ]),
    ("1211", "Supervisors, general office and administrative support workers", 2, "business", [
        "Supervision", "Scheduling", "Performance management",
        "Office administration", "Training", "Communication",
        "Problem-solving", "Record keeping",
    ]),
    ("2141", "Industrial and manufacturing engineers", 1, "sciences", [
        "Process engineering", "Quality control", "Lean manufacturing",
        "Project management", "Technical drawing", "Problem-solving",
        "Data analysis", "Equipment maintenance planning",
    ]),
    ("7302", "Contractors and supervisors, electrical trades", 2, "trades", [
        "Electrical supervision", "Project coordination", "Scheduling",
        "Safety compliance", "Budget management", "Team leadership",
        "Blueprint reading", "Electrical codes",
    ]),
    ("0711", "Construction managers", 0, "management", [
        "Project management", "Budgeting", "Scheduling", "Contract management",
        "Safety management", "Team leadership", "Blueprint reading",
        "Stakeholder communication",
    ]),

    # ── Trade / blue-collar target occupations ────────────────────────────────
    ("7251", "Contractors and supervisors, plumbing trades", 2, "trades", [
        "Plumbing", "Pipe fitting", "Blueprint reading", "Troubleshooting",
        "Safety compliance", "Customer service", "Tool use",
        "Water systems", "Drainage systems", "Code compliance",
    ]),
    ("7271", "Plumbers", 2, "trades", [
        "Pipe installation", "Blueprint reading", "Soldering", "Troubleshooting",
        "Plumbing codes", "Water supply systems", "Drainage",
        "Customer service", "Tool operation", "Safety practices",
    ]),
    ("7241", "Electricians (except industrial and power system)", 2, "trades", [
        "Electrical wiring", "Blueprint reading", "Circuit installation",
        "Safety protocols", "Electrical code", "Troubleshooting",
        "Panel installation", "Tool use", "Customer service",
    ]),
    ("7247", "Telecommunications line and cable workers", 2, "trades", [
        "Cable installation", "Network wiring", "Troubleshooting",
        "Equipment installation", "Safety practices", "Technical documentation",
        "Customer service", "Fibre optics",
    ]),
    ("7231", "Machinists and machining and tooling inspectors", 2, "trades", [
        "Machining", "Blueprint reading", "CNC operation", "Quality inspection",
        "Precision measurement", "Tool maintenance", "Metal working",
        "Technical drawing", "Problem-solving",
    ]),
    ("7232", "Tool and die makers", 2, "trades", [
        "Tool fabrication", "CNC programming", "Blueprint reading",
        "Precision machining", "Metal working", "Quality control",
        "CAD software", "Problem-solving",
    ]),
    ("7311", "Construction millwrights and industrial mechanics", 2, "trades", [
        "Mechanical installation", "Troubleshooting", "Blueprint reading",
        "Equipment maintenance", "Hydraulics", "Pneumatics",
        "Welding basics", "Safety practices", "Precision alignment",
    ]),
    ("7312", "Heavy-duty equipment technicians", 2, "trades", [
        "Diesel engine repair", "Hydraulics", "Electrical systems",
        "Diagnostic tools", "Blueprint reading", "Welding basics",
        "Preventive maintenance", "Safety practices",
    ]),
    ("7321", "Automotive service technicians, truck and bus mechanics", 2, "trades", [
        "Engine repair", "Diagnostic equipment", "Hydraulic systems",
        "Electrical troubleshooting", "Customer service",
        "Preventive maintenance", "Safety practices", "Parts ordering",
    ]),
    ("7371", "Crane operators", 2, "trades", [
        "Crane operation", "Load calculations", "Rigging",
        "Safety compliance", "Signal communication", "Blueprint reading",
        "Spatial awareness", "Mechanical knowledge",
    ]),
    ("7372", "Drillers and blasters, surface mining, quarrying and construction", 2, "trades", [
        "Drilling operation", "Explosives handling", "Safety protocols",
        "Blueprint reading", "Equipment maintenance", "Environmental compliance",
        "Site assessment",
    ]),
    ("7611", "Construction trades helpers and labourers", 5, "trades", [
        "Physical labour", "Tool operation", "Safety practices",
        "Material handling", "Site cleanup", "Equipment assistance",
        "Team collaboration",
    ]),
    ("7612", "Other trades helpers and labourers", 5, "trades", [
        "Manual labour", "Tool operation", "Safety practices",
        "Material handling", "Team collaboration", "Following instructions",
    ]),
    ("8221", "Supervisors, mining and quarrying", 2, "natural_resources", [
        "Mine supervision", "Safety management", "Production planning",
        "Equipment oversight", "Team leadership", "Reporting",
        "Environmental compliance",
    ]),
    ("8231", "Underground production and development miners", 3, "natural_resources", [
        "Underground mining", "Drilling", "Blasting", "Safety practices",
        "Equipment operation", "Ore extraction", "Ventilation knowledge",
    ]),
    ("8232", "Oil and gas well drillers, servicers, testers and related workers", 3, "natural_resources", [
        "Drilling operations", "Well servicing", "Pressure systems",
        "Safety compliance", "Equipment maintenance", "Technical reporting",
        "Environmental awareness",
    ]),
    ("7441", "Residential and commercial installers and servicers", 3, "trades", [
        "HVAC installation", "Sheet metal work", "Troubleshooting",
        "Customer service", "Blueprint reading", "Safety practices",
        "Tool operation", "Code compliance",
    ]),
    ("7442", "Waterworks and gas maintenance workers", 3, "trades", [
        "Pipeline maintenance", "Gas systems", "Safety protocols",
        "Leak detection", "Excavation", "Documentation",
        "Customer communication",
    ]),
    ("8411", "Underground mine service and support workers", 4, "natural_resources", [
        "Equipment operation", "Safety practices", "Material handling",
        "Maintenance support", "Team collaboration",
    ]),
    ("9221", "Supervisors, mineral and metal processing", 2, "manufacturing", [
        "Process supervision", "Quality control", "Safety management",
        "Production planning", "Team leadership", "Equipment oversight",
        "Reporting", "Environmental compliance",
    ]),
    ("9411", "Machine operators, mineral and metal processing", 4, "manufacturing", [
        "Machine operation", "Quality monitoring", "Safety practices",
        "Production targets", "Equipment maintenance basics",
        "Documentation", "Team collaboration",
    ]),
    ("7282", "Concrete finishers", 3, "trades", [
        "Concrete placement", "Finishing techniques", "Blueprint reading",
        "Tool operation", "Safety practices", "Quality inspection",
        "Physical stamina",
    ]),
    ("7283", "Tilesetters", 3, "trades", [
        "Tile installation", "Surface preparation", "Blueprint reading",
        "Tool operation", "Customer service", "Material estimation",
        "Attention to detail",
    ]),
    ("7511", "Transport truck drivers", 3, "trades", [
        "Commercial vehicle operation", "Route planning", "Logbook maintenance",
        "Safety compliance", "Customer service", "Load securement",
        "Vehicle inspection",
    ]),
]


def main():
    print("Seeding SkillForge DB with curated NOC 2021 occupations...")
    db.init_db()

    total_occupations = 0
    total_skills = 0

    with db.db() as conn:
        for noc_code, title, teer, broad_category, skills in OCCUPATIONS:
            db.upsert_occupation(conn, noc_code, title, teer, broad_category)
            total_occupations += 1
            for skill_label in skills:
                db.upsert_skill(conn, noc_code, "seed", skill_label)
                total_skills += 1

    print(f"  Inserted/updated {total_occupations} occupations")
    print(f"  Inserted {total_skills} skill mappings")
    print("Done.")


if __name__ == "__main__":
    main()
