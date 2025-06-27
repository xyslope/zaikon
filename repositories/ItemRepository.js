const db = require('../db');

class ItemRepository {
  // 全アイテム取得
  static getAllItems() {
    return db.prepare(`
      SELECT i.*, l.location_name 
      FROM items i
      JOIN locations l ON i.location_id = l.location_id
    `).all();
  }

  // アイテム追加
  static addItem(itemData) {
    const {
      item_id, item_name, location_id, amount, status,
      yellow, green, purple, inuse, created_at, updated_at
    } = itemData;
    return db.prepare(`
      INSERT INTO items
      (item_id, item_name, location_id, amount, status,
       yellow, green, purple, inuse, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item_id, item_name, location_id, amount, status,
      yellow, green, purple, inuse,
      created_at, updated_at
    );
  }

  // 在庫数更新
  static updateItemAmount(itemId, newAmount) {
    return db.prepare(`
      UPDATE items 
      SET amount = ?, updated_at = datetime('now')
      WHERE item_id = ?
    `).run(newAmount, itemId);
  }

  // amountのみ更新（UI用）
  static updateAmount(itemId, newAmount) {
    return db.prepare(`
      UPDATE items SET amount = ?, updated_at = datetime('now')
      WHERE item_id = ?
    `).run(newAmount, itemId);
  }

  // ロケーション別アイテム取得
  static getItemsByLocation(locationId) {
    return db.prepare(`
      SELECT * FROM items 
      WHERE location_id = ?
      ORDER BY item_name
    `).all(locationId);
  }

  static findByLocationId(locationId) {
    return db.prepare('SELECT * FROM items WHERE location_id = ?').all(locationId) || [];
  }

  // アイテムIDで取得
  static findById(itemId) {
    return db.prepare('SELECT * FROM items WHERE item_id = ?').get(itemId) || null;
  }

  // アイテム削除
  static delete(itemId) {
    return db.prepare('DELETE FROM items WHERE item_id = ?').run(itemId);
  }

  // ロケーション別アイテム一括削除
  static deleteByLocationId(locationId) {
    return db.prepare('DELETE FROM items WHERE location_id = ?').run(locationId);
  }

  // inuseとamountの同時更新
  static updateInuseAndAmount(itemId, newInuse, newAmount) {
    return db.prepare(`
      UPDATE items
      SET inuse = ?, amount = ?, updated_at = datetime('now')
      WHERE item_id = ?
    `).run(newInuse, newAmount, itemId);
  }

  // inuseのみ更新
  static updateInuse(itemId, newInuse) {
    return db.prepare(`
      UPDATE items
      SET inuse = ?, updated_at = datetime('now')
      WHERE item_id = ?
    `).run(newInuse, itemId);
  }
  
  // アイテム完全更新
  static updateItem(itemId, itemData) {
    const {
      item_name, yellow, green, purple, amount, status
    } = itemData;
    return db.prepare(`
      UPDATE items 
      SET item_name = ?, yellow = ?, green = ?, purple = ?, 
          amount = ?, status = ?, updated_at = datetime('now')
      WHERE item_id = ?
    `).run(item_name, yellow, green, purple, amount, status, itemId);
  }

  // ユーザIDでアイテム抽出（任意のinuse・status条件を渡せる）
  static findItemsByUserWithConditions(userId, inuse = null, status = null) {
    let query = `
      SELECT i.*, l.location_name FROM items i
      JOIN locations l ON i.location_id = l.location_id
      JOIN members m ON l.location_id = m.location_id
      WHERE m.user_id = ?
    `;
    const params = [userId];

    if (inuse !== null) {
      query += ' AND i.inuse = ?';
      params.push(inuse);
    }
    if (status !== null) {
      query += ' AND i.status = ?';
      params.push(status);
    }
    return db.prepare(query).all(...params);
  }

  // アイテムのロケーション移動
  static moveItem(itemId, newLocationId) {
    return db.prepare(`
      UPDATE items 
      SET location_id = ?, updated_at = datetime('now')
      WHERE item_id = ?
    `).run(newLocationId, itemId);
  }
}

module.exports = ItemRepository;