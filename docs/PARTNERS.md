# SkillForge B2B Partners Program

## Overview

SkillForge is building a comprehensive B2B partnership program to scale workforce skill development, talent matching, and career advancement. This document outlines partner segments, value propositions, core features, and onboarding workflows.

---

## B2B Partner Segments

### 1. Workforce Agencies
**Target**: Public and private workforce development agencies, job training organizations

**Pain Points:**
- Limited visibility into candidate skill levels
- Outdated assessment methods
- Difficulty matching candidates to opportunities
- Fragmented talent data

**Use Cases:**
- Rapid skill profiling of candidates
- Personalized training recommendations
- Job matching and placement tracking
- Program effectiveness measurement

---

### 2. Universities & Educational Institutions
**Target**: Higher education, vocational schools, community colleges

**Pain Points:**
- Limited visibility into student employability skills
- Curriculum-to-employer skill gap
- Difficulty tracking graduate employment outcomes
- Limited employer feedback loops

**Use Cases:**
- Student career readiness assessment
- Curriculum alignment with employer needs
- Alumni skill tracking and development
- Employer partnership management

---

### 3. Recruitment Firms & Staffing Companies
**Target**: Executive search, staffing, contract recruiting firms

**Pain Points:**
- Manual skill verification processes
- Inefficient candidate sourcing
- Limited skill depth analysis
- Candidate skill decay over time

**Use Cases:**
- Automated candidate skill verification
- Skill-based candidate sourcing
- Placement quality improvement
- Candidate skill development tracking

---

### 4. Enterprises & Large Organizations
**Target**: Fortune 500 companies, mid-market enterprises with 500+ employees

**Pain Points:**
- Talent development at scale
- Internal mobility limitations
- Skill gap identification
- L&D program ROI measurement

**Use Cases:**
- Employee skill assessment and development
- Internal talent marketplace
- Succession planning
- Learning program optimization

---

## Core Value Propositions

### For Workforce Agencies
- **Faster Outcomes**: Reduce time-to-placement by 40% with data-driven skill matching
- **Better Results**: Improve job retention rates through skill-matched placements
- **Scalability**: Assess and develop hundreds of candidates simultaneously
- **Compliance**: Track and report on skill development outcomes for funders

### For Universities
- **Employer Alignment**: Map curriculum to employer skill requirements
- **Career Outcomes**: Measure and improve graduate employability
- **Employer Partnerships**: Strengthen relationships through data-driven insights
- **Student Value**: Demonstrate ROI of education through skill development tracking

### For Recruitment Firms
- **Quality Assurance**: Verify candidate skills before placement
- **Efficiency**: Reduce screening time through automated skill profiling
- **Competitive Advantage**: Offer value-added services to clients
- **Success Metrics**: Improve placement quality and retention

### For Enterprises
- **Talent Optimization**: Identify and develop high-potential employees
- **Internal Mobility**: Enable data-driven internal career transitions
- **Cost Reduction**: Reduce external hiring costs through internal development
- **Strategic Planning**: Make informed decisions on talent gaps and training needs

---

## Core Platform Features for Partners

### API
Comprehensive REST API for seamless integration:
- Resume parsing and skill extraction
- Skill assessment and verification
- User profile management
- Candidate-opportunity matching
- Learning recommendations
- Progress tracking and reporting

**Documentation**: [API.md](./API.md)

### Dashboard
Intuitive management interface:
- **Candidate Management**: View candidate profiles, skill assessments, and development progress
- **Analytics & Reporting**: Placement success rates, skill distribution, learning outcomes
- **Integration Management**: API keys, webhook configuration, usage metrics
- **Team Collaboration**: User management, permissions, audit logs
- **Customization**: Branding, workflow configuration, skill taxonomy customization

---

## Partner Onboarding Workflow

### Phase 1: Initial Consultation (Week 1)
1. **Discovery Meeting**: Understand partner business model, pain points, target users
2. **Use Case Definition**: Map specific use cases to SkillForge capabilities
3. **Success Metrics**: Define KPIs and success criteria
4. **Contract Negotiation**: Pricing model, volume commitments, SLAs

### Phase 2: Technical Integration (Weeks 2-4)
1. **API Access**: Provision API keys and sandbox environment
2. **Integration Planning**: Map partner systems to SkillForge APIs
3. **Test Integration**: Build and test integration in sandbox
4. **Security Review**: Verify authentication, data handling, compliance

