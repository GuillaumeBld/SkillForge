# Production Change Request: SkillForge GA Launch (2025-11-07)

## 1. Overview
- **Change ID:** CR-2025-11-07-SkillForge-GA
- **Summary:** Promote the SkillForge MVP build to general availability in the `skillforge-prod` cluster, enabling full customer onboarding, analytics, and partner integrations.
- **Requested Window:** 2025-11-07 18:00–20:00 UTC
- **Environments Affected:** `skillforge-prod` (frontend, api, data-pipelines namespaces)
- **Change Type:** Standard, high-visibility release per launch checklist.

## 2. Scope
- Deploy release candidate container images tagged `v1.0.0-rc2` for frontend SPA, API services, worker CronJobs.
- Apply Terraform tag `prod-release-2025-11-07` to ensure infrastructure parity with staging.
- Migrate LaunchDarkly feature flags from staged cohorts to production defaults aligning with GA experience.
- Enable partner webhooks and billing integrations as defined in `docs/MONETIZATION.md` and `docs/PARTNER_ENABLEMENT_PLAYBOOK.md`.

## 3. Deployment Plan (GitHub Actions → Argo CD/Flux)
1. GitHub Actions `release.yml` workflow (manual dispatch) builds and signs the release artifacts, publishing images to the production registry and Helm chart version `1.0.0`.
2. Workflow pushes Git tag `v1.0.0` with SBOM attachments and updates the GitOps config repository (`ops/gitops-prod`) via PR containing image digests.
3. Upon PR merge, Argo CD observes the `prod` branch and performs a sync against the `frontend`, `api`, and `data-pipelines` applications with automated health checks.
4. Flux Helm controllers manage CronJobs and support workloads, confirming drift-free state post-sync.
5. Post-deploy smoke tests run through GitHub Actions `post-release.yml`, invoking Playwright synthetic flows and k6 latency probes.

## 4. Canary Strategy
- Initial traffic shift: 10% of production user traffic directed to `v1.0.0` API Deployments via Argo Rollouts canary, monitored for 30 minutes.
- Metrics to monitor: API error rate (<0.5%), auth latency P95 (<250 ms), search latency P95 (<350 ms), queue depth (<200 jobs).
- Expand to 50% traffic contingent on stable metrics and absence of P1/P2 alerts for an additional 30 minutes.
- Full rollout to 100% follows Release Manager sign-off after reviewing Grafana dashboards and synthetic checks described in `docs/OPERATIONS.md` §4.

## 5. Rollback Plan
- Argo Rollouts configured with `maxSurge:0` and `maxUnavailable:1`; execute `kubectl argo rollouts undo` to revert to previous ReplicaSet if metrics breach thresholds.
- Helm release history retained; `flux rollback helmrelease <service> --revision=<prev>` available for support namespace CronJobs.
- Database migrations are backward-compatible; in failure scenario, apply reversal script `2025-11-07-down.sql` validated in staging and re-enable previous feature flag defaults.
- Communication: notify `#skillforge-incident` channel, update Statuspage, and open incident in PagerDuty if rollback invoked.

## 6. Verification Steps
- Confirm GitHub Actions `release.yml` and `post-release.yml` workflows succeed with artifact checksums verified.
- Validate Argo CD applications show `Healthy/Synced` status for all affected namespaces.
- Run smoke E2E suite covering signup, resume upload, assessment completion, and pathway activation.
- Review Grafana dashboards (`API Performance`, `Frontend Experience`) for baseline adherence.
- Confirm analytics events visible in production workspace; QA lead signs off post-verification.
- Review evidence log in [`docs/LAUNCH_READINESS.md` Appendix A](LAUNCH_READINESS.md#appendix-a---verification-evidence-log) to confirm audit trail attachments.

## 7. Stakeholder Sign-offs (per `docs/LAUNCH_READINESS.md`)
- **Product Lead (Jordan Lee):** Approved 2025-11-06
- **Engineering Lead (Priya Desai):** Approved 2025-11-06
- **QA Lead (Miguel Alvarez):** Approved 2025-11-06
- **Security Lead (Casey Morgan):** Approved 2025-11-06
- **GTM Lead (Lena Chow):** Approved 2025-11-06
- **Release Manager (Daniel Park):** Approved 2025-11-07
- **Executive Sponsor (Morgan Blake):** Approved 2025-11-06

### Go/No-Go Reconfirmation (2025-11-07 17:00 UTC)
- Meeting chaired by Release Manager with Product (Jordan Lee), Engineering (Priya Desai), Security (Casey Morgan), and Partnerships (Lena Chow) stakeholders.
- Reviewed `docs/LAUNCH_READINESS_LOG.md` Appendix A, latest scan evidence (`docs/SECURITY_SCANS_2025-11-07.md`), and rollback readiness checklist (`docs/ROLLBACK_CHECKLIST_2025-11-07.md`).
- All stakeholders reaffirmed `Approved` status for launch proceeding to the 18:00 UTC window; no new action items raised.

## 8. Risk Assessment & Mitigations
- **Risk:** Increased load from GA surge → **Mitigation:** HPA tuned per `docs/OPERATIONS.md` §1.1; synthetic load tests executed pre-launch.
- **Risk:** Partner webhook misconfiguration → **Mitigation:** Dry-run tests completed in staging with recorded payloads; manual verification post-deploy.
- **Risk:** Billing integration errors → **Mitigation:** Transactional smoke tests with sandbox accounts; on-call finance liaison available during window.

## 9. Communication Plan
- Pre-launch briefing sent to stakeholders 24 hours in advance with runbook links.
- Live updates in `#skillforge-launch` Slack channel at key milestones (start, 10% canary, 50%, 100%, smoke test completion).
- Statuspage entry scheduled with maintenance window; final update posted upon launch completion.
- Post-launch review scheduled for 2025-11-08 16:00 UTC.
- Leadership and support teams receive change notification referencing `docs/LAUNCH_READINESS_LOG.md` to highlight fulfilled readiness gates and the attached rollback checklist for contingency confidence.

## 10. Deployment Window & On-Call Coverage
- Production deployment window confirmed for 2025-11-07 18:00–20:00 UTC (see `docs/LAUNCH_CALENDAR_2025-11-07.md` §1).
- PagerDuty rotations and escalation roles published in `docs/LAUNCH_CALENDAR_2025-11-07.md` §2 and distributed with readiness log citation during the go/no-go sync.
- Support leadership briefed on coverage model via Opsgenie change calendar entry linking to readiness evidence and rollback checklist attachments.

## 11. Attached Evidence & Artefacts
- Launch readiness evidence log: [`docs/LAUNCH_READINESS_LOG.md`](LAUNCH_READINESS_LOG.md)
- Security scan summaries: [`docs/SECURITY_SCANS_2025-11-07.md`](SECURITY_SCANS_2025-11-07.md)
- Rollback execution checklist: [`docs/ROLLBACK_CHECKLIST_2025-11-07.md`](ROLLBACK_CHECKLIST_2025-11-07.md)
