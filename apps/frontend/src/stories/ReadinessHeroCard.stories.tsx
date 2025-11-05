import type { Meta, StoryObj } from "@storybook/react";
import { ReadinessHeroCard } from "../components/ReadinessHeroCard";

const meta: Meta<typeof ReadinessHeroCard> = {
  title: "Dashboard/ReadinessHeroCard",
  component: ReadinessHeroCard,
  parameters: {
    docs: {
      description: {
        component:
          "Hero module summarizing readiness and plan progress. Ensure textual equivalents accompany visual indicators per docs/ARCHITECTURE.md."
      }
    },
    layout: "centered"
  },
  args: {
    persona: "student",
    readinessScore: 78,
    previousScore: 65,
    goalsCompleted: 9,
    totalGoals: 12
  }
};

export default meta;

type Story = StoryObj<typeof ReadinessHeroCard>;

export const Default: Story = {};

export const AdvisorView: Story = {
  args: {
    persona: "advisor",
    readinessScore: 82,
    previousScore: 80,
    goalsCompleted: 15,
    totalGoals: 18
  }
};
