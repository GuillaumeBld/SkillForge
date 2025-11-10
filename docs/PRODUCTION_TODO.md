# Production Readiness To-Do List

This to-do list consolidates the remaining work required to bring the SkillForge platform to production readiness. Each item captures the desired outcome, the workstreams impacted, and the measurable signal that demonstrates completion.

## Platform & Infrastructure
- [x] Provision managed PostgreSQL, Redis, and background queue infrastructure across staging and production environments. _Signal:_ Terraform plans and apply logs committed to ops repo, environment variables configured through secrets manager.
- [x] Implement secret management strategy that removes hard-coded credentials and integrates with the selected secrets store. _Signal:_ Secrets sourced at runtime from the manager and rotation runbook published.
- [x] Resolve duplicate server bootstrap to guarantee single `listen` invocation and verified telemetry startup. _Signal:_ Successful boot logs with telemetry export enabled in staging.
- [x] Remove write-side effects from CI installations so workflows comply with protected branch policies. _Signal:_ GitHub Actions pipeline installs dependencies without attempting to commit or push generated artifacts.

## Backend Services
- [x] Complete Prisma migration verification against real infrastructure, including seed routines and rollback testing. _Signal:_ CI pipeline executing `prisma migrate deploy` and `prisma db seed` without intervention.
- [x] Implement persistent partner webhook delivery with retry and DLQ handling. _Signal:_ Integration tests demonstrating retried deliveries with Redis-backed queues.
- [x] Mount and exercise learner APIs (auth, profiles, assessments, matching, notifications) end-to-end. _Signal:_ Contract tests covering each route with database fixtures.

## Frontend & UX
- [x] Implement persona-specific experiences (student, career changer, advisor) per UX guide. _Signal:_ Manual acceptance criteria captured in Cypress E2E suite.
- [x] Add accessibility, localization, and analytics instrumentation across critical flows. _Signal:_ Lighthouse and axe scores meeting launch thresholds with analytics events verified.
- [x] Expand frontend test coverage to include integration and E2E tests. _Signal:_ CI dashboards demonstrating passing suites across browsers.

## Data & Compliance
- [x] Operationalize data retention, consent revocation, and partner segregation jobs with monitored Redis queues. _Signal:_ Scheduled jobs observed running with telemetry and alerting thresholds configured.
- [x] Document and automate production-scale dry runs for compliance operations. _Signal:_ Runbook entries linked to scheduled drills with completion evidence.
- [x] Implement data residency controls and partner isolation per compliance checklist. _Signal:_ Architecture diagrams and tests validating data boundaries.

## Security & Observability
- [x] Enforce API rate limiting and abuse prevention with distributed coordination. _Signal:_ Load tests confirming adherence to SLAs under peak traffic.
- [x] Configure OTLP exporters and dashboards for tracing, metrics, and logs. _Signal:_ Observability platform receiving data with SLO dashboards published.
- [x] Conduct security review covering secrets, authentication, and partner access. _Signal:_ Signed-off report with remediation tasks closed.

## Quality Engineering
- [x] Establish CI/CD pipeline covering lint, type-check, unit, integration, contract, and E2E tests. _Signal:_ Green pipeline required before deploy gate.
- [x] Introduce chaos and failure drills aligned with resilience targets. _Signal:_ Documented scenarios with automated replay and remediation steps.
- [x] Implement performance benchmarking and load testing suites. _Signal:_ Baseline results meeting response time and throughput targets recorded.
- [x] Enforce automated OpenAPI generation and validation in CI to guard contract regressions. _Signal:_ Workflow executes `npm run openapi:generate --workspace @skillforge/shared` and `npm run validate --workspace @skillforge/shared` on every run.

## Operational Readiness
- [x] Finalize runbooks for incident response, deployment, and rollback. _Signal:_ Operations team sign-off after tabletop exercises.
- [x] Provide training and shadowing sessions for support and partner success teams. _Signal:_ Attendance records and knowledge checks archived.
- [x] Validate launch readiness checklist with evidence links for every gate. _Signal:_ Updated Launch Readiness Log with artifacts attached and stakeholders approved.
