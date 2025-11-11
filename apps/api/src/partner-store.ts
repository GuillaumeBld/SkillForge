import { randomUUID } from 'crypto';
import type { PrismaClient } from '@prisma/client';

import type { Environment } from './config';
import { prisma } from './config/prisma';

const MAX_CANDIDATES_PER_BATCH = 100;

type CandidateStatus = 'processed' | 'failed';

type PartnerDataStoreStrategy = 'memory' | 'prisma';

interface NormalizedCandidateResult {
  id: string;
  externalId: string;
  status: CandidateStatus;
  candidateId?: string;
  jaatVectorVersion?: string;
  error?: string;
}

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
  status: CandidateStatus;
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

export interface PartnerDataStore {
  createCandidateBatch(partnerId: string, environment: Environment, payload: CandidateImportRequest): Promise<CandidateBatch>;
  getCandidateBatch(partnerId: string, environment: Environment, batchId: string): Promise<CandidateBatch | undefined>;
  createAssessment(partnerId: string, environment: Environment, payload: AssessmentRequest): Promise<AssessmentRecord>;
  createBatchAssessment(
    partnerId: string,
    environment: Environment,
    payload: BatchAssessmentRequest
  ): Promise<BatchAssessmentRecord>;
  recordPlacement(partnerId: string, environment: Environment, payload: PlacementRequest): Promise<PlacementRecord>;
  clear(): Promise<void>;
}

interface CandidateEvaluation {
  batchId: string;
  createdAt: Date;
  normalizedResults: NormalizedCandidateResult[];
  processed: number;
  failed: number;
}

interface CandidateResultRecord {
  id: string;
  externalId: string;
  status: CandidateStatus;
  candidateId: string | null;
  jaatVectorVersion: string | null;
  error: string | null;
  createdAt: Date;
}

interface CandidateBatchRecord {
  id: string;
  partnerId: string;
  environment: string;
  webhookUrl: string | null;
  processed: number;
  failed: number;
  createdAt: Date;
  results: CandidateResultRecord[];
}

const evaluateCandidateImport = (payload: CandidateImportRequest): CandidateEvaluation => {
  if (!payload.candidates || payload.candidates.length === 0) {
    throw new Error('At least one candidate is required');
  }

  if (payload.candidates.length > MAX_CANDIDATES_PER_BATCH) {
    throw new Error(`Candidate import limit exceeded (max ${MAX_CANDIDATES_PER_BATCH} per request)`);
  }

  const batchId = payload.batch_id ?? `batch_${randomUUID()}`;
  const createdAt = new Date();

  const normalizedResults = payload.candidates.map<NormalizedCandidateResult>((candidate) => {
    const hasResume = Boolean(candidate.resume_url || candidate.base64_content);

    if (!hasResume) {
      return {
        id: `res_${randomUUID()}`,
        externalId: candidate.external_id,
        status: 'failed',
        error: 'Missing resume content'
      };
    }

    return {
      id: `res_${randomUUID()}`,
      externalId: candidate.external_id,
      status: 'processed',
      candidateId: `sf_${randomUUID()}`,
      jaatVectorVersion: new Date().toISOString().split('T')[0]
    };
  });

  const processed = normalizedResults.filter((candidate) => candidate.status === 'processed').length;
  const failed = normalizedResults.length - processed;

  return { batchId, createdAt, normalizedResults, processed, failed };
};

const toCandidateResult = (result: NormalizedCandidateResult): CandidateResult => ({
  external_id: result.externalId,
  status: result.status,
  candidate_id: result.candidateId,
  jaat_vector_version: result.jaatVectorVersion,
  error: result.error
});

const safeParseDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return parsed;
};

class InMemoryPartnerDataStore implements PartnerDataStore {
  private readonly candidateBatches = new Map<string, CandidateBatch>();
  private readonly assessments = new Map<string, AssessmentRecord>();
  private readonly batchAssessments = new Map<string, BatchAssessmentRecord>();
  private readonly placements = new Map<string, PlacementRecord>();

  async createCandidateBatch(
    partnerId: string,
    environment: Environment,
    payload: CandidateImportRequest
  ): Promise<CandidateBatch> {
    const { batchId, createdAt, normalizedResults, processed, failed } = evaluateCandidateImport(payload);

    const record: CandidateBatch = {
      id: batchId,
      partnerId,
      environment,
      webhookUrl: payload.webhook_url,
      processed,
      failed,
      results: normalizedResults.map(toCandidateResult),
      createdAt: createdAt.toISOString()
    };

    this.candidateBatches.set(this.composeKey(partnerId, environment, batchId), record);

    return record;
  }

