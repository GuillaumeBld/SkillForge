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

export interface DataRetentionJobPayload extends ComplianceJobBase {
  /**
   * ISO date string. Users updated before this timestamp will be targeted.
   */
  before?: string;
  /**
   * Fallback window (in months) applied when `before` is not supplied. Defaults to 24.
   */
  monthsInactive?: number;
}

interface RetentionMetrics {
  notificationsRemoved: number;
  resumesRemoved: number;
  assessmentsRemoved: number;
  preferencesRemoved: number;
  profilesRemoved: number;
  userDeleted: boolean;
}

const JOB_NAME = 'data-retention';
const DEFAULT_INACTIVE_MONTHS = 24;

const resolveCutoff = (payload: DataRetentionJobPayload): { cutoff: Date; source: 'before' | 'months' } => {
  if (payload.before) {
    const parsed = new Date(payload.before);

    if (!Number.isNaN(parsed.valueOf())) {
      return { cutoff: parsed, source: 'before' };
    }

    auditLog('warn', 'Invalid cutoff supplied to data retention job; falling back to monthsInactive window', {
      job: JOB_NAME,
      before: payload.before
    });
  }

  const months = payload.monthsInactive ?? DEFAULT_INACTIVE_MONTHS;
  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() - months);

  return { cutoff: fallback, source: 'months' };
};

export const performDataRetention = async (payload: DataRetentionJobPayload): Promise<ComplianceJobResult> => {
  const dryRun = payload.dryRun ?? false;
  const scope: ComplianceScope = payload.scope ?? {};
  const startedAt = isoNow();

  const { cutoff, source } = resolveCutoff(payload);
  const filters = {
    updatedAt: {
      lt: cutoff
    }
  };

  const users = await fetchScopedUsers({ scope, filters });
  const missing = inferMissingScopeIds(scope, users);

  const warnings: string[] = [];

  if (missing.length > 0) {
    warnings.push(`User IDs not found: ${missing.join(', ')}`);
  }

  if (users.length === 0) {
    auditLog('info', 'No users matched data retention criteria', {
      job: JOB_NAME,
      scope,
      cutoff: cutoff.toISOString(),
      source
    });
  }

  const actions: ComplianceAction[] = [];

  for (const user of users) {
    const [notificationCount, resumeCount, assessmentCount, preferenceCount, profile] = await Promise.all([
      prisma.notification.count({ where: { userId: user.id } }),
      prisma.resumeIngestion.count({ where: { userId: user.id } }),
      prisma.assessment.count({ where: { userId: user.id } }),
      prisma.notificationPreference.count({ where: { userId: user.id } }),
      prisma.profile.findUnique({
        where: { userId: user.id },
        select: { id: true }
      })
    ]);

    let metrics: RetentionMetrics = {
      notificationsRemoved: notificationCount,
      resumesRemoved: resumeCount,
      assessmentsRemoved: assessmentCount,
      preferencesRemoved: preferenceCount,
      profilesRemoved: profile ? 1 : 0,
      userDeleted: false
    };

    if (!dryRun) {
      metrics = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const removedNotifications = await tx.notification.deleteMany({
          where: { userId: user.id }
        });

        const removedResumes = await tx.resumeIngestion.deleteMany({
          where: { userId: user.id }
        });

        const removedAssessments = await tx.assessment.deleteMany({
          where: { userId: user.id }
        });

        const removedPreferences = await tx.notificationPreference.deleteMany({
          where: { userId: user.id }
        });

        const removedProfiles = await tx.profile.deleteMany({
          where: { userId: user.id }
        });

        await tx.user.delete({
          where: { id: user.id }
        });

        return {
          notificationsRemoved: removedNotifications.count,
          resumesRemoved: removedResumes.count,
          assessmentsRemoved: removedAssessments.count,
          preferencesRemoved: removedPreferences.count,
          profilesRemoved: removedProfiles.count,
          userDeleted: true
        };
      });
    }

    actions.push({
      userId: user.id,
      entity: 'Notification',
      operation: metrics.notificationsRemoved > 0 ? 'delete' : 'noop',
      applied: !dryRun && metrics.notificationsRemoved > 0,
      count: metrics.notificationsRemoved,
      description: 'Removed notifications as part of retention policy'
    });

    actions.push({
      userId: user.id,
      entity: 'ResumeIngestion',
      operation: metrics.resumesRemoved > 0 ? 'delete' : 'noop',
      applied: !dryRun && metrics.resumesRemoved > 0,
      count: metrics.resumesRemoved,
      description: 'Removed resume ingestions as part of retention policy'
    });

    actions.push({
      userId: user.id,
      entity: 'Assessment',
      operation: metrics.assessmentsRemoved > 0 ? 'delete' : 'noop',
      applied: !dryRun && metrics.assessmentsRemoved > 0,
      count: metrics.assessmentsRemoved,
      description: 'Removed assessments older than retention window'
    });

    if (metrics.preferencesRemoved > 0 || preferenceCount > 0) {
      actions.push({
        userId: user.id,
        entity: 'NotificationPreference',
        operation: metrics.preferencesRemoved > 0 ? 'delete' : 'noop',
        applied: !dryRun && metrics.preferencesRemoved > 0,
        count: metrics.preferencesRemoved || preferenceCount,
        description: 'Cleared notification preferences'
      });
    }

    if (metrics.profilesRemoved > 0 || profile) {
      actions.push({
        userId: user.id,
        entity: 'Profile',
        operation: metrics.profilesRemoved > 0 ? 'delete' : 'noop',
        applied: !dryRun && metrics.profilesRemoved > 0,
        count: metrics.profilesRemoved || (profile ? 1 : 0),
        description: 'Removed profile data'
      });
    }

    actions.push({
      userId: user.id,
      entity: 'User',
      operation: 'delete',
      applied: !dryRun,
      count: metrics.userDeleted ? 1 : 0,
      description: 'Deleted user record after dependent data removal',
      metadata: {
        updatedAt: user.updatedAt.toISOString(),
        cutoff: cutoff.toISOString()
      }
    });

    auditLog('info', 'Applied data retention policies to user', {
      job: JOB_NAME,
      dryRun,
      userId: user.id,
      notificationsRemoved: metrics.notificationsRemoved,
      assessmentsRemoved: metrics.assessmentsRemoved,
      resumesRemoved: metrics.resumesRemoved,
      scope
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

const processDataRetentionJob = async (job: Job<DataRetentionJobPayload>) => {
  auditLog('info', 'Starting data retention job', {
    job: JOB_NAME,
    jobId: job.id,
    dryRun: job.data.dryRun ?? false,
    scope: job.data.scope,
    before: job.data.before,
    monthsInactive: job.data.monthsInactive
  });

  const result = await performDataRetention(job.data);

  auditLog('info', 'Completed data retention job', {
    job: JOB_NAME,
    jobId: job.id,
    processedUsers: result.processedUsers,
    dryRun: result.dryRun,
    warnings: result.warnings.length
  });

  return result;
};

const dataRetentionComponents = registerQueue<DataRetentionJobPayload>(
  `${JOB_NAME}-jobs`,
  processDataRetentionJob,
  {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false
  }
);

export const dataRetentionQueue = dataRetentionComponents.queue;
export const dataRetentionWorker = dataRetentionComponents.worker;

export default dataRetentionComponents;
