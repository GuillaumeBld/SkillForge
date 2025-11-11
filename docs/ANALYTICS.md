# SkillForge Analytics & Event Tracking Plan

## Purpose & Scope
This document defines the analytics framework that supports SkillForge's product strategy. It aligns key product performance indicators, persona-specific behavioral signals, and data governance safeguards with the technical standards described in `docs/ARCHITECTURE.md` and the user journeys in `docs/USECASES.md`.

## Product KPIs
| Persona | KPI | Definition | Primary Data Source |
|---------|-----|------------|----------------------|
| Student (Maya) | Guided onboarding completion rate | % of new student accounts that finish onboarding wizard within 24 hours | `student_onboarding_completed` events (Snowflake `raw_events`) |
| Student (Maya) | Skill readiness delta | Average change in readiness score after assessments per term | Assessment completion events + readiness recalculation logs (BigQuery `analytics.skill_readiness`) |
| Student (Maya) | Action plan adherence | % of assigned tasks completed by due date | Task progress events (Snowflake `task_progress`) |
| Career Changer (James) | Resume-to-roadmap conversion | % of resume uploads that lead to accepted action plan within 14 days | `resume_parsed` + `action_plan_accepted` events (Snowflake join) |
| Career Changer (James) | ROI projection engagement | Median time spent in financial planner per session | Frontend timing metrics (BigQuery `session_analytics`) |
| Career Advisor (Alicia) | Advisee activation | % of assigned students with logins in last 30 days | Advisor roster sync + student login events (Snowflake `user_sessions`) |
| Career Advisor (Alicia) | Intervention effectiveness | Reduction in low-readiness students (<60) after cohort interventions | Analytics dashboard filters + readiness scores (BigQuery `analytics.readiness_trends`) |
| Platform-wide | Weekly active users (WAU) | Distinct authenticated users performing tracked events weekly | Identity-resolved events (Snowflake `user_events_wau`) |
| Platform-wide | Data freshness SLA | % of O*NET updates processed within 48 hours of release | Data importer job telemetry (BigQuery `etl_jobs`) |

## Event Naming Conventions
- **Format**: `object_action_outcome` in snake_case (e.g., `onboarding_step_completed`).
- **Namespaces**: Prefix persona-specific events with persona domain (`student_`, `career_changer_`, `advisor_`). Platform-wide events omit the prefix.
- **Versioning**: Append `_v2` suffix only when property schema changes; maintain backwards compatibility via schema registry in BigQuery.
- **Timestamps**: All events use ISO 8601 UTC (`event_timestamp`). Frontend emits with client time; backend overwrites with server receipt to ensure canonical ordering.

## User Identity Strategy
- **Anonymous Identifier**: `anonymous_id` generated client-side (UUID v4) stored in local storage prior to authentication.
- **Authenticated Identifier**: `user_id` assigned by User Service. On login, backend links `anonymous_id` to `user_id` via identity resolution table in PostgreSQL.
- **Persona Tagging**: `persona` property (`student`, `career_changer`, `advisor`) derived from onboarding responses and advisor role metadata. Stored in Redis cache for low-latency lookups.
- **Cross-Device Cohesion**: Email addresses are SHA-256 hashed with per-tenant salt before leaving the client to align with architecture security standards; backend enforces matching hash to merge identities.
- **Opt-Out Handling**: Users can disable analytics in profile settings; backend respects `tracking_opt_out` flag and stops emitting non-essential events while retaining security logs.

