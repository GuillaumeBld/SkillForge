import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { store } from './store/store';
import * as api from './api/client';

vi.mock('./api/client', () => ({
  fetchHealth: vi.fn(() => Promise.resolve({ status: 'ok', timestamp: new Date().toISOString() }))
}));

describe('App', () => {
  it('renders the SkillForge shell header', async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(await screen.findByText(/SkillForge Platform Shell/)).toBeInTheDocument();
    expect(api.fetchHealth).toHaveBeenCalled();
  });
});
