const db = require('../db');

function run() {
  db.exec(`
    ALTER TABLE items ADD COLUMN inuse INTEGER DEFAULT 0;
  `);
  console.log('Added inuse column to items table.');
}

module.exports.run = run;