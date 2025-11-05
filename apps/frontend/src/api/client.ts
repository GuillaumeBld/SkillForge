import axios from 'axios';
import type { paths } from '@skillforge/shared';

type HealthResponse = paths['/api/v1/health']['get']['responses']['200']['content']['application/json'];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
});

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/api/v1/health');
  return response.data;
}
