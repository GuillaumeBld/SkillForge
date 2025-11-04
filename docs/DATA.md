# SkillForge - Data Architecture & Integration

## Overview

SkillForge leverages two primary authoritative data sources for occupational and skills information:
- **O*NET** (Occupational Information Network): Comprehensive occupational database maintained by the U.S. Department of Labor
- **JAAT** (Job Analysis at a Glance): Curated summaries and quick-reference information for major occupations

## Data Sources

### 1. O*NET Database

#### What is O*NET?
- Government-maintained occupational database covering 900+ occupations
- Updated periodically (typically annually)
- Provides comprehensive KSA (Knowledge, Skills, Abilities) data
- Includes tasks, job outlook, salary data, work context, and more

#### Key O*NET Data Elements

**Occupational Information**
- O*NET Code (SOC code mapping)
- Occupation title and description
- Alternative titles
- Tasks (typical job tasks)
- Work context (physical demands, work environment)

**Worker Characteristics**
- Knowledge (e.g., English Language, Mathematics)
- Skills (e.g., Active Listening, Critical Thinking)
- Abilities (e.g., Oral Comprehension, Deductive Reasoning)
- Work Values (e.g., Independence, Achievement)
- Interests (e.g., Realistic, Investigative)

**Labor Market Information**
- Employment statistics
- Job growth projections
- Wage and salary data
- Industry breakdown

#### O*NET API/Data Access
- Bulk downloads from O*NET website (onetcenter.org)
- Monthly updated datasets
- Free and open for educational use
- Multiple export formats (XML, JSON, RDF)

### 2. JAAT (Job Analysis at a Glance)

#### Purpose
- Provides curated, summary-level occupational information
- Focuses on the most essential information for quick career decisions
- Designed for accessibility to general audiences
- Complements detailed O*NET data

#### Key JAAT Components
- Quick job summary (2-3 sentences)
- Key responsibilities
- Essential skills (top 5-10)
- Typical education requirements
- Typical salary range
- Job growth outlook
- Related occupations

## Data Import Workflow

### Phase 1: Data Acquisition
```
1. Download latest O*NET database from onetcenter.org
   - Format: XML or JSON
   - Frequency: Monthly or upon new release
   - Size: ~50-100 MB uncompressed

2. Retrieve supplemental JAAT data
   - May be internally maintained or sourced
   - Standardized format (JSON recommended)
```

### Phase 2: Data Cleaning & Normalization
```
1. Parse O*NET XML/JSON
   - Extract relevant fields
   - Validate data integrity
   - Handle missing or inconsistent data

2. Standardize terminology
   - Map alternative occupation titles to canonical names
   - Normalize skill names (e.g., "Python Programming" → "Python")
   - Create occupation hierarchies (families, groups)

3. Data enrichment
   - Cross-reference with BLS wage data
   - Add job growth projections
   - Link related occupations
   - Create skill clusters
```

### Phase 3: Database Population
```
1. Create database schema
   - Occupations table
   - Skills taxonomy
   - Knowledge requirements
   - Abilities mapping
   - Work context data

2. Bulk insert normalized data
   - Use batch operations for efficiency
   - Implement duplicate detection
   - Maintain referential integrity

3. Create indexes
   - Index on occupation codes (SOC)
   - Full-text search indexes on titles and descriptions
   - Skills cross-reference indexes
```

### Phase 4: Validation & Testing
```
1. Data quality checks
   - Completeness validation (required fields present)
   - Format validation (proper data types)
   - Relationship integrity (foreign key constraints)

2. Functional testing
   - Search functionality
   - Skill matching accuracy
   - Related occupations recommendations

3. Performance testing
   - Query response times
   - Search index efficiency
   - Concurrent user load
```

## Database Schema

### Core Tables

