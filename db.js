const Database = require('better-sqlite3');
const db = new Database('zaikon.db');

// テーブル作成（外部キー制約有効化）
db.pragma('foreign_keys = ON');

db.exec(`
  -- usersテーブル
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    user_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- locationsテーブル
  CREATE TABLE IF NOT EXISTS locations (
    location_id TEXT PRIMARY KEY,
    location_name TEXT NOT NULL,
    owner_id TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (owner_id) REFERENCES users(user_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
  );

  -- membersテーブル
  CREATE TABLE IF NOT EXISTS members (
    user_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    PRIMARY KEY (user_id, location_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
  );

  -- itemsテーブル
  CREATE TABLE IF NOT EXISTS items (
    item_id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    location_id TEXT NOT NULL,
    yellow INTEGER DEFAULT 0,
    green INTEGER DEFAULT 0,
    purple INTEGER DEFAULT 0,
    amount INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('Red', 'Yellow', 'Green', 'Purple')),
    created_at TEXT NOT NULL,
    updated_at TEXT,
    updated_on TEXT,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
  );
`);

module.exports = db;