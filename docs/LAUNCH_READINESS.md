# SkillForge MVP Launch Readiness Checklist

This checklist translates the "Execute MVP launch readiness program" task into concrete, environment-aware steps. It is intended for release managers coordinating final verification in staging and pre-production environments.

## 1. Prerequisites
- Access to staging and production clusters (`skillforge-staging`, `skillforge-prod`) with necessary kubeconfig contexts.
- Credentials for CI/CD tooling (GitHub Actions, Argo CD/Flux), observability platforms (Grafana, Tempo, Loki, Prometheus), and security scanners (Snyk, OWASP ZAP, Trivy).
- Synthetic data fixtures referenced in [`docs/TESTPLAN.md`](TESTPLAN.md) and [`docs/DATA_OPERATIONS.md`](DATA_OPERATIONS.md) imported into staging.
- Latest OpenAPI spec validated and published (`docs/api/openapi.yaml`).
- Operational runbooks in [`docs/OPERATIONS.md`](OPERATIONS.md) reviewed by on-call SREs.

## 2. Functional & Non-Functional Validation
1. Deploy the release candidate to **staging** via standard CI/CD workflow.
2. Execute automated suites in this order:
   - `npm run lint`, `npm run test`, and `npm run test:integration` for unit/integration coverage.
   - Contract tests (`npm run test:contracts`) using Schemathesis/Pact against the deployed staging endpoints.
   - E2E scenarios via Playwright/Cypress aligned to persona matrices in [`docs/TESTPLAN.md`](TESTPLAN.md#6-regression-matrices-for-critical-flows).
3. Run accessibility audits:
   - Storybook axe scans (`npm run test:a11y`),
   - Manual NVDA/VoiceOver spot checks for onboarding, assessment, and advisor dashboards.
4. Conduct load and stress tests from the performance toolkit:
   - k6 scenarios matching NFR targets in [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) (auth 400 RPS, search 300 RPS, notification batch 10k/hr).
   - Locust long-running mixed workload (onboarding + assessments + recommendations).
5. Capture metrics and confirm they meet thresholds in [`docs/TESTPLAN.md`](TESTPLAN.md#5-mvp-passfail-criteria). Document deviations and remediation owners.

## 3. Security & Compliance Verification
1. Perform dependency and container scans (Snyk/npm audit, Trivy) on release images; ensure no high/critical issues remain.
2. Execute OWASP ZAP dynamic scan against staging endpoints; remediate findings or document compensating controls.
3. Run static analysis (semgrep) and secret scanning (`npm run scan:secrets`).
4. Facilitate formal threat modeling review with security lead; update [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) if new risks are identified.
5. Validate GDPR/CCPA workflows:
   - Execute consent revocation pipeline from [`docs/DATA_OPERATIONS.md`](DATA_OPERATIONS.md#6-consent-revocation-handling).
   - Verify data retention jobs run in dry-run mode, then confirm deletions on staging copy.

## 4. Runbook & Incident Preparedness Drills
1. Rehearse backup and restore using procedures in [`docs/OPERATIONS.md`](OPERATIONS.md#33-backup--restore-procedures) to meet 30m RTO / 15m RPO.
2. Conduct a blue/green or canary deployment simulation and validate rollback steps.
3. Run game-day scenarios:
   - Resume parser outage,
   - Matching engine queue saturation,
   - Notification service downtime.
   Use [`docs/SEQUENCES.md`](SEQUENCES.md) to verify retry/backoff behaviors.
4. Review on-call escalation and incident communication paths; ensure PagerDuty schedules align with launch window.
5. Confirm observability dashboards show expected traces and alerts are armed per [`docs/OPERATIONS.md`](OPERATIONS.md#42-alert-thresholds).

## 5. Partner & Support Readiness
1. Coordinate with partner enablement team to run sandbox import rehearsals following [`docs/PARTNERS.md`](PARTNERS.md) and [`docs/DATA_OPERATIONS.md`](DATA_OPERATIONS.md#7-partner-specific-data-segregation).
2. Validate webhook flows and SLA monitoring for partner automations.
3. Provide support and GTM teams with updated playbooks, release notes, and KPI dashboards defined in [`docs/ANALYTICS.md`](ANALYTICS.md).
4. Ensure feedback channels (support tickets, analytics dashboards) are ready to capture post-launch signals.

## 6. Exit Criteria & Sign-off
- All pass/fail conditions in [`docs/TESTPLAN.md`](TESTPLAN.md#5-mvp-passfail-criteria) satisfied.
- No Sev1/Sev2 issues open; Sev3 issues have approved mitigations.
- Security/compliance sign-off documented with references to scan reports.
- Operations sign-off confirming restore drill, deployment rehearsal, and alert readiness.
- Product and partner stakeholders approve launch via documented change record.
- Launch evidence logged in the [readiness execution log](#appendix-a---launch-readiness-execution-log-template) with links to dashboards, tickets, and reports.

## 7. Known Environmental Constraints
This repository environment cannot reach staging or production infrastructure, execute external scanners, or modify operational tooling. Use this checklist as guidance for teams with proper network access and credentials.

## Appendix A – Launch Readiness Execution Log Template
Record every verification activity in the table below so auditors and leadership can trace evidence back to the specific run.

| Checklist Section | Activity | Owner | Evidence / Link | Pass/Fail | Follow-up Tasks |
| --- | --- | --- | --- | --- | --- |
| 2. Functional & Non-Functional Validation | e.g., Playwright regression run | QA Lead | Test report URL | ✅ Pass | – |
| 3. Security & Compliance Verification | e.g., OWASP ZAP scan | Security Lead | Scan artifact link | ✅ Pass | – |
| 4. Runbook & Incident Preparedness Drills | e.g., Backup/restore drill | SRE | Runbook log entry | ✅ Pass | – |
| 5. Partner & Support Readiness | e.g., Sandbox import rehearsal | Partnerships PM | Meeting notes / recording | ✅ Pass | – |

> **Tip:** Store the completed log alongside the change record (e.g., in Confluence or the release ticket) so future launches can review the historical evidence trail.
