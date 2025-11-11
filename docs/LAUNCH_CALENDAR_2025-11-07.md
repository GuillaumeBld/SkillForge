# SkillForge GA Launch Calendar & On-Call Rotations

## 1. Launch Timeline (UTC)
| Time | Milestone | Owner | Notes |
| --- | --- | --- | --- |
| 2025-11-06 16:00 | Final readiness review | Release Manager | Review change request, confirm evidence complete |
| 2025-11-07 15:00 | PagerDuty rotation handoff briefing | SRE Lead | Confirm primary/secondary coverage, review escalation |
| 2025-11-07 17:30 | Pre-deploy checkpoint | Product Lead | Validate marketing comms, customer success prep |
| 2025-11-07 18:00 | Change window opens; canary start (10%) | Release Manager | Execute GitHub Actions `release.yml` |
| 2025-11-07 18:30 | Canary evaluation (10%→50%) | Engineering Lead | Review metrics, approve traffic ramp |
| 2025-11-07 19:00 | Full rollout decision | Executive Sponsor | Confirm go/no-go based on dashboards |
| 2025-11-07 19:15 | Post-deploy smoke tests complete | QA Lead | Validate synthetic flows, analytics events |
| 2025-11-07 19:30 | Public status update + launch announcement | GTM Lead | Statuspage + marketing push |
| 2025-11-08 16:00 | Post-launch retrospective | Cross-functional | Review metrics, capture action items |
| 2025-11-14 17:00 | KPI review #1 & feedback loop | Product Analytics Lead | Weekly session with Support, Advisor Experience, and Customer Success to capture early signals and assign follow-ups |

## 2. PagerDuty Rotation Schedule (2025-11-06 → 2025-11-09)
| Role | Primary | Secondary | Escalation Manager |
| --- | --- | --- | --- |
| SRE | Alex Kim | Priya Desai | Morgan Blake |
| Backend/API | Ravi Patel | Nina Owens | Priya Desai |
| Frontend | Maya Chen | Luis Ortega | Jordan Lee |
| Data Pipelines | Sara Ito | Devin Brooks | Casey Morgan |
| Security/Privacy | Casey Morgan | Elena Rossi | Morgan Blake |
| Customer Success Liaison | Renee Patel | Omar Lewis | Lena Chow |

- Rotations created in PagerDuty service `SkillForge-Production` with overrides covering the launch window.
- Incident bridge: Zoom link stored in PagerDuty response play; auto-shares to `#skillforge-incident`.

## 3. Change Calendar Entry
- **Platform:** Opsgenie Change Calendar `SkillForge Production`.
- **Event:** "SkillForge GA Launch (CR-2025-11-07)".
- **Window:** 2025-11-07 18:00–20:00 UTC (auto-reminders 24h and 1h prior).
- **Linked Artifacts:**
  - `docs/PROD_CHANGE_REQUEST_2025-11-07.md`
  - GitHub Actions workflows `release.yml`, `post-release.yml`
  - Argo CD application dashboards (frontend, api, data-pipelines)
- **Notifications:** Calendar invites sent to engineering, product, security, GTM distribution lists. PagerDuty overrides confirmed via audit log `PD-override-2025-11-07.csv` archived in Ops drive.

## 4. Communications Checklist
- [x] Launch timeline posted to `#skillforge-launch` and Confluence change calendar page.
- [x] PagerDuty overrides verified; SMS/phone escalation tested.
- [x] Statuspage scheduled maintenance drafted and approved by Communications.
- [ ] Post-launch customer email template queued (owner: Customer Success).
- [x] Leadership/support briefing circulated with link to `docs/LAUNCH_READINESS_LOG.md` highlighting satisfied launch gates.
