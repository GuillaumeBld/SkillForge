import type { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';

import prisma from '../config/prisma';
import { registerQueue } from '../config/queue';
import {
  auditLog,
  fetchScopedUsers,
  inferMissingScopeIds,
  isoNow,
  type ComplianceAction,
  type ComplianceJobBase,
  type ComplianceJobResult,
  type ComplianceScope
} from './compliance-support';

export interface ConsentRevocationJobPayload extends ComplianceJobBase {
  reason?: string;
}

interface ConsentRevocationMetrics {
  marketingOptInReset: boolean;
  preferencesDeleted: number;
  notificationsArchived: number;
  assessmentsCancelled: number;
}

const JOB_NAME = 'consent-revocation';

export const performConsentRevocation = async (payload: ConsentRevocationJobPayload): Promise<ComplianceJobResult> => {
  const dryRun = payload.dryRun ?? false;
  const scope: ComplianceScope = payload.scope ?? {};
  const startedAt = isoNow();

  const users = await fetchScopedUsers({ scope });
  const missingIds = inferMissingScopeIds(scope, users);

  const warnings: string[] = [];

  if (missingIds.length > 0) {
    warnings.push(`User IDs not found: ${missingIds.join(', ')}`);
  }

  if (users.length === 0) {
    auditLog('warn', 'No users matched consent revocation scope', {
      job: JOB_NAME,
      scope
    });
  }

  const actions: ComplianceAction[] = [];

  for (const user of users) {
    const [preference, notificationCount, scheduledAssessments] = await Promise.all([
      prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id } }),
      prisma.assessment.count({
        where: {
          userId: user.id,
          status: { in: ['scheduled', 'processing'] }
        }
      })
    ]);

    let metrics: ConsentRevocationMetrics = {
      marketingOptInReset: !user.marketingOptIn,
      preferencesDeleted: preference ? 1 : 0,
      notificationsArchived: notificationCount,
      assessmentsCancelled: scheduledAssessments
    };

    if (!dryRun) {
      metrics = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const userRecord = await tx.user.update({
          where: { id: user.id },
          data: { marketingOptIn: false }
        });

        const deletedPreferences = await tx.notificationPreference.deleteMany({
          where: { userId: user.id }
        });

        const cancelledAssessments = await tx.assessment.updateMany({
          where: {
            userId: user.id,
            status: { in: ['scheduled', 'processing'] }
          },
          data: {
            status: 'cancelled',
            notifyUser: false
          }
        });

        const archivedNotifications = await tx.notification.updateMany({
          where: { userId: user.id },
          data: { status: 'archived' }
        });

        return {
          marketingOptInReset: userRecord.marketingOptIn === false,
          preferencesDeleted: deletedPreferences.count,
          notificationsArchived: archivedNotifications.count,
          assessmentsCancelled: cancelledAssessments.count
        };
      });
    }

    actions.push({
      userId: user.id,
      entity: 'User',
      operation: 'update',
      applied: !dryRun,
      metadata: {
        marketingOptIn: false
      },
      description: 'Set marketing opt-in to false'
    });

    if (metrics.preferencesDeleted > 0 || preference) {
      actions.push({
        userId: user.id,
        entity: 'NotificationPreference',
        operation: 'delete',
        applied: !dryRun,
        count: metrics.preferencesDeleted,
        description: preference ? 'Removed notification preferences' : 'No notification preferences found'
      });
    }

    if (metrics.notificationsArchived > 0 || notificationCount > 0) {
      actions.push({
        userId: user.id,
        entity: 'Notification',
        operation: metrics.notificationsArchived > 0 ? 'update' : 'noop',
        applied: !dryRun && metrics.notificationsArchived > 0,
        count: metrics.notificationsArchived || notificationCount,
        description: 'Archived notifications for revoked consent',
        metadata: {
          previousCount: notificationCount
        }
      });
    }

    if (metrics.assessmentsCancelled > 0 || scheduledAssessments > 0) {
      actions.push({
        userId: user.id,
        entity: 'Assessment',
        operation: metrics.assessmentsCancelled > 0 ? 'update' : 'noop',
        applied: !dryRun && metrics.assessmentsCancelled > 0,
        count: metrics.assessmentsCancelled || scheduledAssessments,
        description: 'Cancelled scheduled assessments and disabled notifications',
        metadata: {
          previousScheduled: scheduledAssessments
        }
      });
    }

    auditLog('info', 'Processed consent revocation for user', {
      job: JOB_NAME,
      userId: user.id,
      dryRun,
      marketingOptInWasTrue: user.marketingOptIn,
      notificationsArchived: metrics.notificationsArchived,
      assessmentsCancelled: metrics.assessmentsCancelled,
      preferencesRemoved: metrics.preferencesDeleted
    });
  }

  const completedAt = isoNow();

  return {
    job: JOB_NAME,
    dryRun,
    scope,
    triggeredBy: payload.triggeredBy,
    note: payload.note ?? payload.reason,
    startedAt,
    completedAt,
    processedUsers: users.length,
    actions,
    warnings
  };
};

const processConsentRevocationJob = async (job: Job<ConsentRevocationJobPayload>) => {
  auditLog('info', 'Starting consent revocation job', {
    job: JOB_NAME,
    jobId: job.id,
    dryRun: job.data.dryRun ?? false,
    scope: job.data.scope
  });

  const result = await performConsentRevocation(job.data);

  auditLog('info', 'Completed consent revocation job', {
    job: JOB_NAME,
    jobId: job.id,
    processedUsers: result.processedUsers,
    dryRun: result.dryRun,
    warnings: result.warnings.length
  });

  return result;
};

const consentComponents = registerQueue<ConsentRevocationJobPayload>(`${JOB_NAME}-jobs`, processConsentRevocationJob, {
  attempts: 1,
  removeOnComplete: true,
  removeOnFail: false
});

export const consentRevocationQueue = consentComponents.queue;
export const consentRevocationWorker = consentComponents.worker;

export default consentComponents;
