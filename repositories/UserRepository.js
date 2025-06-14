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
    UPDATE users SET user_name = ?, user_description = ? WHERE user_id = ?
  `);
  return stmt.run(userData.user_name, userData.user_description, userData.user_id);
}

}

module.exports = UserRepository;