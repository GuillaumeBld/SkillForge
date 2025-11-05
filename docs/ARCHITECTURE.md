# SkillForge - Technical Architecture

## Overview

SkillForge is designed as a modern, scalable web application that integrates authoritative labor market data (JAAT/O*NET) to provide personalized career guidance and skill assessments.

## Technical Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit or Zustand
- **UI Components**: Material-UI (MUI) or Tailwind CSS + Headless UI
- **Data Visualization**: D3.js, Recharts, or Chart.js for skill graphs and career pathways
- **Routing**: React Router v6
- **Form Management**: React Hook Form with Zod validation
- **API Client**: Axios or React Query for data fetching
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js or Fastify
- **Language**: TypeScript
- **API Architecture**: RESTful with potential GraphQL layer
- **Authentication**: JWT + OAuth 2.0 (Google, LinkedIn)
- **Session Management**: Redis for session storage
- **Caching**: Redis for API response caching

### Database
- **Primary Database**: PostgreSQL 15+
  - User profiles and preferences
  - Assessment results and career plans
  - Application metadata
- **Schema Migration**: Prisma or TypeORM
- **Search Engine**: Elasticsearch or PostgreSQL full-text search
  - Fast occupational and skill lookups
  - Fuzzy matching for user inputs

### Data Integration
- **JAAT/O*NET Data Source**: 
  - Batch import from O*NET database releases
  - Periodic updates via scheduled jobs
- **ETL Pipeline**: Python scripts or Node.js workers
  - Data cleaning and normalization
  - Skill taxonomy standardization

### Infrastructure
- **Hosting**: AWS, Google Cloud, or Vercel
- **Container Orchestration**: Docker + Docker Compose (dev), Kubernetes (production)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry for error tracking, DataDog or Prometheus for metrics
- **Logging**: Winston or Pino with centralized logging (CloudWatch, Loggly)

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend Layer                       │
│  (React + TypeScript, MUI, D3.js Visualizations)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS/REST API
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      API Gateway / BFF                       │
│              (Express.js, JWT Middleware)                   │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──────────────────┬──────────────────┐
             │                  │                  │
   ┌─────────▼────────┐ ┌──────▼────────┐ ┌──────▼────────┐
   │  User Service    │ │ Career Service│ │  Data Service │
   │  (Auth, Profile) │ │ (Matching,    │ │ (JAAT/O*NET) │
   │                  │ │  Pathways)    │ │   Queries     │
   └─────────┬────────┘ └──────┬────────┘ └──────┬────────┘
             │                  │                  │
             │                  │                  │
   ┌─────────▼──────────────────▼──────────────────▼────────┐
   │               PostgreSQL Database                        │
   │  ┌──────────┐  ┌───────────┐  ┌────────────────────┐  │
   │  │  Users   │  │ O*NET Data│  │ Career Assessments │  │
   │  └──────────┘  └───────────┘  └────────────────────┘  │
   └──────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │            Redis Cache & Session Store                    │
   └──────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────┐
   │         Elasticsearch (Optional Search Index)             │
   └──────────────────────────────────────────────────────────┘
