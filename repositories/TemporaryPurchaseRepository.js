const db = require('../db');
const { v4: uuidv4 } = require('uuid');

class TemporaryPurchaseRepository {
  // 臨時購入依頼作成
  static create(data) {
    const tempId = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO temporary_purchases 
      (temp_id, user_id, item_name, description, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      tempId,
      data.user_id,
      data.item_name,
      data.description,
      data.priority,
      data.status,
      now,
      now
    );
    
    return this.findById(tempId);
  }

  // ID による取得
  static findById(tempId) {
    const stmt = db.prepare('SELECT * FROM temporary_purchases WHERE temp_id = ?');
    return stmt.get(tempId);
  }

  // ユーザーIDによる取得（全件）
  static findByUserId(userId) {
    const stmt = db.prepare(`
      SELECT * FROM temporary_purchases 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(userId);
  }

  // ユーザーIDによるアクティブな依頼取得
  static findActiveByUserId(userId) {
    const stmt = db.prepare(`
      SELECT * FROM temporary_purchases 
      WHERE user_id = ? AND status = 'pending'
      ORDER BY priority DESC, created_at DESC
    `);
    return stmt.all(userId);
  }

  // ステータス更新
  static updateStatus(tempId, status) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE temporary_purchases 
      SET status = ?, updated_at = ?
      WHERE temp_id = ?
    `);
    return stmt.run(status, now, tempId);
  }

  // 臨時購入依頼更新
  static update(tempId, data) {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE temporary_purchases 
      SET item_name = ?, description = ?, priority = ?, updated_at = ?
      WHERE temp_id = ?
    `);
    return stmt.run(data.item_name, data.description, data.priority, now, tempId);
  }

  // 削除
  static delete(tempId) {
    const stmt = db.prepare('DELETE FROM temporary_purchases WHERE temp_id = ?');
    return stmt.run(tempId);
  }

  // 全件取得（管理者用）
  static findAll() {
    const stmt = db.prepare(`
      SELECT tp.*, u.user_name 
      FROM temporary_purchases tp
      LEFT JOIN users u ON tp.user_id = u.user_id
      ORDER BY tp.created_at DESC
    `);
    return stmt.all();
  }

  // ステータス別取得
  static findByStatus(status) {
    const stmt = db.prepare(`
      SELECT tp.*, u.user_name 
      FROM temporary_purchases tp
      LEFT JOIN users u ON tp.user_id = u.user_id
      WHERE tp.status = ?
      ORDER BY tp.created_at DESC
    `);
    return stmt.all(status);
  }
}

module.exports = TemporaryPurchaseRepository;