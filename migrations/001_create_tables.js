const db = require('../db');

function run() {
  // schema_migrationsテーブル（マイグレーション管理用）
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // usersテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      user_name TEXT NOT NULL,
      user_description TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // locationsテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      location_id TEXT PRIMARY KEY,
      location_name TEXT NOT NULL,
      owner_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  // membersテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      user_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (user_id, location_id)
    );
  `);

  // itemsテーブル
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      item_id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      location_id TEXT NOT NULL,
      yellow INTEGER DEFAULT 0,
      green INTEGER DEFAULT 0,
      purple INTEGER DEFAULT 0,
      amount INTEGER DEFAULT 0,
      status TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );
  `);

  // サンプルデータ挿入
  const sampleUserId = 'user-sampleuser';
  const sampleUserEmail = 'residenta_at_ecofirm.com';
  const sampleUserName = '住人A';
  const sampleLocationId = 'loc-samplelocation';
  const sampleLocationName = 'みんなのいえ';
  const now = new Date().toISOString();

  // 既存のサンプルユーザがいなければ追加
  const userExists = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(sampleUserId);
  if (!userExists) {
    db.prepare(`INSERT INTO users (user_id, email, user_name, created_at) VALUES (?, ?, ?, ?)`)
      .run(sampleUserId, sampleUserEmail, sampleUserName, now);
  }

  // 既存のサンプル場所がいなければ追加
  const locationExists = db.prepare('SELECT location_id FROM locations WHERE location_id = ?').get(sampleLocationId);
  if (!locationExists) {
    db.prepare(`INSERT INTO locations (location_id, location_name, created_by, created_at) VALUES (?, ?, ?, ?)`)
      .run(sampleLocationId, sampleLocationName, sampleUserId, now);
  }

  // membersにサンプルユーザと場所の紐付け
  const memberExists = db.prepare('SELECT user_id FROM members WHERE user_id = ? AND location_id = ?').get(sampleUserId, sampleLocationId);
  if (!memberExists) {
    db.prepare(`INSERT INTO members (user_id, location_id, joined_at) VALUES (?, ?, ?)`)
      .run(sampleUserId, sampleLocationId, now);
  }

  // マイグレーション完了登録
  const migrationName = '001_create_tables';
  const applied = db.prepare('SELECT name FROM schema_migrations WHERE name = ?').get(migrationName);
  if (!applied) {
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(migrationName);
  }

  console.log('001_create_tables migration applied');
}

module.exports.run = run;