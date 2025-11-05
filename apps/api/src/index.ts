import cors from 'cors';
import express, { type Request, type Response } from 'express';
import morgan from 'morgan';
import type { paths } from '@skillforge/shared';
import { apiKeyAuth, enforceRateLimit, SLA_LIMITS, type PartnerRequest } from './middleware';
import { partnerDataStore, type CandidateImportRequest, type AssessmentRequest, type BatchAssessmentRequest, type PlacementRequest } from './partner-store';
import { webhookService } from './webhooks';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestContext);
app.use(apiRateLimiter);
app.use(morgan('combined'));

type HealthResponse = {
  status: string;
  timestamp: string;
};

app.get('/api/v1/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

const partnerRouter = express.Router();

partnerRouter.use(apiKeyAuth);

function getBaseUrl(environment: 'production' | 'sandbox'): string {
  return environment === 'sandbox' ? 'https://sandbox.api.skillforge.com' : 'https://api.skillforge.com';
}

partnerRouter.post(
  '/candidates/import',
  enforceRateLimit('candidateImport', SLA_LIMITS.candidateImport),
  (request: PartnerRequest, response: Response) => {
    try {
      const context = request.partnerContext!;
      const payload = request.body as CandidateImportRequest;
      const batch = partnerDataStore.createCandidateBatch(context.credential.partnerId, context.environment, payload);

      batch.results.forEach((candidate) => {
        const eventType = candidate.status === 'processed' ? 'import.completed' : 'import.failed';
        webhookService.publish({
          type: eventType,
          partnerId: context.credential.partnerId,
          environment: context.environment,
          payload: {
            batch_id: batch.id,
            candidate_external_id: candidate.external_id,
            candidate_id: candidate.candidate_id,
            status: candidate.status,
            error: candidate.error
          }
        });
      });

      response.status(201).json({
        status: 'success',
        batch_id: batch.id,
        processed: batch.processed,
        failed: batch.failed,
        results: batch.results.map((candidate) => ({
          external_id: candidate.external_id,
          status: candidate.status,
          candidate_id: candidate.candidate_id,
          jaat_vector_version: candidate.jaat_vector_version,
          webhook_delivery: 'pending',
          error: candidate.error
        })),
        next_poll_url: `${getBaseUrl(context.environment)}/api/v1/candidates/import/${batch.id}`
      });
    } catch (error) {
      response.status(400).json({ status: 'error', message: (error as Error).message });
    }
  }
);

partnerRouter.get('/candidates/import/:batchId', (request: PartnerRequest, response: Response) => {
  const context = request.partnerContext!;
  const batchId = request.params.batchId;
  const record = partnerDataStore.getCandidateBatch(context.credential.partnerId, context.environment, batchId);

  if (!record) {
    response.status(404).json({ status: 'error', message: 'Batch not found' });
    return;
  }

  response.json({
    status: 'success',
    batch: record
  });
});

partnerRouter.post(
  '/assessments/create',
  enforceRateLimit('assessmentSchedule', SLA_LIMITS.assessmentSchedule),
  (request: PartnerRequest, response: Response) => {
    try {
      const context = request.partnerContext!;
      const payload = request.body as AssessmentRequest;
      const record = partnerDataStore.createAssessment(context.credential.partnerId, context.environment, payload);

      webhookService.publish({
        type: 'assessment.scheduled',
        partnerId: context.credential.partnerId,
        environment: context.environment,
        payload: {
          assessment_id: record.id,
          candidate_id: record.candidateId,
          template_id: record.templateId
        }
      });

      response.status(201).json({
        status: 'scheduled',
        assessment_id: record.id,
        launch_url: `${getBaseUrl(context.environment)}/assess/${record.id}`,
        webhook_delivery: 'assessment.scheduled'
      });
    } catch (error) {
      response.status(400).json({ status: 'error', message: (error as Error).message });
    }
  }
);

partnerRouter.post(
  '/assessments/assign-batch',
  enforceRateLimit('assessmentBatch', SLA_LIMITS.assessmentBatch),
  (request: PartnerRequest, response: Response) => {
    try {
      const context = request.partnerContext!;
      const payload = request.body as BatchAssessmentRequest;
      const record = partnerDataStore.createBatchAssessment(context.credential.partnerId, context.environment, payload);

      webhookService.publish({
        type: 'assessment.batch_scheduled',
        partnerId: context.credential.partnerId,
        environment: context.environment,
        payload: {
          batch_id: record.id,
          candidate_ids: record.candidateIds,
          template_id: record.templateId
        }
      });

      response.status(202).json({
        status: 'processing',
        batch_id: record.id,
        queued: record.queued,
        estimated_completion_seconds: Math.max(30, record.queued * 5)
      });
    } catch (error) {
      response.status(400).json({ status: 'error', message: (error as Error).message });
    }
  }
);

partnerRouter.post(
  '/placements/record',
  enforceRateLimit('placementRecord', SLA_LIMITS.placementRecord),
  (request: PartnerRequest, response: Response) => {
    try {
      const context = request.partnerContext!;
      const payload = request.body as PlacementRequest;
      const record = partnerDataStore.recordPlacement(context.credential.partnerId, context.environment, payload);

      webhookService.publish({
        type: 'placement.recorded',
        partnerId: context.credential.partnerId,
        environment: context.environment,
        payload: {
          placement_id: record.id,
          candidate_id: record.candidateId,
          job_id: record.jobId
        }
      });

      response.status(201).json({
        status: 'recorded',
        placement_id: record.id,
        dashboard_url: `${getBaseUrl(context.environment)}/placements/${record.id}`
      });
    } catch (error) {
      response.status(400).json({ status: 'error', message: (error as Error).message });
    }
  }
);

app.use('/api/v1', partnerRouter);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await startTelemetry();
  } catch (error) {
    console.error('Failed to start telemetry', error);
  }

  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });
  }
};

void startServer();

process.on('SIGTERM', async () => {
  await shutdownTelemetry();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdownTelemetry();
  process.exit(0);
});

export default app;
