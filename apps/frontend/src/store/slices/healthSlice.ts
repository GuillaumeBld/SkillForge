import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { paths } from '@skillforge/shared';

type HealthResponse = paths['/api/v1/health']['get']['responses']['200']['content']['application/json'];

type HealthState = {
  lastChecked?: string;
  status?: HealthResponse['status'];
};

const initialState: HealthState = {};

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    setHealth(state, action: PayloadAction<HealthResponse>) {
      state.status = action.payload.status;
      state.lastChecked = action.payload.timestamp;
    }
  }
});

export const { setHealth } = healthSlice.actions;
export const healthReducer = healthSlice.reducer;
