# SkillForge Intake Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 3-screen Next.js web app for vocational school advisors to assess displaced workers and generate LMDA/WDA funding referral packages using the SkillForge matching engine.

**Architecture:** Next.js 15 App Router frontend (TypeScript + Tailwind) calls the existing SkillForge FastAPI engine at `http://localhost:8000`. Per-school intake records stored in the engine's SQLite DB. PDF referral packages generated server-side with `@react-pdf/renderer`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, `@react-pdf/renderer`, SWR, Zod for validation, FastAPI engine (already built at `/Volumes/SanDisk/dev/projects/skillforge/`)

---

## Prerequisites

Engine must be running: `cd /Volumes/SanDisk/dev/projects/skillforge && make run`
Confirm health: `curl http://localhost:8000/health` → `{"status":"ok"}`

---

### Task 1: Bootstrap Next.js App

**Files:**
- Create: `skillforge-web/` (new directory)

**Step 1: Scaffold project**

```bash
cd /Volumes/SanDisk/dev/projects
npx create-next-app@latest skillforge-web \
  --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --no-eslint
cd skillforge-web
```

**Step 2: Install dependencies**

```bash
npm install swr zod @react-pdf/renderer
npm install -D @types/react-pdf
```

**Step 3: Configure engine proxy in next.config.ts**

Replace `next.config.ts` content:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/engine/:path*",
        destination: `${process.env.ENGINE_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

**Step 4: Create .env.local**

```bash
echo 'ENGINE_URL=http://localhost:8000' > .env.local
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: server on http://localhost:3000 with default Next.js page.

**Step 6: Commit**

```bash
git init && git add -A
git commit -m "feat: bootstrap Next.js skillforge-web"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `types/skillforge.ts`

**Step 1: Write types matching engine response shapes**

```typescript
// types/skillforge.ts

export interface MatchRequest {
  current_noc: string;
  current_title: string;
  years_experience?: number;
  education_level?: "secondary" | "college" | "university";
  is_youth?: boolean;
  is_newcomer?: boolean;
  is_indigenous?: boolean;
  is_visible_minority?: boolean;
  is_person_with_disability?: boolean;
  province?: string;
  top_k?: number;
}

export interface MatchResultItem {
  noc_code: string;
  title: string;
  teer: number;
  composite_score: number;
  skill_similarity: number;
  demand_score: number;
  wage_growth: number;
  funding_eligible: boolean;
  training_programs: string[];
  ai_tools: string[];
}

export interface MatchResponse {
  source_noc: string;
  source_title: string;
  matches: MatchResultItem[];
  engine_version: string;
  embeddings_loaded: number;
}

export interface DemandResponse {
  noc_code: string;
  composite: number;
  vacancy_rate: number;
  cops_shortage: number;
  express_entry_priority: number;
  retirement_replacement: number;
}

export interface IntakeFormData {
  jobTitle: string;
  noc: string;
  province: string;
  yearsExperience: number;
  isYouth: boolean;
  isNewcomer: boolean;
  isIndigenous: boolean;
  isVisibleMinority: boolean;
  isDisability: boolean;
  isEiEligible: boolean | null;
}
```

**Step 2: Commit**

```bash
git add types/skillforge.ts
git commit -m "feat: add SkillForge type definitions"
```

---

### Task 3: NOC Title → Code Lookup

**Files:**
- Create: `lib/noc-lookup.ts`

**Step 1: Write static lookup table for common white-collar NOC codes**

```typescript
// lib/noc-lookup.ts
// Common displaced white-collar titles → NOC 2021 code

