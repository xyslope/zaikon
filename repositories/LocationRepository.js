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
  
}

module.exports = LocationRepository;