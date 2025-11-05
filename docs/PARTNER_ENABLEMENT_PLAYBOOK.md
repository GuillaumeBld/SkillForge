# Partner Enablement Playbook

This playbook operationalizes SkillForge's monetization and analytics strategies for partner-facing engagements. It establishes repeatable onboarding communications, training programs, and feedback cadences aligned with the partner tiers defined in `docs/MONETIZATION.md` and the KPIs outlined in `docs/ANALYTICS.md`.

---

## 1. Customer Onboarding & SLA Communication Templates

### 1.1 Partner Tier Overview
- **Developer / Basic**: API access with standard email support. Focus on rapid self-service onboarding and documentation delivery.
- **Business / Premium Onboarding**: Mid-market partners requiring live training, prioritized ticket queues, and data readiness checkpoints.
- **Enterprise SLA**: High-volume contracts with 24/7 coverage, dedicated account management, and bespoke analytics packages.

### 1.2 Welcome Email Template (Day 0)
```
Subject: Welcome to SkillForge – Getting Started with Your {{tier_name}} Plan

Hi {{primary_contact_name}},

We’re excited to partner with {{organization}} on the {{tier_name}} plan. Here’s everything you need to activate your team:

1. **Access Details**
   - Sandbox URL: https://sandbox.skillforge.com
   - API Base: https://sandbox.api.skillforge.com (rate limits: 200 req/hr for sandbox)
   - Admin Console: https://dashboard.skillforge.com (use SSO or credentials provisioned below)

2. **Next Steps**
   - Complete the onboarding survey: {{survey_link}}
   - Review the integration guide for your tier: {{integration_playbook_link}}
   - Schedule your kickoff call: {{calendly_link}}

3. **Support & SLAs**
   - Support channel: {{support_channel}} ({{support_hours_description}})
   - SLA targets: {{response_sla}} first response | {{resolution_sla}} resolution

Let us know if you need anything ahead of the kickoff. Welcome aboard!

Best,
{{account_manager_name}}
Customer Success @ SkillForge
```

### 1.3 Kickoff Agenda Template (Week 1)
```
Duration: 60 minutes (Zoom / Teams)
Participants: {{account_manager}}, {{solution_architect}}, {{support_lead}}, {{partner_team}}

1. Introductions & goals recap (10 min)
2. Success metrics review (aligned with contract KPIs) (10 min)
3. Sandbox environment walkthrough (15 min)
4. Integration plan & timelines (developer portal, API usage limits) (15 min)
5. Support pathways & escalation policy (5 min)
6. Next steps, owners, and follow-up actions (5 min)
```

### 1.4 SLA Confirmation Template (Post-Kickoff)
```
Subject: SkillForge SLA & Escalation Plan – {{organization}}

Hi {{primary_contact_name}},

Thanks for meeting with us. As discussed, here are your SLA commitments under the {{tier_name}} plan:

- **Availability Target**: 99.5% monthly uptime for core API and dashboard services.
- **Support Coverage**: {{support_hours_description}} via {{support_channel}} with first-response SLA of {{response_sla}} and resolution SLA of {{resolution_sla}}.
- **Escalation Path**:
  1. Submit ticket at {{support_portal_link}} referencing contract ID {{contract_id}}.
  2. For urgent incidents, call the on-call line {{on_call_number}} (Enterprise only) or use the `#skillforge-support` Slack connect channel.
  3. Escalate to account manager {{account_manager_name}} if no update within SLA window.

Please confirm receipt and let us know if any internal stakeholders should be added to the distribution list.

Regards,
{{support_manager_name}}
Support Operations @ SkillForge
```

### 1.5 Quarterly Business Review (QBR) Invite Template
```
Subject: QBR Prep – SkillForge + {{organization}} ({{quarter}})

Hi {{executive_sponsor}},

It’s time for our {{quarter}} QBR. We’ll review:
- Adoption and engagement trends across your cohorts
- API consumption vs. contracted thresholds
- Skills readiness improvements mapped to your goals
- Upcoming roadmap items and upsell opportunities (e.g., Advanced Analytics, Enterprise SLA renewals)

Please confirm availability for {{proposed_dates}}. We’ll circulate the pre-read analytics deck 3 business days prior.

