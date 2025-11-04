# SkillForge API Documentation

## 1. Overview
SkillForge provides RESTful APIs that connect learners, workforce partners, and employers to skill intelligence derived from the JAAT toolkit, O*NET taxonomy, and complementary labor market datasets documented in [docs/SOURCES.md](SOURCES.md). The service exposes onboarding, resume analysis, assessment management, matching, dashboards, notifications, reporting, and partner workflows.

- **Base URL:** `https://api.skillforge.com`
- **Versioning:** All endpoints are prefixed with `/api/v1/`. Breaking changes introduce a new version prefix.
- **Formats:** Requests and responses use JSON unless otherwise noted. File uploads support `multipart/form-data`.
- **Rate Limits:** Standard plans receive 1,000 requests/hour per user token. Enterprise agreements may negotiate higher limits (see Section 5).
- **Data Lineage:** Structured skill tags, occupations, and job insights trace to JAAT processing of NLx corpus data and O*NET mappings, with trend overlays from Lightcast analytics.【F:docs/SOURCES.md†L8-L63】

## 2. Authentication
Authentication uses OAuth 2.0 with JSON Web Tokens (JWT). Obtain tokens with password, authorization code, or client credentials flows. All tokens include scopes that gate feature access.

### 2.1 Token Request
**Endpoint:** `POST /api/v1/auth/token`

**Request Headers**
- `Content-Type: application/json`

**Body Schema**
```json
{
  "grant_type": "authorization_code | password | client_credentials",
  "client_id": "string",
  "client_secret": "string",
  "code": "string (required for authorization_code)",
  "username": "string (required for password)",
  "password": "string (required for password)",
  "scope": "space-delimited scopes"
}
```

**Success (200)**
```json
{
  "access_token": "jwt_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "jwt_refresh_token",
  "scope": "users.read users.write"
}
```

**Errors**
- `400`: Missing or invalid parameters
- `401`: Invalid client credentials
- `429`: Too many attempts

### 2.2 Scopes
| Scope | Grants | Related Sections |
|-------|--------|------------------|
| `users.read` | Read onboarding records, dashboards | §3.1, §3.5 |
| `users.write` | Create/update onboarding profiles | §3.1 |
| `resumes.write` | Upload resumes, trigger parsing | §3.2 |
| `assessments.manage` | Assign and review assessments | §3.3 |
| `matching.read` | Retrieve personalized recommendations | §3.4, §4 |
| `notifications.manage` | Manage notification preferences | §3.6 |
| `reports.read` | Access user and organizational reports | §3.7, §5.4 |
| `partners.admin` | Partner workflows, bulk imports | §5 |

Refresh tokens can be rotated with `POST /api/v1/auth/refresh` using similar request and response bodies.

## 3. Core User Endpoints
All user endpoints require a `Bearer` token tied to an active learner account. Unless noted, include the header `X-Request-Id` for traceability.

### 3.1 User Onboarding
**Endpoint:** `POST /api/v1/users`

**Query Parameters**
- `invite_code` (string, optional): Required for closed cohorts

