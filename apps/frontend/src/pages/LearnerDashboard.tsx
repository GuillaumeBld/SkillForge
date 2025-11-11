import { useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
  Button
} from '@mui/material';
import { ANALYTICS_EVENTS, trackEvent } from '../analytics/events';
import { OnboardingProgressCard } from '../components/OnboardingProgressCard';
import { ReadinessHeroCard } from '../components/ReadinessHeroCard';

const onboardingSteps = [
  'Upload your resume',
  'Select preferred roles',
  'Complete skill self-assessment',
  'Book advisor consultation'
];

const focusAreas = [
  {
    label: 'Career Story',
    description: 'Practice telling your journey using STAR prompts and skill highlights.'
  },
  {
    label: 'Portfolio Boost',
    description: 'Add two project spotlights with quantified impact before the next review.'
  }
];

export const LearnerDashboard = () => {
  const recommendedPaths = useMemo(
    () => [
      { id: 'ux', title: 'UX Research Foundations', duration: '4 weeks', modality: 'Async + mentor check-ins' },
      { id: 'pm', title: 'Product Strategy Sprint', duration: '3 weeks', modality: 'Cohort-based live sessions' }
    ],
    []
  );

  const upcomingSessions: Array<{ id: string; title: string; date: string }> = [];
  const insightsError: string | null = null;

  useEffect(() => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.learnerDashboardViewed,
      persona: 'student',
      contextPage: '/learners/dashboard'
    });
  }, []);

  return (
    <Box component="section" aria-labelledby="learner-dashboard-heading" className="space-y-10">
      <Box className="flex flex-col gap-2">
        <Typography id="learner-dashboard-heading" variant="h3" component="h1" className="text-balance font-semibold">
          Welcome back, here is your personalized SkillForge plan
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track progress, complete onboarding, and explore curated experiences recommended by advisors.
        </Typography>
      </Box>
      <Grid container spacing={4} alignItems="stretch">
        <Grid item xs={12} lg={6} className="flex flex-col gap-4">
          <ReadinessHeroCard
            persona="student"
            readinessScore={72}
            previousScore={65}
            goalsCompleted={6}
            totalGoals={10}
          />
          <Card role="region" aria-labelledby="focus-areas-title" className="rounded-3xl border border-slate-200 shadow-sm">
            <CardContent className="space-y-4">
              <Typography id="focus-areas-title" variant="h5" component="h2">
                Focus areas from your advisor
              </Typography>
              <List aria-describedby="focus-areas-caption" dense disablePadding>
                {focusAreas.map((area) => (
                  <ListItem key={area.label} className="items-start">
                    <ListItemText
                      primaryTypographyProps={{ variant: 'subtitle1', className: 'font-semibold' }}
                      primary={area.label}
                      secondary={area.description}
                    />
                  </ListItem>
                ))}
              </List>
              <Typography id="focus-areas-caption" variant="caption" color="text.secondary">
                These priorities update after each advisor sync.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={6} className="flex flex-col gap-4">
          <OnboardingProgressCard persona="student" steps={onboardingSteps} currentStepIndex={2} />
          <Card role="region" aria-labelledby="upcoming-sessions-title" className="rounded-3xl border border-slate-200 shadow-sm">
            <CardContent className="space-y-3">
              <Typography id="upcoming-sessions-title" variant="h5" component="h2">
                Upcoming live sessions
              </Typography>
              {upcomingSessions.length === 0 ? (
                <Alert severity="info" variant="outlined" role="status" aria-live="polite">
                  No sessions scheduled yet. Use the advisor console to request a time or join group office hours.
                </Alert>
              ) : (
                <List dense>
                  {upcomingSessions.map((session) => (
                    <ListItem key={session.id} className="flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <ListItemText
                        primaryTypographyProps={{ variant: 'subtitle1', className: 'font-medium' }}
                        primary={session.title}
                        secondary={session.date}
                      />
                      <Chip label="Confirmed" color="success" size="small" />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Card role="region" aria-labelledby="recommended-paths-title" className="rounded-3xl border border-slate-200 shadow-sm">
        <CardContent className="space-y-4">
          <Box className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Box>
              <Typography id="recommended-paths-title" variant="h4" component="h2">
                Recommended learning sequences
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Curated from SkillForge sequence flows to keep momentum between assessments.
              </Typography>
            </Box>
            <Button variant="contained" color="primary" size="large">
              Browse full catalog
            </Button>
          </Box>
          <Divider />
          <Grid container spacing={3} alignItems="stretch">
            {recommendedPaths.map((path) => (
              <Grid item xs={12} md={6} key={path.id}>
                <Card className="h-full rounded-2xl border border-primary-100 bg-primary-50/60 shadow-none">
                  <CardContent className="space-y-3">
                    <Typography variant="h6" component="p" className="font-semibold text-primary-900">
                      {path.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {path.modality}
                    </Typography>
                    <Chip label={path.duration} color="primary" variant="outlined" role="status" aria-live="polite" />
                    <Button
                      variant="text"
                      color="primary"
                      onClick={() =>
                        trackEvent({
                          eventName: ANALYTICS_EVENTS.careerMatchViewed,
                          persona: 'student',
                          contextPage: '/learners/dashboard',
                          recommendationId: path.id
                        })
                      }
                    >
                      View details
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
      {insightsError ? (
        <Alert severity="error" role="alert" className="rounded-3xl border border-rose-200" aria-live="assertive">
          {insightsError}
        </Alert>
      ) : null}
    </Box>
  );
};

export default LearnerDashboard;
