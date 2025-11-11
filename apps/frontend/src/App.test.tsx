import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { store } from './store/store';
import { createQueryClient } from './api/queryClient';

const renderApp = (initialRoute = '/') => {
  const queryClient = createQueryClient();

describe('App routing and layout', () => {
  it('renders the learner dashboard within the layout shell and fetches health status', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/learners/dashboard']}>
          <App />
        </MemoryRouter>
      </Provider>
    );

    expect(
      await screen.findByRole('heading', {
        name: /personalized SkillForge plan/i
      })
    ).toBeInTheDocument();

    expect(
      await screen.findByRole('navigation', {
        name: /primary/i
      })
    ).toBeInTheDocument();

    await waitFor(() => expect(api.fetchHealth).toHaveBeenCalled());
  });
});
