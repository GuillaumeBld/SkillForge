import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest';
import App from './App';
import { store } from './store/store';
import * as api from './api/client';
import { ANALYTICS_EVENTS } from './analytics/events';
import * as analytics from './analytics/events';

vi.mock('./api/client', () => ({
  fetchHealth: vi.fn(() => Promise.resolve({ status: 'ok', timestamp: new Date().toISOString() }))
}));

const renderAppAt = (initialEntry: string) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </Provider>
  );

const trackEventSpy = vi.spyOn(analytics, 'trackEvent');

beforeEach(() => {
  vi.clearAllMocks();
  trackEventSpy.mockClear();
});

afterAll(() => {
  trackEventSpy.mockRestore();
});

describe('App persona journeys', () => {
  it('renders an accessible learner dashboard experience and emits analytics for key interactions', async () => {
    renderAppAt('/learners/dashboard');

    expect(await screen.findByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        name: /personalized SkillForge plan/i
      })
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(trackEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: ANALYTICS_EVENTS.learnerDashboardViewed,
          persona: 'student',
          contextPage: '/learners/dashboard'
        })
      )
    );

    const recommendedActions = await screen.findAllByRole('button', { name: /view details/i });
    expect(recommendedActions.length).toBeGreaterThan(0);

    const user = userEvent.setup();
    await user.click(recommendedActions[0]);

    await waitFor(() =>
      expect(trackEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: ANALYTICS_EVENTS.careerMatchViewed,
          persona: 'student',
          recommendationId: expect.any(String)
        })
      )
    );

    await waitFor(() => expect(api.fetchHealth).toHaveBeenCalled());
  });

  it('surfaces advisor roster data with actionable controls and analytics coverage', async () => {
    renderAppAt('/advisors/console');

    expect(
      await screen.findByRole('heading', { name: /cohort readiness and intervention management/i })
    ).toBeInTheDocument();

    const rosterRegion = screen.getByRole('region', { name: /advisee roster/i });
    expect(within(rosterRegion).getByText(/ava chen/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(trackEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: ANALYTICS_EVENTS.advisorConsoleViewed,
          persona: 'advisor',
          contextPage: '/advisors/console'
        })
      )
    );

    const user = userEvent.setup();
    const assignButtons = within(rosterRegion).getAllByRole('button', { name: /assign assessment/i });
    await user.click(assignButtons[0]);

    await waitFor(() =>
      expect(trackEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: ANALYTICS_EVENTS.cohortAssessmentAssigned,
          contextPage: '/advisors/console'
        })
      )
    );
  });

  it('displays partner onboarding integrations and logs enablement analytics', async () => {
    renderAppAt('/partners/onboarding');

    expect(
      await screen.findByRole('heading', { name: /partner onboarding checklist/i })
    ).toBeInTheDocument();

    const integrationRegion = screen.getByRole('region', { name: /integration readiness/i });
    expect(within(integrationRegion).getByText(/Single Sign-On/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(trackEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: ANALYTICS_EVENTS.partnerOnboardingViewed,
          persona: 'partner_admin',
          contextPage: '/partners/onboarding'
        })
      )
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /download enablement kit/i }));

    await waitFor(() =>
      expect(trackEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: ANALYTICS_EVENTS.partnerImportUploaded,
          action: 'download_enablement_kit'
        })
      )
    );
  });

  it('keeps marketing landing CTAs accessible while validating analytics funnels', async () => {
    renderAppAt('/marketing/landing');

    expect(
      await screen.findByRole('heading', { name: /skillforge accelerates outcomes/i })
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(trackEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: ANALYTICS_EVENTS.marketingLandingViewed,
          persona: 'marketing',
          contextPage: '/marketing/landing'
        })
      )
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /request a demo/i }));

    await waitFor(() =>
      expect(trackEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: ANALYTICS_EVENTS.sessionStarted,
          cta: 'request_demo'
        })
      )
    );
  });
});
