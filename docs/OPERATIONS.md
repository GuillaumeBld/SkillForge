# SkillForge Operations Runbook

## 1. Infrastructure Topology

### 1.1 Kubernetes Footprint
- **Cluster Layout**:
  - `skillforge-dev` (shared development cluster).
  - `skillforge-staging` (pre-production validation).
  - `skillforge-prod` (multi-AZ production cluster).
- **Namespaces**:
  - `frontend`: React SPA served via Nginx container with CDN integration.
  - `api`: Node.js/Express microservices (user, assessment, recommendation, data).
  - `data-pipelines`: ETL jobs for JAAT/O*NET refresh and enrichment workers.
  - `observability`: Prometheus, Grafana, Tempo, and Loki stack.
  - `platform`: Ingress controllers, cert-manager, external-dns.
  - `support`: Maintenance jobs (db-migrations, backup verifiers).
- **Workload Classes**:
  - Stateless API deployments with HPA targets (CPU 60%, memory 70%).
  - StatefulSets for Redis (session + cache) and Elasticsearch optional index.
  - CronJobs for nightly assessments recalculation, data pulls, and backup validation.
- **Networking**:
  - Istio/Linkerd service mesh for mTLS and traffic shaping.
  - Internal load balancers for API-to-database connectivity; external HTTPS ingress terminated with managed certificates.

### 1.2 Managed Services & Data Stores
- **PostgreSQL**: Managed (AWS RDS / Cloud SQL) with multi-zone high availability, point-in-time restore, and read replicas sized for ≥3x read capacity per NFRs.
- **Redis**: Managed cache (Elasticache / Memorystore) with 15-minute snapshots for session continuity.
- **Object Storage**: S3/GCS buckets for assets, backups, and analytics exports; lifecycle policies per GDPR/CCPA retention.
- **Search**: Managed OpenSearch/Elasticsearch domain, hot-warm tier, blue/green index deployment.
- **Secrets**: AWS Secrets Manager / GCP Secret Manager integrated with External Secrets Operator for pod-level injection.
- **CI Artifacts**: Container registry (ECR/GAR) with image scanning, provenance attestations, and retention policy (90 days non-prod, 365 days prod).

### 1.3 Alignment with NFRs
- **Performance**: API pods auto-scale based on latency SLOs; Redis cache warms top 10k occupations to meet ≤350 ms search P95. CDN ensures ≤3.5 s TTI for mobile.
- **Availability**: Multi-AZ deployments, managed DB failover, and synthetic uptime checks uphold 99.5–99.9% SLAs. Mesh retries configured for transient failures.
- **Security & Privacy**: End-to-end TLS (1.2+), per-namespace network policies, RBAC aligned with SOC 2, audit logging via Loki/S3 retention.
- **Resilience**: Nightly encrypted backups, monthly restore drills, and queue spillover buffering maintain 30m RTO / 15m RPO.

## 2. CI/CD Workflow

### 2.1 Stages
1. **Validate** (per pull request)
   - Linting (ESLint, tsc, prettier check).
   - Unit tests (Jest, Vitest) with coverage gates.
   - API contract tests using Prism/OpenAPI validators.
   - Static security analysis (npm audit, Snyk, Trivy filesystem scan).
2. **Build**
   - Docker image build for frontend and backend using multi-stage Dockerfiles.
   - Image scanning (Trivy, Grype) and SBOM generation (Syft).
   - Push to staging registry with commit SHA tags.
3. **Integrate**
   - Deploy to `skillforge-staging` via Argo CD or Flux.
   - Run integration and end-to-end suites (Playwright/Cypress, Postman).
   - Execute k6 load smoke to confirm SLA adherence.
4. **Release**
   - Manual approval with change request metadata.
   - Progressive delivery (canary 10%, rolling update) to `skillforge-prod`.
   - Post-deploy verification via synthetic tests and dashboard review.

### 2.2 Configuration Management
- **Infrastructure as Code**: Terraform modules for VPC, clusters, managed services, IAM roles.
- **Application Delivery**: Helm charts (per namespace) stored in Git, reconciled by Argo CD using GitOps promotion.
- **Secrets & Config**:
  - Encrypted values in Terraform and SOPS-managed YAML for app configs.
  - External Secrets Operator fetches runtime secrets; ConfigMaps hold non-sensitive tuning parameters.
  - Feature flags managed via LaunchDarkly or OpenFeature SDKs.

## 3. Provisioning & Maintenance Runbooks

