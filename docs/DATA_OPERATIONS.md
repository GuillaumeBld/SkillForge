# SkillForge Data Operations Runbook

## 1. Migration Orchestration (Flyway → Prisma)
1. **Flyway baseline migrations**
   - Execute database schema migrations first to ensure structural compatibility for downstream ORM layers.
   - Apply versioned SQL scripts in ascending order; stop on any checksum mismatch and remediate before proceeding.
   - Critical objects seeded here include foundational tables documented in `docs/DATA.md` such as `occupations`, `skills`, `knowledge_requirements`, `abilities`, and `work_context`.
2. **Flyway repeatable migrations**
   - Re-run idempotent scripts (e.g., view refreshes, materialized aggregates) after every release.
   - Ensure derived tables (e.g., occupation search indices) stay aligned with `occupations` and `skills`.
3. **Prisma migrations**
   - Run `prisma migrate deploy` to synchronize Prisma's migration history with the already-applied Flyway schema.
   - Validate Prisma client generation succeeds and regenerate clients (`prisma generate`) before application deployment.
4. **Verification checks**
   - Confirm Prisma introspection reports no drift (`prisma migrate status`).
   - Run smoke queries against `occupations` and `skills` to confirm read/write paths.

## 2. Seed Data Strategy
1. **Baseline occupations and skills**
   - Populate canonical occupations from the latest O\*NET release into `occupations` with related `skills`, `knowledge_requirements`, `abilities`, and `work_context` mappings.
   - Use bulk loaders that enforce SOC/O\*NET code uniqueness and maintain foreign key integrity.
2. **Skill taxonomy enrichment**
   - Insert crosswalk tables (e.g., `skill_clusters`, `occupation_skill_strength`) after primary occupation loads.
   - Apply deduplication scripts to normalize skill names before insertion.
3. **Administrative accounts**
   - Seed `users` with hashed credentials for platform administrators and data stewards.
   - Grant roles/permissions covering Flyway/Prisma release management, ETL approvals, and consent revocation overrides.
4. **Idempotency & auditing**
   - Wrap seeds in transactions with `ON CONFLICT DO UPDATE` semantics where supported.
   - Log seed executions in an `etl_run_log` table for traceability.

## 3. Environment Configuration Population
- **Development**
  - Load reduced occupation/skill subsets (top 100) and synthetic users for rapid iteration.
  - Configure Prisma `.env` with sandbox API keys, mocked JAAT endpoints, and permissive rate limits.
- **Staging**
  - Mirror full production schema and seed data; point to staging JAAT/O\*NET buckets.
  - Enable feature flags for experimental ETL transforms while keeping partner data anonymized.
- **Production**
  - Require secret rotation prior to migrations.
  - Load environment variables via managed secret store (e.g., Vault) and validate checksum of `.env.production` templates before rollout.

## 4. JAAT & O*NET ETL Operations
1. **Schedules**
   - **O\*NET bulk refresh**: monthly (first Sunday, 02:00 UTC) covering `occupations`, `skills`, `knowledge_requirements`, `abilities`, and `work_context` tables documented in `docs/DATA.md`.
   - **JAAT incremental sync**: weekly (Wednesday, 04:00 UTC) updating `jaat_profiles`, `occupation_summary`, and `related_occupations` link tables.
2. **Monitoring**
   - Track ETL health via `etl_run_log` entries (status, duration, row counts).
   - Emit alerts on SLA breaches (duration > 30 min, row deltas ±5% vs. prior run).
   - Validate record counts against historical baselines for `occupations` and `skills` using automated anomaly detection jobs.
3. **Rollback Procedures**
   - Retain last-two ETL snapshots per source in object storage (partitioned by run timestamp).
   - To revert:
     1. Pause downstream consumers.
     2. Restore snapshot into staging schema (`*_backup` tables).
     3. Swap partitions or execute `INSERT ... SELECT` from backup into primary tables.
     4. Rebuild dependent materialized views and search indices.
   - Document rollback actions in `etl_run_log` with `rollback_of_run_id` metadata.

## 5. Retention & Anonymization Automation
- Schedule nightly job to purge personal data older than retention policy (default 365 days) from audit-heavy tables (`user_activity`, `session_events`).
- Automate anonymization by replacing PII columns with irreversible hashes (SHA-256 + salt) while preserving foreign keys for analytics.
- Maintain `retention_policy` table controlling dataset-specific schedules; Flyway repeatable migration updates enforce policy changes.
- Provide dry-run mode emitting diffs to compliance reviewers before execution.

## 6. Consent Revocation Handling
- Implement listener on consent management service to enqueue revocation events.
- ETL worker consumes queue, locates subject records via `consent_grants` and cascades deletions/anonymizations across `user_profiles`, `progress_history`, and partner export tables.
- Log revocation completion with references to affected record IDs and timestamps for auditability.
- Block future exports by adding user ID to `consent_blocklist` table consulted by partner delivery pipelines.

## 7. Partner-Specific Data Segregation
- Partition partner deliverables per tenant (`partner_id`) using schema-level separation (e.g., `partner_<id>` schemas) or row-level security policies.
- Configure export jobs to read from segregated views that enforce partner filters on `occupations`, `skills`, and engagement data.
- Apply consent-aware filters before export; omit records flagged in `consent_blocklist`.
- Run quarterly verification ensuring no cross-partner data leakage by sampling exports and comparing hashes.
- Document partner onboarding tasks: provision schema, seed partner config (`partner_settings`), register API keys, and schedule dedicated monitoring alerts.