Thanks,
{{account_manager_name}}
```

---

## 2. Support & Partnership Training Program

### 2.1 Training Objectives
- Equip support and partnership teams to manage tier-specific onboarding workflows.
- Ensure proficiency with sandbox environments seeded according to `docs/DATA_OPERATIONS.md`.
- Build fluency with analytics dashboards and KPI definitions from `docs/ANALYTICS.md`.

### 2.2 Environment Preparation Checklist
1. **Sandbox Provisioning**
   - Request tenant-specific sandbox schema (`partner_<id>`) with preloaded top 100 occupations/skills for demos.
   - Confirm API keys and rate limits match tier expectations (200 req/hr sandbox cap per Data Operations runbook).
2. **Data Seeding**
   - Execute synthetic user and cohort seeds to mirror persona journeys (student, career changer, advisor).
   - Load sample assessments, action plans, and advisor notes to support end-to-end scenarios.
3. **Analytics Dashboards**
   - Publish curated dashboard views for onboarding completion, readiness delta, WAU, and data freshness.
   - Preload filter presets by persona and partner segment to accelerate training walkthroughs.

### 2.3 Training Schedule
| Week | Session | Audience | Format | Key Outcomes |
|------|---------|----------|--------|--------------|
| Week 1 | Partner Tier Deep-Dive | Partnerships | 90-min live workshop | Explain monetization tiers, upsell paths, and contract levers |
| Week 1 | Sandbox Orientation | Support + Partnerships | 60-min hands-on lab | Navigate sandbox tenant, execute API calls, review seeded datasets |
| Week 2 | Analytics for Success | Support + Partnerships | 75-min guided dashboard review | Interpret KPIs: onboarding completion, readiness delta, WAU, data freshness |
| Week 2 | Escalation & SLA Labs | Support | 45-min scenario drills | Practice SLA commitments, escalation tree, and communication templates |
| Ongoing | Office Hours | All | Weekly 30-min drop-in | Address partner-specific issues, share feedback |

### 2.4 Training Materials
- **Playbooks**: Tier comparison matrix, FAQ sheets, escalation flowcharts.
- **Hands-On Labs**: Postman collection with sandbox API calls, dashboard walkthrough scripts.
- **Assessment**: Knowledge check quiz (score ≥85% required for certification) covering data operations, analytics, and communication protocols.

---

## 3. Feedback Loops & KPI Governance

### 3.1 Feedback Intake Channels
- **Support Tickets**: Tag partner tier, issue category, and SLA breach risk. Weekly triage with support manager and account managers.
- **Product Analytics**: Monitor KPIs from `docs/ANALYTICS.md` (onboarding completion, readiness delta, WAU, data freshness) segmented by partner tier.
- **Partner Advisory Council**: Monthly call with Enterprise and Premium partners focusing on roadmap alignment and service quality.
- **Voice of Customer Digest**: Bi-weekly summary combining ticket insights, NPS verbatims, and analytics anomalies.

### 3.2 Feedback Processing Workflow
1. **Collection**: Support tooling auto-syncs tags to Jira/Linear board; analytics pipeline updates dashboards nightly.
2. **Review**: Cross-functional meeting every Wednesday (Support Lead, Product Analyst, Partnerships Director).
3. **Actioning**: Assign owners for top issues; log resolution ETA and expected impact on KPIs.
4. **Communication**: Send fortnightly update email to partners summarizing resolved issues, upcoming improvements, and SLA performance.

### 3.3 KPI Review Cadence
- **First Post-Launch KPI Review**: Scheduled for **Week 6 post-launch (Thursday, 10:00 AM local time)**.
  - Attendees: VP Partnerships, Head of Support, Product Analytics Lead, Account Managers for active partners.
  - Agenda:
    1. KPI Snapshot: onboarding completion rate, readiness delta, WAU, data freshness SLA.
    2. SLA Performance: response/resolution compliance by tier.
    3. Feedback Themes: top support tickets, product analytics anomalies, partner sentiment.
    4. Action Plan: prioritize backlog items, assign owners, set deadlines before QBR cycle.
- **Ongoing Cadence**: Monthly KPI reviews thereafter, aligned with QBR schedule.

### 3.4 Reporting Artifacts
- **KPI Dashboard Pack**: Export from analytics tool with tier-specific filters.
- **SLA Compliance Report**: Auto-generated from support system; highlight breaches and mitigations.
- **Feedback Tracker**: Shared spreadsheet or Notion board capturing issue lifecycle from submission to resolution.
- **Executive Summary**: One-page briefing for leadership including KPI trends, escalations, upsell opportunities.

---

## 4. Roles & Responsibilities
| Function | Primary Responsibilities |
|----------|--------------------------|
| Partnerships Director | Owns partner tier strategy, facilitates QBRs, ensures monetization alignment |
| Support Manager | Maintains SLA adherence, manages ticket triage, oversees training certification |
| Product Analytics Lead | Curates dashboards, reports KPI trends, partners on feedback analysis |
| Solutions Architect | Maintains sandbox environments, ensures data seeding fidelity |
| Account Managers | Execute communication templates, manage day-to-day partner expectations |

---

## 5. Success Metrics
- 100% of new partners receive welcome + SLA confirmation communications within 24 hours of contract signature.
- Support and partnership team certification completion ≥ 90% within first two weeks of launch.
- SLA first-response compliance ≥ 95% across all tiers; Enterprise resolution compliance ≥ 98%.
- KPI review action items closed within 30 days; KPI trends reported to leadership monthly.

---

## 6. Revision History
| Date | Author | Description |
|------|--------|-------------|
| 2024-05-23 | SkillForge GTM Ops | Initial draft of partner enablement playbook |
