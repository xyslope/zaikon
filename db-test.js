// db-test.js
const db = require('./db');
console.log('Database connection test:');
console.log(db.prepare("SELECT 1 as test").get()); // 接続テスト