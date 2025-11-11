# Rollback Checklist – SkillForge GA Launch (2025-11-07)

Use this checklist if the GA deployment must be rolled back during the 2025-11-07 production window. Each task maps to runbook sections cited in `docs/OPERATIONS.md` and the change request.

## 1. Trigger & Communication
- [ ] Declare rollback intent in `#skillforge-incident`, tagging @SRE, @Product, @Security, @GTM.
- [ ] Page the production incident bridge (PagerDuty response play `GA-Rollback`).
- [ ] Notify leadership distribution list with reference to readiness evidence (`docs/LAUNCH_READINESS_LOG.md`).

## 2. Technical Actions
1. **Argo Rollouts Undo**
   - [ ] Run `kubectl argo rollouts undo rollout frontend --namespace frontend`.
   - [ ] Run `kubectl argo rollouts undo rollout api --namespace api`.
   - [ ] Confirm previous ReplicaSets scaled and healthy.
2. **Flux HelmRelease Revert**
   - [ ] Execute `flux rollback helmrelease data-pipelines --namespace data-pipelines --revision=<prev>`.
   - [ ] Execute `flux rollback helmrelease support-jobs --namespace support --revision=<prev>`.
   - [ ] Verify CronJobs report Ready status.
3. **Feature Flags & Integrations**
   - [ ] Reapply LaunchDarkly production defaults (`prod-safe-2025-10` flag set).
   - [ ] Disable partner webhooks/billing integrations per `docs/PARTNER_ENABLEMENT_PLAYBOOK.md` §4.2.
   - [ ] Confirm auth rate limits restored to pre-launch settings.

## 3. Validation
- [ ] Run GitHub Actions `post-release.yml` rollback smoke suite (`rollback` input).
- [ ] Review Grafana dashboards for baseline metrics (TTI, API error rate) returning to pre-deploy ranges.
- [ ] Confirm analytics ingestion matches `_staging_baseline` deltas within ±2%.

## 4. Close-out
- [ ] Update change request `docs/PROD_CHANGE_REQUEST_2025-11-07.md` Section 5 with outcome summary.
- [ ] File incident ticket with root cause placeholder and attach monitoring screenshots.
- [ ] Schedule follow-up review within 48 hours; ensure action items tracked in Jira.

> **Note:** If database migrations progressed beyond safe undo points, escalate immediately to the Data Pipelines primary (Sara Ito) for manual intervention steps in `docs/DATA_OPERATIONS.md` §7.