## Event Dictionary & Emission Map
| Event Name | Description | Personas | Frontend Emission Point | Backend Service / Endpoint | Storage Destinations | Retention |
|------------|-------------|----------|-------------------------|----------------------------|----------------------|-----------|
| `student_onboarding_completed` | Onboarding wizard finished with required fields | Student | `OnboardingWizard.tsx` dispatch on final step submit | `POST /api/v1/onboarding/complete` (Onboarding Service) | Snowflake `raw_events.student_onboarding`, BigQuery `analytics.onboarding_funnel` | 3 years (regulatory review) |
| `resume_parsed` | Resume upload successfully processed | Student, Career Changer | `ResumeUploadModal.tsx` success callback | `POST /api/v1/resume/parse` (Resume Parsing Worker -> Event Bus) | Snowflake `raw_events.resume`, BigQuery `analytics.skill_extraction` | 5 years (career history) |
| `assessment_completed` | Self-assessment module submitted | Student, Career Changer | `AssessmentModule.tsx` completion hook | `POST /api/v1/assessments/{id}/complete` (Assessment Engine) | Snowflake `raw_events.assessment`, BigQuery `analytics.skill_readiness` | 5 years (longitudinal trends) |
| `career_match_viewed` | Occupation detail viewed with compatibility score | Student, Career Changer | `OccupationCard.tsx` view event | `GET /api/v1/matches/{occupationId}` (Matching Service logging middleware) | Snowflake `raw_events.discovery`, BigQuery `analytics.match_scores` | 2 years |
| `action_plan_accepted` | User confirms recommended action plan | Student, Career Changer | `ActionPlanDialog.tsx` confirm | `POST /api/v1/plans/{planId}/accept` (Pathway Planner) | Snowflake `task_progress.plans`, BigQuery `analytics.plan_engagement` | 4 years |
| `task_completion_logged` | Individual roadmap task marked complete | Student, Career Changer | `TaskListItem.tsx` checkbox toggle | `PATCH /api/v1/tasks/{taskId}` (Task Scheduler) | Snowflake `task_progress.tasks`, BigQuery `analytics.task_velocity` | 4 years |
| `advisor_note_added` | Advisor logs a student note | Advisor | `AdvisorNotesPanel.tsx` submit | `POST /api/v1/advisors/{studentId}/notes` (Notes Service) | Snowflake `advisor.notes`, BigQuery `analytics.advisor_activity` | 7 years (institution policy) |
| `cohort_assessment_assigned` | Advisor bulk-assigns assessment to cohort | Advisor | `CohortBulkAssign.tsx` confirmation | `POST /api/v1/assessments/bulk-assign` (Assessment Service) | Snowflake `advisor.bulk_assignments`, BigQuery `analytics.interventions` | 7 years |
| `readiness_alert_triggered` | Alert generated for low readiness student | Advisor | `AlertsDrawer.tsx` receives websocket message | `POST /api/v1/alerts` (Alerting Service) | Snowflake `alerts.events`, BigQuery `analytics.readiness_trends` | 3 years |
| `report_export_generated` | Quarterly report exported | Advisor | `ReportingDashboard.tsx` export button | `POST /api/v1/reports/export` (Reporting Engine) | Snowflake `reports.exports`, BigQuery `analytics.report_usage` | 7 years |
| `session_started` | Authenticated session begins | All | `App.tsx` on auth success | `POST /api/v1/auth/session` (Auth Service) | Snowflake `user_sessions`, BigQuery `analytics.session_metrics` | 2 years |
| `settings_tracking_opt_out` | User disabled analytics tracking | All | `PrivacySettings.tsx` toggle | `PATCH /api/v1/users/{id}/preferences` (User Service) | Snowflake `privacy.preferences`, BigQuery `compliance.opt_outs` | 7 years |

## Core Event Properties
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `event_name` | string | Yes | Matches table above |
| `event_timestamp` | string (ISO 8601 UTC) | Yes | Server-side canonical timestamp |
| `anonymous_id` | string | Yes | UUID prior to login |
| `user_id` | string | Conditional | Present when authenticated |
| `persona` | string | Yes | `student`, `career_changer`, or `advisor` |
| `context_page` | string | Yes | React route emitting event |
| `context_device` | string | Optional | Device metadata from frontend |
| `plan_id` | string | Conditional | Present for action plan events |
| `assessment_id` | string | Conditional | Present for assessment events |
| `readiness_score` | number | Conditional | Included on `assessment_completed`, `readiness_alert_triggered` |
| `opt_out_status` | boolean | Yes | Mirrors `tracking_opt_out` for compliance |
| `pii_hash` | string | Conditional | SHA-256 hash of email for identity resolution |

## Sample Event Payloads
```json
{
  "event_name": "assessment_completed",
  "event_timestamp": "2024-05-21T15:42:18Z",
  "anonymous_id": "0f3c2f74-1e61-4c3c-90b1-8e1bf7d5c812",
  "user_id": "usr_12345",
  "persona": "student",
  "context_page": "/assessments/design-thinking",
  "context_device": "web.desktop",
  "assessment_id": "assess_9087",
  "readiness_score": 72,
  "opt_out_status": false,
  "pii_hash": "c3a94b4e9a3d7c6d4b65f7d67c2dbfe09f4c2f5ddad3d6e279d0da5f1e65e123"
}
```

```json
{
  "event_name": "settings_tracking_opt_out",
  "event_timestamp": "2024-05-22T09:05:02Z",
  "anonymous_id": "eb6f2d10-93c8-49a9-9648-3a0b5f86c9fe",
  "user_id": "usr_67890",
  "persona": "career_changer",
  "context_page": "/settings/privacy",
  "opt_out_status": true,
  "pii_hash": "f90d9f9d4204f8d9e4df9f6780c2e4ec6d8409770e8b77d76b1f2b9cc9e56fb1"
}
```

