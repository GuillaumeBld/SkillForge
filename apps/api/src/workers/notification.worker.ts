import type { Job } from 'bullmq';

import prisma from '../config/prisma';
import { registerQueue } from '../config/queue';

export interface NotificationJobPayload {
  userId: string;
  channel: 'email' | 'sms' | 'push';
  template: string;
  data: Record<string, unknown>;
}

const processNotificationJob = async (job: Job<NotificationJobPayload>): Promise<void> => {
  const { userId, channel, template, data } = job.data;

  try {
    console.info(`Dispatching notification`, { userId, channel, template, data });
    await prisma.notificationPreference.findUnique({ where: { userId } });
  } catch (error) {
    console.error('Notification job failed', { userId, channel, error });
    throw error;
  }
};

const components = registerQueue<NotificationJobPayload>('notification-jobs', processNotificationJob, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 3000
  },
  removeOnComplete: true,
  removeOnFail: false
});

export const notificationQueue = components.queue;
export const notificationWorker = components.worker;

export default components;
