# SkillForge Testing & Release Readiness Plan

## 1. Purpose & Traceability
This test plan codifies quality expectations for the MVP release of SkillForge. It maps testing activities to:
- **User journeys** documented in [docs/USECASES.md](USECASES.md) (Maya – student, James – career changer, Alicia – advisor, and partner-facing automations).
- **Feature capabilities** in [docs/FEATURES.md](FEATURES.md) and API workflows in [docs/API.md](API.md).
- **Non-functional requirements (NFRs)** in [docs/ARCHITECTURE.md](ARCHITECTURE.md), including performance, availability, security, privacy, accessibility, and observability commitments.

All tests are tagged with the feature module (e.g., `auth`, `assessment`, `matching`), the relevant persona workflow, and the NFR(s) they verify to enable coverage reporting in CI.

## 2. Test Coverage Matrix by Feature & NFR
| Feature / Use Case Reference | Primary Modules | Key NFR Targets | Unit Testing | Integration Testing | Contract Testing | End-to-End Testing | Accessibility Testing | Load & Stress Testing | Security Testing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Account creation & guided onboarding (Student §1; Features 1.1–1.3) | Auth service, Onboarding wizard, Profile API | Auth latency ≤250 ms, 99.9% auth uptime, RBAC, WCAG 2.1 AA onboarding screens | Validate input schemas, password hashing, JWT expiry logic | Auth ↔ PostgreSQL user creation, onboarding service writes baseline skills | Pact tests for `/api/v1/auth/register`, `/api/v1/users/me` | Browser automation for Google OAuth, resume optional path, interruption resume | Keyboard navigation, color contrast, screen reader labels in wizard | 200 RPS signup bursts, 400 RPS peak tolerance | OAuth misuse, rate-limiting, credential stuffing simulations |
| Resume import & skill extraction (Student §2; Features 1.3, 2.1, 2.3) | Resume parser, Skills dashboard, Storage | Async queue throughput, data privacy encryption, P95 ≤750 ms extraction | Parser unit tests for MIME handling, PII redaction | Parser ↔ storage ↔ profile update pipeline | Contract on `/api/v1/skills/profile` payload shapes | Upload/retry flow verifying parsed skill edits | Modal focus management, drag/drop alt text | Batch uploads (1k resumes/hour) with back-pressure | Malware scanning, file type enforcement |
| Self-assessment & competency check (Student §3; Features 2.1–2.3, 6.2) | Assessment engine, Results analyzer, Dashboard | Assessment throughput (75 concurrent submissions), data integrity, analytics tracing | Score calculators, questionnaire branching logic | Assessment API ↔ queue ↔ dashboard updates | Contract for `/api/v1/assessments` request/response | Multi-module completion with offline recovery | Form labels, timing cues for screen readers | Concurrency spikes to 75 submissions with <2 s queue delay | Session hijack prevention, tamper-proof result storage |
| Career exploration & matching (Student §4; Features 3.1–3.3, 4.1) | Matching engine, Occupation search, JAAT data | Search latency ≤350 ms, cache hit ratio KPIs | Match scoring utils, search query builders | Search API ↔ cache ↔ database | Contract for `/api/v1/occupations`, `/api/v1/recommendations` | Role discovery, save favorites, persistence checks | Card semantics, ARIA roles for results | Autocomplete load under 300 RPS | Injection resistance on search parameters |
| Action plan & progress tracking (Student §5; Features 5.1–5.3, 6.1–6.3) | Pathway planner, Task scheduler, Notifications | Reminder delivery SLA (15 min), data retention, PDF export integrity | Task serialization, notification templating | Planner ↔ notification ↔ analytics | Contract for `/api/v1/career-plans` and notification webhook | Cross-device sync of tasks and reminders | Timeline contrast ratios, downloadable artifact tagging | Reminder batch load testing (10k notifications/hr) | Notification spoofing, audit logging |
| Goal setting & ROI modeling (Career changer §2–4; Features 3.1–5.2) | Matching, Financial planner, Dashboard | Salary calc accuracy, performance ≤750 ms, privacy | ROI calculators, wage projection curves | Finance API ↔ profile ↔ analytics | Contract for `/api/v1/financial-plan` (future) | Wizard path verifying persisted inputs | Chart accessibility (ARIA descriptions) | Stress test ROI calculations under cohort imports | Sensitive data masking, authorization per user |
| Advisor portal workflows (Advisor §1–5; Features 3.1 Portal, 3.2 Integration, 7.1) | SSO, Roster sync, Reporting engine | SSO <3 s login, SLA 99.5%, export integrity, audit logs | RBAC guards, roster transformers, notes service | SSO ↔ partner tenancy ↔ roster fetch | Contract for `/api/v1/advisors/*` (portal endpoints) | Portal smoke tests for roster, bulk tasks, reporting | Screen-reader accessible tables, focus traps | Concurrent roster sync (5k students) | RBAC privilege escalation, advisor note encryption |
| Partner import automations (Partners API §4; DATA partner tenancy) | Partner auth, ETL pipelines, Webhooks | Rate limits (1,500 req/hr), data residency, RPO 15 min | ETL parsers, duplicate resolution functions | Partner API ↔ staging bucket ↔ tenancy | Contract for `/api/v1/partners/import` & webhooks | End-to-end synthetic partner feed through sandbox | High-contrast status dashboards for partners | Load test nightly batch (50k records) | API key rotation, webhook signature validation |

