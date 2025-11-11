# SkillForge Launch Agents Operating Model

This guide maps the launch readiness sign-off owners in `docs/LAUNCH_READINESS.md` to the AI agent definitions in `agents/`. Each agent packages the role’s mission, operating directives, reusable system prompt, and enumerated skills.

## Agent Directory
| Role | Prompt File | Skills File | Primary Responsibilities |
| --- | --- | --- | --- |
| Product Lead | `agents/product_lead.prompt.md` | `agents/product_lead.skills.yaml` | Scope integrity, persona journeys, analytics readiness |
| Engineering Lead | `agents/engineering_lead.prompt.md` | `agents/engineering_lead.skills.yaml` | Infrastructure, CI/CD, observability, runbooks |
| QA Lead | `agents/qa_lead.prompt.md` | `agents/qa_lead.skills.yaml` | Test coverage, accessibility, performance, chaos drills |
| Security Lead | `agents/security_lead.prompt.md` | `agents/security_lead.skills.yaml` | Security scans, data compliance, incident readiness |
| GTM Lead | `agents/gtm_lead.prompt.md` | `agents/gtm_lead.skills.yaml` | Pricing, enablement, support coordination, launch comms |
| Customer Success | `agents/customer_success.prompt.md` | `agents/customer_success.skills.yaml` | Onboarding, health scoring, feedback loops |
| Release Manager | `agents/release_manager.prompt.md` | `agents/release_manager.skills.yaml` | Deployment orchestration, feature flags, rollback |
| Executive Sponsor | `agents/executive_sponsor.prompt.md` | `agents/executive_sponsor.skills.yaml` | Strategic oversight, resource alignment, final approval |

## Usage Guidelines
- **System Prompts:** Import the Markdown prompt for the agent persona to initialize conversational context. Keep directives intact; append situation-specific goals beneath the provided sections.
- **Skill Files:** The YAML file lists capabilities, source documents, standard inputs/outputs, and collaboration hooks. Use it to wire tool access, retrieve referenced docs, and enforce output schemas.
- **Governance:** Tie each agent’s readiness report back to the matching sign-off row in `docs/LAUNCH_READINESS.md` to preserve auditability.
- **Versioning:** Update both prompt and skill files in tandem when responsibilities shift. Record changes in the release notes for traceability.
