# SkillForge Sequence Flows

## Onboarding to Resume Ingestion
```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend App
    participant AUTH as Auth Service
    participant RP as Resume Parser
    participant ME as Matching Engine
    participant NS as Notification Service
    participant PG as PostgreSQL
    participant RD as Redis
    participant JI as JAAT Index

    U->>FE: Submit registration + resume
    FE->>AUTH: POST /auth/register (JWT issuance)
    AUTH->>PG: Persist user profile
    AUTH->>RD: Cache session token
    AUTH-->>FE: Auth success + JWT
    FE->>RP: Upload resume with JWT
    RP->>RD: Cache parsing job metadata
    RP->>PG: Store parsed resume data
    RP->>ME: Notify resume ingested
    ME->>JI: Fetch canonical occupation skills
    ME->>PG: Link parsed skills to user profile
    ME->>NS: Publish onboarding completion event
    NS-->>U: Send welcome message
    ME-->>FE: Resume ingestion confirmation
    FE-->>U: Display onboarding success

    Note over AUTH,PG: Auth Service persists user credentials and profile metadata in PostgreSQL.
    Note over AUTH,RD: Session tokens cached in Redis for quick validation and revocation workflows.
    Note over RP,ME: Parsed resume skills are normalized before Matching Engine alignment.
    Note over ME,JI: Matching Engine fetches canonical skill mappings from the JAAT Index.

    alt Auth Service failure
        AUTH-->>FE: 5xx error
        FE-->>U: Prompt retry later
        Note over FE,AUTH: Client retries after 2^n backoff up to 3 attempts.
    else Resume Parser timeout
        RP-->>FE: 504 timeout
        FE-->>U: Show pending ingestion banner
        RP->>RD: Schedule retry with exponential backoff (max 15 min)
        RP->>NS: Alert ops on repeated failures
    else JAAT Index unavailable
        ME-->>FE: 503 unavailable
        FE-->>U: Inform of delay
        ME->>RD: Queue retry job with jittered backoff (1m, 5m, 15m)
        ME->>NS: Emit incident notification
    end
```

## Assessment Scoring to Recommendation Generation
```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend App
    participant AUTH as Auth Service
    participant ME as Matching Engine
    participant RP as Resume Parser
    participant PG as PostgreSQL
    participant RD as Redis
    participant JI as JAAT Index
    participant NS as Notification Service

    U->>FE: Submit assessment responses
    FE->>AUTH: Validate session (JWT introspection)
    AUTH->>RD: Retrieve session context
    AUTH-->>FE: Session valid
    FE->>PG: POST assessment responses (REST)
    PG-->>ME: Trigger scoring event
    ME->>PG: Fetch user history + parsed resume
    ME->>JI: Retrieve occupation competency vectors
    ME->>RD: Cache intermediate scoring artifacts
    ME-->>PG: Persist assessment scores & recommendations
    PG-->>NS: Emit recommendation-ready event
    NS-->>U: Send notification (email/push)
    FE<-NS: Webhook to refresh UI
    FE-->>U: Display personalized recommendations

    Note over PG,ME: Matching Engine aligns assessment outputs with JAAT taxonomy stored in the JAAT Index.
    Note over ME,RD: Redis caches scoring states to resume processing on retries.
    Note over NS,U: Notification Service keeps users updated on recommendation readiness.

    alt Session validation fails
        AUTH-->>FE: 401 Unauthorized
        FE-->>U: Prompt reauthentication
        Note over FE,AUTH: Immediate retry blocked until user refreshes credentials.
    else Matching Engine error
        ME-->>PG: Error event logged
        ME->>RD: Requeue scoring job with exponential backoff (1m, 2m, 4m)
        ME->>NS: Notify DevOps on repeated failures
        NS-->>U: Inform delay in recommendations
    else JAAT Index lag
        ME-->>PG: Partial results stored
        ME->>RD: Schedule refresh to hydrate gaps
        PG-->>FE: Return partial recommendations flag
        FE-->>U: Display partial recommendations banner
    end
```

## Partner Bulk Import to Placement
```mermaid
sequenceDiagram
    participant P as Partner Admin
    participant FE as Partner Portal
    participant AUTH as Auth Service
    participant RP as Resume Parser
    participant ME as Matching Engine
    participant NS as Notification Service
    participant PG as PostgreSQL
    participant RD as Redis
    participant JI as JAAT Index

    P->>FE: Upload candidate CSV
    FE->>AUTH: Validate partner credentials
    AUTH->>RD: Verify partner session + rate limits
    AUTH-->>FE: Partner authorized
    FE->>PG: Store bulk import metadata
    FE->>RP: Stream candidate resumes for parsing
    RP->>RD: Queue parsing tasks with state snapshots
    RP->>PG: Persist normalized candidate profiles
    RP->>ME: Publish ready-for-matching event
    ME->>JI: Pull required skill clusters
    ME->>PG: Create candidate-job matches
    ME->>NS: Send placement recommendations
    NS-->>P: Email/SMS placement digest
    NS->>PG: Log communication outcomes

    Note over AUTH,RD: Redis enforces throttling and tracks bulk import progress.
    Note over RP,PG: Parsed data written to PostgreSQL for auditability.
    Note over ME,JI: Matching Engine depends on JAAT index to align partner roles.

    alt Resume Parser queue saturation
        RP->>RD: Defer new tasks with jittered backoff (30s-5m)
        RP-->>FE: Report processing delay
        FE-->>P: Display import status warning
    else Matching Engine conflict
        ME-->>PG: Flag conflicting placements
        ME->>RD: Retry match resolution (backoff 2m, 5m, 10m)
        ME->>NS: Notify QA to review conflicts
    else Notification Service outage
        NS-->>P: Delivery failure callback
        NS->>RD: Queue retry with exponential backoff (5m, 15m, 30m)
        NS->>PG: Record failure metrics
        FE-->>P: Surface in-portal alert with manual resend option
    end
```
