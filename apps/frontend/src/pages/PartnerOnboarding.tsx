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

const partnerSteps = [
  'Invite team members',
  'Upload candidate roster',
  'Configure integrations',
  'Review placement insights'
];

export const PartnerOnboarding = () => {
  const integrationChecks = useMemo(
    () => [
      { id: 'sso', title: 'Single Sign-On', status: 'Connected', detail: 'Okta SAML verified' },
      { id: 'ats', title: 'ATS Import', status: 'Pending', detail: 'Awaiting API key from partner admin' },
      { id: 'webhook', title: 'Webhook Delivery', status: 'Testing', detail: 'QA sandbox receiving payloads' }
    ],
    []
  );

  const openQuestions = [
    {
      id: 'security',
      question: 'Can we scope custom data retention for the pilot cohort?',
      owner: 'Security review'
    }
  ];

  useEffect(() => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.partnerOnboardingViewed,
      persona: 'partner_admin',
      contextPage: '/partners/onboarding'
    });
  }, []);

  return (
    <Box component="section" aria-labelledby="partner-onboarding-heading" className="space-y-10">
      <Box className="flex flex-col gap-2">
        <Typography id="partner-onboarding-heading" variant="h3" component="h1" className="text-balance font-semibold">
          Partner onboarding checklist
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Align integrations, verify data flows, and monitor placement success metrics in one workspace.
        </Typography>
      </Box>
      <Grid container spacing={4} alignItems="stretch">
        <Grid item xs={12} lg={6} className="space-y-4">
          <OnboardingProgressCard persona="partner_admin" steps={partnerSteps} currentStepIndex={1} />
          <Card role="region" aria-labelledby="integration-status-title" className="rounded-3xl border border-slate-200 shadow-sm">
            <CardContent className="space-y-4">
              <Typography id="integration-status-title" variant="h5" component="h2">
                Integration readiness
              </Typography>
              <List dense disablePadding>
                {integrationChecks.map((check) => (
                  <ListItem key={check.id} className="flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <ListItemText
                      primaryTypographyProps={{ variant: 'subtitle1', className: 'font-semibold' }}
                      primary={check.title}
                      secondary={check.detail}
                    />
                    <Chip
                      label={check.status}
                      color={check.status === 'Connected' ? 'success' : check.status === 'Pending' ? 'warning' : 'info'}
                      variant="outlined"
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
              <Alert severity="info" variant="outlined" role="status" aria-live="polite">
                ATS integration is pending partner API credentials. Automated reminders will send every 48 hours.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={6} className="space-y-4">
          <Card role="region" aria-labelledby="enablement-resources-title" className="rounded-3xl border border-slate-200 shadow-sm">
            <CardContent className="space-y-3">
              <Typography id="enablement-resources-title" variant="h5" component="h2">
                Enablement resources
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Launch readiness runbook" secondary="Updated weekly from SkillForge operations." />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Import validation checklist" secondary="Pair with Sequence Flow #3 for QA." />
                </ListItem>
              </List>
              <Button
                variant="contained"
                color="primary"
                onClick={() =>
                  trackEvent({
                    eventName: ANALYTICS_EVENTS.partnerImportUploaded,
                    persona: 'partner_admin',
                    contextPage: '/partners/onboarding',
                    action: 'download_enablement_kit'
                  })
                }
              >
                Download enablement kit
              </Button>
            </CardContent>
          </Card>
          <Card role="region" aria-labelledby="open-questions-title" className="rounded-3xl border border-slate-200 shadow-sm">
            <CardContent className="space-y-3">
              <Typography id="open-questions-title" variant="h5" component="h2">
                Open questions
              </Typography>
              {openQuestions.length === 0 ? (
                <Alert severity="success" role="status" aria-live="polite">
                  All onboarding questions resolved. Schedule launch retro with partner success.
                </Alert>
              ) : (
                openQuestions.map((item) => (
                  <Box key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:bg-slate-800">
                    <Typography variant="subtitle1" className="font-semibold">
                      {item.question}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Owner: {item.owner}
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Card role="region" aria-labelledby="placement-metrics-title" className="rounded-3xl border border-slate-200 shadow-sm">
        <CardContent className="space-y-3">
          <Typography id="placement-metrics-title" variant="h5" component="h2">
            Placement readiness metrics
          </Typography>
          <Divider />
          <Grid container spacing={3} alignItems="stretch">
            <Grid item xs={12} md={4}>
              <Card className="h-full rounded-2xl border border-primary-100 bg-primary-50/60 shadow-none">
                <CardContent className="space-y-1">
                  <Typography variant="h4" component="p" className="font-semibold text-primary-900">
                    68%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Candidates matched to priority roles
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card className="h-full rounded-2xl border border-emerald-100 bg-emerald-50/60 shadow-none">
                <CardContent className="space-y-1">
                  <Typography variant="h4" component="p" className="font-semibold text-emerald-900">
                    12
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Offers extended this sprint
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card className="h-full rounded-2xl border border-amber-100 bg-amber-50/60 shadow-none">
                <CardContent className="space-y-1">
                  <Typography variant="h4" component="p" className="font-semibold text-amber-900">
                    4.6 / 5
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average candidate satisfaction
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PartnerOnboarding;
