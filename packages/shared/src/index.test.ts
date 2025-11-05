import { describe, expect, it } from 'vitest';
import type { paths } from './openapi-types';

describe('openapi types', () => {
  it('exposes health endpoint response structure', () => {
    type HealthResponse = paths['/api/v1/health']['get']['responses']['200']['content']['application/json'];
    const sample: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString()
    };

    expect(sample.status).toBe('ok');
  });
});
