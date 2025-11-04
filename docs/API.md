# SkillForge API Documentation
  "recommendations": [
    {"title": "Data Scientist", "match": 92},
    {"title": "Software Engineer", "match": 80}
  ]
}
```
**
Error (400):
**
```
json
{
  "status": "error",
  "message": "Skills array required"
}
```
---
## 4. Data Access (JAAT Data)
**
Endpoint:
**
 `
GET /api/jaat-data
`
### Request
-
 Query Parameter: 
`
user_id
`
 (string, required)
**
Example:
**
 
`
/api/jaat-data?user_id=abc123
`
### Response
-
 Content-Type: 
`
application/json
`
**
Success (200):
**
```
json
{
  "status": "success",
  "jaat_data": { /* ... user-specific data ... */ }
}
```
**
Error (404):
**
```
json
{
  "status": "error",
  "message": "JAAT data not found"
}
```
---
## 5. Partner and Bulk Endpoints

For B2B partners and enterprise clients. See [PARTNERS.md](PARTNERS.md) for partnership details.

### 5.1 Partner Authentication

**Endpoint:** `POST /api/v1/auth/partner`

#### Request
- Content-Type: `application/json`
- Headers:
  - `X-API-Key`: Partner API key (required)
  - `X-API-Secret`: Partner API secret (required)

**Request Body:**
```json
{
  "partner_id": "string",
  "timestamp": "ISO8601 timestamp"
}
```

#### Response
**Success (200):**
```json
{
  "status": "success",
  "access_token": "jwt_token_here",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

**Error (401):**
```json
{
  "status": "error",
  "message": "Invalid credentials"
}
```

**Security Note:** All partner endpoints require Bearer token authentication. Tokens expire after 1 hour.

---

### 5.2 Bulk Resume Upload

**Endpoint:** `POST /api/v1/candidates/import`

#### Request
- Content-Type: `multipart/form-data` or `application/json`
- Authentication: Bearer token required
- Rate Limit: 100 resumes per request, 1000 per hour

**Request Body (JSON):**
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
**Success (201):**
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
      "candidate_id": "sf_67890"
    },
    {
      "external_id": "cand_002",
      "status": "failed",
      "error": "Invalid resume format"
    }
  ]
}
```

**Error (400):**
```json
{
  "status": "error",
  "message": "Batch size exceeds limit"
}
```

**Compliance Note:** All uploaded data is encrypted at rest. PII handling complies with GDPR, CCPA, and SOC 2 Type II standards.

---

### 5.3 Batch Skill Assessment

**Endpoint:** `POST /api/v1/assessments/assign-batch`

#### Request
- Content-Type: `application/json`
- Authentication: Bearer token required

**Request Body:**
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
**Success (200):**
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

**Error (404):**
```json
{
  "status": "error",
  "message": "Assessment template not found"
}
```

---

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

**Example:**
```
GET /api/v1/reports/outcomes?start_date=2025-01-01&end_date=2025-01-31&group_by=department&format=json
```

#### Response
**Success (200):**
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
      "top_skills": ["Python", "JavaScript", "SQL"]
    },
    {
      "group": "Sales",
      "candidates": 65,
      "avg_match": 71.8,
      "top_skills": ["Communication", "CRM", "Negotiation"]
    }
  ],
  "download_url": "https://skillforge.com/reports/download/token"
}
```

**Error (403):**
```json
{
  "status": "error",
  "message": "Insufficient permissions for PII access"
}
```

**Compliance Notes:**
- Reports containing PII require additional authorization
- Data retention: 90 days for detailed reports, 7 years for anonymized aggregates
- Audit logs maintained for all report access
- Cross-reference [PARTNERS.md](PARTNERS.md) for data sharing agreements

---

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

---
## Common Error Handling
-
 All endpoints return errors in the format:
```
json
{
  "status": "error",
  "message": "string"
}
```
-
 HTTP status codes follow standard REST patterns (200, 201, 400, 404, 500).
