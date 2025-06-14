// itemsテーブルにinuseカラムを追加する（すでにあれば何もしない）
const db = require('./db');

db.exec(`CREATE TABLE IF NOT EXISTS ban_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL
);`);
  console.log('Added banemails table.');

db.close && db.close();
