# Data Operations Runbook

This runbook tracks routine and emergency operations that touch production data.
It now covers two major areas:

- **Compliance worker drills** powered by BullMQ queues under
  `apps/api/src/workers/`.
- **O*NET / JAAT dataset management**, including local database setup and
  Flyway migrations.

Run commands from the repository root. To execute API workspace tooling, use
`npm run --workspace @skillforge/api <script> -- <args>` (or
`npm --prefix apps/api run <script> -- <args>`).

## Compliance Worker Drills

The CLI entry point lives at `apps/api/src/cli/compliance.ts`. It defaults to a
dry-run, prints audit-friendly JSON summaries, and can enqueue jobs for
background processing when Redis is available.

Inspect available options:

```bash
npm run --workspace @skillforge/api compliance -- --help
```

### Consent Revocation

**Purpose:** honour user opt-outs by revoking marketing/notification consent.
The worker:

- Forces `marketingOptIn` to `false`.
- Removes any `NotificationPreference` rows.
- Cancels scheduled/processing assessments and disables future notifications.
- Archives notifications so downstream channels cease delivery.

**Dry-run example (default):**

```bash
npm run --workspace @skillforge/api compliance -- consent-revocation \
  --tenant acme-partners \
  --dry-run \
  --triggered-by privacy@skillforge.com \
  --note "Quarterly consent audit drill"
```

**Apply immediately for a single user:**

```bash
npm run --workspace @skillforge/api compliance -- consent-revocation \
  --user user_123 \
  --execute \
  --reason "Customer-requested opt-out 2025-07-15"
```

**Enqueue for asynchronous processing:**

```bash
npm run --workspace @skillforge/api compliance -- consent-revocation \
  --tenant acme-partners \
  --execute \
  --queue
```

**Verification:** Review CLI JSON output and search central logs for entries
with `job: "consent-revocation"`. Expect `marketingOptIn` disabled, notification
preferences removed, assessments cancelled, and notifications marked `archived`
for the scoped users.

### Data Retention Purge

**Purpose:** enforce the 24‑month retention window (GDPR/CCPA). The worker
deletes notifications, resumes, assessments, notification preferences, and
profiles before removing the user record.

**Dry-run (default 24 months):**

```bash
npm run --workspace @skillforge/api compliance -- data-retention \
  --tenant orbit-labs \
  --dry-run
```

**Custom cutoff with execution:**

```bash
npm run --workspace @skillforge/api compliance -- data-retention \
  --before 2023-01-01T00:00:00Z \
  --execute \
  --triggered-by data.protection@skillforge.com
```

**Verification:** Inspect the JSON summary (counts per entity) and correlate
with Postgres audit logs or BullMQ metrics (`queue: data-retention-jobs`) when
run in production.

### Partner Segregation Alignment

**Purpose:** ensure partner/tenant metadata on resumes and notifications remains
isolated. The worker normalises `tenantId`/`partnerId` fields inside
`ResumeIngestion.ingestionMetadata` and `Notification.actions`.

> **Important:** `--tenant` is required. Without it the job records a warning
> and exits.

**Dry-run metadata scan:**

```bash
npm run --workspace @skillforge/api compliance -- partner-segregation \
  --tenant orbit-labs \
  --dry-run
```

**Execute and enqueue:**

```bash
npm run --workspace @skillforge/api compliance -- partner-segregation \
  --tenant orbit-labs \
  --execute \
  --queue
```

**Verification:** The summary lists `resumeUpdates` and `notificationUpdates`
counts. When applied, spot-check the associated JSON blobs to confirm
`tenantId`/`partnerId` values now match the requested tenant.

## O*NET / JAAT Data Seeding

The reference dataset workflow still lives in `ops/scripts/seed-onet-data.py`,
built around fixtures stored in `ops/fixtures/onet/`.

### Prerequisites

- Python 3.10 or newer.
- Install dependencies:
  ```bash
  pip install "psycopg[binary]>=3.1"
  ```
- Network access to the target PostgreSQL instance and credentials that can
  upsert into the tables documented in `docs/DATA.md`.
- Configure a connection string via one of:
  - `SKILLFORGE_<ENV>_DATABASE_URL` (e.g. `SKILLFORGE_LOCAL_DATABASE_URL`)
  - `DATABASE_URL` or `SKILLFORGE_DATABASE_URL`
  - The `--dsn` flag when invoking the script directly

