const db = require('../db');

class TemporaryPurchaseRepository {
  // 臨時購入依頼作成
  static create(purchaseData) {
    const stmt = db.prepare(`
      INSERT INTO temporary_purchases 
      (temp_id, item_name, description, requested_by, requested_for_user, priority, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      purchaseData.temp_id,
      purchaseData.item_name,
      purchaseData.description || null,
      purchaseData.requested_by,
      purchaseData.requested_for_user || purchaseData.requested_by,
      purchaseData.priority || 1,
      purchaseData.status || 'pending',
      purchaseData.created_at,
      purchaseData.expires_at || null
    );
  }

  // ID で取得
  static findById(tempId) {
    return db.prepare('SELECT * FROM temporary_purchases WHERE temp_id = ?').get(tempId) || null;
  }

  // ユーザーの臨時購入依頼一覧取得（自分が依頼したもの）
  static findByRequestedBy(userId) {
    return db.prepare(`
      SELECT tp.*, u.user_name as requested_for_user_name 
      FROM temporary_purchases tp
      LEFT JOIN users u ON tp.requested_for_user = u.user_id
      WHERE tp.requested_by = ? 
      ORDER BY tp.created_at DESC
    `).all(userId);
  }

  // ユーザーの臨時購入依頼一覧取得（自分への依頼を含む）
  static findByUser(userId) {
    return db.prepare(`
      SELECT tp.*, 
             req_by.user_name as requested_by_name,
             req_for.user_name as requested_for_user_name,
             comp_by.user_name as completed_by_name
      FROM temporary_purchases tp
      LEFT JOIN users req_by ON tp.requested_by = req_by.user_id
      LEFT JOIN users req_for ON tp.requested_for_user = req_for.user_id
      LEFT JOIN users comp_by ON tp.completed_by = comp_by.user_id
      WHERE tp.requested_by = ? OR tp.requested_for_user = ?
      ORDER BY 
        CASE tp.status 
          WHEN 'pending' THEN 1 
          WHEN 'completed' THEN 2 
          ELSE 3 
        END,
        tp.priority DESC,
        tp.created_at DESC
    `).all(userId, userId);
  }

  // 有効な臨時購入依頼一覧取得（未完了かつ期限内）
  static findActivePurchases(userId) {
    const now = new Date().toISOString();
    return db.prepare(`
      SELECT tp.*, 
             req_by.user_name as requested_by_name,
             req_for.user_name as requested_for_user_name
      FROM temporary_purchases tp
      LEFT JOIN users req_by ON tp.requested_by = req_by.user_id
      LEFT JOIN users req_for ON tp.requested_for_user = req_for.user_id
      WHERE (tp.requested_by = ? OR tp.requested_for_user = ?)
        AND tp.status = 'pending'
        AND (tp.expires_at IS NULL OR tp.expires_at > ?)
      ORDER BY tp.priority DESC, tp.created_at ASC
    `).all(userId, userId, now);
  }

  // 臨時購入依頼完了
  static markAsCompleted(tempId, completedBy) {
    const stmt = db.prepare(`
      UPDATE temporary_purchases 
      SET status = 'completed', completed_at = ?, completed_by = ?
      WHERE temp_id = ?
    `);
    return stmt.run(new Date().toISOString(), completedBy, tempId);
  }

  // 臨時購入依頼削除
  static delete(tempId) {
    return db.prepare('DELETE FROM temporary_purchases WHERE temp_id = ?').run(tempId);
  }

  // 臨時購入依頼更新
  static update(tempId, updates) {
    const allowedFields = ['item_name', 'description', 'priority', 'status', 'expires_at'];
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (fields.length === 0) return null;
    
    values.push(tempId);
    const stmt = db.prepare(`UPDATE temporary_purchases SET ${fields.join(', ')} WHERE temp_id = ?`);
    return stmt.run(...values);
  }

  // 期限切れアイテムのクリーンアップ
  static cleanupExpired() {
    const now = new Date().toISOString();
    return db.prepare(`
      DELETE FROM temporary_purchases 
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `).run(now);
  }
}

module.exports = TemporaryPurchaseRepository;