#### occupations
```sql
CREATE TABLE occupations (
  id UUID PRIMARY KEY,
  onet_code VARCHAR(10) UNIQUE NOT NULL,
  soc_code VARCHAR(10),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  alternative_titles TEXT[],
  tasks TEXT[],
  work_context JSONB,
  median_wage DECIMAL(10,2),
  wage_10th_percentile DECIMAL(10,2),
  wage_90th_percentile DECIMAL(10,2),
  annual_openings INT,
  job_outlook_percent DECIMAL(5,2),
  education_level VARCHAR(100),
  typical_entry_education VARCHAR(100),
  work_experience VARCHAR(100),
  related_occupations UUID[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_title,
  FULLTEXT INDEX ft_title_description
);
```

#### skills
```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  code VARCHAR(10) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- technical, soft, domain-specific
  difficulty_level INT, -- 1-5 scale
  related_skills UUID[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_name,
  INDEX idx_category,
  FULLTEXT INDEX ft_name
);
```

#### occupation_skills
```sql
CREATE TABLE occupation_skills (
  occupation_id UUID,
  skill_id UUID,
  importance_level INT, -- 1-5, importance to occupation
  proficiency_level INT, -- 1-5, typical proficiency required
  PRIMARY KEY (occupation_id, skill_id),
  FOREIGN KEY (occupation_id) REFERENCES occupations(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id),
  INDEX idx_occupation_id,
  INDEX idx_skill_id
);
```

#### knowledge
```sql
CREATE TABLE knowledge (
  id UUID PRIMARY KEY,
  code VARCHAR(10) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_name
);
```

#### occupation_knowledge
```sql
CREATE TABLE occupation_knowledge (
  occupation_id UUID,
  knowledge_id UUID,
  importance_level INT, -- 1-5
  PRIMARY KEY (occupation_id, knowledge_id),
  FOREIGN KEY (occupation_id) REFERENCES occupations(id),
  FOREIGN KEY (knowledge_id) REFERENCES knowledge(id)
);
```

#### abilities
```sql
CREATE TABLE abilities (
  id UUID PRIMARY KEY,
  code VARCHAR(10) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_name
);
```

### Experience Platform Entities