### 3.1 Provisioning Scripts
- `infra/terraform/` – bootstrap networking, Kubernetes clusters, managed databases, caches, storage, IAM.
- `ops/scripts/bootstrap-cluster.sh` – installs ingress, cert-manager, CSI drivers, observability stack.
- `ops/scripts/deploy-app.sh` – triggers Helm releases for frontend, API, workers, and CronJobs.
- `ops/scripts/seed-onet-data.py` – loads baseline JAAT/O*NET dataset into PostgreSQL.
- `ops/scripts/verify-backups.sh` – runs point-in-time restore validation in support namespace.
- All scripts support `--env` flag (dev/staging/prod), log to CloudWatch/Stackdriver, and emit OpenTelemetry traces.

### 3.2 Secret Rotation
1. Rotate credentials in Secrets Manager (auto-rotation for DB/Redis every 30 days).
2. Terraform run updates IAM policies and rotation schedules.
3. Argo CD syncs ExternalSecret resources to refresh Kubernetes secrets.
4. Rolling restart affected Deployments/StatefulSets; verify application logs for successful re-auth.
5. Document rotation in runbook and close change ticket.

### 3.3 Backup & Restore Procedures
- **PostgreSQL**:
  1. Nightly automated snapshots + WAL archiving; on-demand snapshot prior to major releases.
  2. Monthly `ops/scripts/verify-backups.sh` restores to isolated instance and runs integrity checks.
  3. Restoration to production: initiate point-in-time restore, reconfigure read replicas, update connection strings, execute data consistency checks.
- **Redis**:
  - 15-minute snapshots; restore by promoting latest snapshot to new node and updating service endpoint.
- **Object Storage**:
  - Versioning enabled; lifecycle policies enforce retention.
  - Restore via cross-region replication or object version rollback.
- **Search Index**:
  - Nightly snapshot to object storage; blue/green swap on restore.

### 3.4 On-call Escalation Path
1. Primary SRE (week-long rotation) – respond within 15 minutes to P1, 30 minutes to P2.
2. Secondary SRE – engages if primary unresponsive in 15 minutes or incident >60 minutes.
3. Engineering Manager – informed on P1 incidents or prolonged P2 (>2 hours).
4. Product & Compliance – notified for security/privacy incidents per breach policy.
5. Post-incident review scheduled within 48 hours with action items tracked in Jira.

## 4. Observability & Operational Health

### 4.1 Dashboards
- **API Performance** (Grafana): latency percentiles, throughput, error rates per service, queue depth, cache hit ratio.
- **Frontend Experience**: Core Web Vitals (TTI, CLS, FID), CDN cache metrics, synthetic check results.
- **Data Pipelines**: ETL job duration, success/failure counts, backlog size, data freshness indicators.
- **Database**: Connection usage, replication lag, slow query counts, buffer/cache hit ratios.
- **Infrastructure**: Node health, pod restarts, HPA status, cluster resource saturation.

> **Implementation Status (2025-11-07)**: Dashboards are provisioned via `ops/observability/dashboards/*.json` with Grafana file-based provisioning (`ops/observability/grafana-dashboards.yaml`). Each panel compares production telemetry against staging baselines derived from Prometheus recording rules.

### 4.2 Alert Thresholds
- API error rate > 1% for 5 minutes (P1).
- P95 latency breach vs. NFR targets for 10 minutes (P1 for auth/search, P2 for recommendations).
- Queue depth > 500 jobs for 5 minutes (P1).
- Staging/prod deployment failure >2 consecutive attempts (P2).
- Redis cache hit ratio < 85% for 15 minutes (P2).
- Database replication lag > 5 minutes or storage consumption > 80% (P1).
- Synthetic uptime < 99.5% rolling hour (P1).
- ETL job delay > 2 hours past schedule (P2) and data freshness > 24 hours (P1).

> **Implementation Status (2025-11-07)**: Alert rules codified in `ops/observability/prometheus-alerts.yaml` route P1/P2 incidents to PagerDuty and include staging annotations. Recording rules in `ops/observability/prometheus-baselines.yaml` maintain `_staging_baseline` series so production responders can immediately compare pre-release signals without triggering noise.

### 4.3 Weekly Operational Health Checks
- Review dashboard baselines and update runbook thresholds.
- Verify Argo CD sync status and Helm release versions across environments.
- Confirm backup jobs and restore drills logs are green; plan next restore exercise.
- Validate secret rotation schedule and upcoming expirations.
- Audit access logs for anomalies; ensure RBAC roles reviewed quarterly.
- Run smoke load test to confirm SLA headroom and update capacity models.
- Review open incidents, postmortem action items, and change management backlog.