  async getCandidateBatch(
    partnerId: string,
    environment: Environment,
    batchId: string
  ): Promise<CandidateBatch | undefined> {
    return this.candidateBatches.get(this.composeKey(partnerId, environment, batchId));
  }

  async createAssessment(
    partnerId: string,
    environment: Environment,
    payload: AssessmentRequest
  ): Promise<AssessmentRecord> {
    if (!payload.candidate_id || !payload.assessment_template_id) {
      throw new Error('candidate_id and assessment_template_id are required');
    }

    const dueAt = payload.due_at ? safeParseDate(payload.due_at)?.toISOString() : undefined;

    const record: AssessmentRecord = {
      id: `asm_${randomUUID()}`,
      partnerId,
      environment,
      candidateId: payload.candidate_id,
      templateId: payload.assessment_template_id,
      deliveryMode: payload.delivery_mode,
      dueAt,
      notifyCandidate: payload.notify_candidate,
      createdAt: new Date().toISOString()
    };

    this.assessments.set(record.id, record);

    return record;
  }

  async createBatchAssessment(
    partnerId: string,
    environment: Environment,
    payload: BatchAssessmentRequest
  ): Promise<BatchAssessmentRecord> {
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
      windowStart: payload.window_start ? safeParseDate(payload.window_start)?.toISOString() : undefined,
      windowEnd: payload.window_end ? safeParseDate(payload.window_end)?.toISOString() : undefined,
      queued: payload.candidate_ids.length,
      createdAt: new Date().toISOString()
    };

    this.batchAssessments.set(record.id, record);

    return record;
  }

  async recordPlacement(
    partnerId: string,
    environment: Environment,
    payload: PlacementRequest
  ): Promise<PlacementRecord> {
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

  async clear(): Promise<void> {
    this.candidateBatches.clear();
    this.assessments.clear();
    this.batchAssessments.clear();
    this.placements.clear();
  }

  private composeKey(partnerId: string, environment: Environment, batchId: string): string {
    return `${partnerId}:${environment}:${batchId}`;
  }
}

const mapPrismaCandidateBatch = (record: CandidateBatchRecord): CandidateBatch => ({
  id: record.id,
  partnerId: record.partnerId,
  environment: record.environment as Environment,
  webhookUrl: record.webhookUrl ?? undefined,
  processed: record.processed,
  failed: record.failed,
  createdAt: record.createdAt.toISOString(),
  results: record.results
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map((result) => ({
      external_id: result.externalId,
      status: result.status as CandidateStatus,
      candidate_id: result.candidateId ?? undefined,
      jaat_vector_version: result.jaatVectorVersion ?? undefined,
      error: result.error ?? undefined
    }))
});

class PrismaPartnerDataStore implements PartnerDataStore {
  constructor(private readonly client: PrismaClient = prisma) {}

  async createCandidateBatch(
    partnerId: string,
    environment: Environment,
    payload: CandidateImportRequest
  ): Promise<CandidateBatch> {
    const { batchId, createdAt, normalizedResults, processed, failed } = evaluateCandidateImport(payload);

    const existing = await this.client.partnerCandidateBatch.findFirst({
      where: {
        id: batchId,
        partnerId,
        environment
      }
    });

    if (existing) {
      throw new Error(`Batch ${batchId} has already been imported for this partner`);
    }

    const record = (await this.client.partnerCandidateBatch.create({
      data: {
        id: batchId,
        partnerId,
        environment,
        webhookUrl: payload.webhook_url,
        processed,
        failed,
        createdAt,
        updatedAt: createdAt,
        results: {
          create: normalizedResults.map((result) => ({
            id: result.id,
            externalId: result.externalId,
            status: result.status,
            candidateId: result.candidateId,
            jaatVectorVersion: result.jaatVectorVersion,
            error: result.error,
            createdAt
          }))
        }
      },
      include: {
        results: true
      }
    })) as CandidateBatchRecord;

    return mapPrismaCandidateBatch(record);
  }

  async getCandidateBatch(
    partnerId: string,
    environment: Environment,
    batchId: string
  ): Promise<CandidateBatch | undefined> {
    const record = (await this.client.partnerCandidateBatch.findFirst({
      where: {
        id: batchId,
        partnerId,
        environment
      },
      include: {
        results: true
      }
    })) as CandidateBatchRecord | null;

    return record ? mapPrismaCandidateBatch(record) : undefined;
  }

