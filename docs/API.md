# SkillForge API Documentation

This document specifies the available public API endpoints for SkillForge, including their request and response formats, sample payloads, status codes, and error handling.

---

## 1. Resume Upload

**Endpoint:** `POST /api/resume`

### Request
- Content-Type: `application/json`

```json
{
  "user_id": "string",
  "resume": "<base64-encoded-pdf>"
}
```

### Response
- Content-Type: `application/json`

**Success (201):**
```json
{
  "status": "success",
  "message": "Resume uploaded successfully",
  "resume_id": "string"
}
```

**Error (400):**
```json
{
  "status": "error",
  "message": "Invalid resume format"
}
```

---
## 2. Skill Assessment

**Endpoint:** `POST /api/skills-assessment`

### Request
- Content-Type: `application/json`

```json
{
  "resume_id": "string"
}
```

### Response
- Content-Type: `application/json`

**Success (200):**
```json
{
  "status": "success",
  "skills": [
    {"name": "Python", "level": "advanced"},
    {"name": "Data Analysis", "level": "intermediate"}
  ]
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "Resume not found"
}
```

---
## 3. Career Recommendation

**Endpoint:** `POST /api/recommendation`

### Request
- Content-Type: `application/json`

```json
{
  "user_id": "string",
  "skills": ["Python", "Data Analysis"]
}
```

### Response
- Content-Type: `application/json`

**Success (200):**
```json
{
  "status": "success",
  "recommendations": [
    {"title": "Data Scientist", "match": 92},
    {"title": "Software Engineer", "match": 80}
  ]
}
```

**Error (400):**
```json
{
  "status": "error",
  "message": "Skills array required"
}
```

---

## 4. Data Access (JAAT Data)

**Endpoint:** `GET /api/jaat-data`

### Request
- Query Parameter: `user_id` (string, required)

**Example:** `/api/jaat-data?user_id=abc123`

### Response
- Content-Type: `application/json`

**Success (200):**
```json
{
  "status": "success",
  "jaat_data": { /* ... user-specific data ... */ }
}
```

**Error (404):**
```json
{
  "status": "error",
  "message": "JAAT data not found"
}
```

---

## Common Error Handling
- All endpoints return errors in the format:
```json
{
  "status": "error",
  "message": "string"
}
```
- HTTP status codes follow standard REST patterns (200, 201, 400, 404, 500).
