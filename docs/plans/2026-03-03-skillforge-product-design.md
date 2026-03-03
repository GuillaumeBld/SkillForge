# SkillForge Product Design

**Date**: 2026-03-03
**Status**: Approved
**Phase**: MVP — School Intake Tool (Option A)

---

## Problem

AI is displacing white-collar workers faster than the labour market can redirect them. Vocational schools and LMDA/WDA case managers lack a fast, evidence-based tool to assess displaced workers and match them to high-demand trades with funding eligibility pre-computed.

## Solution

A B2B2C SaaS intake assessment tool for Canadian vocational schools. A school advisor enters a displaced worker's current occupation; SkillForge returns ranked trade pathway recommendations with skill-transfer rationale, demand outlook, and LMDA/WDA funding eligibility. The advisor selects a program and generates a referral package.

---

## Users

| User | Role | Interaction |
|------|------|-------------|
| School intake advisor | Primary (paying customer) | Assesses prospective students, selects programs |
| Displaced worker | End user | Receives recommendations via advisor |
| School administrator | Secondary | Manages seat count, views intake analytics |
| LMDA/WDA case manager | Future (Phase 2) | Routes government-funded clients |

---

## Core Flow

```
1. Advisor opens SkillForge web app
2. Enters: worker's current job title (or NOC code), province, years experience,
   priority group flags (youth / newcomer / indigenous / visible minority / disability)
3. SkillForge engine runs z-score match:
   composite = 0.40 × Z_skill + 0.40 × Z_demand + 0.20 × Z_wage
4. Match report displayed: top 5 trade pathways
5. Advisor selects a program → generates LMDA referral checklist
6. Record saved to school intake log
```

---

## Three Screens

### Screen 1: Intake Form

Fields:
- Current job title (text autocomplete → maps to NOC 2021)
- Province (dropdown, default: ON)
- Years of experience (slider: 0–30)
- Priority group checkboxes: Youth (15-29), Newcomer (<5yr), Indigenous, Visible minority, Disability
- Optional: EI eligibility (Yes / No / Unknown)

Design principle: 30-second completion. No registration required for trial (first 30 intakes free).

### Screen 2: Match Report

Layout: card list, sorted by composite score descending.

Each card shows:
- Trade title + NOC code + TEER level
- Composite score (visual bar) + "Why it fits" tooltip (skill transfer explanation)
- Market demand badge: "High demand — COPS shortage + Express Entry priority"
- Funding badge: "✓ LMDA eligible — up to $28,000" or "✓ WDA eligible"
- Estimated training: type, duration, Red Seal eligible?
- AI tools in this trade (3 examples)
- CTA: "Select this program →"

### Screen 3: Referral Package

Generated after advisor selects a program:
- Worker summary (name optional, NOC, matched trade)
- Eligibility assessment (LMDA / WDA / Canada Job Grant / Apprenticeship grants)
- Funding amounts by source
- School program details (name, duration, cost, next intake date — pulled from school's program list)
- LMDA referral checklist (printable PDF)
- Email button → sends package to worker + case manager

---

## Architecture

```
Browser (Next.js / Vercel)
    │
    ├── POST /match → SkillForge FastAPI engine (port 8000)
    ├── GET  /demand/:noc
    └── GET  /funding
                │
                └── SQLite DB (NOC embeddings, demand signals)

School intake records → Separate SQLite table (per-school)
PDF generation → @react-pdf/renderer or Puppeteer
```

**Phase 1 deployment**: Vercel (frontend) + fly.io or Railway (engine). No Docker complexity. Engine instance per school not required — one shared engine, per-school SQLite for intake records.

---

## Revenue Model

| Tier | Price | Includes |
|------|-------|---------|
| Trial | Free | 30 intakes, no referral package |
| School | $299/mo | Unlimited intakes, referral package, intake log |
| Portfolio | $999/mo | Up to 10 school locations, admin analytics |

Annual prepay: 2 months free.

**Primary distribution channel**: You own the schools you acquire. Zero CAC for first customers.

---

## Competitive Moat

1. **NOC 2021 native** — built on the authoritative Canadian taxonomy, not imported US O*NET directly
2. **LMDA/WDA pre-computed** — no competitor integrates government funding eligibility into the match
3. **Demand signals** — COPS + Express Entry + Job Bank, live-updated quarterly
4. **Owns the school** — distribution moat; schools you acquire use it by default

---

## Phase Roadmap

| Phase | Scope | Timeline |
|-------|-------|----------|
| 1 — Engine | Matching pipeline, REST API | Done |
| 2 — Intake Tool | 3-screen web app, PDF generation | Weeks 1-4 |
| 3 — School admin | Multi-school, intake analytics | Weeks 5-8 |
| 4 — Worker self-serve portal | skillforge.ca public intake | After first acquisition |
| 5 — Case manager portal | Government LMDA/WDA integration | Post-acquisition |

---

## Success Criteria (MVP)

- [ ] Advisor can complete intake + get match report in < 2 minutes
- [ ] Top match has composite score > 0.70 for typical white-collar NOC codes (1311, 2173, 4155)
- [ ] LMDA referral package is printable and includes correct funding amounts by province
- [ ] School can view their intake log with all past assessments
- [ ] First paying school within 30 days of launch

---

## Open Questions (Phase 2+)

- How does the school's program catalog sync? (Manual CSV upload vs. structured intake)
- Do case managers need a separate portal or do schools grant them view access?
- What data does Statistics Canada require for LMIA/LMDA outcome reporting?