### 4.4 Staging-to-Production Baseline Promotion
- Apply recording rules (`ops/observability/prometheus-baselines.yaml`) in staging and production clusters so that staging metrics populate `_staging_baseline` time-series in the shared Prometheus instance.
- Ensure the recording rules include `frontend:tti_seconds:max_staging_baseline`, `frontend:cls_score:avg_staging_baseline`, and Kubernetes capacity baselines so Grafana panels align with production comparisons.
- Confirm Grafana provisioning (`ops/observability/`) references the shared dashboards folder and lists both production and staging series for every panel.
- Run `kubectl -n observability annotate configmap grafana-dashboards skillforge.io/baseline-sync=$(git rev-parse HEAD)` after syncing dashboards to capture audit trace.
- Execute weekly synthetic traffic in staging before release freeze and compare baseline panels against production to ensure regressions are identified ahead of promotion.

### 4.5 Post-Launch 72-Hour Guardrails
- **Search latency variance (2025-11-11 17:45 UTC):** Production search P95 briefly breached the ≤350 ms target (peaked at 361 ms) under EU onboarding surge. Mitigation playbook:
  1. Scale `search-api` deployment from 6→9 replicas via `kubectl -n api scale deployment search-api --replicas=9`.
  2. Trigger cache prewarm job `kubectl -n api create job --from=cronjob/search-cache-warm search-cache-warm-manual-$(date +%s)` to repopulate top occupation queries.
  3. Monitor `search_latency_p95` and `cache_hit_ratio` panels in Grafana for 15 minutes; confirm return to <340 ms sustained.
  4. Reduce replicas once traffic normalises but keep HPA min replicas at 7 during EU peak windows (08:00–12:00 UTC) via Helm values override committed to GitOps repo.
- **Kafka analytics backlog (2025-11-11 18:20 UTC):** Alert triggered when `analytics_events_ingested_total` lagged `_staging_baseline` by >10 minutes. Response:
  1. Scale consumer Deployment `analytics-event-router` from 2→4 replicas (`kubectl -n data-pipelines scale deployment analytics-event-router --replicas=4`).
  2. Update `ops/observability/prometheus-alerts.yaml` to add saturation alert `analytics_consumer_lag_seconds > 300` for 5 minutes with PagerDuty routing.
  3. Annotate Grafana dashboard `Analytics Pipeline Health` with incident timeline and mitigation link in Confluence.
  4. Review backlog metrics during KPI sync; revert replicas only after 24h of sustained <120 s lag.

## 5. Contact & Resources
- Incident channel: `#skillforge-incident` (Slack/Teams) with PagerDuty integration.
- Knowledge base: Confluence space `SkillForge Ops` for detailed runbooks and diagrams.
- Change calendar: Opsgenie shared calendar aligned with release train.
- Compliance references: SOC 2 trust principles, GDPR/CCPA register stored in GRC tool.


## 6. Production Deployment Rehearsal (2025-11-07)

### 6.1 Objectives
- Validate end-to-end release workflow from GitHub Actions through Argo CD/Flux ahead of GA launch.
- Confirm observability signals, smoke tests, and rollback hooks behave as documented in sections 2 and 4.

### 6.2 Execution Log
| Step | Owner | Evidence | Result |
| --- | --- | --- | --- |
| Trigger `release.yml` workflow (dry run) in GitHub Actions with `v1.0.0-rc2` artifacts | Release Manager | Workflow run `https://github.com/skillforge/app/actions/runs/8253174621` | ✅ Successful build, SBOM uploaded |
| Open GitOps PR updating prod image digests | Platform Engineer | PR `ops/gitops-prod#482` | ✅ Merged after review, auto-tagged |
| Argo CD sync for `frontend`, `api`, `data-pipelines` apps | SRE | Argo dashboard screenshot archived in Confluence | ✅ Healthy/Synced; no drift |
| Flux HelmRelease sync for support CronJobs | SRE | `flux get helmreleases --all-namespaces` output attached to runbook | ✅ All in Ready state |
| Post-deploy smoke tests (Playwright, k6) | QA Lead | GitHub Actions `post-release.yml` run `https://github.com/skillforge/app/actions/runs/8253201943` | ✅ All checks green |
| Rollback drill using Argo Rollouts undo | Release Manager | Command transcript stored in Confluence | ✅ Reverted to previous ReplicaSet in <3 minutes |

### 6.3 Findings & Follow-ups
- Observability dashboards matched expected baselines; alert thresholds require no adjustment.
- Documentation gaps: Added explicit rollback commands to `docs/PROD_CHANGE_REQUEST_2025-11-07.md` (Section 5).
- Action: Confirm canary metric alerts (error rate, latency) are tied to PagerDuty services before go-live (owner: SRE, due 2025-11-07 EOD).

### 6.4 Approval
- Rehearsal reviewed and approved by Release Manager (Daniel Park) and Engineering Lead (Priya Desai) on 2025-11-07.
