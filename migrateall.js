const db = require('./lib/db');
const fs = require('fs');

function migrateData() {
  try {
    // データ読み込み
    const usersData = JSON.parse(fs.readFileSync('./data/users.json'));
    const locationsData = JSON.parse(fs.readFileSync('./data/locations.json'));
    const membersData = JSON.parse(fs.readFileSync('./data/members.json'));
    const itemsData = JSON.parse(fs.readFileSync('./data/items.json'));

    // トランザクション開始
    db.pragma('foreign_keys = OFF'); // 一時的に無効化
    const transaction = db.transaction(() => {
      // users移行
      const userInsert = db.prepare(`
        INSERT INTO users (user_id, email, user_name, created_at)
        VALUES (?, ?, ?, ?)
      `);
      usersData.forEach(user => {
        userInsert.run(
          user.user_id,
          user.email,
          user.user_name,
          user.created_at
        );
      });

      // locations移行
      const locationInsert = db.prepare(`
        INSERT INTO locations 
        (location_id, location_name, owner_id, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      locationsData.forEach(loc => {
        locationInsert.run(
          loc.location_id,
          loc.location_name,
          loc.owner_id || null,
          loc.created_by || null,
          loc.created_at,
          loc.updated_at || null
        );
      });

      // members移行
      const memberInsert = db.prepare(`
        INSERT INTO members (user_id, location_id, joined_at)
        VALUES (?, ?, ?)
      `);
      membersData.forEach(member => {
        memberInsert.run(
          member.user_id,
          member.location_id,
          member.joined_at
        );
      });

      // items移行
      const itemInsert = db.prepare(`
        INSERT INTO items (
          item_id, item_name, location_id, yellow, green, purple,
          amount, status, created_at, updated_at, updated_on
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      itemsData.forEach(item => {
        itemInsert.run(
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
    db.pragma('foreign_keys = ON'); // 有効化に戻す
    
    console.log(`
      移行完了:
      - Users: ${usersData.length}件
      - Locations: ${locationsData.length}件  
      - Members: ${membersData.length}件
      - Items: ${itemsData.length}件
    `);
  } catch (err) {
    console.error('移行エラー:', err);
    process.exit(1);
  }
}

migrateData();