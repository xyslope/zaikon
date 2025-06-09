// c:\Users\yusakata\work\github.com\xyslope\zaikon\repositories\UserRepository.js
const db = require('../db');

class UserRepository {
  // ユーザーIDで取得
  static getUserById(userId) {
    return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }

  // 認証用（ユーザー名とメールアドレスで検索）
  static findByCredentials(username, email) {
    return db.prepare(`SELECT * FROM users WHERE user_name = ? AND email = ?`)
      .get(username, email) || null;
  }

  // ユーザー名で検索
  static findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE user_name = ?').get(username);
  }

  // c:\Users\yusakata\work\github.com\xyslope\zaikon\repositories\UserRepository.js
static findById(userId) {
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) || null;
}

  // 新規ユーザー作成
  static createUser(userData) {
    const stmt = db.prepare(`
      INSERT INTO users 
      (user_id, user_name, email, created_at)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(
      userData.user_id,
      userData.user_name,
      userData.email,
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
}

module.exports = UserRepository;