import type { Preview } from "@storybook/react";
import "../src/styles/tailwind.css";
import { initializeAnalyticsDecorator } from "../src/analytics/storybookAnalytics";
import { initializeMockServiceWorker } from "../src/mocks/browser";

void initializeMockServiceWorker();

const preview: Preview = {
  decorators: [initializeAnalyticsDecorator],
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    a11y: {
      element: "#root",
      config: {
        rules: [
          {
            id: "color-contrast",
            reviewOnFail: true
          }
        ]
      },
      options: {
        restoreScroll: true
      }
    },
    viewport: {
      viewports: {
        desktop: {
          name: "1440px Desktop",
          styles: {
            width: "1440px",
            height: "900px"
          }
        }
      }
    }
  }
};

export default preview;
