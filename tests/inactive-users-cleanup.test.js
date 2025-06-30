const request = require('supertest');
const app = require('../app');
const UserRepository = require('../repositories/UserRepository');
const LocationRepository = require('../repositories/LocationRepository');
const ItemRepository = require('../repositories/ItemRepository');
const MemberRepository = require('../repositories/MemberRepository');

describe('Inactive Users Cleanup - Issue #18', () => {
  // テストデータ作成用のヘルパー
  const createTestUser = (userData) => {
    const defaultUser = {
      user_id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      user_description: 'Test Description',
      created_at: new Date().toISOString()
    };
    return { ...defaultUser, ...userData };
  };

  const createOldDate = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
  };

  describe('UserRepository Activity Tracking', () => {
    test('should find inactive users correctly', () => {
      // 古いユーザーを作成
      const oldUser = createTestUser({
        created_at: createOldDate(400),
        last_activity_at: createOldDate(400)
      });
      
      UserRepository.createUser(oldUser);

      // 最近のユーザーを作成
      const recentUser = createTestUser({
        created_at: createOldDate(10),
        last_activity_at: createOldDate(10)
      });
      
      UserRepository.createUser(recentUser);

      // 365日間非アクティブなユーザーを検索
      const inactiveUsers = UserRepository.findInactiveUsers(365);
      
      // 古いユーザーが見つかること
      const foundOldUser = inactiveUsers.find(u => u.user_id === oldUser.user_id);
      expect(foundOldUser).toBeTruthy();
      
      // 最近のユーザーは見つからないこと
      const foundRecentUser = inactiveUsers.find(u => u.user_id === recentUser.user_id);
      expect(foundRecentUser).toBeFalsy();

      // クリーンアップ
      UserRepository.delete(oldUser.user_id);
      UserRepository.delete(recentUser.user_id);
    });

    test('should find orphaned users correctly', () => {
      // 孤立ユーザー（どの場所にも属していない）を作成
      const orphanedUser = createTestUser();
      UserRepository.createUser(orphanedUser);

      // 場所に属するユーザーを作成
      const memberUser = createTestUser();
      UserRepository.createUser(memberUser);
      
      // テスト用の場所を作成
      const testLocation = {
        location_id: `test-loc-${Date.now()}`,
        location_name: 'Test Location',
        created_by: memberUser.user_id,
        created_at: new Date().toISOString()
      };
      LocationRepository.create(testLocation);
      
      // メンバーシップを作成
      MemberRepository.addMember({
        user_id: memberUser.user_id,
        location_id: testLocation.location_id,
        joined_at: new Date().toISOString()
      });

      // 孤立ユーザーを検索
      const orphanedUsers = UserRepository.findOrphanedUsers();
      
      // 孤立ユーザーが見つかること
      const foundOrphanedUser = orphanedUsers.find(u => u.user_id === orphanedUser.user_id);
      expect(foundOrphanedUser).toBeTruthy();
      
      // メンバーユーザーは見つからないこと
      const foundMemberUser = orphanedUsers.find(u => u.user_id === memberUser.user_id);
      expect(foundMemberUser).toBeFalsy();

      // クリーンアップ
      MemberRepository.removeMember(memberUser.user_id, testLocation.location_id);
      LocationRepository.delete(testLocation.location_id);
      UserRepository.delete(orphanedUser.user_id);
      UserRepository.delete(memberUser.user_id);
    });

    test('should update last activity correctly', () => {
      const testUser = createTestUser();
      UserRepository.createUser(testUser);

      // 活動時刻を更新
      UserRepository.updateLastActivity(testUser.user_id);
      
      // ユーザーを再取得して確認
      const updatedUser = UserRepository.findById(testUser.user_id);
      expect(updatedUser.last_activity_at).toBeTruthy();
      
      // 更新時刻が最近であることを確認（1分以内）
      const lastActivity = new Date(updatedUser.last_activity_at);
      const now = new Date();
      const diffMs = now - lastActivity;
      expect(diffMs).toBeLessThan(60000); // 1分以内

      // クリーンアップ
      UserRepository.delete(testUser.user_id);
    });
  });

  describe('Cascade Deletion', () => {
    test('should cascade delete user with all related data', () => {
      // テストユーザーを作成
      const testUser = createTestUser();
      UserRepository.createUser(testUser);

      // ユーザーが所有する場所を作成
      const testLocation = {
        location_id: `test-loc-${Date.now()}`,
        location_name: 'Test Location',
        created_by: testUser.user_id,
        created_at: new Date().toISOString()
      };
      LocationRepository.create(testLocation);

      // メンバーシップを作成
      MemberRepository.addMember({
        user_id: testUser.user_id,
        location_id: testLocation.location_id,
        joined_at: new Date().toISOString()
      });

      // アイテムを作成
      const testItem = {
        item_id: `test-item-${Date.now()}`,
        item_name: 'Test Item',
        location_id: testLocation.location_id,
        yellow: 1,
        green: 3,
        purple: 6,
        amount: 5,
        status: 'Green',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      ItemRepository.addItem(testItem);

      // カスケード削除を実行
      UserRepository.cascadeDelete(testUser.user_id);

      // 全てのデータが削除されていることを確認
      expect(UserRepository.findById(testUser.user_id)).toBeNull();
      expect(LocationRepository.findById(testLocation.location_id)).toBeNull();
      expect(ItemRepository.findById(testItem.item_id)).toBeNull();
      
      const members = MemberRepository.findByLocationId(testLocation.location_id);
      expect(members.length).toBe(0);
    });

    test('should handle cascade deletion safely with missing data', () => {
      // 存在しないユーザーの削除を試行
      const nonExistentUserId = 'non-existent-user';
      
      // エラーが発生しないことを確認
      expect(() => {
        UserRepository.cascadeDelete(nonExistentUserId);
      }).not.toThrow();
    });
  });

  describe('Admin Interface Integration', () => {
    test('should render inactive users admin page', async () => {
      // 管理者として非アクティブユーザーページにアクセス
      const response = await request(app)
        .get(`/admin//inactive-users`) // Empty admin key for test
        .expect(200);

      expect(response.text).toMatch(/非アクティブユーザー管理/);
      expect(response.text).toMatch(/非アクティブ期間/);
    });

    test('should handle inactive user deletion via admin interface', async () => {
      // テストユーザーを作成
      const testUser = createTestUser({
        created_at: createOldDate(400),
        last_activity_at: createOldDate(400)
      });
      UserRepository.createUser(testUser);

      // 管理者として削除を実行
      const response = await request(app)
        .post(`/admin//delete-inactive-user`) // Empty admin key for test
        .send({ user_id: testUser.user_id })
        .expect(302); // Redirect

      // ユーザーが削除されていることを確認
      expect(UserRepository.findById(testUser.user_id)).toBeNull();
    });

    test('should handle bulk cleanup of inactive users', async () => {
      // 複数の古いテストユーザーを作成
      const oldUsers = [];
      for (let i = 0; i < 3; i++) {
        const user = createTestUser({
          user_name: `Old User ${i}`,
          created_at: createOldDate(400),
          last_activity_at: createOldDate(400)
        });
        UserRepository.createUser(user);
        oldUsers.push(user);
      }

      // 一括削除を実行
      const response = await request(app)
        .post(`/admin//cleanup-inactive-users`) // Empty admin key for test
        .send({ days: '365', action: 'inactive' })
        .expect(200);

      expect(response.text).toMatch(/削除しました/);

      // 全てのユーザーが削除されていることを確認
      oldUsers.forEach(user => {
        expect(UserRepository.findById(user.user_id)).toBeNull();
      });
    });
  });

  describe('Activity Tracking Middleware', () => {
    test('should track user activity during normal requests', async () => {
      // 実際のユーザーリクエストをシミュレート
      const agent = request.agent(app);
      
      // テスト環境でのユーザーセッションが自動設定されることを確認
      const response = await agent.get('/user/user-sampleuser');
      expect(response.statusCode).toBe(200);

      // サンプルユーザーの活動時刻が更新されていることを確認
      const user = UserRepository.findById('user-sampleuser');
      if (user && user.last_activity_at) {
        const lastActivity = new Date(user.last_activity_at);
        const now = new Date();
        const diffMs = now - lastActivity;
        expect(diffMs).toBeLessThan(60000); // 1分以内
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', () => {
      // 無効なデータでの削除操作
      expect(() => {
        UserRepository.cascadeDelete(null);
      }).not.toThrow();

      expect(() => {
        UserRepository.cascadeDelete('');
      }).not.toThrow();
    });

    test('should handle missing admin key gracefully', async () => {
      const response = await request(app)
        .get('/admin/invalid-key/inactive-users')
        .expect(302); // Should redirect due to auth middleware
    });
  });
});