**Request Body Schema**
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "user@example.com",
  "phone": "+12025550123",
  "preferred_roles": ["Data Scientist", "Business Analyst"],
  "education": {
    "highest_level": "bachelor",
    "institution": "string",
    "credential_ids": ["cred_engine:1234"]
  },
  "goals": ["transition_to_tech"],
  "marketing_opt_in": true
}
```

**Response**
- `201 Created` on success
```json
{
  "status": "success",
  "user_id": "usr_abc123",
  "profile_completion": 0.35,
  "required_actions": ["upload_resume", "schedule_assessment"]
}
```
- `409 Conflict`: Duplicate email
- `422 Unprocessable Entity`: Validation failures with `errors` array listing field-level issues

**Notes**
- Profiles auto-link to JAAT occupational vectors once resumes or interests are provided (see §3.2 and §4).
- Invitation enrollments for partner cohorts are auditable in §5.2 workflows.

### 3.2 Resume Ingestion
**Endpoint:** `POST /api/v1/users/{user_id}/resumes`

**Headers**
- `Content-Type: multipart/form-data`

**Multipart Fields**
- `file`: PDF, DOCX, or TXT resume (max 10 MB)
- `source` (optional): `uploaded|linkedin|partner_import`
- `language` (optional): ISO 639-1 code

**Processing**
Resumes are parsed with JAAT-informed NLP to map skills, tasks, and O*NET occupation codes.【F:docs/SOURCES.md†L8-L63】

**Success (202 Accepted)**
```json
{
  "status": "processing",
  "resume_id": "res_789",
  "ingestion_state": "queued",
  "estimated_completion_seconds": 45
}
```

**Status Polling**
`GET /api/v1/users/{user_id}/resumes/{resume_id}` supports query parameter `include_vectors=true` to embed skill vectors and Lightcast trend overlays once processing completes.

**Errors**
- `400`: Unsupported file type
- `404`: User not found
- `413`: Payload too large

### 3.3 Skill Assessments
**Endpoint:** `POST /api/v1/users/{user_id}/assessments`

**Request Body**
```json
{
  "assessment_template_id": "templ_sql_basics",
  "delivery_mode": "asynchronous",
  "due_at": "2025-05-15T23:59:59Z",
  "notify_user": true
}
```

**Response**
- `201 Created`
```json
{
  "status": "scheduled",
  "assessment_id": "asm_456",
  "launch_url": "https://skillforge.com/assess/asm_456",
  "skills_benchmarked": [
    {
      "skill_name": "SQL Data Modeling",
      "taxonomy_source": "O*NET",
      "reference": "onet:15-1251.01"
    }
  ]
}
```

**Additional Endpoints**
- `GET /api/v1/users/{user_id}/assessments?status=completed&cursor=asm_400` (paginated with `cursor` and `limit`)
- `PATCH /api/v1/users/{user_id}/assessments/{assessment_id}` to update due dates or reminders

**Errors**
- `400`: Invalid template ID
- `404`: User or assessment not found
- `409`: Assessment already scheduled

### 3.4 Matching & Recommendations
**Endpoint:** `GET /api/v1/users/{user_id}/matches`

**Query Parameters**
- `type` (required): `jobs|courses|mentors`
- `limit` (optional): 1-100 (default 20)
- `cursor` (optional): Use for pagination; `next_cursor` returned in responses
- `include_jaat_debug` (optional): `true` to surface JAAT feature weights for partner analysts

**Response (200)**
```json
{
  "status": "success",
  "user_id": "usr_abc123",
  "type": "jobs",
  "next_cursor": "eyJwYWdlIjoyfQ==",
  "results": [
    {
      "id": "job_001",
      "title": "Data Scientist",
      "match_score": 0.92,
      "top_skills": [
        {"name": "Python", "source": "JAAT"},
        {"name": "Machine Learning", "source": "Lightcast"}
      ],
      "onet_code": "15-2051.00",
      "source_reference": "NLx Posting 2025-03-18"
    }
  ]
}
```

**Errors**
- `400`: Missing or invalid `type`
- `401`: Token lacks `matching.read`

### 3.5 Dashboards
**Endpoint:** `GET /api/v1/users/{user_id}/dashboard`

**Query Parameters**
- `sections`: Comma-delimited subset of `summary,skills,assessments,goals`
- `refresh`: `true|false` to force re-computation (rate limited)

**Response (200)**
```json
{
  "status": "success",
  "sections": {
    "summary": {
      "profile_completion": 0.68,
      "last_active": "2025-05-11T08:35:12Z"
    },
    "skills": {
      "strengths": ["SQL", "Data Visualization"],
      "gaps": ["Applied Statistics"],
      "source_citations": ["JAAT Toolkit", "O*NET Resource Center"]
    }
  },
  "generated_at": "2025-05-12T10:01:02Z"
}
```

**Errors**
- `400`: Invalid `sections`
- `403`: Scope missing `users.read`

### 3.6 Notifications
**Endpoint:** `GET /api/v1/users/{user_id}/notifications`

**Query Parameters**
- `channel`: `email|sms|in_app`
- `status`: `unread|read`
- `limit`: Defaults to 25; max 100
- `cursor`: For pagination

**Response (200)**
```json
{
  "status": "success",
  "notifications": [
    {
      "id": "ntf_001",
      "category": "assessment",
      "message": "Your SQL Benchmark assessment is due tomorrow.",
      "delivered_at": "2025-05-11T09:00:00Z",
      "channel": "email",
      "actions": [
        {
          "type": "open_url",
          "label": "Launch Assessment",
          "url": "https://skillforge.com/assess/asm_456"
        }
      ]
    }
  ],
  "next_cursor": null
}
```

**Management**
- `PATCH /api/v1/users/{user_id}/notifications/{notification_id}` accepts `{ "status": "read" }`
- `PUT /api/v1/users/{user_id}/notification-preferences` updates channel opt-ins with granular scopes such as `notifications.manage`

**Errors**
- `404`: Notification not found
- `409`: Preference conflicts (e.g., SMS without verified phone)

### 3.7 Reporting (User Insights)
**Endpoint:** `GET /api/v1/users/{user_id}/reports/progress`

**Query Parameters**
- `start_date`, `end_date`: ISO8601 dates (required)
- `format`: `json|pdf`
- `include_benchmarks`: `true|false`

**Response (200)**
```json
{
  "status": "success",
  "user_id": "usr_abc123",
  "period": {"start": "2025-04-01", "end": "2025-04-30"},
  "learning_hours": 42,
  "assessments_completed": 3,
  "skill_delta": {
    "sql": 0.12,
    "data-storytelling": 0.07
  },
  "benchmarks": {
    "cohort_percentile": 78,
    "external_reference": "Lightcast Regional Dataset"
  },
  "download_url": "https://skillforge.com/reports/usr_abc123?token=abc"
}
```

**Errors**
- `400`: Invalid date range
- `403`: Missing `reports.read`
- `404`: Report unavailable for user

## 4. Data Access (JAAT Data)
**Endpoint:** `GET /api/v1/jaat-data`

### Request
- Query Parameter: `user_id` (string, required)

**Example:**
`/api/v1/jaat-data?user_id=abc123`

### Response
- Content-Type: `application/json`

**Success (200)**
```json
{
  "status": "success",
  "jaat_data": {
    "vector_version": "2025-04-10",
    "feature_weights": {
      "textual_skill_python": 0.83,
      "textual_skill_sql": 0.78
    },
    "source_reference": "JAAT Toolkit & NLx Corpus"
  }
}
```

**Error (404)**
```json
{
  "status": "error",
  "message": "JAAT data not found"
}
```

**Cross-Reference:** Partner analysts can combine JAAT vectors with bulk reporting described in §5.4 for aggregated program insights backed by the sources in [docs/SOURCES.md](SOURCES.md).【F:docs/SOURCES.md†L8-L63】

## 5. Partner and Bulk Endpoints
For B2B partners and enterprise clients. See [PARTNERS.md](PARTNERS.md) for partnership details and compliance commitments. Partner workflows often stitch onboarding (§3.1), resume ingestion (§3.2), and assessment assignments (§3.3) into automated journeys.

### 5.1 Partner Authentication
**Endpoint:** `POST /api/v1/auth/partner`

#### Request
- Content-Type: `application/json`
- Headers:
  - `X-API-Key`: Partner API key (required)
  - `X-API-Secret`: Partner API secret (required)

**Request Body**
```json
{
  "partner_id": "string",
  "timestamp": "ISO8601 timestamp"
}
```

#### Response
**Success (200)**
```json
{
  "status": "success",
  "access_token": "jwt_token_here",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Error (401)**
```json
{
  "status": "error",
  "message": "Invalid credentials"
}
```

**Security Note:** All partner endpoints require Bearer token authentication. Tokens expire after 1 hour.

### 5.2 Bulk Resume Upload
**Endpoint:** `POST /api/v1/candidates/import`

#### Request
- Content-Type: `multipart/form-data` or `application/json`
- Authentication: Bearer token required
- Rate Limit: 100 resumes per request, 1000 per hour

**Request Body (JSON)**
```json
{
  "batch_id": "string (optional)",
  "candidates": [
    {
      "external_id": "string",
      "name": "string",
      "email": "string",
      "resume_url": "string (or base64_content)",
      "metadata": {
        "source": "string",
        "applied_date": "ISO8601"
      }
    }
  ]
}
```

#### Response
**Success (201)**
```json
{
  "status": "success",
  "batch_id": "batch_12345",
  "processed": 95,
  "failed": 5,
  "results": [
    {
      "external_id": "cand_001",
      "status": "processed",
      "candidate_id": "sf_67890",
      "jaat_vector_version": "2025-04-10"
    },
    {
      "external_id": "cand_002",
      "status": "failed",
      "error": "Invalid resume format"
    }
  ]
}
```

**Error (400)**
```json
{
  "status": "error",
  "message": "Batch size exceeds limit"
}
```

**Compliance Note:** All uploaded data is encrypted at rest. PII handling complies with GDPR, CCPA, and SOC 2 Type II standards.

### 5.3 Batch Skill Assessment
**Endpoint:** `POST /api/v1/assessments/assign-batch`

#### Request
- Content-Type: `application/json`
- Authentication: Bearer token required

**Request Body**
```json
{
  "assessment_template_id": "string",
  "candidates": [
    {
      "candidate_id": "string",
      "due_date": "ISO8601 (optional)",
      "notify": true
    }
  ],
  "options": {
    "auto_reminder": true,
    "reminder_frequency": "daily|weekly",
    "proctoring": "none|browser|webcam"
  }
}
```

#### Response
**Success (200)**
```json
{
  "status": "success",
  "assignment_id": "assign_78901",
  "assigned": 48,
  "skipped": 2,
  "assignments": [
    {
      "candidate_id": "sf_67890",
      "assessment_link": "https://skillforge.com/assess/token",
      "status": "assigned"
    }
  ]
}
```

**Error (404)**
```json
{
  "status": "error",
  "message": "Assessment template not found"
}
```

### 5.4 Organization Reporting
**Endpoint:** `GET /api/v1/reports/outcomes`

#### Request
- Authentication: Bearer token required
- Query Parameters:
  - `start_date`: ISO8601 date (required)
  - `end_date`: ISO8601 date (required)
  - `group_by`: `department|location|cohort` (optional)
  - `format`: `json|csv|xlsx` (default: json)
  - `include_pii`: `true|false` (default: false)
  - `include_jaat_vectors`: `true|false` to surface aggregated JAAT feature weights for partner dashboards

**Example**
```
GET /api/v1/reports/outcomes?start_date=2025-01-01&end_date=2025-01-31&group_by=department&format=json
```

#### Response
**Success (200)**
```json
{
  "status": "success",
  "report_id": "rpt_34567",
  "period": {
    "start": "2025-01-01",
    "end": "2025-01-31"
  },
  "summary": {
    "total_candidates": 245,
    "assessments_completed": 198,
    "avg_skill_match": 76.5,
    "placements": 45
  },
  "breakdown": [
    {
      "group": "Engineering",
      "candidates": 120,
      "avg_match": 82.3,
      "top_skills": ["Python", "SQL", "Data Visualization"],
      "sources": ["JAAT Toolkit", "O*NET Resource Center"]
    },
    {
      "group": "Sales",
      "candidates": 65,
      "avg_match": 71.8,
      "top_skills": ["Communication", "CRM", "Negotiation"],
      "sources": ["EFChats Podcast", "Lightcast"]
    }
  ],
  "download_url": "https://skillforge.com/reports/download/token"
}
```

**Error (403)**
```json
{
  "status": "error",
  "message": "Insufficient permissions for PII access"
}
```

**Compliance Notes**
- Reports containing PII require additional authorization
- Data retention: 90 days for detailed reports, 7 years for anonymized aggregates
- Audit logs maintained for all report access
- Cross-reference [PARTNERS.md](PARTNERS.md) for data sharing agreements

### Partner Endpoint Security & Compliance
**Authentication:**
- API keys rotated every 90 days
- IP whitelisting available for enterprise partners
- OAuth 2.0 client credentials flow supported

**Rate Limits:**
- Standard tier: 1,000 requests/hour
- Enterprise tier: 10,000 requests/hour
- Bulk operations have separate limits (documented per endpoint)

**Data Security:**
- TLS 1.3 required for all connections
- End-to-end encryption for sensitive data
- SOC 2 Type II, GDPR, and CCPA compliant
- Regular third-party security audits

**Compliance:**
- Data processing agreements (DPAs) required for all partners
- Subprocessor disclosure in [PARTNERS.md](PARTNERS.md)
- Right to erasure (GDPR Article 17) supported via DELETE endpoints
- Consent management integration available

For partnership inquiries and access requests, see [PARTNERS.md](PARTNERS.md).

## 6. Common Error Handling
All endpoints return errors in the format:
```json
{
  "status": "error",
  "message": "string",
  "code": "machine_readable_code",
  "correlation_id": "uuid"
}
```
- HTTP status codes follow standard REST patterns: `200`, `201`, `202`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.
- Validation errors may include `errors: [{"field": "email", "message": "Already taken"}]` for user guidance.
- Use returned `correlation_id` when contacting support to trace JAAT processing or partner workflows across systems.
