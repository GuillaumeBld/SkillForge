import { Alert, Card, CardActions, CardContent, Stack, Typography, Button } from '@mui/material';
import {
  useBatchAssessmentMutation,
  useBulkUserImportMutation,
  useCandidateImportMutation,
  useJobSyncMutation,
  usePlacementOutcomeMutation,
  useQuickVerifyMutation,
  useRecordPlacementMutation,
  useRegisterCandidateMutation
} from '../api/hooks';

export const PartnerAutomationPage = () => {
  const importCandidates = useCandidateImportMutation();
  const bulkUsers = useBulkUserImportMutation();
  const registerCandidate = useRegisterCandidateMutation();
  const batchAssessments = useBatchAssessmentMutation();
  const quickVerify = useQuickVerifyMutation();
  const jobSync = useJobSyncMutation();
  const recordPlacement = useRecordPlacementMutation();
  const placementOutcome = usePlacementOutcomeMutation();

  const handleCandidateImport = () => {
    importCandidates.mutate({
      batch_id: 'batch-demo',
      webhook_url: 'https://partner.skillforge.test/webhooks/import',
      candidates: [
        {
          external_id: 'cand-001',
          name: 'Taylor Smith',
          email: 'taylor.smith@example.com',
          resume_url: 'https://example.com/resume.pdf',
          metadata: { cohort: 'spring' }
        }
      ]
    });
  };

  const handleBulkUsers = () => {
    bulkUsers.mutate({
      partner_id: 'partner-001',
      environment: 'sandbox',
      users: [
        {
          external_id: 'learner-01',
          first_name: 'Jordan',
          last_name: 'Lee',
          email: 'jordan.lee@example.com',
          cohort: 'spring'
        }
      ]
    });
  };

  const handleRegisterCandidate = () => {
    registerCandidate.mutate({
      external_id: 'cand-002',
      name: 'Morgan Rivera',
      email: 'morgan.rivera@example.com',
      partner_tags: ['priority']
    });
  };

  const handleBatchAssessments = () => {
    batchAssessments.mutate({
      cohort_id: 'cohort-2025',
      assessment_template_id: 'assessment-template',
      candidate_ids: ['cand-001', 'cand-002'],
      window_start: new Date().toISOString()
    });
  };

  const handleQuickVerify = () => {
    quickVerify.mutate({
      candidate_id: 'cand-001',
      assessment_template_id: 'quick-verify',
      mode: 'async'
    });
  };

  const handleJobSync = () => {
    jobSync.mutate({
      partner_id: 'partner-001',
      jobs: [
        {
          job_id: 'job-001',
          title: 'Data Analyst',
          location: 'Remote'
        }
      ]
    });
  };

  const handleRecordPlacement = () => {
    recordPlacement.mutate({
      candidate_id: 'cand-001',
      job_id: 'job-001',
      employer_name: 'Fictional Corp',
      placement_date: new Date().toISOString(),
      employment_type: 'full_time'
    });
  };

  const handlePlacementOutcome = () => {
    placementOutcome.mutate({
      placement_id: 'placement-001',
      outcome: 'retained'
    });
  };

  return (
    <Stack spacing={4} data-page="partner-automation">
      <Typography variant="h4" component="h1">
        Partner automation controls
      </Typography>
      <Typography color="text.secondary">
        Each action mirrors the automation timeline described in the partner bulk import sequence with exponential backoff.
      </Typography>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} flexWrap="wrap">
        <AutomationCard
          title="Candidate import"
          description="Queue resume parsing for partner cohorts."
          onAction={handleCandidateImport}
          isPending={importCandidates.isPending}
          error={importCandidates.error?.message}
        />
        <AutomationCard
          title="Bulk user import"
          description="Provision learner accounts via partner feed."
          onAction={handleBulkUsers}
          isPending={bulkUsers.isPending}
          error={bulkUsers.error?.message}
        />
        <AutomationCard
          title="Register candidate"
          description="Register a single candidate and return onboarding links."
          onAction={handleRegisterCandidate}
          isPending={registerCandidate.isPending}
          error={registerCandidate.error?.message}
        />
        <AutomationCard
          title="Batch assessments"
          description="Assign assessments to a full cohort."
          onAction={handleBatchAssessments}
          isPending={batchAssessments.isPending}
          error={batchAssessments.error?.message}
        />
        <AutomationCard
          title="Quick verify"
          description="Launch a verification assessment."
          onAction={handleQuickVerify}
          isPending={quickVerify.isPending}
          error={quickVerify.error?.message}
        />
        <AutomationCard
          title="Job sync"
          description="Sync the latest requisitions from partner ATS feeds."
          onAction={handleJobSync}
          isPending={jobSync.isPending}
          error={jobSync.error?.message}
        />
        <AutomationCard
          title="Record placement"
          description="Capture a placement for reporting."
          onAction={handleRecordPlacement}
          isPending={recordPlacement.isPending}
          error={recordPlacement.error?.message}
        />
        <AutomationCard
          title="Update placement outcome"
          description="Refresh placement disposition after QA review."
          onAction={handlePlacementOutcome}
          isPending={placementOutcome.isPending}
          error={placementOutcome.error?.message}
        />
      </Stack>
    </Stack>
  );
};

type AutomationCardProps = {
  title: string;
  description: string;
  onAction: () => void;
  isPending: boolean;
  error?: string;
};

const AutomationCard = ({ title, description, onAction, isPending, error }: AutomationCardProps) => (
  <Card sx={{ flex: 1, minWidth: 280 }}>
    <CardContent>
      <Typography variant="h6" component="h3">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </CardContent>
    <CardActions>
      <Button variant="contained" onClick={onAction} disabled={isPending} aria-live="polite">
        {isPending ? 'Processing…' : 'Run action'}
      </Button>
    </CardActions>
    {error ? <Alert severity="warning">{error}</Alert> : null}
  </Card>
);
