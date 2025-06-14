const request = require('supertest');
const app = require('../app');
const agent = request.agent(app);

beforeAll(async () => {
  await agent.post('/login').send({});
});

describe('GET /location/:locationId', () => {
  it('should return location page for existing location', async () => {
    const locationId = 'loc-samplelocation';
    const response = await agent.get(`/location/${locationId}`);
    expect(response.statusCode).toBe(200);
    expect(response.text).toMatch(/みんなのいえ/);
  });

  it('should return 404 for non existing location', async () => {
    const locationId = 'nonexistloc';
    const response = await agent.get(`/location/${locationId}`);
    expect(response.statusCode).toBe(404);
  });
});