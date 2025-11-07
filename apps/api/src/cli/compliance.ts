#!/usr/bin/env node
import type { Queue } from 'bullmq';

import {
  consentRevocationQueue,
  performConsentRevocation,
  type ConsentRevocationJobPayload
} from '../workers/consent-revocation.worker';
import { dataRetentionQueue, performDataRetention, type DataRetentionJobPayload } from '../workers/data-retention.worker';
import {
  partnerSegregationQueue,
  performPartnerSegregation,
  type PartnerSegregationJobPayload
} from '../workers/partner-segregation.worker';
import { auditLog, ensureArray, type ComplianceJobResult, type ComplianceScope } from '../workers/compliance-support';

type JobName = 'consent-revocation' | 'data-retention' | 'partner-segregation';

interface CliOptions {
  job?: JobName;
  queue: boolean;
  dryRun: boolean;
  scope: ComplianceScope;
  triggeredBy?: string;
  note?: string;
  reason?: string;
  before?: string;
  monthsInactive?: number;
  tenantMetadataKey?: string;
  help?: boolean;
}

type JobDefinition<Payload> = {
  name: JobName;
  queue?: Queue<Payload>;
  buildPayload: (options: CliOptions) => Payload;
  run: (payload: Payload) => Promise<ComplianceJobResult>;
};

const JOBS: Record<JobName, JobDefinition<any>> = {
  'consent-revocation': {
    name: 'consent-revocation',
    queue: consentRevocationQueue,
    buildPayload: (options: CliOptions): ConsentRevocationJobPayload => ({
      dryRun: options.dryRun,
      scope: options.scope,
      triggeredBy: options.triggeredBy,
      note: options.note,
      reason: options.reason
    }),
    run: performConsentRevocation
  },
  'data-retention': {
    name: 'data-retention',
    queue: dataRetentionQueue,
    buildPayload: (options: CliOptions): DataRetentionJobPayload => ({
      dryRun: options.dryRun,
      scope: options.scope,
      triggeredBy: options.triggeredBy,
      note: options.note,
      before: options.before,
      monthsInactive: options.monthsInactive
    }),
    run: performDataRetention
  },
  'partner-segregation': {
    name: 'partner-segregation',
    queue: partnerSegregationQueue,
    buildPayload: (options: CliOptions): PartnerSegregationJobPayload => ({
      dryRun: options.dryRun,
      scope: options.scope,
      triggeredBy: options.triggeredBy,
      note: options.note,
      tenantMetadataKey: options.tenantMetadataKey
    }),
    run: performPartnerSegregation
  }
};

const HELP_TEXT = `
Usage: compliance <job> [options]

Jobs:
  consent-revocation     Disable notifications/marketing and archive messages for users.
  data-retention         Purge data that predates the retention window.
  partner-segregation    Align partner/tenant metadata across records.

Common options:
  --tenant <tenantId>        Restrict scope to a tenant.
  --user <userId>            Restrict scope to a specific user (repeatable).
  --dry-run                  Evaluate without applying changes (default).
  --apply | --execute        Apply changes instead of dry-run.
  --queue                    Enqueue job instead of running immediately.
  --triggered-by <email>     Operator identity for audit logs.
  --note <text>              Additional audit context.

Job specific options:
  consent-revocation: --reason <text>
  data-retention: --before <ISO date>, --months <int>
  partner-segregation: --tenant-key <metadataKey>

Examples:
  compliance consent-revocation --tenant acme --dry-run
  compliance data-retention --before 2023-01-01T00:00:00Z --apply
  compliance partner-segregation --tenant orbit --queue
`.trim();

