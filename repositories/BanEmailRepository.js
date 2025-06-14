const db = require('../db');

class BanEmailRepository {
  static add(email, reason = '') {
    const stmt = db.prepare(`INSERT OR IGNORE INTO ban_emails (email, reason, created_at) VALUES (?, ?, ?)`);
    return stmt.run(email, reason, new Date().toISOString());
  }

  static findByEmail(email) {
    return db.prepare('SELECT * FROM ban_emails WHERE email = ?').get(email) || null;
  }

  static removeByEmail(email) {
    const stmt = db.prepare('DELETE FROM ban_emails WHERE email = ?');
    return stmt.run(email);
  }

  static findAll() {
    return db.prepare('SELECT * FROM ban_emails ORDER BY created_at DESC').all();
  }
}

module.exports = BanEmailRepository;
