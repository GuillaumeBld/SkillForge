import request from 'supertest';
import app from './index';

describe('GET /api/v1/health', () => {
  it('returns service status payload', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(typeof response.body.timestamp).toBe('string');
  });
});