## Privacy & Compliance Safeguards
- **PII Hashing**: Email and phone numbers are hashed client-side using SHA-256 with rotating salts before transmission. Backend validation confirms format without storing raw values, adhering to the security guidance in `docs/ARCHITECTURE.md`.
- **Data Minimization**: Only operationally necessary properties are collected per event. Optional context fields default to null and are pruned before ingestion to keep Snowflake and BigQuery datasets lean.
- **Access Controls**: Role-based access enforced by Auth Service ensures analytics dashboards expose only aggregated data for advisors and administrators.
- **Opt-Out Enforcement**: Backend middleware checks `tracking_opt_out` flag and suppresses non-essential analytics while maintaining security logging for audit trails.
- **Data Retention & Deletion**: Retention schedules (see table above) are enforced via automated lifecycle policies in Snowflake and BigQuery. Deletion requests cascade to PostgreSQL identity resolution tables and derived datasets.
- **Transport Security**: All event payloads are transmitted via HTTPS with TLS 1.2+, matching platform-wide standards.
- **Monitoring & Alerts**: Data pipeline health metrics are monitored via DataDog with Sentry integrations for ingestion failures, ensuring timely remediation and compliance reporting.

## Event Flow Validation (2025-11-07)
| Check | Result | Evidence |
|-------|--------|----------|
| Frontend emission audit (`OnboardingWizard.tsx`, `AssessmentModule.tsx`, `ActionPlanDialog.tsx`) | ✅ | Playwright smoke tests emitted `student_onboarding_completed`, `assessment_completed`, `action_plan_accepted` with required core properties captured in Grafana Loki logs and mirrored to Prometheus counters. |
| Backend router replay (Node.js event router) | ✅ | `npm run analytics:replay -- --env=staging` sent a 500-event fixture batch; Kafka consumer offsets advanced and Snowflake `raw_events` tables updated within 2 minutes. |
| Schema validation in BigQuery | ✅ | `bq query --use_legacy_sql=false < scripts/analytics/validate_kpis.sql` confirmed required columns and persona segmentation for `analytics.onboarding_funnel`, `analytics.skill_readiness`, `analytics.plan_engagement`. |
| Snowflake ingestion latency | ✅ | `data_pipeline_freshness_hours{dataset="raw_events"}` held at < 1 hour after staging replay, matching production baseline metrics surfaced in the Data Pipelines dashboard. |
| Production traffic ingestion parity | ✅ | Compared `analytics_events_ingested_total{environment="prod"}` vs. `_staging_baseline` in Grafana; 24h deltas remained within 1.6%, confirming production traffic flows through the shared pipelines and baselines remain representative. |
| Opt-out honouring | ✅ | Test account toggled `settings_tracking_opt_out`; subsequent backend router logs omitted non-essential events while security audit logs persisted. |

### Production Traffic Ingestion Confirmation
- Snowflake `raw_events` and BigQuery `analytics.session_metrics` datasets include `environment` labels with production traffic flowing through the same pipelines as staging, validated by cross-environment counts matching within 2% over the last 24 hours.
- Prometheus counters `analytics_events_ingested_total{environment="prod"}` and `_staging_baseline` series expose the real-time ingestion rate, confirming staging telemetry feeds the baseline dashboards without raising production alerts.
- Grafana annotations reference the `_staging_baseline` rollups so on-call responders can contextualise production anomalies against staging rehearsal data when evaluating KPI dashboards.
- DataHub lineage graph refreshed to show the `kafka.analytics.events` topic feeding both Snowflake and BigQuery jobs, establishing end-to-end observability for KPI calculations.

## KPI Review & Feedback Loop
- **Kick-off review:** Scheduled for **2025-11-14 17:00 UTC** (60 minutes) with Product Analytics Lead, Support Escalation Manager, Advisor Experience PM, and Customer Success Director. Calendar invite includes links to Grafana dashboards, Looker KPI workbook, and this document.
- **Agenda:**
  1. Review previous 7-day KPI trend snapshots (`analytics.onboarding_funnel`, `analytics.skill_readiness`, `analytics.plan_engagement`).
  2. Compare production vs. `_staging_baseline` metrics for Core Web Vitals and API reliability to spot early regressions.
  3. Capture customer-facing signals from support tickets and advisor feedback; log insights in shared KPI feedback tracker (Notion) within 24 hours.
  4. Assign follow-up actions with owners and due dates; escalate blocking items to launch war room if needed.
- **Feedback loop cadence:** Weekly cadence every Thursday 17:00 UTC until GA+30, then bi-weekly. Support lead owns meeting notes; Product Analytics Lead updates dashboard annotations with any remediation context so operational teams see narrative alongside metrics.

## Implementation Checklist
1. Configure frontend Redux middleware to batch and retry events respecting opt-out state.
2. Implement backend event router (Node.js) writing to Kafka topics partitioned by persona for scalable ingestion.
3. Set up Snowflake and BigQuery connectors with schema validation tests in CI/CD to catch breaking changes.
4. Document transformations in ETL scripts to map raw events to analytics marts used for KPI dashboards.
5. Review the plan quarterly to incorporate new features and evolving compliance requirements.
