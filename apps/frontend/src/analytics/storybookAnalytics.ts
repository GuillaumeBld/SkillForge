import type { Decorator } from "@storybook/react";
import { registerAnalyticsEmitter, trackEvent } from "./events";

type StorybookAnalyticsChannel = "console" | "storybook";

declare global {
  interface Window {
    __STORYBOOK_ANALYTICS_CHANNEL__?: StorybookAnalyticsChannel;
  }
}

const resolveChannel = (): StorybookAnalyticsChannel => {
  if (typeof window !== "undefined" && window.__STORYBOOK_ANALYTICS_CHANNEL__) {
    return window.__STORYBOOK_ANALYTICS_CHANNEL__;
  }
  return "console";
};

const createEmitter = () => {
  const channel = resolveChannel();
  if (channel === "storybook") {
    return (payload: unknown) => window.parent?.postMessage({
      source: "skillforge-storybook-analytics",
      payload
    });
  }
  return (payload: unknown) => {
    // eslint-disable-next-line no-console
    console.info("[Analytics]", payload);
  };
};

registerAnalyticsEmitter(createEmitter());

export const initializeAnalyticsDecorator: Decorator = (Story, context) => {
  trackEvent({
    eventName: "storybook_story_viewed",
    contextPage: context.id,
    persona: "student"
  });

  return Story(context);
};
