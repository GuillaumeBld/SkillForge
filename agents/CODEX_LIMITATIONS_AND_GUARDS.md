# Codex Limitations and Guardrails

Understanding Codex limitations keeps SkillForge deliveries safe and predictable. Use these guardrails—drawn from OpenAI's Codex documentation and internal retrospectives—to mitigate common pitfalls.

## Known limitations

- **Stale context** – Codex only sees what you paste or stream. If you omit recent commits or schema changes, it may produce regressions.
- **Hallucinated APIs** – The model can invent functions, packages, or CLI flags. Always cross-check against the repository and official SDK docs.
- **Loose typing or validation** – Suggestions may skip zod/TypeScript refinements or Prisma validation. Reinforce these expectations in the prompt.
- **Rate limits and retries** – Completions API requests may return HTTP `429` under load. Implement exponential backoff and surface the error to the operator.
- **Security blind spots** – Without explicit reminders, Codex may log secrets, skip auth checks, or return verbose stack traces.

## Guardrails for every request

1. **Context curation**
   - Provide the exact file segments you intend to modify along with surrounding code.
   - Summarize large files rather than truncating mid-block to avoid malformed syntax.
2. **Determinism controls**
   - Use `temperature: 0`, `top_p: 1`, and explicit `stop` tokens (e.g., `"```"`, `"\n\n"`) to limit unexpected continuations.
   - Cap `max_tokens` to the estimated diff size plus safety margin.
3. **Verification loop**
   - Run lint, typecheck, tests, and targeted smoke commands after each change.
   - Compare generated code to official APIs and existing patterns before committing.
4. **Security posture**
   - Remind Codex to scrub secrets, respect RBAC, and validate user input.
   - Keep `.env.example` and secret rotation docs in sync with any configuration change.
5. **Human review readiness**
   - Keep diffs small (<300 lines when possible) and document rollback steps.
   - Capture command outputs for the validation file to de-risk reviewer approval.

## Escalation checklist

Complete this checklist before merging:

- [ ] Acceptance criteria mapped to concrete tests.
- [ ] No secrets or PII introduced; `.env.example` updated instead.
- [ ] Validation file populated with command outputs or log links.
- [ ] Rollback plan documented and executable.
- [ ] Reviewer runbook or PR checklist updated if operational impact exists.
- [ ] API rate limits, error handling, and logging verified for any new automation using Codex.

Following these guardrails keeps Codex contributions aligned with SkillForge's production-readiness gates.