## 3. Test Type Details
### 3.1 Unit Testing
- **Scope:** Pure functions, validation schemas, feature toggles, RBAC guards, wage projection calculations, notification templates.
- **Tooling:** Jest (frontend & backend), React Testing Library, ts-jest for shared type coverage.
- **Coverage Targets:** ≥85% statements/functions for modules powering MVP user journeys; mutation tests on critical scoring functions.
- **Traceability:** Unit cases tagged with persona (`student`, `career-changer`, `advisor`, `partner`) and NFR IDs (`perf-auth`, `security-rbac`, etc.) to report coverage vs. requirements in CI dashboards.

### 3.2 Integration Testing
- **Scope:** Service-to-database flows (auth ↔ PostgreSQL, assessments ↔ queue ↔ dashboard), asynchronous job orchestration, notification scheduling, partner ETL staging.
- **Tooling:** Jest + supertest for API-service combos, Testcontainers for PostgreSQL/Redis/Elasticsearch, localstack for S3-style buckets used in partner imports.
- **Success Criteria:** Validate schema migrations, ensure retries/backoff strategies (as defined in `docs/DATA.md` ETL notes), and verify observability signals (OpenTelemetry spans) emit correlation IDs per [docs/ARCHITECTURE.md](ARCHITECTURE.md) standards.

### 3.3 Contract Testing
- **Scope:** API contracts between frontend BFF and backend services, as well as partner webhook payloads.
- **Tooling:** Pact for consumer-driven contracts (`/api/v1/auth/*`, `/api/v1/assessments`, `/api/v1/partners/*`), Schemathesis for OpenAPI schema drift.
- **Coverage:** Every MVP endpoint listed in [docs/API.md](API.md) section 3 (learner) and partner onboarding endpoints (section 5) must have published contracts before release.

### 3.4 End-to-End (E2E) Testing
- **Scope:** Full persona journeys covering registration to action-plan export (Student), roadmap creation (Career changer), advisor bulk assignment & reporting, and a synthetic partner import triggering assessments.
- **Tooling:** Playwright with fixtures for seeded data, Cypress for cross-browser regression.
- **Scenarios:** Happy paths, session resume mid-assessment, offline resume upload, SSO advisor login, partner webhook failure/retry.
- **Exit Criteria:** No critical (severity 1) or high (severity 2) defects outstanding; medium severity items must have mitigation and risk acceptance by product.

### 3.5 Accessibility Testing
- **Scope:** Compliance with WCAG 2.1 AA as stated in [docs/ARCHITECTURE.md](ARCHITECTURE.md).
- **Tooling:** axe-core CI scans, Storybook accessibility testing, manual audits with NVDA & VoiceOver on onboarding, assessments, dashboards, and reporting flows.
- **Focus Areas:** Keyboard-only navigation, form labeling, dynamic updates (ARIA live regions), chart descriptions, color contrast, time-limit accommodations.

### 3.6 Load & Stress Testing
- **Scope:** Validate performance targets listed under "Performance Targets" and "Availability & Capacity Planning" in [docs/ARCHITECTURE.md](ARCHITECTURE.md).
- **Tooling:** k6/Gatling for API throughput, Locust for long-running workflow mixes (onboarding + assessments + recommendations).
- **Profiles:** Marketing campaign surge (400 RPS auth, 300 RPS search), nightly partner import (50k records), assessment concurrency (75 submissions), notification batch jobs (10k/hr).
- **Success Criteria:** P95 latency within targets, zero data loss, auto-scaling triggers at defined CPU/memory thresholds.