  async createAssessment(
    partnerId: string,
    environment: Environment,
    payload: AssessmentRequest
  ): Promise<AssessmentRecord> {
    if (!payload.candidate_id || !payload.assessment_template_id) {
      throw new Error('candidate_id and assessment_template_id are required');
    }

    const createdAt = new Date();
    const dueAt = safeParseDate(payload.due_at);

    const record = await this.client.partnerAssessment.create({
      data: {
        id: `asm_${randomUUID()}`,
        partnerId,
        environment,
        candidateId: payload.candidate_id,
        templateId: payload.assessment_template_id,
        deliveryMode: payload.delivery_mode,
        dueAt,
        notifyCandidate: payload.notify_candidate ?? undefined,
        createdAt,
        updatedAt: createdAt
      }
    });

    return {
      id: record.id,
      partnerId: record.partnerId,
      environment: record.environment as Environment,
      candidateId: record.candidateId,
      templateId: record.templateId,
      deliveryMode: record.deliveryMode as 'synchronous' | 'asynchronous',
      dueAt: record.dueAt ? record.dueAt.toISOString() : undefined,
      notifyCandidate: record.notifyCandidate ?? undefined,
      createdAt: record.createdAt.toISOString()
    };
  }

  async createBatchAssessment(
    partnerId: string,
    environment: Environment,
    payload: BatchAssessmentRequest
  ): Promise<BatchAssessmentRecord> {
    if (!payload.cohort_id || !payload.assessment_template_id || !Array.isArray(payload.candidate_ids)) {
      throw new Error('cohort_id, assessment_template_id, and candidate_ids are required');
    }

    const createdAt = new Date();
    const windowStart = safeParseDate(payload.window_start);
    const windowEnd = safeParseDate(payload.window_end);

    const record = await this.client.partnerBatchAssessment.create({
      data: {
        id: `asm_batch_${randomUUID()}`,
        partnerId,
        environment,
        cohortId: payload.cohort_id,
        templateId: payload.assessment_template_id,
        candidateIds: payload.candidate_ids,
        windowStart,
        windowEnd,
        queued: payload.candidate_ids.length,
        createdAt,
        updatedAt: createdAt
      }
    });

    return {
      id: record.id,
      partnerId: record.partnerId,
      environment: record.environment as Environment,
      cohortId: record.cohortId,
      templateId: record.templateId,
      candidateIds: [...record.candidateIds],
      windowStart: record.windowStart ? record.windowStart.toISOString() : undefined,
      windowEnd: record.windowEnd ? record.windowEnd.toISOString() : undefined,
      queued: record.queued,
      createdAt: record.createdAt.toISOString()
    };
  }

  async recordPlacement(
    partnerId: string,
    environment: Environment,
    payload: PlacementRequest
  ): Promise<PlacementRecord> {
    if (!payload.candidate_id || !payload.job_id) {
      throw new Error('candidate_id and job_id are required');
    }

    const createdAt = new Date();

    const record = await this.client.partnerPlacement.create({
      data: {
        id: `plc_${randomUUID()}`,
        partnerId,
        environment,
        candidateId: payload.candidate_id,
        jobId: payload.job_id,
        employerName: payload.employer_name,
        placementDate: payload.placement_date,
        employmentType: payload.employment_type,
        createdAt,
        updatedAt: createdAt
      }
    });

    return {
      id: record.id,
      partnerId: record.partnerId,
      environment: record.environment as Environment,
      candidateId: record.candidateId,
      jobId: record.jobId,
      employerName: record.employerName,
      placementDate: record.placementDate,
      employmentType: record.employmentType,
      createdAt: record.createdAt.toISOString()
    };
  }

  async clear(): Promise<void> {
    await this.client.$transaction([
      this.client.partnerCandidateResult.deleteMany({}),
      this.client.partnerCandidateBatch.deleteMany({}),
      this.client.partnerAssessment.deleteMany({}),
      this.client.partnerBatchAssessment.deleteMany({}),
      this.client.partnerPlacement.deleteMany({})
    ]);
  }
}

const resolveStrategy = (): PartnerDataStoreStrategy => {
  const strategy = process.env.PARTNER_DATASTORE_STRATEGY?.toLowerCase();
  if (strategy === 'memory' || strategy === 'prisma') {
    return strategy;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'prisma';
  }

  if (process.env.NODE_ENV === 'test') {
    return 'memory';
  }

  return process.env.DATABASE_URL ? 'prisma' : 'memory';
};

const instantiateStore = (strategy: PartnerDataStoreStrategy): PartnerDataStore => {
  if (strategy === 'prisma') {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be configured to use the persistent partner data store');
    }

    return new PrismaPartnerDataStore();
  }

  return new InMemoryPartnerDataStore();
};

export const partnerDataStore = instantiateStore(resolveStrategy());
