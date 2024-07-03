import request from 'supertest';
import app from '../app';

describe('GET /status', () => {
  it('should return status 200 and correct response', async () => {
    const response = await request(app).get('/status');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('redis');
    expect(response.body).toHaveProperty('db');
  });
});

describe('GET /stats', () => {
  it('should return status 200 and correct response', async () => {
    const response = await request(app).get('/stats');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('users');
    expect(response.body).toHaveProperty('files');
  });
});