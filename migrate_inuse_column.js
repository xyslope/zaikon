// itemsテーブルにinuseカラムを追加する（すでにあれば何もしない）
const db = require('./db');

// すでにカラムが存在するかチェック
function columnExists() {
  const stmt = db.prepare(`PRAGMA table_info(items);`);
  const columns = stmt.all();
  return columns.some(col => col.name === 'inuse');
}

if (!columnExists()) {
  db.exec(`ALTER TABLE items ADD COLUMN inuse INTEGER DEFAULT 0;`);
  console.log('Added inuse column.');
} else {
  console.log('inuse column already exists.');
}

db.close && db.close();
