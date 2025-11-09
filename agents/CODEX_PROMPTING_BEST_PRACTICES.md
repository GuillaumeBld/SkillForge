# Codex Prompting Best Practices for SkillForge Agents

Optimized prompts help Codex produce precise, reproducible outputs. Treat the steps below as your implementation checklist whenever you interact with the API or run a local agent loop.

## Anchor every prompt in documentation

1. **Role and mission** – Remind Codex it is operating inside the SkillForge repository and must follow the Operating Manual and validation gates.
2. **Repository context** – Inline the impacted file paths, key interfaces, or `rg` snippets you already inspected.
3. **Task framing** – Describe the desired outcome, success criteria, and non-goals in bullet points.
4. **Output contract** – Specify whether you expect a diff, shell commands, JSON, or prose documentation.
5. **Self-check loop** – Ask for risk assessment, validation evidence, and rollback steps before presenting the final answer.

## Guidance from OpenAI's Codex docs

- **State what you want explicitly** – Long, ambiguous prompts yield inconsistent code. Provide exact function signatures, configuration keys, and command names.
- **Prefer incremental edits** – Codex performs best when you include the current implementation and describe the delta you need.
- **Keep token budgets in mind** – Trim unrelated sections so the final request stays well below the ~4,000-token limit.
- **Add temperature hints** – For deterministic diffs, keep `temperature` near `0` and optionally request `logprobs` for auditing.
- **Guardrail with examples** – If you need a specific format, show a short example snippet first.

## Tone and clarity

- Use short, directive sentences that reduce ambiguity.
- Convert acceptance criteria into checklists Codex can restate.
- Provide fallback instructions if critical inputs (e.g., schema definitions) are missing so Codex knows when to pause.
- Reinforce security expectations: no secrets, sanitize inputs, respect auth pathways.

## End-to-end template

```text
System: You are Codex working in the SkillForge monorepo. Follow the Agent Operating Manual. Never leak secrets or PII.

User: Implement <feature>. Context:
- Issue: <link>
- Impacted modules: <paths>
- Acceptance tests: <list>
- Non-goals: <list>

Steps:
1. Outline plan, dependencies, and validation approach.
2. Create feature branch `feature/<issue>-<slug>` and confirm local prerequisites (Docker + Prisma status).
3. Apply the minimal code diff with supporting tests, types, and docs.
4. Run lint, typecheck, unit tests, and targeted smoke test.
5. Populate `docs/validation/<issue>-<slug>.md` with command output links.
6. Summarize risks, mitigations, and rollback commands.

Deliverables: Code diff, updated docs, command logs, validation summary.
```

## Prompt validation checklist

- [ ] Critical files and interfaces referenced explicitly.
- [ ] Token count estimated; large files summarized when possible.
- [ ] Temperature, `max_tokens`, and `stop` parameters chosen for deterministic output.
- [ ] Security, privacy, and rollback reminders embedded.
- [ ] Instructions for capturing and citing validation evidence included.

Run this checklist before each request to ensure Codex has the context it needs for production-ready increments.
