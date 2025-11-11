export const queryKeys = {
  health: ['health'] as const,
  onboarding: (userId: string) => ['users', userId, 'onboarding'] as const,
  resume: (userId: string, resumeId: string) => ['users', userId, 'resumes', resumeId] as const,
  assessments: (userId: string, status?: string, limit?: number) =>
    ['users', userId, 'assessments', { status, limit }] as const,
  matches: (userId: string, type: string) => ['users', userId, 'matches', type] as const,
  dashboard: (userId: string, sections?: string) => ['users', userId, 'dashboard', sections] as const,
  notifications: (userId: string, filters?: unknown) => ['users', userId, 'notifications', filters] as const,
  candidateMatches: (candidateId: string, type: string) => ['candidates', candidateId, 'matches', type] as const
};