export const NOC_LOOKUP: Record<string, { code: string; title: string }> = {
  "accountant": { code: "1311", title: "Accounting technicians and bookkeepers" },
  "bookkeeper": { code: "1311", title: "Accounting technicians and bookkeepers" },
  "financial analyst": { code: "1112", title: "Financial and investment analysts" },
  "hr manager": { code: "0112", title: "Human resources managers" },
  "human resources": { code: "1121", title: "Human resources professionals" },
  "software developer": { code: "2173", title: "Software engineers and designers" },
  "software engineer": { code: "2173", title: "Software engineers and designers" },
  "data analyst": { code: "2172", title: "Database analysts and data administrators" },
  "marketing manager": { code: "0124", title: "Advertising, marketing and PR managers" },
  "insurance adjuster": { code: "1312", title: "Insurance adjusters and claims examiners" },
  "paralegal": { code: "4211", title: "Paralegal and related occupations" },
  "project manager": { code: "0213", title: "Computer and information systems managers" },
  "office manager": { code: "0114", title: "Other administrative services managers" },
  "loan officer": { code: "1114", title: "Other financial officers" },
  "clerk": { code: "1411", title: "General office support workers" },
  "administrative assistant": { code: "1241", title: "Administrative assistants" },
  "customer service": { code: "6552", title: "Other customer and information services reps" },
  "graphic designer": { code: "5241", title: "Graphic designers and illustrators" },
  "journalist": { code: "5122", title: "Editors" },
  "teacher": { code: "4032", title: "Elementary school and kindergarten teachers" },
  "social worker": { code: "4152", title: "Social workers" },
};