### 3.7 Security Testing
- **Scope:** Authentication hardening, RBAC, data encryption, partner scopes, webhook signatures, GDPR deletion workflows.
- **Tooling:** OWASP ZAP scans, Snyk/npm audit, dependency review, manual penetration testing, static code analysis (semgrep), secret scanning.
- **Scenarios:** Credential stuffing, JWT replay, CSRF on onboarding forms, SQL injection in search, SSRF on resume upload, privilege escalation in advisor portal, webhook tampering for partner imports.
- **Compliance:** Evidence captured for SOC 2, GDPR, and CCPA audit checkpoints outlined in [docs/ARCHITECTURE.md](ARCHITECTURE.md) and [docs/PARTNERS.md](PARTNERS.md).

## 4. Environments & Data Management
| Environment | Purpose | Tooling & Config | Data Seeding Procedures | Pass/Fail Gates |
| --- | --- | --- | --- | --- |
| **Local** | Developer productivity, unit/integration tests | Docker Compose (API, PostgreSQL, Redis, Elasticsearch), Storybook | `npm run seed:local` hydrates baseline personas (Maya, James, Alicia) with synthetic skills, plus partner tenant `demo_partner`; fixtures stored in `ops/fixtures/onet/local`. | All unit tests must pass before branch push; lint & typecheck required. |
| **CI** | Automated verification for PRs | GitHub Actions runners with ephemeral containers; Testcontainers for services | Migration smoke seeds executed via `npm run seed:ci` (minimal data in `ops/fixtures/onet/ci`). Contract tests pull canonical pact broker stubs. | ✅ Required: lint, unit, integration, contract, axe-core, dependency scan. ❌ Block PR if any fail. |
| **Sandbox** | External partner integration & exploratory testing | Kubernetes namespace mirroring staging; feature flags optional | Nightly synthetic data load using `terraform apply -target=module.sandbox_seed` referencing anonymized JAAT subsets; partner imports triggered via fixture S3 bucket. | Release candidates deploy after passing CI; partner QA sign-off required for breaking schema changes. |
| **Staging** | Pre-production validation & load testing | Managed PostgreSQL read replica, real Redis/queue sizing, feature flags matching production | `npm run seed:staging` loads anonymized production-like cohort (5k users), scheduled resume imports, advisor rosters. Sensitive data encrypted per production keys. | ✅ All E2E, load, security smoke, accessibility audits must pass. ✅ Observability checks (traces/logs). ❌ No open Sev1/Sev2 defects. Product + Engineering leads sign-off before promotion. |
| **Production (Launch Gate)** | MVP release | Managed multi-AZ cluster, CDN, WAF enabled | Controlled migration from staging snapshot; partner tenants imported via change-management runbooks. | Launch only if staging gates passed, incident runbooks rehearsed, rollback plan validated, and monitoring alerts green for 24h burn-in simulation. |

**Data Privacy Controls:** All seeded datasets use synthetic personas; no real PII outside production. Data refresh scripts maintain GDPR retention constraints described in [docs/ARCHITECTURE.md](ARCHITECTURE.md) and [docs/DATA.md](DATA.md).

## 5. MVP Pass/Fail Criteria
1. **Functional Coverage:** 100% of MVP features in [docs/FEATURES.md](FEATURES.md) have automated regression (unit + integration + E2E) and manual exploratory test cases executed.
2. **NFR Validation:** Performance, availability, security, and accessibility targets from [docs/ARCHITECTURE.md](ARCHITECTURE.md) met in staging with supporting metrics.
3. **Defect Thresholds:** No unresolved Sev1/Sev2 issues; Sev3 issues require documented workaround and owner. Bug debt burn-down plan for Sev4.
4. **Compliance & Privacy:** SOC 2/GDPR control checks complete; audit logs verified; data retention scripts validated.
5. **Monitoring & Observability:** Dashboards (latency, error rate, queue depth, cache hit ratio) configured with alerting thresholds defined in the architecture NFRs.
6. **Rollback Readiness:** Runbook tested in staging (database snapshot + blue/green toggle) with <30 minute RTO.

