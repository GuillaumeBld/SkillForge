import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const accessibilityTargets = [
  { route: '/learners/dashboard', landmark: /personalized skillforge plan/i },
  { route: '/advisors/console', landmark: /cohort readiness and intervention management/i },
  { route: '/partners/onboarding', landmark: /partner onboarding checklist/i },
  { route: '/marketing/landing', landmark: /skillforge accelerates outcomes/i }
];

test.describe('Axe accessibility scan @axe', () => {
  for (const target of accessibilityTargets) {
    test(`${target.route} has no serious accessibility violations @axe`, async ({ page }) => {
      await page.goto(target.route);
      await expect(page.getByRole('heading', { name: target.landmark })).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      const seriousViolations = results.violations.filter((violation) =>
        violation.impact && ['serious', 'critical'].includes(violation.impact)
      );

      expect(seriousViolations, `Serious violations on ${target.route}: ${JSON.stringify(seriousViolations, null, 2)}`).toHaveLength(
        0
      );
    });
  }
});
