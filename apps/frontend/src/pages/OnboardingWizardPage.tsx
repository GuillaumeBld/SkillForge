import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { OnboardingProgressCard } from '../components/OnboardingProgressCard';
import {
  useAssessmentsQuery,
  useCreateUserMutation,
  useResumeStatusQuery,
  useUploadResumeMutation
} from '../api/hooks';

const DEMO_USER_ID = 'demo-user';
const DEMO_RESUME_ID = 'resume-123';

const ONBOARDING_STEPS = ['Create profile', 'Assess skills', 'Select goals', 'Confirm plan'];

const mapIngestionStateToIndex = (state?: string) => {
  switch (state) {
    case 'queued':
      return 0;
    case 'processing':
      return 1;
    case 'completed':
      return 3;
    case 'failed':
      return 1;
    default:
      return 0;
  }
};

export const OnboardingWizardPage = () => {
  const [inviteCode] = useState<string | undefined>('WELCOME2025');
  const [persona] = useState<'student' | 'career_changer'>('student');

  const resumeStatus = useResumeStatusQuery(DEMO_USER_ID, DEMO_RESUME_ID, false, true);
  const assessmentsQuery = useAssessmentsQuery(DEMO_USER_ID, { limit: 5 });
  const createUser = useCreateUserMutation();
  const uploadResume = useUploadResumeMutation(DEMO_USER_ID);

  const currentStepIndex = useMemo(
    () => mapIngestionStateToIndex(resumeStatus.data?.ingestion_state),
    [resumeStatus.data?.ingestion_state]
  );

  const handleCreateProfile = async () => {
    try {
      await createUser.mutateAsync({
        payload: {
          first_name: 'Demo',
          last_name: 'Learner',
          email: 'demo.learner@example.com',
          goals: ['career_transition'],
          marketing_opt_in: true
        },
        inviteCode
      });
    } catch (error) {
      console.warn('Create user failed', error);
    }
  };

  const handleResumeUpload = async () => {
    const blob = new Blob(['Demo resume content'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'resume.txt');
    formData.append('source', 'uploaded');
    try {
      await uploadResume.mutateAsync(formData);
      void resumeStatus.refetch();
    } catch (error) {
      console.warn('Resume upload failed', error);
    }
  };

  return (
    <Stack spacing={4} data-page="onboarding-wizard">
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Onboarding wizard
        </Typography>
        <Typography color="text.secondary">
          Guided flow for new learners. Progress and resume ingestion status map to the onboarding sequences described
          in docs/SEQUENCES.md.
        </Typography>
      </Box>

      {resumeStatus.isLoading ? (
        <Skeleton variant="rounded" height={220} animation="wave" />
      ) : (
        <OnboardingProgressCard
          steps={ONBOARDING_STEPS}
          currentStepIndex={currentStepIndex}
          persona={persona}
          onContinue={() => resumeStatus.refetch()}
          onSaveExit={() => undefined}
        />
      )}

      {resumeStatus.isError ? (
        <Alert severity="warning" role="alert">
          {resumeStatus.error?.message ?? 'Unable to determine resume status. Please retry.'}
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Button
          variant="contained"
          onClick={handleCreateProfile}
          disabled={createUser.isPending}
          aria-live="polite"
        >
          {createUser.isPending ? 'Creating profile…' : 'Re-run profile creation'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleResumeUpload}
          disabled={uploadResume.isPending}
          aria-live="polite"
        >
          {uploadResume.isPending ? 'Uploading resume…' : 'Upload latest resume'}
        </Button>
      </Stack>

      <Stack spacing={2}>
        <Typography variant="h5" component="h2">
          Assessment queue
        </Typography>
        {assessmentsQuery.isLoading ? (
          <Skeleton variant="rounded" height={160} animation="wave" />
        ) : (
          <Stack component="ul" spacing={1} sx={{ listStyle: 'none', pl: 0 }} aria-live="polite">
            {assessmentsQuery.data?.pages
              .flatMap((page) => page.results)
              .map((assessment) => (
                <Box
                  key={assessment.assessment_id}
                  component="li"
                  sx={{
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 2
                  }}
                >
                  <Typography variant="body1" fontWeight={600}>
                    {assessment.template_id ?? 'SkillForge assessment'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {assessment.status}
                  </Typography>
                </Box>
              ))}
          </Stack>
        )}
        {assessmentsQuery.isError ? (
          <Alert severity="warning" role="alert">
            {assessmentsQuery.error?.message ?? 'Unable to load assessments.'}
          </Alert>
        ) : null}
      </Stack>
    </Stack>
  );
};