If no DSN is supplied, local runs fall back to
`postgresql://postgres:postgres@localhost:5432/skillforge`.

### Local Database Setup

1. Copy the API environment template:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
2. Start the local PostgreSQL container (matches Prisma `DATABASE_URL`):
   ```bash
   docker compose up -d skillforge-db
   ```
3. Confirm the container is healthy:
   ```bash
   docker compose ps
   ```
4. Install API dependencies if needed:
   ```bash
   cd apps/api
   npm install
   ```
5. Verify connectivity via Prisma:
   ```bash
   npx prisma migrate status
   ```
6. If the command hangs, tail the container logs to ensure Postgres
   finished booting:
   ```bash
   docker compose logs -f skillforge-db
   ```
7. Confirm `DATABASE_URL` inside `.env` matches the credentials in
   `docker-compose.yml` (user/password host). Mismatches trigger Prisma P1012 or
   connection refused errors.

#### Tear Down

- Stop the database:
  ```bash
  docker compose down
  ```
- Remove the persistent volume for a clean slate:
  ```bash
  docker compose down -v
  ```

### Running the Seeder

- Inspect `ops/fixtures/onet/<env>/manifest.json` for the target environment.
- Update the JSON fixtures (`occupations.json`, `skills.json`,
  `occupation_skills.json`, `tasks.json`) with the desired dataset, keeping the
  columns aligned with the reference schema in `docs/DATA.md`.
- Execute the workspace command:
  ```bash
  npm run seed:local       # ops/fixtures/onet/local
  npm run seed:ci          # ops/fixtures/onet/ci
  npm run seed:staging     # ops/fixtures/onet/staging
  npm run seed:production  # ops/fixtures/onet/production
  ```
- Validate without writes by appending `-- --dry-run`:
  ```bash
  npm run seed:local -- --dry-run
  ```

All operations run inside a single PostgreSQL transaction. Inserts use
`ON CONFLICT DO UPDATE`, preserving idempotent behaviour.

### Rollback Expectations

- Failed transactions roll back automatically.
- To unwind a successful seed, restore from backup or re-run using the previous
  fixture snapshot.
- Store fixture JSON in version control for easy reverts.

### Targeting Multiple Environments

- Local fixtures contain development samples; `ci` ships a minimal dataset for
  pipelines.
- Staging/production directories default to empty arrays—populate them with the
  authoritative data exports before seeding.
- If staging or production databases need different credentials, set the
  corresponding `SKILLFORGE_<ENV>_DATABASE_URL` (e.g.
  `export SKILLFORGE_PRODUCTION_DATABASE_URL=postgresql://...`).

### Additional Options

- Run the script directly:
  ```bash
  python ops/scripts/seed-onet-data.py --env staging --dsn postgresql://user:pass@host:5432/db
  ```
- Enable verbose logging:
  ```bash
  python ops/scripts/seed-onet-data.py --env local --verbose
  ```

### Flyway Schema Management

Flyway shares connection settings with Prisma. Export `DATABASE_URL` (or
`SKILLFORGE_<ENV>_DATABASE_URL`) before running the workspace scripts;
`ops/scripts/run-flyway.js` derives the `FLYWAY_*` variables automatically.

#### Baseline migrations

Run during release drills to make sure every Prisma table exists:

1. Export the connection string:
   ```bash
   export DATABASE_URL=postgresql://user:pass@host:5432/skillforge
   ```
2. Apply the baseline migrations:
   ```bash
   npm run flyway:migrate
   ```
3. Verify status:
   ```bash
   npm run flyway:info
   ```

`npm run flyway:migrate` runs `V1_0__create_core_app_tables.sql` and
`V1_1__create_reference_tables.sql`, ensuring the application and O\*NET/JAAT
reference tables match the Prisma schema.

#### Repeatable reporting aggregates

After seeding or refreshing O\*NET/JAAT data, rebuild reporting views:

1. Export the same connection string (reuse the value from above if still set).
2. Rerun Flyway to refresh repeatable migrations:
   ```bash
   npm run flyway:migrate
   ```
3. Confirm the reporting bundle refreshed:
   ```bash
   npm run flyway:info | grep R__onet_reporting_views
   ```

The repeatable script recreates and refreshes:

- `reporting.onet_skill_coverage` (materialized view)
- `reporting.onet_skill_category_summary` (materialized view)
- `reporting.onet_source_versions` (view)

No additional manual SQL is required; Flyway rebuilds the materialized views
as part of the migration run.

