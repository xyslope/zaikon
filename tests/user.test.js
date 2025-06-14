const request = require('supertest');
const app = require('../app');

const agent = request.agent(app);

beforeAll(async () => {
  // モックでログイン状態にするための処理、ユーザ登録APIなどを使うか直接セッションCookieセット
  await agent.post('/login').send({ /* 必要な認証情報 */ });
});


describe('GET /user/:userId', () => {
  it('should return user dashboard page for existing user', async () => {
    // 既存のサンプルユーザidを利用
    const userId = 'user-sampleuser';
    const response = await request(app).get(`/user/${userId}`);
    expect(response.statusCode).toBe(200);
    expect(response.text).toMatch(/みんなのいえ/);
  });

  it('should return 404 for non existing user', async () => {
    const userId = 'nonexistuser';
    const response = await request(app).get(`/user/${userId}`);
    expect(response.statusCode).toBe(404);
  });
});