# SkillForge Launch Readiness Checklist

This document captures the cross-functional gates that must be satisfied before promoting the MVP build of SkillForge to general availability. It should be reviewed in the launch readiness meeting alongside status dashboards in CI/CD and observability tooling. Any item not marked complete blocks launch unless an explicit exception is approved by the accountable owner recorded below.

## 1. Product & UX Readiness
- Feature scope for the MVP matches the committed backlog in `docs/FEATURES.md` with no "must-have" items in the `Deferred` column of the roadmap tracker.
- Primary user journeys for Maya (student), James (career changer), and Alicia (advisor) run start-to-finish without manual intervention, referencing acceptance tests in `docs/USECASES.md`.
- UX specs in `docs/UX_GUIDE.md` are implemented for desktop, tablet, and mobile breakpoints with accessibility notes addressed (WCAG 2.1 AA).
- Marketing site and in-product onboarding copy are finalized and localized strings are uploaded to the translation service for supported locales.
- Product analytics funnels (signup, resume upload, assessment completion, pathway activation) are firing to the production analytics workspace with QA sign-off from the Data team.

**Sign-off:** Product Lead (PL) – Jordan Lee / 2025-11-06

## 2. Engineering & Platform Readiness
- Infrastructure IaC modules for core services (Auth, Resume Parser, Assessment, Matching, Notifications) are merged to `main`, validated through sandbox deploys, and tagged with the release version.
- Production environment configuration (secrets, feature flag defaults, external partner endpoints) is checked into the secure config repo and mirrors staging aside from expected overrides.
- CI pipelines are green for the release commit with automated semantic version tagging and SBOM generation.
- Observability: logs, metrics, and traces for each service ship to the prod telemetry stack with dashboards and alerts published in the on-call rotation handbook.
- Runbooks for each critical service are updated and linked from `docs/OPERATIONS.md`, including clear SLOs and paging policies.

**Sign-off:** Engineering Lead (EL) – Priya Desai / 2025-11-06

## 3. Quality Assurance & Testing
- Test execution matrix in `docs/TESTPLAN.md` shows 100% completion for `must-have` unit, integration, contract, and E2E suites; no failed or flaky tests are unresolved.
- Accessibility audits pass for keyboard navigation, screen reader parity, and color contrast on all launch-critical flows; exception list is empty.
- Performance benchmarks meet or exceed the NFR thresholds documented in `docs/ARCHITECTURE.md` (auth P95 ≤250 ms, search P95 ≤350 ms, resume parsing P95 ≤750 ms).
- Chaos and resiliency drills: failover to the secondary region validated for Auth and Matching services; queue back-pressure scenarios handled without data loss.
- Manual exploratory reports for top personas are archived with screenshots and notes in the QA Confluence space.

**Sign-off:** QA Lead (QA) – Miguel Alvarez / 2025-11-06

## 4. Security, Privacy & Compliance
- Security review findings from the latest penetration test are closed or have documented compensating controls approved by the Security lead.
- Static and dynamic scanning (SAST/DAST) pipelines are green; dependency scanning exceptions are logged with remediation dates.
- Data handling conforms to the classifications in `docs/DATA.md` and `docs/DATA_OPERATIONS.md`; encryption at rest and in transit verified.
- Privacy impact assessment completed, including DPIA for EU users and third-party data sharing agreements signed.
- Incident response tabletop exercise executed with lessons learned incorporated into `docs/OPERATIONS.md`.

**Sign-off:** Security Lead (SEC) – Casey Morgan / 2025-11-06

## 5. Go-To-Market & Customer Success
- Pricing and packaging decisions documented in `docs/MONETIZATION.md` and reflected in billing integrations.
- Partner enablement assets in `docs/PARTNER_ENABLEMENT_PLAYBOOK.md` delivered; customer success team trained on onboarding workflows.
- Support tooling (ticket routing, knowledge base, macros) configured and tested in production sandbox.
- Launch announcement messaging aligned with Marketing; FAQs validated against latest product capabilities.
- Early access customer commitments confirmed; success criteria and feedback loops scheduled post-launch.

**Sign-off:** GTM Lead (GTM) – Lena Chow / 2025-11-06

## 6. Deployment Plan & Rollback
- Release candidate build ID recorded; deployment steps documented in the Delivery runbook with smoke test checklist.
- Feature flags mapped with default states for GA; rollout strategy defined (e.g., cohort-based activation, region-based throttling).
- Database migrations: backward-compatible scripts reviewed, reversible steps tested in staging with production-like data volumes.
- Rollback plan rehearsed, including automated rollback pipeline and manual intervention steps, with ownership assigned.
- Communication matrix ready: Slack channels, status page updates, and escalation path for any launch-day incidents.

**Sign-off:** Release Manager (RM) – Daniel Park / 2025-11-06

## 7. Final Approval Board
| Function | Representative | Status | Date |
| --- | --- | --- | --- |
| Product | Jordan Lee | Approved | 2025-11-06 |
| Engineering | Priya Desai | Approved | 2025-11-06 |
| QA | Miguel Alvarez | Approved | 2025-11-06 |
| Security | Casey Morgan | Approved | 2025-11-06 |
| GTM | Lena Chow | Approved | 2025-11-06 |
| Customer Success | Renee Patel | Approved | 2025-11-06 |
| Executive Sponsor | Morgan Blake | Approved | 2025-11-06 |

All rows must be marked `Approved` with signatures or links to the recorded decision before the launch commences. The Release Manager is responsible for archiving this document alongside the deployment artefacts once the launch completes.