export function lookupNoc(title: string): { code: string; title: string } | null {
  const key = title.toLowerCase().trim();
  // Exact match
  if (NOC_LOOKUP[key]) return NOC_LOOKUP[key];
  // Partial match
  for (const [k, v] of Object.entries(NOC_LOOKUP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}
```

**Step 2: Commit**

```bash
git add lib/noc-lookup.ts
git commit -m "feat: add NOC title lookup table"
```

---

### Task 4: Engine API Client

**Files:**
- Create: `lib/engine.ts`

**Step 1: Write fetch wrapper for engine endpoints**

```typescript
// lib/engine.ts
import type { MatchRequest, MatchResponse, DemandResponse } from "@/types/skillforge";

const BASE = "/api/engine"; // proxied by next.config.ts rewrites

export async function matchOccupations(req: MatchRequest): Promise<MatchResponse> {
  const res = await fetch(`${BASE}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Engine error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getDemand(nocCode: string): Promise<DemandResponse> {
  const res = await fetch(`${BASE}/demand/${nocCode}`);
  if (!res.ok) throw new Error(`Demand fetch failed: ${res.status}`);
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
```

**Step 2: Commit**

```bash
git add lib/engine.ts
git commit -m "feat: add engine API client"
```

---

### Task 5: Intake Form — Screen 1

**Files:**
- Create: `app/page.tsx` (replaces default)
- Create: `components/IntakeForm.tsx`

**Step 1: Write IntakeForm component**

```typescript
// components/IntakeForm.tsx
"use client";
import { useState } from "react";
import { lookupNoc } from "@/lib/noc-lookup";
import type { IntakeFormData } from "@/types/skillforge";

interface Props {
  onSubmit: (data: IntakeFormData) => void;
  loading: boolean;
}

export function IntakeForm({ onSubmit, loading }: Props) {
  const [jobTitle, setJobTitle] = useState("");
  const [nocHint, setNocHint] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<IntakeFormData, "jobTitle" | "noc">>({
    province: "ON",
    yearsExperience: 5,
    isYouth: false,
    isNewcomer: false,
    isIndigenous: false,
    isVisibleMinority: false,
    isDisability: false,
    isEiEligible: null,
  });

  const handleTitleChange = (v: string) => {
    setJobTitle(v);
    const match = lookupNoc(v);
    setNocHint(match ? `→ NOC ${match.code}: ${match.title}` : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = lookupNoc(jobTitle);
    onSubmit({
      jobTitle,
      noc: match?.code ?? "",
      ...form,
    });
  };

  const toggle = (field: keyof typeof form) =>
    setForm((f) => ({ ...f, [field]: !f[field] }));

  const PROVINCES = ["ON","BC","AB","QC","MB","SK","NS","NB","NL","PE","NT","NU","YT"];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-900">SkillForge Intake</h1>

      <div>
        <label className="block text-sm font-medium mb-1">Current job title *</label>
        <input
          required
          value={jobTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="e.g. Financial Analyst, Software Developer"
          className="w-full border rounded px-3 py-2 text-sm"
        />
        {nocHint && <p className="text-xs text-blue-600 mt-1">{nocHint}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Province</label>
          <select
            value={form.province}
            onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Years experience</label>
          <input
            type="number" min={0} max={40}
            value={form.yearsExperience}
            onChange={(e) => setForm((f) => ({ ...f, yearsExperience: Number(e.target.value) }))}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium mb-2">Priority groups (check all that apply)</legend>
        <div className="space-y-2">
          {[
            ["isYouth", "Youth (age 15-29)"],
            ["isNewcomer", "Newcomer to Canada (<5 years)"],
            ["isIndigenous", "Indigenous"],
            ["isVisibleMinority", "Visible minority"],
            ["isDisability", "Person with disability"],
          ].map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form[field as keyof typeof form] as boolean}
                onChange={() => toggle(field as keyof typeof form)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium mb-1">EI eligible?</label>
        <div className="flex gap-4">
          {[["yes", true], ["no", false], ["unknown", null]].map(([label, val]) => (
            <label key={String(label)} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="radio"
                name="ei"
                checked={form.isEiEligible === val}
                onChange={() => setForm((f) => ({ ...f, isEiEligible: val as boolean | null }))}
              />
              {String(label).charAt(0).toUpperCase() + String(label).slice(1)}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !jobTitle}
        className="w-full bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
      >
        {loading ? "Matching…" : "Find Trade Pathways →"}
      </button>
    </form>
  );
}
```

**Step 2: Write page.tsx to host the form**

```typescript
// app/page.tsx
"use client";
import { useState } from "react";
import { IntakeForm } from "@/components/IntakeForm";
import { matchOccupations } from "@/lib/engine";
import type { IntakeFormData, MatchResponse } from "@/types/skillforge";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ form: IntakeFormData; match: MatchResponse } | null>(null);

  const handleSubmit = async (data: IntakeFormData) => {
    if (!data.noc) {
      setError("Job title not recognized. Enter a NOC code manually or try a different title.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const match = await matchOccupations({
        current_noc: data.noc,
        current_title: data.jobTitle,
        years_experience: data.yearsExperience,
        province: data.province,
        is_youth: data.isYouth,
        is_newcomer: data.isNewcomer,
        is_indigenous: data.isIndigenous,
        is_visible_minority: data.isVisibleMinority,
        is_person_with_disability: data.isDisability,
        top_k: 5,
      });
      setResult({ form: data, match });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg.includes("fetch")) {
        setError("SkillForge engine is not running. Start it with `make run` in the skillforge/ directory.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    // Screen 2 — Match Report (built in Task 6)
    return <div>Results for {result.form.jobTitle}: {result.match.matches.length} matches. (Task 6)</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      {error && (
        <div className="max-w-lg mx-auto mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
          {error}
        </div>
      )}
      <IntakeForm onSubmit={handleSubmit} loading={loading} />
    </main>
  );
}
```

**Step 3: Test in browser**

```bash
npm run dev
```
Open http://localhost:3000. Fill out "Financial Analyst", ON, 8 years. Click button.
Expected: placeholder result div shows (engine must be running).

**Step 4: Commit**

```bash
git add app/page.tsx components/IntakeForm.tsx
git commit -m "feat: add intake form screen 1"
```

---

### Task 6: Match Report — Screen 2

**Files:**
- Create: `components/MatchReport.tsx`
- Modify: `app/page.tsx` (swap placeholder for MatchReport)

**Step 1: Write MatchReport component**

```typescript
// components/MatchReport.tsx
"use client";
import type { MatchResultItem, IntakeFormData } from "@/types/skillforge";

interface Props {
  sourceTitle: string;
  sourceNoc: string;
  matches: MatchResultItem[];
  form: IntakeFormData;
  onSelect: (match: MatchResultItem) => void;
  onBack: () => void;
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-amber-400" : "bg-gray-300";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function DemandBadge({ score, copsShortage, expressEntry }: { score: number; copsShortage?: boolean; expressEntry?: boolean }) {
  const label = score >= 0.70 ? "High demand" : score >= 0.50 ? "Moderate demand" : "Lower demand";
  const color = score >= 0.70 ? "bg-green-100 text-green-800" : score >= 0.50 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {label}
      {copsShortage && " · COPS shortage"}
      {expressEntry && " · Express Entry"}
    </span>
  );
}

const TEER_LABEL: Record<number, string> = {
  0: "Management", 1: "University/college", 2: "College/apprenticeship",
  3: "College/training", 4: "High school", 5: "Short demo",
};

export function MatchReport({ sourceTitle, sourceNoc, matches, form, onSelect, onBack }: Props) {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={onBack} className="text-sm text-blue-600 mb-6">← Back</button>

      <h1 className="text-2xl font-bold mb-1">Trade Pathways</h1>
      <p className="text-gray-500 text-sm mb-6">
        {sourceTitle} (NOC {sourceNoc}) · {form.province} · {form.yearsExperience}yr experience
      </p>

      <div className="space-y-4">
        {matches.map((m, i) => (
          <div key={m.noc_code} className="border rounded-lg p-5 hover:shadow-sm transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs text-gray-400 mr-2">#{i + 1}</span>
                <span className="font-semibold">{m.title}</span>
                <span className="ml-2 text-xs text-gray-400">NOC {m.noc_code} · TEER {m.teer}</span>
                <p className="text-xs text-gray-400">{TEER_LABEL[m.teer]} training</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {Math.round(m.composite_score * 100)}
                </div>
                <div className="text-xs text-gray-400">match score</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
              <div>
                <div className="text-gray-400 mb-1">Skill transfer</div>
                <ScoreBar value={m.skill_similarity} />
              </div>
              <div>
                <div className="text-gray-400 mb-1">Market demand</div>
                <ScoreBar value={m.demand_score} />
              </div>
              <div>
                <div className="text-gray-400 mb-1">Wage growth</div>
                <ScoreBar value={m.wage_growth} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <DemandBadge score={m.demand_score} />
              {m.funding_eligible && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                  ✓ LMDA/WDA eligible
                </span>
              )}
            </div>

            {m.training_programs.length > 0 && (
              <p className="text-xs text-gray-500 mb-2">
                Training: {m.training_programs.slice(0, 2).join(" · ")}
              </p>
            )}
            {m.ai_tools.length > 0 && (
              <p className="text-xs text-gray-400 mb-3">
                AI tools: {m.ai_tools.slice(0, 3).join(", ")}
              </p>
            )}

            <button
              onClick={() => onSelect(m)}
              className="w-full mt-1 border border-blue-600 text-blue-600 text-sm py-1.5 rounded hover:bg-blue-50 transition"
            >
              Select this program →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Wire MatchReport into page.tsx**

Replace the `if (result)` block in `app/page.tsx`:

```typescript
// In app/page.tsx, add to imports:
import { MatchReport } from "@/components/MatchReport";
// Add state for selected match:
const [selected, setSelected] = useState<import("@/types/skillforge").MatchResultItem | null>(null);

// Replace the `if (result)` block:
if (result && !selected) {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <MatchReport
        sourceTitle={result.match.source_title}
        sourceNoc={result.match.source_noc}
        matches={result.match.matches}
        form={result.form}
        onSelect={setSelected}
        onBack={() => setResult(null)}
      />
    </main>
  );
}

if (result && selected) {
  return <div>Referral package for {selected.title} (Task 7)</div>;
}
```

**Step 3: Test in browser**

Complete the intake form → verify 5 match cards appear with score bars and badges.
Verify "Select this program →" shows referral placeholder.

**Step 4: Commit**

```bash
git add components/MatchReport.tsx app/page.tsx
git commit -m "feat: add match report screen 2"
```

---

### Task 7: Referral Package — Screen 3

**Files:**
- Create: `components/ReferralPackage.tsx`
- Create: `app/api/referral-pdf/route.ts` (server-side PDF)

**Step 1: Write ReferralPackage display component**

```typescript
// components/ReferralPackage.tsx
"use client";
import { useState } from "react";
import type { MatchResultItem, IntakeFormData } from "@/types/skillforge";

const FUNDING_BY_PROVINCE: Record<string, { lmda: string; wda: string }> = {
  ON: { lmda: "up to $28,000", wda: "Canada Job Grant + WDA" },
  BC: { lmda: "up to $20,000 (StrongerBC)", wda: "Canada Job Grant" },
  AB: { lmda: "up to $15,000", wda: "Canada Job Grant" },
  QC: { lmda: "up to $20,000 (Emploi-Québec)", wda: "PAMT" },
  default: { lmda: "up to $15,000", wda: "Canada Job Grant" },
};

interface Props {
  match: MatchResultItem;
  form: IntakeFormData;
  onBack: () => void;
}

export function ReferralPackage({ match, form, onBack }: Props) {
  const [downloading, setDownloading] = useState(false);
  const funding = FUNDING_BY_PROVINCE[form.province] ?? FUNDING_BY_PROVINCE.default;
  const isRedSeal = match.teer <= 2 && match.noc_code[0] === "7";

  const download = async () => {
    setDownloading(true);
    const res = await fetch("/api/referral-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match, form }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skillforge-referral-${match.noc_code}.pdf`;
    a.click();
    setDownloading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={onBack} className="text-sm text-blue-600 mb-6">← Back to matches</button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h1 className="text-xl font-bold mb-1">Referral Package</h1>
        <p className="text-gray-600 text-sm">
          {form.jobTitle} → {match.title} (NOC {match.noc_code})
        </p>
      </div>

      <section className="mb-6">
        <h2 className="font-semibold mb-3">Funding Eligibility</h2>
        <div className="space-y-2 text-sm">
          {form.isEiEligible !== false && (
            <div className="flex items-start gap-2">
              <span className="text-green-600">✓</span>
              <div>
                <strong>LMDA (EI-funded)</strong> — {funding.lmda} for approved training
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <div>
              <strong>WDA</strong> — {funding.wda} (all displaced workers)
            </div>
          </div>
          {isRedSeal && (
            <>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <div><strong>Apprenticeship Incentive Grant</strong> — $1,000/year during apprenticeship</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <div><strong>Apprenticeship Completion Bonus</strong> — $2,000 at Red Seal</div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-3">LMDA Referral Checklist</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          {[
            "Proof of identity (SIN + government photo ID)",
            "Record of Employment (ROE) from last employer",
            "EI application / EI statement (if EI-eligible)",
            "Educational credentials (if applicable)",
            "Proof of residence in " + form.province,
            form.isYouth ? "Proof of age (youth 15-29 priority)" : null,
            form.isNewcomer ? "Permanent Resident card / proof of landing date" : null,
            form.isIndigenous ? "Indigenous status documentation (optional, self-identification accepted)" : null,
          ]
            .filter(Boolean)
            .map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 w-4 h-4 border border-gray-400 rounded-sm flex-shrink-0" />
                {item}
              </li>
            ))}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-3">Training Program</h2>
        <div className="text-sm text-gray-700 space-y-1">
          <p>Program: {match.training_programs[0] ?? "Trade school / apprenticeship"}</p>
          <p>NOC: {match.noc_code} — {match.title}</p>
          <p>TEER level: {match.teer} — {match.teer <= 2 ? "Apprenticeship / Red Seal eligible" : "Certificate / diploma"}</p>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          onClick={download}
          disabled={downloading}
          className="flex-1 bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
        >
          {downloading ? "Generating PDF…" : "Download PDF"}
        </button>
        <button className="flex-1 border border-gray-300 py-2 rounded font-medium text-sm">
          Email to worker
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Write PDF API route (server-side)**

```typescript
// app/api/referral-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";

// Note: @react-pdf/renderer must run server-side only
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { match, form } = body;

  // Dynamic import to avoid SSR issues
  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
  const React = (await import("react")).default;

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
    title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
    subtitle: { fontSize: 12, color: "#666", marginBottom: 20 },
    section: { marginBottom: 16 },
    heading: { fontSize: 13, fontWeight: "bold", marginBottom: 6 },
    row: { flexDirection: "row", marginBottom: 3 },
    label: { width: 160, color: "#555" },
    value: { flex: 1 },
    checkItem: { flexDirection: "row", marginBottom: 4 },
    box: { width: 10, height: 10, border: "1pt solid #999", marginRight: 6, marginTop: 1 },
  });

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.title }, "SkillForge Referral Package"),
        React.createElement(Text, { style: styles.subtitle },
          `${form.jobTitle} → ${match.title} (NOC ${match.noc_code}) · ${form.province}`
        ),
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.heading }, "Match Summary"),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Composite score"),
          React.createElement(Text, { style: styles.value }, `${Math.round(match.composite_score * 100)}/100`),
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Skill transfer"),
          React.createElement(Text, { style: styles.value }, `${Math.round(match.skill_similarity * 100)}%`),
        ),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Market demand"),
          React.createElement(Text, { style: styles.value }, `${Math.round(match.demand_score * 100)}%`),
        ),
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.heading }, "LMDA Referral Checklist"),
        ...[
          "Proof of identity (SIN + government photo ID)",
          "Record of Employment (ROE)",
          `EI application (if eligible)`,
          `Proof of residence in ${form.province}`,
        ].map((item) =>
          React.createElement(View, { style: styles.checkItem },
            React.createElement(View, { style: styles.box }),
            React.createElement(Text, null, item),
          )
        ),
      ),
    )
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="skillforge-referral-${match.noc_code}.pdf"`,
    },
  });
}
```

**Step 3: Wire ReferralPackage into page.tsx**

```typescript
// Add import in app/page.tsx:
import { ReferralPackage } from "@/components/ReferralPackage";

// Replace the `if (result && selected)` block:
if (result && selected) {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <ReferralPackage
        match={selected}
        form={result.form}
        onBack={() => setSelected(null)}
      />
    </main>
  );
}
```

**Step 4: Test**

Complete full flow: intake form → match report → select a match → referral package.
Click "Download PDF" → verify PDF opens with correct data.

**Step 5: Commit**

```bash
git add components/ReferralPackage.tsx app/api/referral-pdf/route.ts app/page.tsx
git commit -m "feat: add referral package screen 3 with PDF download"
```

---

### Task 8: Engine Health Banner

**Files:**
- Create: `components/EngineStatus.tsx`
- Modify: `app/layout.tsx`

**Step 1: Write EngineStatus component**

```typescript
// components/EngineStatus.tsx
"use client";
import { useEffect, useState } from "react";

export function EngineStatus() {
  const [status, setStatus] = useState<"ok" | "down" | "checking">("checking");

  useEffect(() => {
    fetch("/api/engine/health")
      .then((r) => setStatus(r.ok ? "ok" : "down"))
      .catch(() => setStatus("down"));
  }, []);

  if (status === "checking" || status === "ok") return null;

  return (
    <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm text-center py-2 px-4">
      ⚠️ SkillForge engine is not running. Start it:{" "}
      <code className="bg-red-100 px-1 rounded">make run</code> in the skillforge/ directory.
    </div>
  );
}
```

**Step 2: Add to layout.tsx**

```typescript
// app/layout.tsx — add inside <body> before {children}:
import { EngineStatus } from "@/components/EngineStatus";
// <body><EngineStatus />{children}</body>
```

**Step 3: Commit**

```bash
git add components/EngineStatus.tsx app/layout.tsx
git commit -m "feat: add engine health status banner"
```

---

### Task 9: Deploy to Vercel

**Step 1: Create Vercel project**

```bash
npx vercel --yes
```
Follow prompts. Accept defaults for Next.js detection.

**Step 2: Set environment variable**

```bash
# In Vercel dashboard or CLI:
npx vercel env add ENGINE_URL production
# Enter: https://your-engine.fly.dev (or Railway URL — see Step 3)
```

**Step 3: Deploy engine to fly.io (for production)**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge
fly launch --name skillforge-engine --region yyz   # Toronto
fly deploy
fly secrets set ADMIN_KEY=<your-key>
```

Or skip for now and point at VPS: `ssh vps` then set up a systemd service like signal-dashboard.

**Step 4: Redeploy frontend**

```bash
cd /Volumes/SanDisk/dev/projects/skillforge-web
npx vercel --prod
```

**Step 5: Commit**

```bash
git add -A && git commit -m "chore: add vercel + deployment config"
```

---

## Testing Checklist

For each screen, manually verify with engine running:

- [ ] Intake form: "Financial Analyst" → auto-maps to NOC 1311
- [ ] Intake form: youth + newcomer flags → shows in referral package
- [ ] Match report: 5 cards appear, scores render correctly
- [ ] Match report: "Select this program" → navigates to referral
- [ ] Referral package: LMDA checklist items match priority flags
- [ ] Referral package: PDF downloads and opens correctly
- [ ] Engine banner: appears when `make run` is NOT running
- [ ] Engine banner: hidden when engine is running

---

## File Summary

```
skillforge-web/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              ← orchestrates 3 screens
│   └── api/referral-pdf/
│       └── route.ts          ← server-side PDF generation
├── components/
│   ├── IntakeForm.tsx        ← Screen 1
│   ├── MatchReport.tsx       ← Screen 2
│   ├── ReferralPackage.tsx   ← Screen 3
│   └── EngineStatus.tsx      ← health banner
├── lib/
│   ├── engine.ts             ← API client
│   └── noc-lookup.ts         ← title → NOC lookup
├── types/
│   └── skillforge.ts         ← shared types
└── next.config.ts            ← engine proxy rewrite
```
