const db = require('../db');

function run() {
  db.exec(`ALTER TABLE ban_emails ADD COLUMN created_at TEXT`);
  console.log('Added created_at column to ban_emails');
}

module.exports.run = run;