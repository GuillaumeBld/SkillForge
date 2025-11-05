# SkillForge Component Usage Guide

This guide documents the shared interaction patterns for the SkillForge component library showcased in the `apps/frontend` Storybook. Pair these guidelines with the accessibility architecture in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md#frontend) to ensure parity between design and implementation.

## Principles
- **Persona alignment:** Components should communicate which persona they support and expose analytics hooks that map to the KPI table in [`docs/ANALYTICS.md`](./ANALYTICS.md#product-kpis).
- **Accessibility first:** Every interaction must satisfy WCAG 2.2 AA. Reference the accessibility requirements in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md#frontend) for keyboard support, color contrast, and assistive technology patterns.
- **Composable styles:** Favor MUI structural components (layout, form controls) wrapped with Tailwind utility classes for tokenized theming and responsive spacing.

## Component Catalog

### OnboardingProgressCard
- **Purpose:** Guides students and career changers through the onboarding wizard.
- **Usage:**
  - Provide `steps` array representing the wizard milestones.
  - Pass `persona` to generate analytics context and persona-specific copy.
  - Attach `onContinue` / `onSaveExit` to persist state in the onboarding service.
- **Accessibility notes:** Screen reader live region announces step progress; ensure parent flows include skip links.
- **Analytics:** Emits `onboarding_step_viewed` and `student_onboarding_completed` events (see [`docs/ANALYTICS.md`](./ANALYTICS.md#event-dictionary--emission-map)).

### ReadinessHeroCard
- **Purpose:** Highlights readiness deltas and action plan completion on dashboards.
- **Usage:**
  - Supply `readinessScore`, `previousScore`, `goalsCompleted`, and `totalGoals` for progress context.
  - Link card actions to advisor support modals or messaging features.
- **Accessibility notes:** Provide textual equivalents for charts and maintain contrast ratios defined in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md#technical-stack).
- **Analytics:** Invokes `session_started` when focused to maintain WAU tracking.

### AdvisorRosterTable
- **Purpose:** Enables advisors to triage cohorts, trigger interventions, and capture notes.
- **Usage:**
  - Pass roster rows with readiness metrics.
  - Handle `onAssignAssessment` and `onAddNote` callbacks to integrate with the Advisor Portal APIs.
- **Accessibility notes:** Preserve table semantics with `<table>` markup, ensure focus outlines remain visible, and mirror keyboard shortcuts documented in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md#frontend).
- **Analytics:** Emits `cohort_assessment_assigned` and `advisor_note_added` events for intervention tracking.

## Storybook Workflow
1. Run `npm install` inside `apps/frontend` and start Storybook using `npm run storybook`.
2. Verify each story passes the a11y addon checks before shipping new UI.
3. Document persona-specific variants with MDX or CSF stories referencing analytics hooks.
4. Surface experiment instrumentation by importing `trackEvent` and reusing constants from `src/analytics/events.ts`.

## Design Handoff Checklist
- Link Figma frames listed in [`docs/mocks/README.md`](./mocks/README.md) to corresponding Storybook stories.
- Confirm analytics contracts align with the emission map in [`docs/ANALYTICS.md`](./ANALYTICS.md#event-dictionary--emission-map).
- Capture component-level accessibility annotations in Storybook docs for QA review.
