// 例: migrations/20250614_add_ban_emails_table.js
const db = require('../db');

function run() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ban_emails (
        email TEXT PRIMARY KEY,
        reason TEXT
      );
    `);
  }
  
  module.exports.run = run;