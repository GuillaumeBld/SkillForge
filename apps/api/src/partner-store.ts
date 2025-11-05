import { randomUUID } from 'crypto';
import type { Environment } from './config';

export interface CandidateImportRequest {
  batch_id?: string;
  webhook_url?: string;
  candidates: Array<{
    external_id: string;
    name: string;
    email: string;
    resume_url?: string;
    base64_content?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface CandidateResult {
  external_id: string;
  status: 'processed' | 'failed';
  candidate_id?: string;
  jaat_vector_version?: string;
  error?: string;
}

export interface CandidateBatch {
  id: string;
  partnerId: string;
  environment: Environment;
  webhookUrl?: string;
  processed: number;
  failed: number;
  results: CandidateResult[];
  createdAt: string;
}

export interface AssessmentRequest {
  candidate_id: string;
  assessment_template_id: string;
  delivery_mode: 'synchronous' | 'asynchronous';
  due_at?: string;
  notify_candidate?: boolean;
}

export interface AssessmentRecord {
  id: string;
  partnerId: string;
  environment: Environment;
  candidateId: string;
  templateId: string;
  deliveryMode: 'synchronous' | 'asynchronous';
  dueAt?: string;
  notifyCandidate?: boolean;
  createdAt: string;
}

export interface BatchAssessmentRequest {
  cohort_id: string;
  assessment_template_id: string;
  candidate_ids: string[];
  window_start?: string;
  window_end?: string;
}

export interface BatchAssessmentRecord {
  id: string;
  partnerId: string;
  environment: Environment;
  cohortId: string;
  templateId: string;
  candidateIds: string[];
  windowStart?: string;
  windowEnd?: string;
  queued: number;
  createdAt: string;
}

export interface PlacementRequest {
  candidate_id: string;
  job_id: string;
  employer_name: string;
  placement_date: string;
  employment_type: string;
}

export interface PlacementRecord {
  id: string;
  partnerId: string;
  environment: Environment;
  candidateId: string;
  jobId: string;
  employerName: string;
  placementDate: string;
  employmentType: string;
  createdAt: string;
}

export class PartnerDataStore {
  private readonly candidateBatches = new Map<string, CandidateBatch>();
  private readonly assessments = new Map<string, AssessmentRecord>();
  private readonly batchAssessments = new Map<string, BatchAssessmentRecord>();
  private readonly placements = new Map<string, PlacementRecord>();

  createCandidateBatch(partnerId: string, environment: Environment, payload: CandidateImportRequest): CandidateBatch {
    if (!payload.candidates || payload.candidates.length === 0) {
      throw new Error('At least one candidate is required');
    }

    if (payload.candidates.length > 100) {
      throw new Error('Candidate import limit exceeded (max 100 per request)');
    }

    const batchId = payload.batch_id ?? `batch_${randomUUID()}`;
    const createdAt = new Date().toISOString();

    const results = payload.candidates.map<CandidateResult>((candidate) => {
      const hasResume = Boolean(candidate.resume_url || candidate.base64_content);

      if (!hasResume) {
        return {
          external_id: candidate.external_id,
          status: 'failed',
          error: 'Missing resume content'
        };
      }

      return {
        external_id: candidate.external_id,
        status: 'processed',
        candidate_id: `sf_${randomUUID()}`,
        jaat_vector_version: new Date().toISOString().split('T')[0]
      };
    });

    const processed = results.filter((candidate) => candidate.status === 'processed').length;
    const failed = results.length - processed;

    const record: CandidateBatch = {
      id: batchId,
      partnerId,
      environment,
      webhookUrl: payload.webhook_url,
      processed,
      failed,
      results,
      createdAt
    };

    this.candidateBatches.set(this.composeKey(partnerId, environment, batchId), record);

    return record;
  }

  getCandidateBatch(partnerId: string, environment: Environment, batchId: string): CandidateBatch | undefined {
    return this.candidateBatches.get(this.composeKey(partnerId, environment, batchId));
  }

  createAssessment(partnerId: string, environment: Environment, payload: AssessmentRequest): AssessmentRecord {
    if (!payload.candidate_id || !payload.assessment_template_id) {
      throw new Error('candidate_id and assessment_template_id are required');
    }

    const record: AssessmentRecord = {
      id: `asm_${randomUUID()}`,
      partnerId,
      environment,
      candidateId: payload.candidate_id,
      templateId: payload.assessment_template_id,
      deliveryMode: payload.delivery_mode,
      dueAt: payload.due_at,
      notifyCandidate: payload.notify_candidate,
      createdAt: new Date().toISOString()
    };

    this.assessments.set(record.id, record);

    return record;
  }

  createBatchAssessment(partnerId: string, environment: Environment, payload: BatchAssessmentRequest): BatchAssessmentRecord {
    if (!payload.cohort_id || !payload.assessment_template_id || !Array.isArray(payload.candidate_ids)) {
      throw new Error('cohort_id, assessment_template_id, and candidate_ids are required');
    }

    const record: BatchAssessmentRecord = {
      id: `asm_batch_${randomUUID()}`,
      partnerId,
      environment,
      cohortId: payload.cohort_id,
      templateId: payload.assessment_template_id,
      candidateIds: payload.candidate_ids,
      windowStart: payload.window_start,
      windowEnd: payload.window_end,
      queued: payload.candidate_ids.length,
      createdAt: new Date().toISOString()
    };

    this.batchAssessments.set(record.id, record);

    return record;
  }

  recordPlacement(partnerId: string, environment: Environment, payload: PlacementRequest): PlacementRecord {
    if (!payload.candidate_id || !payload.job_id) {
      throw new Error('candidate_id and job_id are required');
    }

    const record: PlacementRecord = {
      id: `plc_${randomUUID()}`,
      partnerId,
      environment,
      candidateId: payload.candidate_id,
      jobId: payload.job_id,
      employerName: payload.employer_name,
      placementDate: payload.placement_date,
      employmentType: payload.employment_type,
      createdAt: new Date().toISOString()
    };

    this.placements.set(record.id, record);

    return record;
  }

  clear(): void {
    this.candidateBatches.clear();
    this.assessments.clear();
    this.batchAssessments.clear();
    this.placements.clear();
  }

  private composeKey(partnerId: string, environment: Environment, batchId: string): string {
    return `${partnerId}:${environment}:${batchId}`;
  }
}

export const partnerDataStore = new PartnerDataStore();
