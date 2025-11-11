import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  Button
} from '@mui/material';
import { ANALYTICS_EVENTS, trackEvent } from '../analytics/events';
import { AdvisorRosterTable, type AdvisorRosterRow } from '../components/AdvisorRosterTable';

export const AdvisorConsole = () => {
  const [rosterError] = useState<string | null>(null);
  const rosterRows = useMemo<AdvisorRosterRow[]>(
    () => [
      { id: '1', name: 'Ava Chen', readiness: 78, lastLogin: '2 days ago', interventions: 3 },
      { id: '2', name: 'Mateo Garcia', readiness: 64, lastLogin: '5 days ago', interventions: 1 },
      { id: '3', name: 'Priya Patel', readiness: 82, lastLogin: '1 day ago', interventions: 4 }
    ],
    []
  );

  useEffect(() => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.advisorConsoleViewed,
      persona: 'advisor',
      contextPage: '/advisors/console'
    });
  }, []);

  const handleAssignAssessment = (ids: string[]) => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.cohortAssessmentAssigned,
      persona: 'advisor',
      contextPage: '/advisors/console',
      adviseeIds: ids
    });
  };

  const handleAddNote = (id: string) => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.advisorNoteAdded,
      persona: 'advisor',
      contextPage: '/advisors/console',
      adviseeId: id
    });
  };

  const alerts = [
    {
      id: 'intervention-1',
      title: 'Intervention queue approaching SLA',
      detail: '2 advisees are awaiting outreach beyond 72 hours. Reassign or follow up.'
    }
  ];

  return (
    <Box component="section" aria-labelledby="advisor-console-heading" className="space-y-10">
      <Box className="flex flex-col gap-2">
        <Typography id="advisor-console-heading" variant="h3" component="h1" className="text-balance font-semibold">
          Cohort readiness and intervention management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Prioritize outreach, monitor readiness deltas, and coordinate with partners using the roster below.
        </Typography>
      </Box>
      <Grid container spacing={4} alignItems="stretch">
        <Grid item xs={12} lg={8} className="space-y-4">
          {rosterError ? (
            <Box
              role="alert"
              aria-live="assertive"
              tabIndex={0}
              className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-400/40 dark:bg-rose-950/40 dark:text-rose-100"
            >
              <Typography component="p" variant="body2">
                {rosterError}
              </Typography>
            </Box>
          ) : rosterRows.length === 0 ? (
            <Box
              role="status"
              aria-live="polite"
              tabIndex={0}
              className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-sky-400/40 dark:bg-sky-900/30 dark:text-sky-50"
            >
              <Typography component="p" variant="body2">
                No advisees assigned yet. Coordinate with partner success to import a cohort.
              </Typography>
            </Box>
          ) : (
            <AdvisorRosterTable rows={rosterRows} onAssignAssessment={handleAssignAssessment} onAddNote={handleAddNote} />
          )}
        </Grid>
        <Grid item xs={12} lg={4} className="space-y-4">
          <Card role="region" aria-labelledby="advisor-kpis-title" className="rounded-3xl border border-slate-200 shadow-sm">
            <CardContent className="space-y-4">
              <Typography id="advisor-kpis-title" variant="h5" component="h2">
                Weekly advisor KPIs
              </Typography>
              <List dense>
                <ListItem className="justify-between">
                  <ListItemText primary="Average readiness delta" secondary="+6 points" />
                  <Chip label="On track" color="success" size="small" />
                </ListItem>
                <ListItem className="justify-between">
                  <ListItemText primary="Assessments assigned" secondary="12 / 15 target" />
                  <Chip label="80%" color="primary" size="small" variant="outlined" />
                </ListItem>
                <ListItem className="justify-between">
                  <ListItemText primary="Notes captured" secondary="18" />
                  <Chip
                    label="Needs review"
                    color="default"
                    size="small"
                    variant="filled"
                    sx={{
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      color: '#78350f',
                      '& .MuiChip-label': { fontWeight: 600 }
                    }}
                  />
                </ListItem>
              </List>
              <Button
                variant="contained"
                color="primary"
                onClick={() =>
                  trackEvent({
                    eventName: ANALYTICS_EVENTS.taskCompletionLogged,
                    persona: 'advisor',
                    contextPage: '/advisors/console',
                    task: 'weekly_kpi_review'
                  })
                }
              >
                Export cohort snapshot
              </Button>
            </CardContent>
          </Card>
          <Card role="region" aria-labelledby="alerts-title" className="rounded-3xl border border-slate-200 shadow-sm">
            <CardContent className="space-y-3">
              <Typography id="alerts-title" variant="h5" component="h2">
                Alerts & escalations
              </Typography>
              {alerts.length === 0 ? (
                <Box
                  role="status"
                  aria-live="polite"
                  tabIndex={0}
                  className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:border-emerald-400/40 dark:bg-emerald-900/30 dark:text-emerald-100"
                >
                  <Typography component="p" variant="body2">
                    No escalations pending. Keep monitoring partner feedback loops.
                  </Typography>
                </Box>
              ) : (
                alerts.map((alert) => (
                  <Box key={alert.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/40 dark:bg-amber-900/30">
                    <Typography variant="subtitle1" className="font-semibold">
                      {alert.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {alert.detail}
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Card role="region" aria-labelledby="partner-updates-title" className="rounded-3xl border border-slate-200 shadow-sm">
        <CardContent className="space-y-3">
          <Typography id="partner-updates-title" variant="h5" component="h2">
            Partner coordination timeline
          </Typography>
          <Divider />
          <List dense disablePadding>
            <ListItem>
              <ListItemText primary="Monday" secondary="Sync with Riverstone Partners on import QA" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Wednesday" secondary="Office hours with learner cohort" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Friday" secondary="Prepare readiness recap for sponsor" />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdvisorConsole;
