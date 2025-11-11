export const personas = {
  maya: {
    displayName: 'Maya Chen',
    role: 'student',
    seededFocusAreas: ['Career Story', 'Portfolio Boost'],
    dashboardRoute: '/learners/dashboard'
  },
  alicia: {
    displayName: 'Alicia Patel',
    role: 'advisor',
    rosterHighlights: ['Ava Chen', 'Mateo Garcia', 'Priya Patel'],
    consoleRoute: '/advisors/console'
  },
  demoPartner: {
    displayName: 'demo_partner',
    role: 'partner_admin',
    integrationChecks: ['Single Sign-On', 'ATS Import', 'Webhook Delivery'],
    onboardingRoute: '/partners/onboarding'
  }
} as const;

export type PersonaKey = keyof typeof personas;
