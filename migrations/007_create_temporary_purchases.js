// Migration: Create temporary_purchases table
const db = require('../db');

function up() {
  console.log('Running migration: 007_create_temporary_purchases');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS temporary_purchases (
      temp_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
  `;
  
  try {
    db.exec(createTableSQL);
    console.log('temporary_purchases テーブルを作成しました');
    
    // インデックス作成
    db.exec('CREATE INDEX IF NOT EXISTS idx_temp_purchases_user_id ON temporary_purchases(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_temp_purchases_status ON temporary_purchases(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_temp_purchases_created_at ON temporary_purchases(created_at)');
    
    console.log('temporary_purchases テーブルのインデックスを作成しました');
    return true;
  } catch (err) {
    console.error('Migration 007 failed:', err);
    throw err;
  }
}

function down() {
  console.log('Rolling back migration: 007_create_temporary_purchases');
  
  try {
    db.exec('DROP TABLE IF EXISTS temporary_purchases');
    console.log('temporary_purchases テーブルを削除しました');
    return true;
  } catch (err) {
    console.error('Migration 007 rollback failed:', err);
    throw err;
  }
}

module.exports = { up, down };