### Phase 3: Pilot Launch (Weeks 4-8)
1. **Limited Rollout**: Launch with pilot user group (100-500 users)
2. **Training**: Partner team training on platform features
3. **Support**: Dedicated support during pilot phase
4. **Monitoring**: Track adoption, performance, and issues
5. **Feedback**: Collect and iterate on feedback

### Phase 4: Full Production (Week 8+)
1. **Scale Deployment**: Roll out to full user base
2. **Ongoing Support**: Dedicated account management and technical support
3. **Optimization**: Performance tuning and feature optimization
4. **Growth Planning**: Roadmap expansion and upsell planning

---

## Example Integration Steps

### Workforce Agency Integration

All endpoints run under `/api/v1/`. Replace `https://api.skillforge.com` with `https://sandbox.api.skillforge.com` for sandbox validation.

**Step 1: Resume Import**
- **Endpoint:** `POST /api/v1/candidates/import`
- **Rate Limit:** 1,000 requests/hour (standard); sandbox capped at 200/hour
- **Webhooks:** `import.completed`, `import.failed`
- **Sample Request (JSON)**
```json
{
  "batch_id": "wf_batch_001",
  "webhook_url": "https://agency.example.org/hooks/import",
  "candidates": [
    {
      "external_id": "wf-1001",
      "name": "Maya Ortiz",
      "email": "maya.ortiz@example.org",
      "resume_url": "https://files.example.org/maya.pdf"
    }
  ]
}
```
- **Sample Response (201)**
```json
{
  "status": "success",
  "batch_id": "wf_batch_001",
  "processed": 1,
  "failed": 0,
  "next_poll_url": "https://api.skillforge.com/api/v1/candidates/import/wf_batch_001"
}
```

**Step 2: Skill Assessment Scheduling**
- **Endpoint:** `POST /api/v1/assessments/create`
- **Rate Limit:** 1,000 requests/hour (200/hour sandbox)
- **Webhooks:** `assessment.scheduled`, `assessment.completed`
- **Sample Request (JSON)**
```json
{
  "candidate_id": "sf_cand_001",
  "assessment_template_id": "templ_sql_basics",
  "due_at": "2025-05-20T23:59:59Z",
  "notify_candidate": true
}
```

**Step 3: Job Matching Retrieval**
- **Endpoint:** `GET /api/v1/candidates/{candidate_id}/matches`
- **Rate Limit:** 1,500 requests/hour (cached 5 minutes)
- **Webhooks:** `matchset.generated` (optional, if webhook subscribed)
- **Sample cURL**
```bash
curl "https://api.skillforge.com/api/v1/candidates/sf_cand_001/matches?type=jobs&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Step 4: Placement Recording**
- **Endpoint:** `POST /api/v1/placements/record`
- **Rate Limit:** 300 records/hour
- **Webhooks:** `placement.recorded`, followed by `placement.outcome.updated`
- **Sample Request (JSON)**
```json
{
  "candidate_id": "sf_cand_001",
  "job_id": "job-7788",
  "placement_date": "2025-05-01",
  "employment_type": "full_time"
}
```

---

### University Integration

**Step 1: Student Import**
- **Endpoint:** `POST /api/v1/users/bulk-import`
- **Rate Limit:** 200 requests/day (5,000 users/request)
- **Webhooks:** `user.bulk_import.completed`
- **Sample Request (JSON)**
```json
{
  "cohort_id": "spring-analytics",
  "send_invitations": true,
  "users": [
    {
      "external_id": "student-2001",
      "first_name": "Dana",
      "last_name": "Singh",
      "email": "dana.singh@example.edu"
    }
  ]
}
```

**Step 2: Curriculum Mapping**
- **Endpoint:** `POST /api/v1/curriculum/create`
- **Rate Limit:** 60 requests/hour
- **Webhooks:** `curriculum.mapped`
- **Sample Request (JSON)**
```json
{
  "program_name": "BS Data Science",
  "external_id": "program_ds_2025",
  "courses": [
    {
      "code": "DS101",
      "title": "Intro to Data Science",
      "learning_outcomes": ["python-basics", "statistics-foundations"]
    }
  ]
}
```

**Step 3: Cohort Assessments**
- **Endpoint:** `POST /api/v1/assessments/assign-batch`
- **Rate Limit:** 50 batch requests/hour
- **Webhooks:** `assessment.batch_completed`
- **Sample Request (JSON)**
```json
{
  "cohort_id": "spring-analytics",
  "assessment_template_id": "templ_python_intro",
  "candidate_ids": ["sf_cand_001", "sf_cand_002"],
  "window_start": "2025-05-15T12:00:00Z",
  "window_end": "2025-05-30T23:59:59Z"
}
```

**Step 4: Outcomes Reporting**
- **Endpoint:** `GET /api/v1/reports/outcomes`
- **Rate Limit:** Up to 10 concurrent report jobs (429 thereafter)
- **Webhooks:** `report.ready` (optional)
- **Sample cURL**
```bash
curl "https://api.skillforge.com/api/v1/reports/outcomes?start_date=2025-01-01&end_date=2025-03-31&group_by=program" \
  -H "Authorization: Bearer <token>"
