const request = require('supertest');
const app = require('../app');
const agent = request.agent(app);

beforeAll(async () => {
  // モックでログイン状態にするための処理、ユーザ登録APIなどを使うか直接セッションCookieセット
  await agent.post('/login').send({ /* 必要な認証情報 */ });
});




describe('GET /', () => {
  it('should return 200 OK', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toMatch(/Silent/i);
  });
});
