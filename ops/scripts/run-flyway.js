#!/usr/bin/env node

/**
 * Lightweight wrapper that maps DATABASE_URL style DSNs to Flyway environment variables
 * so migrations run with the same connection settings used by Prisma.
 */

const { spawnSync } = require("child_process");
const { URL } = require("url");

const flywayExecutable = process.env.FLYWAY_CLI || "flyway";
const args = process.argv.slice(2);
const flywayCommand = args[0] || "migrate";
const flywayArgs = args.slice(1);

const env = { ...process.env };

function applyJdbcFromDsn(dsn) {
  if (!dsn) {
    return;
  }

  let parsed;
  try {
    parsed = new URL(dsn);
  } catch (error) {
    console.error(`[flyway] Unable to parse DATABASE_URL value: ${error.message}`);
    process.exit(1);
  }

  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    console.error(`[flyway] Unsupported protocol in DATABASE_URL: ${parsed.protocol}`);
    process.exit(1);
  }

  const portPart = parsed.port ? `:${parsed.port}` : "";
  const searchPart = parsed.search || "";

  env.FLYWAY_URL =
    env.FLYWAY_URL ||
    `jdbc:postgresql://${parsed.hostname}${portPart}${parsed.pathname}${searchPart}`;

  if (!env.FLYWAY_USER && parsed.username) {
    env.FLYWAY_USER = decodeURIComponent(parsed.username);
  }

  if (!env.FLYWAY_PASSWORD && parsed.password) {
    env.FLYWAY_PASSWORD = decodeURIComponent(parsed.password);
  }
}

if (!env.FLYWAY_URL) {
  applyJdbcFromDsn(env.DATABASE_URL);
  applyJdbcFromDsn(env.SKILLFORGE_DATABASE_URL);
  applyJdbcFromDsn(env.SKILLFORGE_LOCAL_DATABASE_URL);
  applyJdbcFromDsn(env.SKILLFORGE_STAGING_DATABASE_URL);
  applyJdbcFromDsn(env.SKILLFORGE_PRODUCTION_DATABASE_URL);
}

if (!env.FLYWAY_URL) {
  console.error(
    "[flyway] Missing connection details. Set DATABASE_URL or FLYWAY_URL/FLYWAY_USER/FLYWAY_PASSWORD."
  );
  process.exit(1);
}

const spawnArgs = [
  "-configFiles=db/flyway/flyway.conf",
  flywayCommand,
  ...flywayArgs,
];

const result = spawnSync(flywayExecutable, spawnArgs, {
  stdio: "inherit",
  env,
});

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.error(
      `[flyway] Unable to find '${flywayExecutable}' on PATH. Install Flyway CLI or set FLYWAY_CLI.`
    );
  } else {
    console.error(`[flyway] Failed to execute Flyway: ${result.error.message}`);
  }
  process.exit(1);
}

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
