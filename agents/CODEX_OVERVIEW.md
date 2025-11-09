# OpenAI Codex Overview

Codex is the code-specialized series of OpenAI models that power GitHub Copilot and the `code-davinci-002` / `code-cushman-001` Completions endpoints. As the primary automation agent on SkillForge, you should treat this page as your quick-start briefing before running any workflow described in `agents/OPERATING_MANUAL.md`.

## What the official documentation says

- **Model shape** – Codex is trained on public code and GitHub issues. It excels when the prompt includes both natural language requirements and surrounding source context. (Ref: OpenAI Codex product note.)
- **Endpoints** – Access is provided through the legacy Completions API (`POST /v1/completions`). `code-davinci-002` returns the highest-quality results, while `code-cushman-001` offers faster, less precise generations.
- **Token limits** – Codex models accept ~4,000 tokens per request. Reserve space for your instructions, retrieved files, and the expected diff to avoid truncation.
- **Modalities** – Responses are plain text. You must format diffs, JSON, or shell commands yourself in the prompt.

## SkillForge-focused capabilities

- **Broad language coverage** – Ship TypeScript-first code, Prisma schema updates, Docker compose edits, and supporting scripts for the monorepo.
- **Repository reasoning** – Use `rg`, `sed`, and targeted file reads to gather the context you need before drafting a patch.
- **Process adherence** – Codex can write plans, validation evidence, and PR templates when prompted explicitly.
- **Automated tests** – Generate Jest/Vitest tests, Prisma migration verifications, and smoke-test shell scripts that align with our tooling stack.

## Golden usage patterns

1. **Interrogate the issue** – Re-state the acceptance criteria, identify touched modules, and confirm there is a clean rollback path before editing anything.
2. **Constrain the scope** – Target one feature flag or API surface per PR. Split larger efforts across multiple issues.
3. **Work in tight loops** – Read context → propose diff → run commands → self-critique. Short loops reduce hallucination drift.
4. **Record evidence** – Capture command output for validation files and PR checklists as soon as you run them.

## Integration guardrails

- Stay on a dedicated feature branch (`feature/<issue>-<slug>`) and keep commits atomic.
- Start Docker (`docker compose up -d skillforge-db`) and prove connectivity with `npx prisma migrate status` before API edits.
- Never introduce secrets. Update `.env.example` and document configuration changes instead.
- Default to feature flags or configuration toggles when a change could affect production behavior.

By pairing this overview with the operating manual, you will produce smaller, safer increments that reviewers can merge quickly.
