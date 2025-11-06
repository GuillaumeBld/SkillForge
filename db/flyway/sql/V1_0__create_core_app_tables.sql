-- Create core application tables aligned with Prisma schema (apps/api/prisma/schema.prisma)

CREATE TABLE IF NOT EXISTS "User" (
    "id" text PRIMARY KEY,
    "email" text NOT NULL,
    "passwordHash" text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "phone" text,
    "marketingOptIn" boolean NOT NULL DEFAULT false,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email");

CREATE TABLE IF NOT EXISTS "Profile" (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL UNIQUE,
    "preferredRoles" text[] NOT NULL DEFAULT '{}'::text[],
    "education" jsonb,
    "goals" text[] NOT NULL DEFAULT '{}'::text[],
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Profile_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ResumeIngestion" (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL,
    "source" text,
    "language" text,
    "state" text NOT NULL DEFAULT 'queued',
    "ingestionMetadata" jsonb,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResumeIngestion_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ResumeIngestion_userId_idx" ON "ResumeIngestion" ("userId");

CREATE TABLE IF NOT EXISTS "AssessmentTemplate" (
    "id" text PRIMARY KEY,
    "code" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "deliveryMode" text,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssessmentTemplate_code_key" ON "AssessmentTemplate" ("code");

CREATE TABLE IF NOT EXISTS "Assessment" (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL,
    "templateId" text NOT NULL,
    "status" text NOT NULL DEFAULT 'scheduled',
    "dueAt" timestamptz,
    "notifyUser" boolean NOT NULL DEFAULT true,
    "score" double precision,
    "responses" jsonb,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assessment_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assessment_templateId_fkey"
        FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Assessment_userId_idx" ON "Assessment" ("userId");
CREATE INDEX IF NOT EXISTS "Assessment_templateId_idx" ON "Assessment" ("templateId");

CREATE TABLE IF NOT EXISTS "Occupation" (
    "id" text PRIMARY KEY,
    "onetCode" text NOT NULL UNIQUE,
    "socCode" text,
    "title" text NOT NULL,
    "description" text,
    "alternativeTitles" text[] NOT NULL DEFAULT '{}'::text[],
    "tasks" text[] NOT NULL DEFAULT '{}'::text[],
    "workContext" jsonb,
    "medianWage" numeric(10, 2),
    "wage10thPercentile" numeric(10, 2),
    "wage90thPercentile" numeric(10, 2),
    "annualOpenings" integer,
    "jobOutlookPercent" numeric(5, 2),
    "educationLevel" text,
    "typicalEntryEducation" text,
    "workExperience" text,
    "relatedOccupations" text[] NOT NULL DEFAULT '{}'::text[],
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Skill" (
    "id" text PRIMARY KEY,
    "code" text UNIQUE,
    "name" text NOT NULL,
    "description" text,
    "category" text,
    "difficulty" integer,
    "relatedSkills" text[] NOT NULL DEFAULT '{}'::text[],
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OccupationSkill" (
    "occupationId" text NOT NULL,
    "skillId" text NOT NULL,
    "importanceLevel" integer,
    "proficiencyLevel" integer,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OccupationSkill_pkey" PRIMARY KEY ("occupationId", "skillId"),
    CONSTRAINT "OccupationSkill_occupationId_fkey"
        FOREIGN KEY ("occupationId") REFERENCES "Occupation" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OccupationSkill_skillId_fkey"
        FOREIGN KEY ("skillId") REFERENCES "Skill" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OccupationSkill_occupationId_idx" ON "OccupationSkill" ("occupationId");
CREATE INDEX IF NOT EXISTS "OccupationSkill_skillId_idx" ON "OccupationSkill" ("skillId");

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL UNIQUE,
    "channels" jsonb,
    "quietHours" jsonb,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationPreference_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL,
    "category" text NOT NULL,
    "message" text NOT NULL,
    "channel" text NOT NULL,
    "status" text NOT NULL DEFAULT 'unread',
    "deliveredAt" timestamptz,
    "actions" jsonb,
    "createdAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification" ("userId");
CREATE INDEX IF NOT EXISTS "Notification_status_idx" ON "Notification" ("status");
