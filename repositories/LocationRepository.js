const db = require('../db');

class LocationRepository {
  static getAllLocations() {
    return db.prepare(`
      SELECT l.*, u.user_name as owner_name
      FROM locations l
      LEFT JOIN users u ON l.owner_id = u.user_id
    `).all();
  }

  static getLocationWithItems(locationId) {
    return {
      location: db.prepare('SELECT * FROM locations WHERE location_id = ?').get(locationId),
      items: db.prepare('SELECT * FROM items WHERE location_id = ?').all(locationId)
    };
  }


static findByUserId(userId) {
    // このユーザーがメンバーとなっているロケーション一覧を返す
    return db.prepare(`
      SELECT l.* FROM locations l
      JOIN members m ON l.location_id = m.location_id
      WHERE m.user_id = ?
    `).all(userId);
  }

  static findById(locationId) {
    return db.prepare('SELECT * FROM locations WHERE location_id = ?').get(locationId) || null;
  }

  static create({ location_id, location_name, owner_id, created_by, created_at, updated_at = null }) {
    return db.prepare(`
      INSERT INTO locations (location_id, location_name, owner_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(location_id, location_name, owner_id, created_by, created_at, updated_at);
  }

  // ロケーション削除
  static delete(locationId) {
    return db.prepare('DELETE FROM locations WHERE location_id = ?').run(locationId);
  }

  // ロケーション情報更新
  static update(locationData) {
    const stmt = db.prepare(`
      UPDATE locations SET location_name = ?, updated_at = datetime('now')
      WHERE location_id = ?
    `);
    return stmt.run(locationData.location_name, locationData.location_id);
  }
}

module.exports = LocationRepository;