```

---

### Recruitment Firm Integration

**Step 1: Candidate Registration**
- **Endpoint:** `POST /api/v1/candidates/register`
- **Rate Limit:** 600 requests/hour
- **Webhooks:** `candidate.created`, `import.completed`
- **Sample Request (JSON)**
```json
{
  "external_id": "recruit-3100",
  "first_name": "Alex",
  "last_name": "Green",
  "email": "alex.green@example.com",
  "resume_url": "https://files.example.com/alex.pdf"
}
```

**Step 2: Quick Skill Verification**
- **Endpoint:** `POST /api/v1/assessments/quick-verify`
- **Rate Limit:** 500 requests/hour
- **Webhooks:** `assessment.quick_verification.completed`
- **Sample Request (JSON)**
```json
{
  "candidate_id": "sf_cand_3100",
  "skills": ["Negotiation", "CRM"],
  "time_limit_minutes": 15
}
```

**Step 3: Job Synchronization**
- **Endpoint:** `POST /api/v1/jobs/sync`
- **Rate Limit:** 120 requests/hour
- **Webhooks:** `job.synced`
- **Sample Request (JSON)**
```json
{
  "sync_id": "agency_sync_2025-05-12",
  "jobs": [
    {
      "external_id": "job-8899",
      "title": "Sales Operations Manager",
      "location": "Remote",
      "required_skills": ["CRM", "Reporting"]
    }
  ]
}
```

**Step 4: Placement Outcome Tracking**
- **Endpoint:** `POST /api/v1/placements/outcome`
- **Rate Limit:** 600 outcome updates/hour
- **Webhooks:** `placement.outcome.updated`
- **Sample Request (JSON)**
```json
{
  "placement_id": "plc_2001",
  "retention_status": "employed",
  "retention_check_date": "2025-08-01",
  "notes": "Reached 90-day milestone"
}
```
## Next Steps for Pilot Programs

### For Prospective Partners
1. **Complete Interest Form**: Share business profile, use cases, target user volume
2. **Schedule Discovery Call**: 30-minute overview and Q&A with partnerships team
3. **Sign NDA & Agreement**: Finalize pilot terms and access agreements
4. **Access Sandbox**: Receive API credentials and documentation
5. **Attend Integration Workshop**: Technical training on API and dashboard

### During Pilot Phase
1. **Weekly Syncs**: Progress updates and issue resolution
2. **Performance Dashboard**: Real-time visibility into adoption and KPIs
3. **Feedback Loop**: Regular feedback collection and iteration
4. **Success Celebrations**: Highlight wins and milestones

### Post-Pilot Decisions
1. **Scale Production**: Transition to full production environment
2. **Extended Support**: Move to standard support tiers
3. **Growth Planning**: Multi-year roadmap and expansion planning
4. **Co-Marketing**: Joint marketing and case study opportunities

---

## Related Documentation

- **[API.md](./API.md)** - Complete API reference and integration guide
- **[MONETIZATION.md](./MONETIZATION.md)** - Pricing models and commercial terms
- **[USECASES.md](./USECASES.md)** - Detailed use cases and workflows
- **[README.md](../README.md)** - Project overview and getting started

---

## Contact & Support

Interested in becoming a SkillForge partner? Reach out to partnerships@skillforge.io

For technical support: support@skillforge.io
For integration assistance: api-support@skillforge.io
