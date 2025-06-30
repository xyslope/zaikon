const db = require('../db');

function run() {
  // Add activity tracking fields to users table
  db.exec(`
    ALTER TABLE users ADD COLUMN last_login_at TEXT DEFAULT NULL;
  `);

  db.exec(`
    ALTER TABLE users ADD COLUMN last_activity_at TEXT DEFAULT NULL;
  `);

  // Add updated_at field to users table
  db.exec(`
    ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT NULL;
  `);

  // Update existing users to have initial activity timestamps
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users 
    SET last_activity_at = created_at, updated_at = created_at 
    WHERE last_activity_at IS NULL
  `).run();

  // Register migration completion
  const migrationName = '006_add_activity_tracking';
  const applied = db.prepare('SELECT name FROM schema_migrations WHERE name = ?').get(migrationName);
  if (!applied) {
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(migrationName);
  }

  console.log('006_add_activity_tracking migration applied');
}

module.exports.run = run;