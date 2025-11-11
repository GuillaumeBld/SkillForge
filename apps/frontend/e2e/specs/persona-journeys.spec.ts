import { test, expect } from '@playwright/test';
import { personas } from '../fixtures/personas';

const marketingRoute = '/marketing/landing';

test.describe('Seeded SkillForge personas (docs/TESTPLAN.md)', () => {
  test('Maya Chen (learner) reviews her personalized readiness plan', async ({ page }) => {
    const learner = personas.maya;

    await page.goto(learner.dashboardRoute);

    await test.step('Verify focus areas generated from Maya\'s seeded data', async () => {
      await expect(page.getByRole('heading', { name: /personalized SkillForge plan/i })).toBeVisible();
      for (const focus of learner.seededFocusAreas) {
        await expect(page.getByText(focus)).toBeVisible();
      }
    });

    await test.step('Confirm recommended sequences and accessibility affordances', async () => {
      await expect(page.getByRole('link', { name: /skip to main content/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /browse full catalog/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /view details/i }).first()).toBeVisible();
    });
  });

  test('Alicia Patel (advisor) manages the roster seeded for demo cohorts', async ({ page }) => {
    const advisor = personas.alicia;

    await page.goto(advisor.consoleRoute);

    await test.step('Validate the roster composed from seeded advisees', async () => {
      const rosterRegion = page.getByRole('region', { name: /advisee roster/i });
      for (const advisee of advisor.rosterHighlights) {
        await expect(rosterRegion.getByText(new RegExp(advisee, 'i'))).toBeVisible();
      }
      await expect(rosterRegion.getByRole('button', { name: /assign assessment/i }).first()).toBeVisible();
    });

    await test.step('Check console actions that advisors use to coordinate interventions', async () => {
      await page.getByRole('button', { name: /export cohort snapshot/i }).click();
      await expect(page.getByRole('heading', { name: /alerts & escalations/i })).toBeVisible();
    });
  });

  test('demo_partner admin validates onboarding readiness and enablement assets', async ({ page }) => {
    const partner = personas.demoPartner;

    await page.goto(partner.onboardingRoute);

    await test.step('Confirm integration checks seeded for the partner tenant', async () => {
      const integrationRegion = page.getByRole('region', { name: /integration readiness/i });
      for (const item of partner.integrationChecks) {
        await expect(integrationRegion.getByText(new RegExp(item, 'i'))).toBeVisible();
      }
    });

    await test.step('Validate enablement resources and marketing alignment', async () => {
      await page.getByRole('button', { name: /download enablement kit/i }).click();
      await expect(page.getByRole('region', { name: /placement readiness metrics/i })).toBeVisible();
      await page.goto(marketingRoute);
      await expect(page.getByRole('heading', { name: /skillforge accelerates outcomes/i })).toBeVisible();
    });
  });
});
