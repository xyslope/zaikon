// c:\Users\yusakata\work\github.com\xyslope\zaikon\repositories\UserRepository.js
const db = require('../db');

class UserRepository {
  // ユーザーIDで取得
  static findById(userId) {
    return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) || null;
  }

  // 認証用（ユーザー名とメールアドレスで検索）
  static findByCredentials(username, email) {
    return db.prepare(`SELECT * FROM users WHERE user_name = ? AND email = ?`)
      .get(username, email) || null;
  }

  // ユーザー名で検索
  static findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE user_name = ?').get(username) || null;
  }


  // 新規ユーザー作成
  static createUser(userData) {
    const stmt = db.prepare(`
      INSERT INTO users 
      (user_id, user_name, email, user_description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
      userData.user_id,
      userData.user_name,
      userData.email,
      userData.user_description,
      userData.created_at
    );
  }

  // ユーザーの所属ロケーション取得
  static getUserLocations(userId) {
    return db.prepare(`
      SELECT l.* FROM locations l
      JOIN members m ON l.location_id = m.location_id
      WHERE m.user_id = ?
    `).all(userId);
  }
  
  // メールアドレスでユーザー検索
  static findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
  }

  // 全ユーザー取得
  static findAll() {
    return db.prepare('SELECT * FROM users').all();
  }

  // ユーザー名で部分一致検索（最大10件）
  static searchByUsernameLike(query) {
    return db.prepare('SELECT user_id, user_name, user_description FROM users WHERE user_name LIKE ? LIMIT 10')
      .all(`%${query}%`);
  }

  // ユーザー情報更新
  static updateUser(userData) {
    const stmt = db.prepare(`
      UPDATE users SET user_name = ?, user_description = ?, line_user_id = ? WHERE user_id = ?
    `);
    return stmt.run(userData.user_name, userData.user_description, userData.line_user_id, userData.user_id);
  }

  // LINE連携解除
  static removeLinkUserIdConnection(userId) {
    const stmt = db.prepare('UPDATE users SET line_user_id = NULL WHERE user_id = ?');
    return stmt.run(userId);
  }

  // ユーザー削除
  static delete(userId) {
    return db.prepare('DELETE FROM users WHERE user_id = ?').run(userId);
  }

  // 最終ログイン時刻更新
  static updateLastLogin(userId) {
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE users SET last_login_at = ?, last_activity_at = ?, updated_at = ? WHERE user_id = ?');
    return stmt.run(now, now, now, userId);
  }

  // 最終活動時刻更新
  static updateLastActivity(userId) {
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE users SET last_activity_at = ?, updated_at = ? WHERE user_id = ?');
    return stmt.run(now, now, userId);
  }

  // 非アクティブユーザー検索（指定日数以上アクティビティなし）
  static findInactiveUsers(daysSinceLastActivity = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActivity);
    const cutoffISO = cutoffDate.toISOString();
    
    return db.prepare(`
      SELECT user_id, user_name, email, created_at, last_login_at, last_activity_at, updated_at
      FROM users 
      WHERE (last_activity_at IS NULL OR last_activity_at < ?) 
        AND created_at < ?
      ORDER BY created_at ASC
    `).all(cutoffISO, cutoffISO);
  }

  // 孤立ユーザー検索（どの場所にも属していない）
  static findOrphanedUsers() {
    return db.prepare(`
      SELECT u.user_id, u.user_name, u.email, u.created_at, u.last_activity_at
      FROM users u
      LEFT JOIN members m ON u.user_id = m.user_id
      WHERE m.user_id IS NULL
    `).all();
  }

  // カスケード削除（ユーザー、所有場所、アイテム、メンバーシップを削除）
  static cascadeDelete(userId) {
    const deleteTransaction = db.transaction(() => {
      // 1. ユーザーが所有する場所を取得
      const ownedLocations = db.prepare(`
        SELECT location_id FROM locations WHERE created_by = ?
      `).all(userId);

      // 2. 所有場所のアイテムを削除
      for (const location of ownedLocations) {
        db.prepare('DELETE FROM items WHERE location_id = ?').run(location.location_id);
      }

      // 3. 所有場所のメンバーシップを削除
      for (const location of ownedLocations) {
        db.prepare('DELETE FROM members WHERE location_id = ?').run(location.location_id);
      }

      // 4. 所有場所を削除
      db.prepare('DELETE FROM locations WHERE created_by = ?').run(userId);

      // 5. ユーザーのメンバーシップを削除（他ユーザーの場所から）
      db.prepare('DELETE FROM members WHERE user_id = ?').run(userId);

      // 6. ユーザーを削除
      db.prepare('DELETE FROM users WHERE user_id = ?').run(userId);
    });

    return deleteTransaction();
  }

  // メールアドレス更新
  static updateUserEmail(userId, newEmail) {
    const stmt = db.prepare('UPDATE users SET email = ? WHERE user_id = ?');
    return stmt.run(newEmail, userId);
  }

}

module.exports = UserRepository;