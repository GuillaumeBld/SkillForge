jest.mock('./observability/tracing', () => {
  const noop = jest.fn();
  const sdk = { start: noop, shutdown: noop };
  return {
    __esModule: true,
    startTelemetry: noop,
    shutdownTelemetry: noop,
    otelSdk: sdk,
    default: sdk
  };
});

import request from 'supertest';
import app from './index';
import { getThrottler, SLA_LIMITS } from './middleware';
import { partnerDataStore } from './partner-store';
import { webhookService } from './webhooks';
import { __resetPartnerCredentialCache } from './config';

type Headers = Record<string, string>;

const primaryPartnerHeaders: Headers = {
  'x-api-key': 'sk_live_123',
  'x-api-secret': 'sh_live_456',
  'x-partner-id': 'workforce-agency-17'
};

const secondaryPartnerHeaders: Headers = {
  'x-api-key': 'sk_live_789',
  'x-api-secret': 'sh_live_012',
  'x-partner-id': 'enterprise-analytics-88'
};

const withHeaders = (overrides: Headers = {}) => ({
  ...primaryPartnerHeaders,
  ...overrides
});

describe('SkillForge partner workflows', () => {
  beforeEach(() => {
    delete process.env.PARTNER_CREDENTIALS;
    __resetPartnerCredentialCache();
    partnerDataStore.clear();
    webhookService.reset();
    getThrottler().clear();
  });

  it('returns service status payload', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('processes candidate imports and emits webhooks', async () => {
    const events: string[] = [];
    webhookService.registerConsumer('import.completed', async (event) => {
      events.push(`${event.type}:${event.payload.candidate_external_id}`);
    });
    webhookService.registerConsumer('import.failed', async (event) => {
      events.push(`${event.type}:${event.payload.candidate_external_id}`);
    });

    const response = await request(app)
      .post('/api/v1/candidates/import')
      .set(withHeaders())
      .send({
        webhook_url: 'https://partner.example.com/hooks/import',
        candidates: [
          {
            external_id: 'cand-001',
            name: 'Maya Ortiz',
            email: 'maya@example.org',
            resume_url: 'https://files.example.org/maya.pdf'
          },
          {
            external_id: 'cand-002',
            name: 'Jon Li',
            email: 'jon@example.org'
          }
        ]
      })
      .expect(201);

    expect(response.body.processed).toBe(1);
    expect(response.body.failed).toBe(1);
    expect(response.body.results).toHaveLength(2);
    expect(response.body.next_poll_url).toContain('/api/v1/candidates/import/');

    await webhookService.drain();

    expect(events).toEqual([
      'import.completed:cand-001',
      'import.failed:cand-002'
    ]);
  });

  it('enforces batch segregation across partners', async () => {
    const importResponse = await request(app)
      .post('/api/v1/candidates/import')
      .set(withHeaders())
      .send({
        candidates: [
          {
            external_id: 'cand-1001',
            name: 'Ana Vega',
            email: 'ana@example.org',
            resume_url: 'https://files.example.org/ana.pdf'
          }
        ]
      })
      .expect(201);

    const batchId = importResponse.body.batch_id as string;

    await request(app)
      .get(`/api/v1/candidates/import/${batchId}`)
      .set(secondaryPartnerHeaders)
      .expect(404);

    const primaryLookup = await request(app)
      .get(`/api/v1/candidates/import/${batchId}`)
      .set(withHeaders())
      .expect(200);

    expect(primaryLookup.body.batch.id).toBe(batchId);
    expect(primaryLookup.body.batch.partnerId).toBe('workforce-agency-17');
  });

  it('throttles candidate import requests per SLA', async () => {
    const throttler = getThrottler();
    const limit = SLA_LIMITS.candidateImport.production;

    for (let index = 0; index < limit; index += 1) {
      const allowed = throttler.attempt('workforce-agency-17:candidateImport', SLA_LIMITS.candidateImport, 'production');
      expect(allowed).toBe(true);
    }

    const response = await request(app)
      .post('/api/v1/candidates/import')
      .set(withHeaders())
      .send({
        candidates: [
          {
            external_id: 'cand-rate',
            name: 'Rate Test',
            email: 'rate@example.org',
            resume_url: 'https://files.example.org/rate.pdf'
          }
        ]
      })
      .expect(429);

    expect(response.body.message).toContain('Rate limit exceeded');
  });

  it('supports sandbox routing with SLA caps', async () => {
    const response = await request(app)
      .post('/api/v1/candidates/import')
      .set(withHeaders({ 'x-skillforge-environment': 'sandbox' }))
      .send({
        candidates: [
          {
            external_id: 'cand-sbx',
            name: 'Sandbox User',
            email: 'sbx@example.org',
            resume_url: 'https://files.example.org/sbx.pdf'
          }
        ]
      })
      .expect(201);

    expect(response.body.next_poll_url).toContain('https://sandbox.api.skillforge.com');
  });

  it('schedules assessments and publishes events', async () => {
    const scheduled: string[] = [];
    webhookService.registerConsumer('assessment.scheduled', async (event) => {
      scheduled.push(event.payload.assessment_id as string);
    });

    const response = await request(app)
      .post('/api/v1/assessments/create')
      .set(withHeaders())
      .send({
        candidate_id: 'sf_cand_001',
        assessment_template_id: 'templ_python_intro',
        delivery_mode: 'asynchronous',
        notify_candidate: true
      })
      .expect(201);

    expect(response.body.status).toBe('scheduled');
    expect(response.body.launch_url).toContain('/assess/');

    await webhookService.drain();

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]).toBe(response.body.assessment_id);
  });

  it('queues batch assessments with SLA protections', async () => {
    const response = await request(app)
      .post('/api/v1/assessments/assign-batch')
      .set(withHeaders())
      .send({
        cohort_id: 'spring-analytics',
        assessment_template_id: 'templ_python_intro',
        candidate_ids: ['sf_cand_001', 'sf_cand_002'],
        window_start: '2025-05-15T12:00:00Z',
        window_end: '2025-05-30T23:59:59Z'
      })
      .expect(202);

    expect(response.body.status).toBe('processing');
    expect(response.body.queued).toBe(2);
  });

  it('records placements and emits notifications', async () => {
    const placements: string[] = [];
    webhookService.registerConsumer('placement.recorded', async (event) => {
      placements.push(event.payload.placement_id as string);
      throw new Error('simulate webhook failure');
    });

    const response = await request(app)
      .post('/api/v1/placements/record')
      .set(withHeaders())
      .send({
        candidate_id: 'sf_cand_001',
        job_id: 'job-7788',
        employer_name: 'Acme Analytics',
        placement_date: '2025-05-01',
        employment_type: 'full_time'
      })
      .expect(201);

    expect(response.body.status).toBe('recorded');

    await webhookService.drain();

    expect(placements).toContain(response.body.placement_id);
    expect(webhookService.getDeadLetterQueue().map((event) => event.payload.placement_id)).toContain(
      response.body.placement_id
    );
  });

  it('runs end-to-end partner feed simulation', async () => {
    const importResponse = await request(app)
      .post('/api/v1/candidates/import')
      .set(withHeaders())
      .send({
        candidates: [
          {
            external_id: 'cand-e2e',
            name: 'E2E Candidate',
            email: 'e2e@example.org',
            resume_url: 'https://files.example.org/e2e.pdf'
          }
        ]
      })
      .expect(201);

    const assessmentResponse = await request(app)
      .post('/api/v1/assessments/create')
      .set(withHeaders())
      .send({
        candidate_id: importResponse.body.results[0].candidate_id,
        assessment_template_id: 'templ_sql_basics',
        delivery_mode: 'asynchronous'
      })
      .expect(201);

    const placementResponse = await request(app)
      .post('/api/v1/placements/record')
      .set(withHeaders())
      .send({
        candidate_id: importResponse.body.results[0].candidate_id,
        job_id: 'job-e2e-1',
        employer_name: 'SkillForge Partners',
        placement_date: '2025-06-01',
        employment_type: 'contract'
      })
      .expect(201);

    await webhookService.drain();

    expect(assessmentResponse.body.assessment_id).toBeDefined();
    expect(placementResponse.body.placement_id).toBeDefined();
    expect(webhookService.getDeadLetterQueue()).toHaveLength(0);
  });
});
