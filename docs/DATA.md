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
