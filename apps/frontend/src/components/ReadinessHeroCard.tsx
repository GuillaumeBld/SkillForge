import { Card, CardContent, Chip, Typography, LinearProgress, Box } from "@mui/material";
import clsx from "clsx";
import { ANALYTICS_EVENTS, trackEvent, type Persona } from "../analytics/events";

export interface ReadinessHeroCardProps {
  persona: Persona;
  readinessScore: number;
  previousScore: number;
  goalsCompleted: number;
  totalGoals: number;
}

export const ReadinessHeroCard = ({
  persona,
  readinessScore,
  previousScore,
  goalsCompleted,
  totalGoals
}: ReadinessHeroCardProps) => {
  const delta = readinessScore - previousScore;
  const hasImproved = delta >= 0;
  const completionPercent = totalGoals === 0 ? 0 : Math.round((goalsCompleted / totalGoals) * 100);

  const handleLinkFocus = () => {
    trackEvent({
      eventName: ANALYTICS_EVENTS.sessionStarted,
      persona,
      contextPage: "/dashboard",
      readinessScore,
      previousScore
    });
  };

  return (
    <Card
      className={clsx("bg-primary-50 border border-primary-100", "rounded-2xl shadow-md focus-within:ring-2 focus-within:ring-primary-500")}
      role="region"
      aria-label="Readiness overview"
    >
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Box className="flex flex-col gap-2">
          <Typography variant="h4" component="p">
            Readiness score: {readinessScore}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {hasImproved ? "Improved" : "Changed"} {Math.abs(delta)} points since last assessment.
          </Typography>
          <Chip
            label={`${completionPercent}% action plan completion`}
            color="primary"
            variant="outlined"
            role="status"
            aria-live="polite"
          />
        </Box>
        <Box className="flex-1 max-w-md" aria-live="polite" aria-label="Action plan progress">
          <Typography id="plan-progress-label" variant="subtitle2" gutterBottom>
            Plan progress
          </Typography>
          <LinearProgress
            value={completionPercent}
            variant="determinate"
            aria-labelledby="plan-progress-label"
            sx={{ height: 12, borderRadius: 9999 }}
          />
          <Typography variant="caption" color="text.secondary">
            {goalsCompleted} of {totalGoals} goals completed
          </Typography>
        </Box>
        <a
          href="#advisor-support"
          onFocus={handleLinkFocus}
          className="text-primary-700 underline decoration-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Connect with your advisor
        </a>
      </CardContent>
    </Card>
  );
};
