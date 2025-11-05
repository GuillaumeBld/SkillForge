import { useMemo } from "react";
import {
  Box,
  Button,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography
} from "@mui/material";
import { trackEvent, ANALYTICS_EVENTS, type Persona } from "../analytics/events";

export interface OnboardingProgressCardProps {
  steps: string[];
  currentStepIndex: number;
  persona: Persona;
  onContinue?: () => void;
  onSaveExit?: () => void;
}

const STEP_ANNOUNCER_ID = "onboarding-step-announcer";

export const OnboardingProgressCard = ({
  steps,
  currentStepIndex,
  persona,
  onContinue,
  onSaveExit
}: OnboardingProgressCardProps) => {
  const currentStep = steps[currentStepIndex] ?? "";

  const progressMessage = useMemo(
    () => `Step ${currentStepIndex + 1} of ${steps.length}: ${currentStep}`,
    [currentStep, currentStepIndex, steps]
  );

  const handleContinue = () => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.onboardingStepViewed,
      persona,
      contextPage: "/onboarding",
      step: currentStep,
      stepIndex: currentStepIndex
    });
    onContinue?.();
  };

  const handleSaveExit = () => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.onboardingCompleted,
      persona,
      contextPage: "/onboarding",
      status: "paused"
    });
    onSaveExit?.();
  };

  return (
    <Paper
      elevation={3}
      className="p-8 rounded-3xl shadow-xl bg-white"
      role="group"
      aria-labelledby="onboarding-progress-title"
    >
      <Typography id="onboarding-progress-title" variant="h5" component="h2" gutterBottom>
        Complete your onboarding
      </Typography>
      <Typography id={STEP_ANNOUNCER_ID} className="sr-only" aria-live="polite">
        {progressMessage}
      </Typography>
      <Stepper activeStep={currentStepIndex} alternativeLabel sx={{ mt: 4, mb: 6 }}>
        {steps.map((label) => (
          <Step key={label} aria-label={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box className="flex flex-col gap-3 sm:flex-row sm:items-center" aria-describedby={STEP_ANNOUNCER_ID}>
        <Button variant="contained" color="primary" onClick={handleContinue}>
          Continue
        </Button>
        <Button variant="text" onClick={handleSaveExit}>
          Save &amp; Exit
        </Button>
        <Typography variant="body2" color="text.secondary">
          Progress autosaves. Use the skip link to bypass repeated sections.
        </Typography>
      </Box>
    </Paper>
  );
};