```

## Main Modules

### 1. User Management Module
**Responsibilities**:
- User registration and authentication
- Profile management (education, experience, skills)
- Preference settings
- Session management

**Key Components**:
- AuthController: Login, signup, password reset
- ProfileController: CRUD operations for user data
- AuthMiddleware: JWT verification and route protection

### 2. Assessment Module
**Responsibilities**:
- Skill self-assessment workflows
- Competency scoring
- Interest and aptitude questionnaires
- Assessment history tracking

**Key Components**:
- AssessmentEngine: Score calculation logic
- QuestionnaireService: Dynamic question rendering
- ResultsAnalyzer: Interpret assessment data

### 3. Career Matching Module
**Responsibilities**:
- Match user skills to occupations
- Calculate skill gaps
- Recommend career pathways
- Suggest learning resources

**Key Components**:
- MatchingAlgorithm: Core skill-to-occupation mapping
- SkillGapAnalyzer: Identify missing competencies
- PathwayGenerator: Create step-by-step career plans
- SalaryEstimator: Integrate wage data from O*NET

### 4. Data Integration Module
**Responsibilities**:
- Import and update O*NET database
- Normalize JAAT data structures
- Maintain skill taxonomy
- Provide query APIs for occupational data

**Key Components**:
- DataImporter: ETL scripts for O*NET updates
- SkillTaxonomyService: Standardize skill naming
- OccupationRepository: Query interface for O*NET data

### 5. Reporting & Analytics Module
**Responsibilities**:
- User progress dashboards
- Career advisor reporting tools
- Aggregated analytics (popular careers, common skill gaps)
- Export functionality (PDF reports, CSV data)

**Key Components**:
- DashboardService: Compile user metrics
- ReportGenerator: Create downloadable reports
- AnalyticsCollector: Track user interactions

## Backend/Frontend Integration Plan

### Phase 1: Foundation (Weeks 1-2)
1. Set up monorepo structure (frontend + backend)
2. Configure shared TypeScript types for API contracts
3. Implement authentication flow
4. Basic user profile CRUD
5. Deploy development environment

### Phase 2: Data Integration (Weeks 3-4)
1. Import O*NET database
2. Create database schema for occupations, skills, and tasks
3. Build REST API endpoints for querying O*NET data
4. Implement search functionality (occupation search, skill lookup)
5. Frontend components for browsing occupations

### Phase 3: Core Features (Weeks 5-8)
1. Assessment workflow (frontend + backend)
2. Skill matching algorithm implementation
3. Career recommendation engine
4. Skill gap analysis visualizations
5. Pathway generation logic

### Phase 4: User Experience (Weeks 9-10)
1. Dashboard and progress tracking
2. Personalized recommendations
3. Notification system
4. Mobile-responsive design refinements
5. Performance optimization

### Phase 5: Testing & Launch (Weeks 11-12)
1. End-to-end testing
2. Security audit
3. Load testing
4. User acceptance testing (UAT)
5. MVP launch

## API Design Principles

- **RESTful Conventions**: Use HTTP methods appropriately (GET, POST, PUT, DELETE)
- **Versioning**: `/api/v1/` prefix for all endpoints
- **Pagination**: Cursor or offset-based for large datasets
- **Error Handling**: Consistent error response format with codes and messages
- **Rate Limiting**: Implement to prevent abuse
- **Documentation**: OpenAPI/Swagger spec for all endpoints

### Example Endpoints

```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
GET    /api/v1/users/me
PUT    /api/v1/users/me/profile
GET    /api/v1/occupations?search=software
GET    /api/v1/occupations/:id
GET    /api/v1/skills?category=technical
POST   /api/v1/assessments
GET    /api/v1/assessments/:id/results
GET    /api/v1/recommendations
POST   /api/v1/career-plans
GET    /api/v1/career-plans/:id
```

## Security Considerations

- **Authentication**: Secure password hashing (bcrypt), JWT with short expiry
- **Authorization**: Role-based access control (RBAC)
- **Data Privacy**: Encrypt sensitive user data at rest and in transit
- **Input Validation**: Sanitize all user inputs to prevent injection attacks
- **CORS**: Properly configured for frontend domain
- **HTTPS**: Enforce SSL/TLS in production
- **Dependency Management**: Regular security audits with npm audit/Snyk

## Scalability Considerations

- **Horizontal Scaling**: Stateless backend services for easy scaling
- **Database Optimization**: Indexing on frequently queried fields
- **Caching Strategy**: Cache O*NET data (infrequent updates) and common queries
- **CDN**: Serve static assets via CDN (CloudFront, Cloudflare)
- **Async Processing**: Use message queues (RabbitMQ, SQS) for heavy computations
- **Load Balancing**: Distribute traffic across multiple server instances

## Non-Functional Requirements

### Performance Targets

- **Authentication Endpoints** (`POST /api/v1/auth/login`, `POST /api/v1/auth/register`):
  - P95 latency ≤ 250 ms under normal load, ≤ 400 ms under peak load.
  - Sustain 200 requests per second (RPS) aggregated across regions with burst tolerance to 400 RPS for 1 minute.
- **Occupational Search** (`GET /api/v1/occupations`, `GET /api/v1/skills`):
  - P95 latency ≤ 350 ms with autocomplete results capped at 25 items.
  - Handle 150 RPS sustained, burst to 300 RPS during marketing campaigns.
- **Career Recommendations** (`GET /api/v1/recommendations`, `POST /api/v1/assessments`):
  - P95 latency ≤ 750 ms accounting for scoring and enrichment jobs.
  - Throughput sized for 75 concurrent assessment submissions with queue-based spillover < 2 seconds.
- Frontend Time to Interactive target ≤ 3.5 s on mid-range mobile over 4G per Lighthouse.

### Availability & Capacity Planning

- **SLA**: 99.5% monthly uptime for user-facing APIs, 99.9% for authentication and session validation services.
- **RTO/RPO**: Recovery time objective of 4 hours, recovery point objective of 15 minutes via point-in-time restore.
- **Capacity Assumptions**: Sized for 250k monthly active users, 20k daily actives, and 5k concurrent sessions during virtual events. Redis cache sized for top 10k occupations and assessments; PostgreSQL provisioned with read replicas for ≥3x expected read traffic.
- **Scaling Strategy**: Auto-scale API pods at 60% CPU or 70% memory utilization; search index scaled separately with warm standby nodes.

### Security & Privacy Requirements

- Enforce TLS 1.2+ everywhere; HSTS enabled on web properties.
- All PII, assessment responses, and advisor notes encrypted at rest (AES-256) and in transit, aligning with GDPR and CCPA commitments documented across API and data specifications.
- Role-based access control aligned with SOC 2 controls; privileged operations gated by multi-factor admin workflows.
- Data minimization: Collect only data enumerated in `docs/DATA.md`, with annual privacy impact assessments.
- Maintain audit trails for access to user profiles, exportable for regulatory inquiries.

### Accessibility Commitments

- WCAG 2.1 AA compliance for all user flows, including keyboard navigation, ARIA landmarks, color contrast ≥ 4.5:1, captioning for multimedia content, and alternative text for skill visualizations.
- Quarterly accessibility audits with assistive technology testing (NVDA, VoiceOver) on representative scenarios (assessment completion, viewing recommendations).

### Observability Standards

- Centralized logging with correlation IDs across frontend, API gateway, and downstream services.
- Metrics: request latency, error rates, cache hit ratios, queue depth, and database slow query logs exported to the monitoring stack (Prometheus/DataDog).
- Distributed tracing via OpenTelemetry with sampling ≥ 20% for recommendation workflows.
- Alerting thresholds: error rate > 1% over 5 minutes, latency SLA breaches, queue depth > 500 pending jobs.

### Resilience, Backup, and Data Retention

- Nightly encrypted backups of PostgreSQL with weekly integrity checks; Redis snapshots every 15 minutes for session continuity.
- Disaster recovery runbooks tested bi-annually, including restoration of O*NET data pipelines.
- Data retention policies honoring GDPR/CCPA: PII retained for 24 months post last activity, anonymized aggregates retained indefinitely for analytics, deletion workflows respecting right-to-erasure commitments in `docs/DATA.md`.
- Partner data exchange logs retained for 13 months to meet SOC 2 audit windows.

### Verification & Validation

- **Load & Stress Testing**: Gatling/K6 suites executed before major releases to validate latency and throughput targets under projected peak loads.
- **Chaos & Failover Drills**: Quarterly game days to verify auto-scaling, failover to read replicas, and cache warming strategies.
- **Security & Privacy Audits**: Annual third-party SOC 2 Type II and GDPR readiness assessments, quarterly vulnerability scanning, and penetration tests after significant architectural changes.
- **Accessibility Testing**: Automated axe-core scans in CI with manual screen-reader testing per release train.
- **Monitoring & Alerting**: Synthetic uptime checks for SLA enforcement, alert routing validated monthly, and on-call runbooks exercised during post-incident reviews.
- **Backup Verification**: Monthly restore drills into isolated environments to verify RTO/RPO metrics and data integrity.