The following tables model end-user activity on top of the occupational/skill reference layer. Each schema description highlights primary/foreign keys, important constraints, downstream retention expectations, and linkages back to O*NET/JAAT entities.

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  external_ref VARCHAR(128) UNIQUE NOT NULL, -- SSO/partner identifier
  email VARCHAR(320) UNIQUE NOT NULL,
  phone VARCHAR(32),
  given_name VARCHAR(100) ENCRYPTED WITH (kms_key => 'pii_user'),
  family_name VARCHAR(100) ENCRYPTED WITH (kms_key => 'pii_user'),
  preferred_locale VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(64),
  consent_version VARCHAR(32) NOT NULL,
  consent_signed_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE (email) WHERE deleted_at IS NULL,
  CHECK (email LIKE '%@%')
);
```
- **Retention**: 30 days after `deleted_at` before physical purge to support account recovery.
- **Reference Links**: Downstream interactions join to `users.id`; indirectly ties to O*NET occupations through activity tables.

#### experiences
```sql
CREATE TABLE experiences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  occupation_id UUID NOT NULL, -- FK to occupations (O*NET)
  source ENUM('user_submitted','imported_onet','imported_jaat'),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  employment_type VARCHAR(50),
  employer_name VARCHAR(255) ENCRYPTED WITH (kms_key => 'pii_employment'),
  location JSONB, -- city/state/country, geohash (PII)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (occupation_id) REFERENCES occupations(id) ON DELETE RESTRICT,
  CHECK (end_date IS NULL OR end_date >= start_date)
);
```
- **Retention**: Hard delete 60 days post user purge; anonymize employer and location immediately on soft delete.
- **Reference Links**: `occupation_id` aligns experience back to O*NET occupations; `source` captures provenance (JAAT imports, etc.).

#### assessments
```sql
CREATE TABLE assessments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  assessment_type VARCHAR(64) NOT NULL,
  version VARCHAR(32) NOT NULL,
  administered_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  score JSONB NOT NULL, -- sub-scores, percentiles
  recommended_occupation_id UUID, -- FK to occupations
  recommended_pathway_id UUID, -- FK to learning_pathways
  source ENUM('internal','onet','partner'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recommended_occupation_id) REFERENCES occupations(id),
  FOREIGN KEY (recommended_pathway_id) REFERENCES learning_pathways(id)
);
```
- **Retention**: Maintain for 2 years for longitudinal analytics; mask `score` values during archival.
- **Reference Links**: Recommendation fields connect user outcomes to O*NET occupation profiles and curated pathways derived from JAAT summaries.

#### learning_pathways
```sql
CREATE TABLE learning_pathways (
  id UUID PRIMARY KEY,
  source ENUM('onet','jaat','curated','partner'),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_occupation_id UUID NOT NULL,
  steps JSONB NOT NULL, -- ordered modules, providers
  estimated_duration_days INT,
  certification_outcome VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE (title, target_occupation_id),
  FOREIGN KEY (target_occupation_id) REFERENCES occupations(id) ON DELETE CASCADE
);
```
- **Retention**: Keep active definitions indefinitely; maintain change history via audit table (not shown) for 5 years.
- **Reference Links**: `target_occupation_id` binds pathways to the canonical O*NET occupation; `source` signals JAAT or partner lineage.

#### saved_roles
```sql
CREATE TABLE saved_roles (
  user_id UUID NOT NULL,
  occupation_id UUID NOT NULL,
  interest_level SMALLINT DEFAULT 3 CHECK (interest_level BETWEEN 1 AND 5),
  saved_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, occupation_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (occupation_id) REFERENCES occupations(id) ON DELETE CASCADE
);
```
- **Retention**: Delete immediately when user deletes account; otherwise retained until user removes bookmark.
- **Reference Links**: Directly links user interests to the O*NET occupation master table.

#### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  channel ENUM('email','sms','in_app'),
  template_key VARCHAR(128) NOT NULL,
  payload JSONB,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
- **Retention**: 180 days after `sent_at` unless regulatory archiving requires longer; PII confined to template rendering system, not stored in payload.
- **Reference Links**: Notification content may reference occupations or pathways via identifiers in `payload` metadata (e.g., `occupation_id`).

#### advisor_assignments
```sql
CREATE TABLE advisor_assignments (
  id UUID PRIMARY KEY,
  advisor_user_id UUID NOT NULL,
  advisee_user_id UUID NOT NULL,
  partner_tenant_id UUID,
  status ENUM('active','paused','closed') DEFAULT 'active',
  assigned_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,
  UNIQUE (advisor_user_id, advisee_user_id, status) WHERE status = 'active',
  FOREIGN KEY (advisor_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (advisee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_tenant_id) REFERENCES partner_tenancy(id) ON DELETE SET NULL
);
```
- **Retention**: 3 years for audit compliance; anonymize advisor metadata when advisee requests data deletion.
- **Reference Links**: Advisors leverage O*NET/JAAT content via experiences, assessments, and saved roles tied to advisee.

#### partner_tenancy
```sql
CREATE TABLE partner_tenancy (
  id UUID PRIMARY KEY,
  partner_code VARCHAR(64) UNIQUE NOT NULL,
  partner_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(320) ENCRYPTED WITH (kms_key => 'pii_partner'),
  data_region VARCHAR(32) DEFAULT 'us-east-1',
  branding JSONB,
  feature_flags JSONB,
  sla_tier ENUM('standard','premium'),
  terms_accepted_at TIMESTAMP NOT NULL,
  offboarding_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```
- **Retention**: Retain records 7 years post offboarding to satisfy contractual audit rights.
- **Reference Links**: Provides tenancy scoping across `users`, `advisor_assignments`, and ETL imports (partner-provided occupational overrides referencing O*NET/JAAT codes).

### Relationships & Reference Mapping

- **Users ↔ Experiences/Assessments/Saved Roles/Notifications**: All activity tables enforce `user_id` foreign keys with cascade deletions to ensure downstream cleanup during account removal.
- **O*NET Integration**: `occupation_id` fields across `experiences`, `assessments`, `learning_pathways`, and `saved_roles` reference the canonical `occupations.id` derived from O*NET. Lookup tables capture O*NET SOC codes for consistent joins.
- **JAAT Integration**: Pathway `source` and experience `source` track JAAT-originated guidance; ETL pipelines maintain mapping tables (e.g., `jaat_to_onet`) to align JAAT quick references with `occupations` and `skills`.
- **Partner Tenancy**: `partner_tenancy` scopes user accounts (via `external_ref` naming convention), advisor relationships, and partner-specific ETL feeds.

### Retention & Deletion Workflow Summary

- **Soft Delete Strategy**: `users.deleted_at` triggers downstream anonymization jobs for experiences and notifications before final purge.
- **Scheduled Purge Jobs**: Nightly workers permanently remove soft-deleted user data after retention windows (30 days for accounts, 60 days for experiences, immediate for saved roles).
- **Audit Log Handling**: For entities with compliance retention (advisor assignments, partner tenancy), store anonymized user identifiers (hash of `id`) once account deletion completes.

## Data Update Strategy

### Scheduled Updates
- **Frequency**: Monthly (aligned with O*NET releases)
- **Timing**: Off-peak hours (e.g., 2 AM UTC)
- **Duration**: 30-60 minutes typical full refresh

### Update Process
```
1. Download latest O*NET data
2. Backup existing database
3. Run data validation scripts
4. If valid:
   a. Create new temporary tables
   b. Import and process new data
   c. Run quality checks
   d. Swap production tables (zero-downtime migration)
5. If invalid:
   a. Log errors
   b. Alert administrators
   c. Rollback to previous version
```

### Versioning
- Track data version/release date
- Maintain changelog of data modifications
- Allow point-in-time queries for historical analysis

## ETL Touchpoints for Experience Entities

- **User Provisioning (Inbound)**: Partner tenancy feeds land in an S3 staging bucket partitioned by `partner_code`. Daily Glue jobs create/merge `users` using hashed emails, enforce consent capture, and assign tenancy context. Failed records route to a quarantine queue with partner visibility.
- **Experience Imports**: External resumes or HRIS exports map to the `experiences` table via a transformation layer that resolves O*NET SOC codes. ETL service enriches entries with JAAT quick summaries stored alongside the occupation for downstream display.
- **Assessment Sync**: Psychometric providers deliver SCORM/xAPI statements. A Lambda parses payloads, validates version checksums, and upserts `assessments` plus recommended pathways using the latest `learning_pathways` snapshot.
- **Learning Pathway Curation**: Content operations maintain curated JSON definitions in Git; CI pipelines publish to the warehouse and trigger a delta load that updates `learning_pathways` while preserving audit history.
- **Saved Roles & Notifications**: Real-time events write into a Kafka topic. Stream processors materialize `saved_roles` for analytics and `notifications` for compliance logging, ensuring idempotency via primary key hashing.
- **Advisor Assignment Management**: CRM integrations push assignment events (create/update/close). ETL verifies both advisor and advisee exist in the same `partner_tenancy` context before committing.

## Privacy & Compliance Considerations

- **PII Encryption**: Fields marked `ENCRYPTED WITH` rely on cloud KMS envelope encryption. Application services must decrypt only when necessary and log access via audit events.
- **Role-Based Access Control**: Row-level filters apply tenancy scoping so advisors and partners can only see data associated with their `partner_tenancy.id`.
- **Data Minimization**: `notifications.payload` omits direct PII; templates fetch personal data at render time from secure services.
- **Deletion Workflows**: User-initiated deletion enqueues a GDPR job that soft-deletes the `users` record, calls partner webhooks, and cascades anonymization tasks for experiences and advisor assignments. After the configured retention window, a second workflow permanently removes the data and compacts storage.
- **Retention Monitoring**: Scheduled compliance checks verify no records exceed declared retention windows. Violations trigger alerts and automatic redaction routines.
- **Regulatory Exports**: Data subject access requests (DSAR) compile encrypted bundles of user-related entities, referencing O*NET/JAAT metadata but excluding internal scoring algorithms unless explicitly requested.

## Skill Matching Algorithm

### Skill Mapping
1. **User Skills → Occupation Requirements**
   - Match user-provided skills to O*NET skills taxonomy
   - Handle skill variations and aliases
   - Calculate proficiency alignment

2. **Scoring System**
   ```
   Match Score = (Matched Skills / Total Required Skills) × 100
   
   Adjusted Score = Match Score × 
                    (Avg Proficiency Alignment) ×
                    (Experience Weight Factor)
   ```

3. **Skill Gap Analysis**
   - Identify missing critical skills
   - Prioritize by importance to occupation
   - Suggest learning resources

### Transferable Skills
- Identify skills common across occupations
- Highlight skills user can leverage in new roles
- Minimize apparent skill gap through skill transfer

## Data Query Patterns

### Common Queries

```sql
-- Find occupations matching user skills
SELECT o.id, o.title, COUNT(os.skill_id) as matched_skills,
       COUNT(os.skill_id) * 100.0 / 
       (SELECT COUNT(*) FROM occupation_skills WHERE occupation_id = o.id) as match_percent
FROM occupations o
JOIN occupation_skills os ON o.id = os.occupation_id
WHERE os.skill_id IN (user_skill_ids)
GROUP BY o.id
ORDER BY match_percent DESC;

-- Find skills for occupation
SELECT s.name, os.importance_level, os.proficiency_level
FROM skills s
JOIN occupation_skills os ON s.id = os.skill_id
WHERE os.occupation_id = :occupation_id
ORDER BY os.importance_level DESC;

-- Full-text search occupations
SELECT id, title, description
FROM occupations
WHERE MATCH(title, description) AGAINST(:search_term IN BOOLEAN MODE)
ORDER BY RELEVANCE DESC
LIMIT 20;
```

## Performance Optimization

### Indexing Strategy
- **Primary Indexes**: Occupation codes, IDs, SOC codes
- **Search Indexes**: Full-text on titles and descriptions
- **Foreign Keys**: All occupation_id, skill_id references
- **Query Optimization**: Index on commonly filtered fields (education_level, wage_range)

### Caching
- Cache occupation details (24-hour TTL)
- Cache skill hierarchies (7-day TTL)
- Cache search results (1-hour TTL)
- Use Redis for performance

### Query Optimization
- Use pagination for large result sets
- Precompute aggregations (e.g., average skills per occupation)
- Denormalize frequently accessed data

## Data Privacy & Security

### Sensitive Data Handling
- O*NET data is public domain (no security concerns)
- JAAT data licensing (ensure compliance)
- User skill data encrypted at rest and in transit

### Access Control
- Role-based access to raw data
- Audit logging for administrative data access
- API rate limiting

### Compliance
- GDPR compliance for user data
- CCPA compliance for California users
- Data retention policies

## Data Quality Assurance

### Validation Rules
- All required fields populated
- Skill importance scores in valid range (1-5)
- Wage data within reasonable bounds
- No duplicate occupation records

### Monitoring
- Track data staleness (alert if > 30 days old)
- Monitor query performance
- Track user-reported data issues
- Regular data audit (quarterly)

### Continuous Improvement
- Collect user feedback on occupation recommendations
- A/B test matching algorithm variants
- Incorporate user corrections to skill mappings
- Regular review of O*NET updates for accuracy
