import { http, HttpResponse, delay } from 'msw';
import type {
  AssessmentListResponse,
  CandidateImportResponse,
  MatchListResponse,
  NotificationListResponse,
  CandidateMatchListResponse,
  DashboardResponse
} from '../api/types';

const apiMatcher = '*/api/v1';
const now = new Date().toISOString();

const resumeStatus = {
  status: 'ok',
  resume_id: 'resume-123',
  ingestion_state: 'processing',
  estimated_completion_seconds: 90
};

const matchResponse: MatchListResponse = {
  status: 'success',
  next_cursor: null,
  user_id: 'demo-user',
  type: 'jobs',
  results: [
    {
      id: 'job-100',
      title: 'Junior Data Analyst',
      match_score: 78,
      summary: 'Entry-level analytics role focusing on SQL and dashboards.',
      partner_tags: ['in-demand', 'remote']
    },
    {
      id: 'job-101',
      title: 'Business Intelligence Associate',
      match_score: 74,
      partner_tags: ['hybrid']
    }
  ]
};

const notificationResponse: NotificationListResponse = {
  status: 'success',
  next_cursor: null,
  notifications: [
    {
      id: 'notif-001',
      category: 'assessment',
      message: 'Your readiness assessment results are available.',
      delivered_at: now,
      channel: 'email',
      status: 'unread'
    },
    {
      id: 'notif-002',
      category: 'plan',
      message: 'Two action items are due this week.',
      delivered_at: now,
      channel: 'in_app',
      status: 'unread'
    }
  ]
};

const candidateMatches: CandidateMatchListResponse = {
  status: 'success',
  next_cursor: null,
  candidate_id: 'candidate-001',
  type: 'jobs',
  results: [
    {
      id: 'cand-match-001',
      title: 'Customer Success Analyst',
      match_score: 81,
      summary: 'Client-facing analytics role with Salesforce exposure.',
      partner_tags: ['cohort-a']
    },
    {
      id: 'cand-match-002',
      title: 'Operations Coordinator',
      match_score: 69,
      partner_tags: ['follow-up']
    }
  ]
};

const dashboardResponse: DashboardResponse = {
  status: 'success',
  generated_at: now,
  sections: {
    readiness: {
      readinessScore: 68,
      previousScore: 60,
      goalsCompleted: 5,
      totalGoals: 8
    }
  }
};

const assessments: AssessmentListResponse = {
  status: 'success',
  next_cursor: null,
  results: [
    {
      assessment_id: 'assess-001',
      status: 'completed',
      template_id: 'skill-baseline',
      due_at: now
    }
  ]
};

const candidateImportResponse: CandidateImportResponse = {
  status: 'accepted',
  batch_id: 'batch-demo',
  processed: 1,
  failed: 0,
  results: [
    {
      external_id: 'cand-001',
      status: 'processed',
      candidate_id: 'cand-001',
      jaat_vector_version: '2025.1',
      webhook_delivery: 'queued'
    }
  ],
  next_poll_url: 'https://sandbox.api.skillforge.com/api/v1/candidates/import/batch-demo'
};

export const handlers = [
  http.get(`${apiMatcher}/health`, async () => {
    await delay(150);
    return HttpResponse.json({ status: 'ok', timestamp: now });
  }),
  http.post(`${apiMatcher}/users`, async () => {
    await delay(120);
    return HttpResponse.json({ status: 'success', user_id: 'demo-user', profile_completion: 0.6 });
  }),
  http.post(`${apiMatcher}/users/:userId/resumes`, async () => {
    await delay(120);
    return HttpResponse.json({
      status: 'processing',
      resume_id: 'resume-123',
      ingestion_state: 'processing',
      estimated_completion_seconds: 45
    });
  }),
  http.get(`${apiMatcher}/users/:userId/resumes/:resumeId`, async () => {
    await delay(100);
    return HttpResponse.json(resumeStatus);
  }),
  http.get(`${apiMatcher}/users/:userId/assessments`, async () => HttpResponse.json(assessments)),
  http.post(`${apiMatcher}/users/:userId/assessments`, async () =>
    HttpResponse.json({ status: 'scheduled', assessment_id: 'assess-002', launch_url: 'https://example.com' })
  ),
  http.patch(`${apiMatcher}/users/:userId/assessments/:assessmentId`, async () =>
    HttpResponse.json({ status: 'scheduled', assessment_id: 'assess-001', launch_url: 'https://example.com' })
  ),
  http.get(`${apiMatcher}/users/:userId/matches`, async () => {
    await delay(150);
    return HttpResponse.json(matchResponse);
  }),
  http.get(`${apiMatcher}/users/:userId/dashboard`, async () => HttpResponse.json(dashboardResponse)),
  http.get(`${apiMatcher}/users/:userId/notifications`, async () => {
    await delay(80);
    return HttpResponse.json(notificationResponse);
  }),
  http.patch(`${apiMatcher}/users/:userId/notifications/:notificationId`, async ({ params }) => {
    const notification = notificationResponse.notifications.find((item) => item.id === params.notificationId);
    if (!notification) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ ...notification, status: 'read' });
  }),
  http.put(`${apiMatcher}/users/:userId/notification-preferences`, async () =>
    HttpResponse.json({
      status: 'success',
      channels: { email: 'read', sms: 'unread' },
      updated_at: now
    })
  ),
  http.get(`${apiMatcher}/candidates/:candidateId/matches`, async () => {
    await delay(100);
    return HttpResponse.json(candidateMatches);
  }),
  http.post(`${apiMatcher}/assessments/create`, async () =>
    HttpResponse.json({ status: 'scheduled', assessment_id: 'assess-100', launch_url: 'https://example.com' })
  ),
  http.post(`${apiMatcher}/candidates/import`, async () => {
    await delay(200);
    return HttpResponse.json(candidateImportResponse);
  }),
  http.post(`${apiMatcher}/users/bulk-import`, async () =>
    HttpResponse.json({ status: 'accepted', batch_id: 'bulk-001', queued: 1 })
  ),
  http.post(`${apiMatcher}/candidates/register`, async () =>
    HttpResponse.json({ status: 'success', candidate_id: 'cand-002', onboarding_url: 'https://skillforge.com/onboard' })
  ),
  http.post(`${apiMatcher}/assessments/assign-batch`, async () =>
    HttpResponse.json({ status: 'queued', batch_id: 'batch-001', queued: 2 })
  ),
  http.post(`${apiMatcher}/assessments/quick-verify`, async () =>
    HttpResponse.json({ status: 'started', verification_id: 'verify-001', launch_url: 'https://example.com' })
  ),
  http.post(`${apiMatcher}/jobs/sync`, async () =>
    HttpResponse.json({ status: 'accepted', synced: 1, failed: 0, job_ids: ['job-001'] })
  ),
  http.post(`${apiMatcher}/placements/record`, async () =>
    HttpResponse.json({ status: 'success', placement_id: 'placement-001', dashboard_url: 'https://example.com' })
  ),
  http.post(`${apiMatcher}/placements/outcome`, async () =>
    HttpResponse.json({ status: 'success', placement_id: 'placement-001', updated_at: now })
  )
];
