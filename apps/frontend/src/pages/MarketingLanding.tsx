import { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@mui/material';
import { ANALYTICS_EVENTS, trackEvent } from '../analytics/events';
import { ReadinessHeroCard } from '../components/ReadinessHeroCard';

const differentiators = [
  {
    id: 'conversion',
    title: '30% faster learner activation',
    detail: 'Sequence-driven onboarding inspired by SkillForge playbooks keeps signups engaged through their first milestone.'
  },
  {
    id: 'advisor',
    title: 'Advisor bandwidth unlocked',
    detail: 'Automated interventions and readiness insights help advisors focus on high-impact conversations.'
  },
  {
    id: 'partners',
    title: 'Partner-ready integrations',
    detail: 'ATS, SSO, and webhook connectors accelerate placement pilots without compromising security.'
  }
];

export const MarketingLanding = () => {
  const webinars: Array<{ id: string; title: string; date: string }> = [];

  useEffect(() => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.marketingLandingViewed,
      persona: 'marketing',
      contextPage: '/marketing/landing'
    });
  }, []);

  return (
    <Box component="section" aria-labelledby="marketing-landing-heading" className="space-y-12">
      <Box className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <Box className="space-y-4">
          <Typography id="marketing-landing-heading" variant="h2" component="h1" className="text-balance font-bold">
            SkillForge accelerates outcomes across the learner journey
          </Typography>
          <Typography variant="body1" color="text.secondary">
            From onboarding to placement, the SkillForge orchestration layer adapts to each persona and keeps data flowing across
            the ecosystem documented in our architecture.
          </Typography>
          <Box className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() =>
                trackEvent({
                  eventName: ANALYTICS_EVENTS.sessionStarted,
                  persona: 'marketing',
                  contextPage: '/marketing/landing',
                  cta: 'request_demo'
                })
              }
            >
              Request a demo
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() =>
                trackEvent({
                  eventName: ANALYTICS_EVENTS.taskCompletionLogged,
                  persona: 'marketing',
                  contextPage: '/marketing/landing',
                  task: 'download_case_study'
                })
              }
            >
              Download case study
            </Button>
          </Box>
        </Box>
        <ReadinessHeroCard
          persona="marketing"
          readinessScore={88}
          previousScore={75}
          goalsCompleted={24}
          totalGoals={30}
        />
      </Box>
      <Card role="region" aria-labelledby="differentiators-title" className="rounded-3xl border border-slate-200 shadow-sm">
        <CardContent className="space-y-3">
          <Typography id="differentiators-title" variant="h4" component="h2">
            Why SkillForge
          </Typography>
          <Grid container spacing={3} alignItems="stretch">
            {differentiators.map((item) => (
              <Grid item xs={12} md={4} key={item.id}>
                <Card className="h-full rounded-2xl border border-primary-100 bg-primary-50/60 shadow-none">
                  <CardContent className="space-y-2">
                    <Typography variant="h6" component="p" className="font-semibold text-primary-900">
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.detail}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
      <Card role="region" aria-labelledby="resources-title" className="rounded-3xl border border-slate-200 shadow-sm">
        <CardContent className="space-y-3">
          <Typography id="resources-title" variant="h4" component="h2">
            Resources & webinars
          </Typography>
          {webinars.length === 0 ? (
            <Alert severity="info" variant="outlined" role="status" aria-live="polite">
              Upcoming webinars are being scheduled. Subscribe to launch updates for the latest enablement content.
            </Alert>
          ) : (
            <List>
              {webinars.map((webinar) => (
                <ListItem key={webinar.id} className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <ListItemText
                    primaryTypographyProps={{ variant: 'subtitle1', className: 'font-semibold' }}
                    primary={webinar.title}
                    secondary={webinar.date}
                  />
                  <Button variant="text" color="primary">
                    Save my seat
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MarketingLanding;
