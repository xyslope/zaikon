#!/usr/bin/env node

/**
 * 非アクティブユーザー自動削除スクリプト
 * 
 * Usage:
 *   node scripts/cleanup-inactive-users.js [options]
 * 
 * Options:
 *   --days <number>     非アクティブ日数 (デフォルト: 365)
 *   --orphaned         孤立ユーザーも削除
 *   --dry-run          実際には削除せず、削除対象のみ表示
 *   --force            確認なしで実行
 */

const path = require('path');
const fs = require('fs');

// プロジェクトルートディレクトリに移動
process.chdir(path.dirname(__dirname));

require('dotenv').config();
const UserRepository = require('../repositories/UserRepository');

// コマンドライン引数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    days: 365,
    orphaned: false,
    dryRun: false,
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--days':
        options.days = parseInt(args[++i]) || 365;
        break;
      case '--orphaned':
        options.orphaned = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--help':
        console.log(`
非アクティブユーザー自動削除スクリプト

Usage: node scripts/cleanup-inactive-users.js [options]

Options:
  --days <number>     非アクティブ日数 (デフォルト: 365)
  --orphaned         孤立ユーザーも削除
  --dry-run          実際には削除せず、削除対象のみ表示
  --force            確認なしで実行
  --help             このヘルプを表示
        `);
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

// ユーザー入力確認
function askForConfirmation(message) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function main() {
  const options = parseArgs();
  
  console.log('=== 非アクティブユーザー削除スクリプト ===');
  console.log(`設定: ${options.days}日間非アクティブ${options.orphaned ? ' + 孤立ユーザー' : ''}`);
  console.log(`実行モード: ${options.dryRun ? 'ドライラン (削除実行なし)' : '削除実行'}`);
  console.log('');

  try {
    // 非アクティブユーザー検索
    const inactiveUsers = UserRepository.findInactiveUsers(options.days);
    console.log(`非アクティブユーザー (${options.days}日間): ${inactiveUsers.length}件`);
    
    if (inactiveUsers.length > 0) {
      console.log('非アクティブユーザー一覧:');
      inactiveUsers.forEach(user => {
        const lastActivity = user.last_activity_at 
          ? new Date(user.last_activity_at).toLocaleDateString('ja-JP')
          : '活動なし';
        console.log(`  - ${user.user_name} (${user.user_id}) - 最終活動: ${lastActivity}`);
      });
      console.log('');
    }

    // 孤立ユーザー検索
    let orphanedUsers = [];
    if (options.orphaned) {
      orphanedUsers = UserRepository.findOrphanedUsers();
      console.log(`孤立ユーザー: ${orphanedUsers.length}件`);
      
      if (orphanedUsers.length > 0) {
        console.log('孤立ユーザー一覧:');
        orphanedUsers.forEach(user => {
          const created = user.created_at 
            ? new Date(user.created_at).toLocaleDateString('ja-JP')
            : '不明';
          console.log(`  - ${user.user_name} (${user.user_id}) - 作成日: ${created}`);
        });
        console.log('');
      }
    }

    const totalUsers = inactiveUsers.length + orphanedUsers.length;
    
    if (totalUsers === 0) {
      console.log('削除対象のユーザーはありません。');
      return;
    }

    if (options.dryRun) {
      console.log(`ドライラン: ${totalUsers}件のユーザーが削除対象です。`);
      console.log('実際に削除するには --dry-run オプションを外してください。');
      return;
    }

    // 確認
    if (!options.force) {
      const confirmed = await askForConfirmation(
        `${totalUsers}件のユーザーとその関連データ（場所、アイテム、メンバーシップ）を削除しますか？`
      );
      
      if (!confirmed) {
        console.log('削除がキャンセルされました。');
        return;
      }
    }

    // 削除実行
    let deletedCount = 0;
    
    console.log('削除を開始します...');

    // 非アクティブユーザー削除
    for (const user of inactiveUsers) {
      try {
        UserRepository.cascadeDelete(user.user_id);
        console.log(`削除完了: ${user.user_name} (${user.user_id})`);
        deletedCount++;
      } catch (err) {
        console.error(`削除エラー: ${user.user_name} (${user.user_id}) - ${err.message}`);
      }
    }

    // 孤立ユーザー削除
    for (const user of orphanedUsers) {
      try {
        UserRepository.cascadeDelete(user.user_id);
        console.log(`削除完了: ${user.user_name} (${user.user_id})`);
        deletedCount++;
      } catch (err) {
        console.error(`削除エラー: ${user.user_name} (${user.user_id}) - ${err.message}`);
      }
    }

    console.log('');
    console.log(`=== 削除完了: ${deletedCount}件のユーザーを削除しました ===`);
    
    // ログファイルに記録
    const logEntry = `${new Date().toISOString()} - 自動削除: ${deletedCount}件 (非アクティブ${options.days}日: ${inactiveUsers.length}件, 孤立: ${orphanedUsers.length}件)\n`;
    fs.appendFileSync('data/cleanup.log', logEntry);

  } catch (err) {
    console.error('削除処理中にエラーが発生しました:', err);
    process.exit(1);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main().catch(err => {
    console.error('エラー:', err);
    process.exit(1);
  });
}

module.exports = { main, parseArgs };