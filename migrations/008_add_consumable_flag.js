const db = require('../db');

function run() {
  // itemsテーブルにis_consumableカラム追加
  db.exec(`
    ALTER TABLE items ADD COLUMN is_consumable INTEGER DEFAULT 0;
  `);

  // マイグレーション完了登録
  const migrationName = '008_add_consumable_flag';
  const applied = db.prepare('SELECT name FROM schema_migrations WHERE name = ?').get(migrationName);
  if (!applied) {
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(migrationName);
  }

  console.log('008_add_consumable_flag migration applied');
}

module.exports.run = run;