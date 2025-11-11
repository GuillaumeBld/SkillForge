-- Create persistent partner integration tables
CREATE TABLE IF NOT EXISTS "PartnerCandidateBatch" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "webhookUrl" TEXT,
  "processed" INTEGER NOT NULL,
  "failed" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PartnerCandidateResult" (
  "id" TEXT PRIMARY KEY,
  "batchId" TEXT NOT NULL REFERENCES "PartnerCandidateBatch"("id") ON DELETE CASCADE,
  "externalId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "candidateId" TEXT,
  "jaatVectorVersion" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PartnerCandidateBatch_partner_env_idx"
  ON "PartnerCandidateBatch" ("partnerId", "environment");

CREATE INDEX IF NOT EXISTS "PartnerCandidateResult_batch_idx"
  ON "PartnerCandidateResult" ("batchId");

CREATE TABLE IF NOT EXISTS "PartnerAssessment" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "deliveryMode" TEXT NOT NULL,
  "dueAt" TIMESTAMPTZ,
  "notifyCandidate" BOOLEAN,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PartnerAssessment_partner_env_idx"
  ON "PartnerAssessment" ("partnerId", "environment");

CREATE TABLE IF NOT EXISTS "PartnerBatchAssessment" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "cohortId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "candidateIds" TEXT[] NOT NULL,
  "windowStart" TIMESTAMPTZ,
  "windowEnd" TIMESTAMPTZ,
  "queued" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PartnerBatchAssessment_partner_env_idx"
  ON "PartnerBatchAssessment" ("partnerId", "environment");

CREATE TABLE IF NOT EXISTS "PartnerPlacement" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "employerName" TEXT NOT NULL,
  "placementDate" TEXT NOT NULL,
  "employmentType" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PartnerPlacement_partner_env_idx"
  ON "PartnerPlacement" ("partnerId", "environment");
