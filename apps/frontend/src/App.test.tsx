import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { store } from './store/store';
import { createQueryClient } from './api/queryClient';

const renderApp = (initialRoute = '/') => {
  const queryClient = createQueryClient();

  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
};

describe('App shell', () => {
  it('renders onboarding wizard by default', async () => {
    renderApp();

    expect(await screen.findByText(/Onboarding wizard/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('navigates to student dashboard route', async () => {
    renderApp('/dashboard');

    expect(await screen.findByRole('heading', { name: /Student dashboard/i })).toBeInTheDocument();
  });
});
