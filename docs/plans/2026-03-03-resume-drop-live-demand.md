# Resume Drop + Live Demand Signals — Design

## Goal

Replace the manual intake form with a single resume upload (PDF/DOCX), auto-extract occupation data via Claude Haiku 4.5, and replace mocked demand scores with real Statistics Canada and Job Bank data refreshed automatically via n8n.

## Architecture

Resume upload → AI extraction (Haiku structured output) → Fuse.js NOC matching → pre-filled DOORS form. In parallel, two ETL scripts feed live vacancy data (JVWS + Job Bank CSV) into SQLite, replacing the mocked `0.75/0.40` binary in `demand.py`. n8n automates monthly/quarterly refreshes.

## Tech Stack

- **unpdf** — serverless-safe PDF text extraction (Next.js API route)
- **mammoth** — DOCX text extraction
- **Claude Haiku 4.5** — structured resume parsing (`anthropic-beta: structured-outputs-2025-11-13`), ~$0.002/resume
- **Zod + zod-to-json-schema** — define and validate the extracted resume schema
- **Fuse.js** — fuzzy NOC title matching against NOC 2021 illustrative titles corpus (30k+ entries)
- **Statistics Canada WDS API** — free, JVWS table 14-10-0441-01, quarterly vacancy rates by NOC 2021
- **Job Bank Open Data** — free, monthly CSV from open.canada.ca, NOC-tagged posting counts
- **n8n** — existing VPS instance at https://n8n.qualiaai.fr, two workflows for ETL automation

---

## Section 1: Resume Intake UI

Replace the manual form on the home page with a drag-and-drop file upload. Accepts PDF and DOCX only.

On upload, POST to `/api/parse-resume`:
1. Extract raw text (`unpdf` for PDF, `mammoth` for DOCX)
2. Send to Claude Haiku 4.5 with Zod-defined structured output schema
3. Return `{ currentTitle, yearsExperience, skills[], rawText }`

Extracted fields pre-fill the existing DOORS form. User can review and edit before submitting. Manual entry path remains intact. The form auto-populates, not auto-submits.

---

## Section 2: NOC Matching from Extracted Title

A Fuse.js fuzzy match maps the extracted `currentTitle` to NOC 2021 codes.

**Corpus:** Static JSON file built once from the NOC 2021 elements CSV (Statistics Canada, ~30k illustrative job titles). Shipped with the app under `skillforge-web/public/noc-titles.json`.

**Build script:** `scripts/build_noc_corpus.py` — downloads the NOC 2021 elements CSV, extracts `(noc_code, title)` pairs, writes JSON.

**API route:** `/api/match-noc` (or inline in parse-resume). Fuse.js threshold ~0.35. Returns top 3 NOC candidates with scores. User picks one or accepts the top match. Replaces free-text NOC input.

---

## Section 3: Live Demand Signal ETL

### New SQLite tables

```sql
CREATE TABLE jvws_vacancies (
    noc_code TEXT PRIMARY KEY,
    vacancy_rate REAL,
    reference_period TEXT,  -- e.g. "2024-Q4"
    updated_at TEXT
);

CREATE TABLE jobbank_postings (
    noc_code TEXT PRIMARY KEY,
    posting_count INTEGER,
    reference_month TEXT,  -- e.g. "2025-01"
    updated_at TEXT
);
```

### `scripts/fetch_statcan_jvws.py`

- Hits StatCan WDS bulk download: `https://www150.statcan.gc.ca/t1/tbl1/en/dtbl/downloadGET?pid=1410044101`
- Downloads ZIP, parses data CSV
- Extracts vacancy rate (VR) by NOC unit group
- Upserts into `jvws_vacancies` (skips if `reference_period` unchanged)
- No API key required

### `scripts/fetch_jobbank_monthly.py`

- Polls CKAN API: `https://open.canada.ca/api/3/action/package_show?id=ea639e28-c0fc-48bf-b5dd-b8899bd43072`
- Downloads newest monthly CSV resource
- Aggregates `sum(num_vacancies)` by `noc` field
- Upserts into `jobbank_postings`

### `engine/demand.py` update

Replace `fetch_job_bank_vacancy_ratio()` with a function reading from both tables:

```python
VR_MIN, VR_MAX = 0.005, 0.08

def get_vacancy_signal(noc_code: str) -> float:
    jvws_vr = read_jvws(noc_code)   # None if not in table
    jb_count = read_jobbank(noc_code)  # None if not in table

    if jvws_vr is None and jb_count is None:
        # fallback to existing static logic
        return 0.75 if noc_code in COPS_SHORTAGE_CODES else 0.40

    vr_score = normalize(jvws_vr, VR_MIN, VR_MAX) if jvws_vr else 0.5
    log_score = log_normalize(jb_count) if jb_count else 0.5

    signal = 0.65 * vr_score + 0.35 * log_score

    # Seasonal correction for trades/natural resources (NOC 7xxx, 8xxx)
    if noc_code[0] in ("7", "8"):
        signal *= SEASONAL_WEIGHT[current_month()]

    return min(max(signal, 0.0), 1.0)
```

Seasonal weights (monthly multipliers for trades/NR NOC codes):
```python
SEASONAL_WEIGHT = {
    1: 1.25, 2: 1.20, 3: 1.10,
    4: 1.00, 5: 1.00, 6: 1.00,
    7: 1.00, 8: 1.00, 9: 1.00,
    10: 1.05, 11: 1.15, 12: 1.25
}
```

---

## Section 4: n8n Automation

Two workflows on https://n8n.qualiaai.fr:

### Workflow A — Monthly Job Bank refresh (runs 5th of each month)
1. Cron trigger: `0 6 5 * *`
2. SSH node → VPS: `cd /projets/skillforge-engine && venv/bin/python scripts/fetch_jobbank_monthly.py`
3. SSH node → VPS: `cd /projets/skillforge-engine && venv/bin/python scripts/seed_demand.py`
4. Notification on success/failure

### Workflow B — Quarterly JVWS refresh (runs monthly, idempotent)
1. Cron trigger: `0 7 6 * *` (day after Job Bank)
2. SSH node → VPS: `cd /projets/skillforge-engine && venv/bin/python scripts/fetch_statcan_jvws.py`
   - Script exits 0 with "no new data" if `reference_period` unchanged
3. On new data: SSH node → `seed_demand.py`
4. Notification

Both workflows use n8n SSH credentials (VPS at 82.25.112.7, key `~/.ssh/id_ed25519_new`).

---

## Section 5: What stays the same

- DOORS algorithm: `0.40×Z_skill + 0.40×Z_demand + 0.20×Z_wage`
- All existing NOC embeddings (`data/embeddings_cache.json`)
- `seed_demand.py` — still the final step, now called by n8n after each ETL run
- `COPS_SHORTAGE_CODES` and `EXPRESS_ENTRY_PRIORITY` sets — still used as binary flags
- The `DemandSignal.compute_composite()` method — unchanged
- Fallback to static values when live tables are empty (engine works offline)
