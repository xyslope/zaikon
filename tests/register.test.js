const request = require('supertest');
const app = require('../app');
const agent = request.agent(app);

beforeAll(async () => {
  // モックでログイン状態にするための処理、ユーザ登録APIなどを使うか直接セッションCookieセット
  await agent.post('/login').send({ /* 必要な認証情報 */ });
});



describe('POST /register', () => {

  it('should register new user with valid data', async () => {
    const userData = {
      user_name: 'Test User',
      email: `testuser${Date.now()}@example.com`,
      user_description: 'Test description'
    };

    const response = await request(app)
      .post('/register')
      .send(userData);

    expect(response.statusCode).toBeGreaterThanOrEqual(300);
    expect([302, 303]).toContain(response.statusCode); // リダイレクト期待
    expect(response.headers.location).toMatch(/^\/user\/usr_/);
  });

});