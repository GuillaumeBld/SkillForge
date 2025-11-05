import type { Meta, StoryObj } from "@storybook/react";
import { AdvisorRosterTable } from "../components/AdvisorRosterTable";

const meta: Meta<typeof AdvisorRosterTable> = {
  title: "Advisor/RosterTable",
  component: AdvisorRosterTable,
  parameters: {
    docs: {
      description: {
        component:
          "Advisor cohort table with quick interventions. Bulk actions should emit analytics for cohort management per docs/ANALYTICS.md."
      }
    }
  },
  args: {
    rows: [
      { id: "1", name: "Maya Patel", readiness: 62, lastLogin: "2 days ago", interventions: 3 },
      { id: "2", name: "James Lee", readiness: 74, lastLogin: "1 day ago", interventions: 1 },
      { id: "3", name: "Alicia Gomez", readiness: 88, lastLogin: "4 hours ago", interventions: 5 }
    ]
  }
};

export default meta;

type Story = StoryObj<typeof AdvisorRosterTable>;

export const Default: Story = {};