const parseArgValue = (arg: string, next: string | undefined): [string | undefined, number] => {
  const [flag, inlineValue] = arg.split('=');

  if (inlineValue !== undefined) {
    return [inlineValue, 0];
  }

  if (!next || next.startsWith('--')) {
    return [undefined, 0];
  }

  return [next, 1];
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    queue: false,
    dryRun: true,
    scope: {}
  };

  if (argv.length === 0) {
    options.help = true;
    return options;
  }

  let index = 0;

  const jobCandidate = argv[index];

  if (jobCandidate && !jobCandidate.startsWith('--')) {
    if (['consent-revocation', 'data-retention', 'partner-segregation'].includes(jobCandidate)) {
      options.job = jobCandidate as JobName;
      index += 1;
    } else {
      throw new Error(`Unknown job "${jobCandidate}". Use --help for usage.`);
    }
  }

  for (; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (arg === '--help') {
      options.help = true;
      return options;
    }

    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument "${arg}". Use --help for usage.`);
    }

    switch (true) {
      case arg === '--queue': {
        options.queue = true;
        break;
      }
      case arg === '--dry-run': {
        options.dryRun = true;
        break;
      }
      case arg === '--apply' || arg === '--execute' || arg === '--no-dry-run': {
        options.dryRun = false;
        break;
      }
      case arg.startsWith('--tenant'): {
        const [value, consumed] = parseArgValue(arg, argv[index + 1]);
        if (!value) {
          throw new Error('--tenant flag requires a value');
        }
        options.scope.tenantId = value;
        index += consumed;
        break;
      }
      case arg.startsWith('--user'): {
        const [value, consumed] = parseArgValue(arg, argv[index + 1]);
        if (!value) {
          throw new Error('--user flag requires a value');
        }
        const current = ensureArray(options.scope.userIds);
        current.push(value);
        options.scope.userIds = Array.from(new Set(current));
        index += consumed;
        break;
      }
      case arg.startsWith('--triggered-by'): {
        const [value, consumed] = parseArgValue(arg, argv[index + 1]);
        if (!value) {
          throw new Error('--triggered-by flag requires a value');
        }
        options.triggeredBy = value;
        index += consumed;
        break;
      }
      case arg.startsWith('--note'): {
        const [value, consumed] = parseArgValue(arg, argv[index + 1]);
        if (!value) {
          throw new Error('--note flag requires a value');
        }
        options.note = value;
        index += consumed;
        break;
      }
      case arg.startsWith('--reason'): {
        const [value, consumed] = parseArgValue(arg, argv[index + 1]);
        if (!value) {
          throw new Error('--reason flag requires a value');
        }
        options.reason = value;
        index += consumed;
        break;
      }
      case arg.startsWith('--before'): {
        const [value, consumed] = parseArgValue(arg, argv[index + 1]);
        if (!value) {
          throw new Error('--before flag requires a value');
        }
        options.before = value;
        index += consumed;
        break;
      }
      case arg.startsWith('--months'): {
        const [value, consumed] = parseArgValue(arg, argv[index + 1]);
        if (!value) {
          throw new Error('--months flag requires a value');
        }
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
          throw new Error('--months flag must be a positive integer');
        }
        options.monthsInactive = parsed;
        index += consumed;
        break;
      }
      case arg.startsWith('--tenant-key'): {
        const [value, consumed] = parseArgValue(arg, argv[index + 1]);
        if (!value) {
          throw new Error('--tenant-key flag requires a value');
        }
        options.tenantMetadataKey = value;
        index += consumed;
        break;
      }
      default: {
        throw new Error(`Unknown option "${arg}". Use --help for usage.`);
      }
    }
  }

  if (!options.job && !options.help) {
    throw new Error('Missing job argument. Use --help for usage.');
  }

  return options;
};

const summarizeResult = (result: ComplianceJobResult) => ({
  job: result.job,
  dryRun: result.dryRun,
  processedUsers: result.processedUsers,
  actions: result.actions.length,
  warnings: result.warnings,
  scope: result.scope
});

const main = async () => {
  try {
    const argv = process.argv.slice(2);
    const options = parseArgs(argv);

    if (options.help || !options.job) {
      console.log(HELP_TEXT);
      process.exit(0);
      return;
    }

    const jobDefinition = JOBS[options.job];
    const payload = jobDefinition.buildPayload(options);

    if (options.queue) {
      if (!jobDefinition.queue) {
        throw new Error(`Queue for job "${options.job}" is unavailable (Redis disabled?).`);
      }

      const job = await jobDefinition.queue.add(options.job, payload, {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 1
      });

      auditLog('info', 'Enqueued compliance job', {
        job: options.job,
        jobId: job.id,
        dryRun: payload.dryRun ?? false,
        scope: payload.scope
      });

      console.log(`Enqueued ${options.job} job (${job.id}). Inspect BullMQ dashboard or logs for progress.`);
      return;
    }

    auditLog('info', 'Executing compliance job via CLI', {
      job: options.job,
      dryRun: payload.dryRun ?? false,
      scope: payload.scope,
      triggeredBy: payload.triggeredBy
    });

    const result = await jobDefinition.run(payload);

    auditLog('info', 'Compliance job completed via CLI', summarizeResult(result));
    console.log(JSON.stringify(summarizeResult(result), null, 2));
  } catch (error) {
    auditLog('error', 'Compliance CLI failed', {
      error: (error as Error).message
    });
    console.error((error as Error).message);
    process.exit(1);
  }
};

void main();

