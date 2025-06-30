const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigrations() {
  // schema_migrationsテーブルがなければ作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 適用済みマイグレーション取得
  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').all().map(row => row.name)
  );

  // migrationsディレクトリ内のマイグレーションファイルを取得し昇順にソート
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.match(/^\d+_.*\.js$/))
    .sort();

  for (const file of files) {
    if (applied.has(file.replace(/\.js$/, ''))) {
      // すでに適用済み
      continue;
    }

    console.log(`Applying migration: ${file}`);
    try {
      const migration = require(path.join(migrationsDir, file));
      if (typeof migration.up === 'function') {
        await migration.up(db);
      } else if (typeof migration.run === 'function') {
        await migration.run(db);
      } else if (typeof migration === 'function') {
        await migration(db);
      } else {
        throw new Error('Migration file must export an up function, run function, or be a function');
      }

      // 適用済み記録を追加
      const migName = file.replace(/\.js$/, '');
      const exists = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(migName);
      if (!exists) {
        db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(migName);
      }
      console.log(`Migration applied: ${file}`);
    } catch (err) {
      console.error(`Error applying migration ${file}:`, err);
      process.exit(1);
    }
  }

  console.log('All migrations applied');
}

module.exports = runMigrations;

// CLI実行時は実行
if (require.main === module) {
  runMigrations();
}
