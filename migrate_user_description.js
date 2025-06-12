// usersテーブルにuser_descritpionカラムを追加する（すでにあれば何もしない）
const db = require('./db');

// すでにカラムが存在するかチェック
function columnExists() {
  const stmt = db.prepare(`PRAGMA table_info(users);`);
  const columns = stmt.all();
  return columns.some(col => col.name === 'user_description');
}

if (!columnExists()) {
  db.exec(`ALTER TABLE users ADD COLUMN user_description TEXT NOT NULL DEFAULT 'No Info.';`);
  console.log('Added user_description column.');
} else {
  console.log('user_description column already exists.');
}

db.close && db.close();


