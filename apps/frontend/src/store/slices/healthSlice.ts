import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { paths } from '@skillforge/shared';

type HealthResponse = paths['/api/v1/health']['get']['responses']['200']['content']['application/json'];

export type HealthState = {
  lastChecked?: string;
  status?: HealthResponse['status'];
  error?: string;
};

const initialState: HealthState = {};

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    setHealth(state, action: PayloadAction<HealthResponse>) {
      state.status = action.payload.status;
      state.lastChecked = action.payload.timestamp;
      state.error = undefined;
    },
    setHealthError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.status = undefined;
      state.lastChecked = undefined;
    }
  }
});

export const { setHealth, setHealthError } = healthSlice.actions;
export const healthReducer = healthSlice.reducer;
