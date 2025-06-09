// c:\Users\yusakata\work\github.com\xyslope\zaikon\migrateItems.js
const db = require('../db');
const itemsData = require('../data/items.json'); // 既存のJSONデータ

function migrateItems() {
  const insert = db.prepare(`
    INSERT INTO items (
      item_id, item_name, location_id, yellow, green, purple,
      amount, status, created_at, updated_at, updated_on
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const transaction = db.transaction(() => {
    itemsData.forEach(item => {
      insert.run(
        item.item_id,
        item.item_name,
        item.location_id,
        item.yellow || 0,
        item.green || 0,
        item.purple || 0,
        item.amount || 0,
        item.status || null,
        item.created_at,
        item.updated_at || null,
        item.updated_on || null
      );
    });
  });

  transaction();
  console.log(`${itemsData.length} items migrated successfully`);
}

migrateItems();