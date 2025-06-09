const db = require('../db');

class MemberRepository {
  // メンバー追加
  static addMember(memberData) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO members 
      (user_id, location_id, joined_at)
      VALUES (?, ?, ?)
    `);
    return stmt.run(
      memberData.user_id,
      memberData.location_id,
      memberData.joined_at
    );
  }

  // メンバー削除
  static removeMember(userId, locationId) {
    const stmt = db.prepare(`
      DELETE FROM members 
      WHERE user_id = ? AND location_id = ?
    `);
    return stmt.run(userId, locationId);
  }

  // ロケーションのメンバー一覧取得（ユーザー詳細付き）
  static findWithUserDetails(locationId) {
    return db.prepare(`
      SELECT m.*, u.user_name, u.email 
      FROM members m 
      JOIN users u ON m.user_id = u.user_id 
      WHERE m.location_id = ?
      ORDER BY m.joined_at DESC
    `).all(locationId) || [];
  }

  // ロケーションIDでメンバー検索
  static findByLocationId(locationId) {
    return db.prepare(`
      SELECT * FROM members 
      WHERE location_id = ?
    `).all(locationId) || [];
  }

  // ユーザーIDで参加ロケーション検索
  static findByUserId(userId) {
    return db.prepare(`
      SELECT * FROM members 
      WHERE user_id = ?
    `).all(userId) || [];
  }

  // ロケーションから全メンバー削除
  static deleteByLocationId(locationId) {
    return db.prepare(`
      DELETE FROM members 
      WHERE location_id = ?
    `).run(locationId);
  }

  // ユーザーがロケーションのメンバーか確認
  static isMember(userId, locationId) {
    return db.prepare(`
      SELECT 1 FROM members 
      WHERE user_id = ? AND location_id = ?
    `).get(userId, locationId);
  }
}

module.exports = MemberRepository;