import {
  Alert,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { ReadinessHeroCard } from '../components/ReadinessHeroCard';
import {
  useDashboardQuery,
  useMatchRecommendations,
  useNotificationsQuery
} from '../api/hooks';

const DEMO_USER_ID = 'demo-user';

const defaultReadiness = {
  readinessScore: 62,
  previousScore: 55,
  goalsCompleted: 4,
  totalGoals: 7
};

export const StudentDashboardPage = () => {
  const dashboardQuery = useDashboardQuery(DEMO_USER_ID, {
    sections: 'readiness,action_plan',
    refresh: false
  });

  const matchesQuery = useMatchRecommendations(DEMO_USER_ID, {
    type: 'jobs',
    limit: 5
  });

  const notificationsQuery = useNotificationsQuery(DEMO_USER_ID, {
    status: 'unread',
    limit: 3
  });

  const readinessSection = dashboardQuery.data?.sections?.readiness as
    | Partial<typeof defaultReadiness>
    | undefined;

  const readiness = {
    readinessScore: readinessSection?.readinessScore ?? defaultReadiness.readinessScore,
    previousScore: readinessSection?.previousScore ?? defaultReadiness.previousScore,
    goalsCompleted: readinessSection?.goalsCompleted ?? defaultReadiness.goalsCompleted,
    totalGoals: readinessSection?.totalGoals ?? defaultReadiness.totalGoals
  };

  const matches = matchesQuery.data?.pages.flatMap((page) => page.results) ?? [];
  const notifications = notificationsQuery.data?.pages.flatMap((page) => page.notifications) ?? [];

  return (
    <Stack spacing={4} data-page="student-dashboard">
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Student dashboard
        </Typography>
        <Typography color="text.secondary">
          Recommendations and notifications refresh using the retry cadence outlined in the assessment scoring sequence.
        </Typography>
      </Box>

      {dashboardQuery.isLoading ? (
        <Skeleton variant="rounded" height={180} animation="wave" />
      ) : (
        <ReadinessHeroCard
          persona="student"
          readinessScore={readiness.readinessScore}
          previousScore={readiness.previousScore}
          goalsCompleted={readiness.goalsCompleted}
          totalGoals={readiness.totalGoals}
        />
      )}

      {dashboardQuery.isError ? (
        <Alert severity="warning">{dashboardQuery.error?.message ?? 'Unable to load readiness data.'}</Alert>
      ) : null}

      <Stack spacing={2}>
        <Typography variant="h5" component="h2">
          Career matches
        </Typography>
        {matchesQuery.isLoading ? (
          <Skeleton variant="rounded" height={220} animation="wave" />
        ) : (
          <List disablePadding aria-live="polite">
            {matches.map((match) => (
              <ListItem key={match.id} divider>
                <ListItemText
                  primary={match.title}
                  secondary={`Match score: ${Math.round(match.match_score)}%`}
                />
                {match.partner_tags?.slice(0, 2).map((tag) => (
                  <Chip key={tag} label={tag} color="primary" sx={{ ml: 1 }} />
                ))}
              </ListItem>
            ))}
          </List>
        )}
        {matchesQuery.isError ? (
          <Alert severity="warning">{matchesQuery.error?.message ?? 'Unable to load matches.'}</Alert>
        ) : null}
      </Stack>

      <Stack spacing={2}>
        <Typography variant="h5" component="h2">
          Notifications
        </Typography>
        {notificationsQuery.isLoading ? (
          <Skeleton variant="rounded" height={160} animation="wave" />
        ) : notifications.length > 0 ? (
          <List disablePadding>
            {notifications.map((notification) => (
              <ListItem key={notification.id} divider>
                <ListItemText
                  primary={notification.message}
                  secondary={new Date(notification.delivered_at).toLocaleString()}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">You are all caught up!</Typography>
        )}
        {notificationsQuery.isError ? (
          <Alert severity="warning">
            {notificationsQuery.error?.message ?? 'Unable to load notifications.'}
          </Alert>
        ) : null}
      </Stack>
    </Stack>
  );
};
