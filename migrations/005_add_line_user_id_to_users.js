const db = require('../db');

function run() {
  console.log('マイグレーション: usersテーブルにline_user_idカラムを追加');
  
  try {
    // line_user_idカラムを追加
    db.prepare(`
      ALTER TABLE users 
      ADD COLUMN line_user_id TEXT
    `).run();
    
    console.log('✅ line_user_idカラムを追加しました');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️ line_user_idカラムは既に存在します');
    } else {
      throw error;
    }
  }
}

module.exports.run = run;