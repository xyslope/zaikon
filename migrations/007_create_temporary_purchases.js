const db = require('../db');

function run() {
  // 臨時購入依頼テーブル作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS temporary_purchases (
      temp_id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      description TEXT,
      requested_by TEXT NOT NULL,
      requested_for_user TEXT,
      priority INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      completed_by TEXT,
      expires_at TEXT,
      FOREIGN KEY (requested_by) REFERENCES users(user_id),
      FOREIGN KEY (requested_for_user) REFERENCES users(user_id),
      FOREIGN KEY (completed_by) REFERENCES users(user_id)
    )
  `);
  
  console.log('Created temporary_purchases table');
}

module.exports = { run };