## 6. Regression Matrices for Critical Flows
### 6.1 Learner Onboarding Flow (Account Creation → Action Plan)
| Scenario | Positive / Negative | Data Preconditions | Expected Result | Rollback Procedure |
| --- | --- | --- | --- | --- |
| Email signup with resume upload interruption | Positive resilience | Maya persona seed with valid resume | Wizard resumes at skills confirmation; assessment backlog cleared | Re-run onboarding queue worker; restore profile snapshot if mismatch |
| OAuth signup missing education details | Negative validation | Google OAuth stub lacking `education` scope | Wizard blocks progression with inline errors; audit log entry | Revert partial profile record via `users` soft-delete script |
| Resume upload containing unsupported file | Negative security | DOCM file flagged by AV | Upload rejected, user receives actionable error | Quarantine file in sandbox bucket; notify SecOps |
| Action plan export without assessments | Negative business rule | Profile lacking assessments | Export disabled; prompts user to complete assessment | Restore feature flag if erroneously disabled; re-enable export post fix |
| Notification opt-in decline | Positive branch | User opts out of reminders | Action plan saves without scheduling notifications | Ensure `notifications` records not created; re-enable via opt-in script |

### 6.2 Assessment Submission Flow
| Scenario | Positive / Negative | Data Preconditions | Expected Result | Rollback Procedure |
| --- | --- | --- | --- | --- |
| Assessment submission with connectivity loss mid-way | Positive resilience | Cached assessment state; offline simulation | Auto-save resumes; upon reconnect, submission finalizes | Replay pending queue messages; reconcile duplicate submissions |
| Duplicate assessment attempts within cooldown | Negative business rule | Same assessment ID attempted twice in 24h | API rejects with `409`; dashboard displays cooldown timer | Remove duplicate queue entries; reset cooldown flag via admin tool |
| Malformed questionnaire payload | Negative security | Manipulated client payload | Request rejected; WAF logs event | Block offending IP range; re-seed baseline data if corrupt |
| Partner-triggered assessment scheduling | Positive integration | Partner import created candidate | Assessment scheduled, notifications sent | If failure, roll back by deleting scheduled job, notify partner |
| Assessment scoring service timeout | Negative performance | Stress test load | Fallback queue retains messages; alert triggered | Drain queue to standby worker; reprocess from last checkpoint |

### 6.3 Partner Import Flow
| Scenario | Positive / Negative | Data Preconditions | Expected Result | Rollback Procedure |
| --- | --- | --- | --- | --- |
| Nightly CSV import with new cohort | Positive | Partner S3 drop with 5k records | ETL creates users, assigns tenancy, triggers welcome emails | Roll back by disabling partner tenancy, restore from snapshot |
| Duplicate candidate records | Negative data integrity | CSV with repeated `external_ref` | ETL dedupes; duplicates logged and reported | Re-run dedupe job; issue partner discrepancy report |
| Webhook delivery failure (HTTP 500) | Negative integration | Partner endpoint offline | Retry with exponential backoff; after max retries, alert partner | Replay dead-letter queue after partner fix; ensure idempotency |
| Unauthorized partner token | Negative security | Expired/invalid token used | API returns `401`; rate limit unaffected | Audit token usage; rotate credentials; review SIEM alerts |
| Schema change without partner update | Negative contract | Additional required column deployed | Sandbox regression catches mismatch; production deploy blocked | Roll back migration; communicate schema versioning plan |

## 7. Release Communication & Ownership
- **QA Lead:** Owns test execution schedule, coverage reporting, defect triage, and final go/no-go recommendation.
- **Engineering Leads:** Module owners for `auth`, `assessment`, `matching`, `partners`, responsible for resolving Sev1/Sev2 defects during stabilization window.
- **Product Manager:** Confirms MVP scope alignment, accepts residual risk, coordinates stakeholder sign-off.
- **DevOps/SRE:** Maintains environment parity, monitors load/security tests, executes rollback if required.
- **Support & Partnerships:** Validates sandbox regression results with pilot partners and prepares customer-facing release notes.

## 8. Continuous Improvement
Post-MVP, incorporate:
- Shift-left contract testing (provider verification in CI) before staging deploys.
- Chaos testing expansions (cache eviction, queue outage) per architecture resilience roadmap.
- Quarterly accessibility audits and partner sandbox certification cycles feeding into regression matrices.
- Analytics-driven test gap reviews leveraging observability traces to prioritize additional automation.
