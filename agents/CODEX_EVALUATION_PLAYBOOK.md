# Codex Evaluation Playbook

Use this playbook to validate that a Codex-generated change is ready for review. Each section mirrors OpenAI's recommended self-check loop, adapted to SkillForge's gates.

## 1. Prompt hygiene review

- Confirm the final prompt included role, mission, constraints, and explicit deliverables.
- Verify large context files were summarized rather than pasted wholesale to stay within token limits.
- Ensure security and privacy reminders were embedded.

## 2. Output quality scan

- Compare generated code against existing patterns, interfaces, and naming conventions.
- Inspect for hallucinated imports, missing error handling, or divergent formatting.
- Re-run Codex with a refined prompt if gaps appear; prefer iterative improvements over manual rewrites.

## 3. Automated validation

Run the following commands, capturing logs for `docs/validation/<issue>-<slug>.md`:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test` (or the targeted package-specific command)
4. Feature-specific smoke test (document exact command)

If any command fails, fix the root cause before rerunning Codex.

## 4. Manual verification

- Execute the affected user flow or API endpoint locally.
- Record screenshots, cURL traces, or Postman collections as evidence.
- Confirm observability hooks (structured logs, metrics) capture the new behavior if applicable.

## 5. Documentation and release readiness

- Update the issue brief, PR template sections, and changelog entries touched by the change.
- Fill every section of the validation file with links or log excerpts.
- Draft a rollback plan referencing specific `git` commands or feature flag toggles.

## 6. Final go/no-go checklist

- [ ] Acceptance criteria met and demonstrated with tests or screenshots.
- [ ] Security, privacy, and dependency implications reviewed.
- [ ] Rollback plan executable within minutes.
- [ ] Reviewer instructions include one-command setup.
- [ ] Optional extras (feature flags, telemetry) clearly scoped under "Extra Credit."

Following this playbook ensures Codex-generated work products clear SkillForge's production-readiness gates without surprises.
