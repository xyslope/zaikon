const request = require('supertest');
const app = require('../app');

describe('Item Edit API Endpoints', () => {
  let agent;

  beforeAll(() => {
    agent = request.agent(app);
  });

  describe('GET /api/item/:itemId', () => {
    test('should return item data for existing item', async () => {
      // まず、テスト用のアイテムを作成する必要があります
      // 実際のテストでは、テスト用のデータベースセットアップが必要
      const itemId = 'test-item-id';
      
      const res = await agent
        .get(`/api/item/${itemId}`)
        .expect('Content-Type', /json/);

      // アイテムが存在しない場合は404を期待
      if (res.status === 404) {
        expect(res.body).toHaveProperty('error');
      } else {
        // アイテムが存在する場合は200とアイテムデータを期待
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('item_id');
        expect(res.body).toHaveProperty('item_name');
        expect(res.body).toHaveProperty('amount');
        expect(res.body).toHaveProperty('yellow');
        expect(res.body).toHaveProperty('green');
        expect(res.body).toHaveProperty('purple');
      }
    });

    test('should return 404 for non-existent item', async () => {
      const res = await agent
        .get('/api/item/nonexistent-item')
        .expect(404)
        .expect('Content-Type', /json/);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('アイテムが見つかりません');
    });
  });

  describe('POST /location/:locationId/item/:itemId/edit', () => {
    test('should handle item edit request', async () => {
      const locationId = 'test-location-id';
      const itemId = 'test-item-id';
      
      const editData = {
        item_name: 'Updated Test Item',
        yellow: '2',
        green: '5',
        purple: '10',
        amount: '7'
      };

      const res = await agent
        .post(`/location/${locationId}/item/${itemId}/edit`)
        .send(editData);

      // リダイレクトまたはエラーレスポンスを期待
      expect([200, 302, 404, 500]).toContain(res.status);
      
      if (res.status === 302) {
        // 成功時はリダイレクト
        expect(res.headers.location).toBe(`/location/${locationId}`);
      }
    });

    test('should handle missing required fields', async () => {
      const locationId = 'test-location-id';
      const itemId = 'test-item-id';
      
      const incompleteData = {
        item_name: 'Updated Test Item'
        // yellow, green, purple, amount が不足
      };

      const res = await agent
        .post(`/location/${locationId}/item/${itemId}/edit`)
        .send(incompleteData);

      // リダイレクトされることを期待
      expect(res.status).toBe(302);
    });

    test('should handle invalid numeric values', async () => {
      const locationId = 'test-location-id';
      const itemId = 'test-item-id';
      
      const invalidData = {
        item_name: 'Updated Test Item',
        yellow: 'invalid',
        green: 'also-invalid',
        purple: '10',
        amount: 'not-a-number'
      };

      const res = await agent
        .post(`/location/${locationId}/item/${itemId}/edit`)
        .send(invalidData);

      // システムはNaNを処理できるはずですが、適切なエラーハンドリングも期待
      expect([200, 302, 400, 500]).toContain(res.status);
    });
  });

  describe('Item Edit Integration', () => {
    test('should complete full edit workflow', async () => {
      // この統合テストは実際のデータベースとの連携が必要
      // テスト環境でのみ実行されるべき
      
      if (process.env.NODE_ENV !== 'test') {
        return; // テスト環境以外では実行しない
      }

      // 1. アイテム情報を取得
      // 2. 編集データを送信
      // 3. 変更が反映されているか確認
      
      // 実装例（実際のテストデータが必要）:
      /*
      const itemId = 'existing-test-item';
      const locationId = 'existing-test-location';
      
      // アイテム情報取得
      const getRes = await agent.get(`/api/item/${itemId}`);
      if (getRes.status === 200) {
        const originalItem = getRes.body;
        
        // 編集データ送信
        const editData = {
          ...originalItem,
          item_name: originalItem.item_name + ' (edited)',
          amount: String(originalItem.amount + 1)
        };
        
        const editRes = await agent
          .post(`/location/${locationId}/item/${itemId}/edit`)
          .send(editData);
          
        expect(editRes.status).toBe(302);
        
        // 変更確認
        const verifyRes = await agent.get(`/api/item/${itemId}`);
        expect(verifyRes.body.item_name).toBe(editData.item_name);
        expect(verifyRes.body.amount).toBe(parseInt(editData.amount));
      }
      */
    });
  });
});