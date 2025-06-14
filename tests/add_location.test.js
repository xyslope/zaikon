const request = require('supertest');
const app = require('../app');
const agent = request.agent(app);

beforeAll(async () => {
  // モックでログイン状態にするための処理、ユーザ登録APIなどを使うか直接セッションCookieセット
  await agent.post('/login').send({ /* 必要な認証情報 */ });
});



describe('POST /user/:userId/add-location', () => {
  it('should add a new location and redirect for logged in user', async () => {
    // 新規作成なのでダミーのログインユーザsessionが必要
    // セッション設定をモックするか事前ログイン処理が必要（これは簡易例）
    const userId = 'user-sampleuser';
    const locationName = `Test Location ${Date.now()}`;

    // TODO: セッションのセットアップ必要—ここでは割愛します

    // 直接POSTリクエストを送るテスト
    const response = await request(app)
      .post(`/user/${userId}/add-location`)
      .send({ location_name: locationName });

    // リダイレクトが起きていることを期待
    expect(response.statusCode).toBeGreaterThanOrEqual(300);
    expect([302, 303]).toContain(response.statusCode);
    expect(response.headers.location).toBe(`/user/${userId}`);
  });
});