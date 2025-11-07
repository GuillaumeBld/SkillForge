import type { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';

import prisma from '../config/prisma';
import { registerQueue } from '../config/queue';
import {
  auditLog,
  fetchScopedUsers,
  inferMissingScopeIds,
  isoNow,
  toRecord,
  type ComplianceAction,
  type ComplianceJobBase,
  type ComplianceJobResult,
  type ComplianceScope
} from './compliance-support';

export interface PartnerSegregationJobPayload extends ComplianceJobBase {
  /**
   * Override the metadata key that stores tenant affiliation in JSON payloads.
   * Defaults to `tenantId`.
   */
  tenantMetadataKey?: string;
}

interface MetadataUpdate {
  id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

const JOB_NAME = 'partner-segregation';

const DEFAULT_TENANT_METADATA_KEY = 'tenantId';
const DEFAULT_PARTNER_METADATA_KEY = 'partnerId';

const needsMetadataUpdate = (metadata: Record<string, unknown>, tenantId: string): boolean => {
  const tenantValue = metadata[DEFAULT_TENANT_METADATA_KEY] ?? metadata[DEFAULT_PARTNER_METADATA_KEY];

  return tenantValue !== tenantId;
};

export const performPartnerSegregation = async (
  payload: PartnerSegregationJobPayload
): Promise<ComplianceJobResult> => {
  const dryRun = payload.dryRun ?? false;
  const scope: ComplianceScope = payload.scope ?? {};
  const startedAt = isoNow();

  const warnings: string[] = [];

  if (!scope.tenantId) {
    const warning = 'partner-segregation job requires scope.tenantId';
    auditLog('warn', warning, { job: JOB_NAME });
    const completedAt = isoNow();

    return {
      job: JOB_NAME,
      dryRun,
      scope,
      triggeredBy: payload.triggeredBy,
      note: payload.note,
      startedAt,
      completedAt,
      processedUsers: 0,
      actions: [],
      warnings: [warning]
    };
  }

  const users = await fetchScopedUsers({ scope });
  const missing = inferMissingScopeIds(scope, users);

  if (missing.length > 0) {
    warnings.push(`User IDs not found: ${missing.join(', ')}`);
  }

  if (users.length === 0) {
    auditLog('info', 'No users matched partner segregation scope', {
      job: JOB_NAME,
      scope
    });
  }

  const tenantMetadataKey = payload.tenantMetadataKey ?? DEFAULT_TENANT_METADATA_KEY;
  const actions: ComplianceAction[] = [];

  for (const user of users) {
    const [resumeIngestions, notifications] = await Promise.all([
      prisma.resumeIngestion.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          ingestionMetadata: true
        }
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          actions: true
        }
      })
    ]);

    const resumeUpdates: MetadataUpdate[] = [];

    for (const ingestion of resumeIngestions) {
      const metadata = toRecord(ingestion.ingestionMetadata);

      if (needsMetadataUpdate(metadata, scope.tenantId)) {
        resumeUpdates.push({
          id: ingestion.id,
          before: metadata,
          after: {
            ...metadata,
            [tenantMetadataKey]: scope.tenantId,
            [DEFAULT_PARTNER_METADATA_KEY]: scope.tenantId
          }
        });
      }
    }

    const notificationUpdates: MetadataUpdate[] = [];

    for (const notification of notifications) {
      const actionsMetadata = toRecord(notification.actions);
      const currentTenant = actionsMetadata[tenantMetadataKey] ?? actionsMetadata[DEFAULT_PARTNER_METADATA_KEY];

      if (currentTenant !== scope.tenantId) {
        notificationUpdates.push({
          id: notification.id,
          before: actionsMetadata,
          after: {
            ...actionsMetadata,
            [tenantMetadataKey]: scope.tenantId,
            [DEFAULT_PARTNER_METADATA_KEY]: scope.tenantId
          }
        });
      }
    }

    if (!dryRun) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const update of resumeUpdates) {
          await tx.resumeIngestion.update({
            where: { id: update.id },
            data: { ingestionMetadata: update.after }
          });
        }

        for (const update of notificationUpdates) {
          await tx.notification.update({
            where: { id: update.id },
            data: { actions: update.after }
          });
        }
      });
    }

    actions.push({
      userId: user.id,
      entity: 'ResumeIngestion',
      operation: resumeUpdates.length > 0 ? 'update' : 'noop',
      applied: !dryRun && resumeUpdates.length > 0,
      count: resumeUpdates.length,
      description: resumeUpdates.length > 0 ? 'Aligned ingestion metadata with tenant scope' : 'Ingestion metadata already aligned',
      metadata: resumeUpdates.length > 0 ? { affectedIngestions: resumeUpdates.map((entry) => entry.id) } : undefined
    });

    actions.push({
      userId: user.id,
      entity: 'Notification',
      operation: notificationUpdates.length > 0 ? 'update' : 'noop',
      applied: !dryRun && notificationUpdates.length > 0,
      count: notificationUpdates.length,
      description: notificationUpdates.length > 0 ? 'Aligned notification actions metadata with tenant scope' : 'Notification metadata already aligned',
      metadata: notificationUpdates.length > 0 ? { affectedNotifications: notificationUpdates.map((entry) => entry.id) } : undefined
    });

    auditLog('info', 'Partner segregation scan completed for user', {
      job: JOB_NAME,
      dryRun,
      userId: user.id,
      resumeUpdates: resumeUpdates.length,
      notificationUpdates: notificationUpdates.length,
      tenant: scope.tenantId
    });
  }

  const completedAt = isoNow();

  return {
    job: JOB_NAME,
    dryRun,
    scope,
    triggeredBy: payload.triggeredBy,
    note: payload.note,
    startedAt,
    completedAt,
    processedUsers: users.length,
    actions,
    warnings
  };
};

const processPartnerSegregationJob = async (job: Job<PartnerSegregationJobPayload>) => {
  auditLog('info', 'Starting partner segregation job', {
    job: JOB_NAME,
    jobId: job.id,
    dryRun: job.data.dryRun ?? false,
    scope: job.data.scope
  });

  const result = await performPartnerSegregation(job.data);

  auditLog('info', 'Completed partner segregation job', {
    job: JOB_NAME,
    jobId: job.id,
    processedUsers: result.processedUsers,
    dryRun: result.dryRun,
    warnings: result.warnings.length
  });

  return result;
};

const partnerSegregationComponents = registerQueue<PartnerSegregationJobPayload>(
  `${JOB_NAME}-jobs`,
  processPartnerSegregationJob,
  {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false
  }
);

export const partnerSegregationQueue = partnerSegregationComponents.queue;
export const partnerSegregationWorker = partnerSegregationComponents.worker;

export default partnerSegregationComponents;
