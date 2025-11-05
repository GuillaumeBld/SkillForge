import type { Job } from 'bullmq';

import prisma from '../config/prisma';
import { registerQueue } from '../config/queue';

export interface AssessmentJobPayload {
  assessmentId: string;
}

const processAssessmentJob = async (job: Job<AssessmentJobPayload>): Promise<void> => {
  const { assessmentId } = job.data;

  try {
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: 'processing' }
    });

    // Placeholder for scoring logic to be implemented later
    await prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: 'completed', score: Math.random() * 100 }
    });
  } catch (error) {
    console.error('Assessment job failed', { assessmentId, error });
    throw error;
  }
};

const components = registerQueue<AssessmentJobPayload>('assessment-jobs', processAssessmentJob, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  },
  removeOnComplete: true,
  removeOnFail: false
});

export const assessmentQueue = components.queue;
export const assessmentWorker = components.worker;

export default components;
