import type { Meta, StoryObj } from "@storybook/react";
import { OnboardingProgressCard } from "../components/OnboardingProgressCard";

const meta: Meta<typeof OnboardingProgressCard> = {
  title: "Onboarding/ProgressCard",
  component: OnboardingProgressCard,
  parameters: {
    docs: {
      description: {
        component:
          "Accessible onboarding stepper for students and career changers. Emits analytics defined in docs/ANALYTICS.md."
      }
    },
    a11y: {
      config: {
        rules: [{ id: "aria-required-attr", enabled: true }]
      }
    }
  },
  args: {
    steps: ["Create profile", "Assess skills", "Select goals", "Confirm plan"],
    currentStepIndex: 1,
    persona: "student"
  }
};

export default meta;

type Story = StoryObj<typeof OnboardingProgressCard>;

export const Default: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    canvasElement.setAttribute("data-analytics-context", "onboarding-progress-card");
  }
};

export const CareerChanger: Story = {
  args: {
    persona: "career_changer",
    currentStepIndex: 2
  }
};
