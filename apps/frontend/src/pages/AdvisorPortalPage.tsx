import { useCallback } from 'react';
import { Alert, Box, Skeleton, Stack, Typography } from '@mui/material';
import { AdvisorRosterTable } from '../components/AdvisorRosterTable';
import { usePartnerAssessmentMutation, useCandidateMatchesQuery } from '../api/hooks';

const DEMO_CANDIDATE_ID = 'candidate-001';

export const AdvisorPortalPage = () => {
  const matchesQuery = useCandidateMatchesQuery(DEMO_CANDIDATE_ID, {
    type: 'jobs',
    limit: 10,
    includePartnerTags: true
  });

  const assignAssessment = usePartnerAssessmentMutation();

  const rows =
    matchesQuery.data?.pages
      .flatMap((page) => page.results)
      .map((match, index) => ({
        id: match.id,
        name: match.title,
        readiness: Math.round(match.match_score),
        lastLogin: `${index + 1} day${index === 0 ? '' : 's'} ago`,
        interventions: match.partner_tags?.length ?? 0
      })) ?? [];

  const handleAssignAssessment = useCallback(
    (ids: string[]) => {
      if (!ids.length) {
        return;
      }
      assignAssessment.mutate({
        candidate_id: DEMO_CANDIDATE_ID,
        assessment_template_id: 'advisor-default',
        delivery_mode: 'asynchronous',
        notify_candidate: true
      });
    },
    [assignAssessment]
  );

  const handleAddNote = useCallback((id: string) => {
    console.info('Add note for candidate', id);
  }, []);

  return (
    <Stack spacing={4} data-page="advisor-portal">
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Advisor roster
        </Typography>
        <Typography color="text.secondary">
          Partner matches drive readiness and intervention counts. Optimistic updates on row interactions keep the cohort view
          responsive.
        </Typography>
      </Box>

      {matchesQuery.isLoading ? (
        <Skeleton variant="rounded" height={320} animation="wave" />
      ) : (
        <AdvisorRosterTable rows={rows} onAssignAssessment={handleAssignAssessment} onAddNote={handleAddNote} />
      )}

      {matchesQuery.isError ? (
        <Alert severity="warning">{matchesQuery.error?.message ?? 'Unable to load roster.'}</Alert>
      ) : null}
    </Stack>
  );
};
