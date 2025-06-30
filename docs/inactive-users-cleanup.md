# 非アクティブユーザー自動削除機能

## 概要

Issue #18で実装された長期間アップデートのないアカウントを自動削除する機能です。ユーザーの活動を追跡し、指定された期間非アクティブなユーザーとその関連データ（場所、アイテム、メンバーシップ）を安全に削除します。

## 機能詳細

### 1. 活動追跡システム

#### 新しいデータベースフィールド
- `last_login_at` - 最終ログイン時刻
- `last_activity_at` - 最終活動時刻  
- `updated_at` - レコード更新時刻

#### 自動活動追跡
- ユーザーがページにアクセスするたびに`last_activity_at`を更新
- 管理者やテストユーザーは追跡対象外
- 非同期処理でパフォーマンスに影響なし

### 2. 非アクティブユーザー検索

#### 検索条件
- **非アクティブユーザー**: 指定日数以上活動がないユーザー
- **孤立ユーザー**: どの場所にも属していないユーザー

#### UserRepository新メソッド
```javascript
// 非アクティブユーザー検索
UserRepository.findInactiveUsers(daysSinceLastActivity = 365)

// 孤立ユーザー検索  
UserRepository.findOrphanedUsers()

// カスケード削除
UserRepository.cascadeDelete(userId)
```

### 3. 管理画面機能

#### アクセス方法
```
/admin/{ADMIN_KEY}/inactive-users
```

#### 機能
- 非アクティブ期間の設定（30日〜730日）
- 非アクティブユーザー一覧表示
- 孤立ユーザー一覧表示
- 個別削除
- 一括削除

### 4. 自動化スクリプト

#### 実行方法
```bash
# 基本実行（365日間非アクティブ）
node scripts/cleanup-inactive-users.js

# オプション指定
node scripts/cleanup-inactive-users.js --days 180 --orphaned --dry-run

# 強制実行（確認なし）
node scripts/cleanup-inactive-users.js --days 365 --force
```

#### オプション
- `--days <number>`: 非アクティブ日数（デフォルト: 365）
- `--orphaned`: 孤立ユーザーも削除
- `--dry-run`: 削除せず対象のみ表示
- `--force`: 確認なしで実行

#### ログ出力
削除結果は `data/cleanup.log` に記録されます。

### 5. cron設定例

```bash
# 毎月1日午前2時に実行（365日間非アクティブ + 孤立ユーザー）
0 2 1 * * cd /path/to/zaikon && node scripts/cleanup-inactive-users.js --days 365 --orphaned --force >> /var/log/zaikon-cleanup.log 2>&1
```

## 安全機能

### カスケード削除
ユーザー削除時に以下のデータも自動削除：
1. ユーザーが所有する場所
2. 所有場所内のアイテム
3. 所有場所のメンバーシップ
4. ユーザー自身のメンバーシップ

### エラーハンドリング
- データベースエラーに対する安全な処理
- 存在しないデータの削除要求を適切に処理
- 削除失敗時のログ出力

### 確認機能
- 管理画面での削除確認ダイアログ
- スクリプトでの確認プロンプト
- ドライランでの事前確認

## セキュリティ

### アクセス制御
- 管理画面は`ADMIN_KEY`による認証必須
- 一般ユーザーはアクセス不可

### ログ記録
- 全ての削除操作をログに記録
- 不正アクセス試行の監視

## テスト

### テストファイル
- `tests/inactive-users-cleanup.test.js`

### テスト範囲
- UserRepository機能
- カスケード削除
- 管理画面統合
- 活動追跡ミドルウェア
- エラーハンドリング

### 実行方法
```bash
npm test -- tests/inactive-users-cleanup.test.js
```

## データ移行

### Migration 006_add_activity_tracking.js
```sql
ALTER TABLE users ADD COLUMN last_login_at TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN last_activity_at TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT NULL;
```

既存ユーザーには`created_at`を基準とした初期値が設定されます。

## 監視と運用

### 推奨設定
- **定期実行**: 月1回
- **非アクティブ期間**: 365日（1年）
- **孤立ユーザー削除**: 有効

### 監視ポイント
- 削除ユーザー数の異常な増加
- エラーログの確認
- ディスク容量の推移

### 緊急時対応
- データベースバックアップからの復旧
- 削除ログによる影響範囲特定

## 注意事項

⚠️ **重要**: この機能は不可逆的な削除を行います。運用前に十分なテストを実施してください。

⚠️ **バックアップ**: 定期的なデータベースバックアップを必ず実施してください。

⚠️ **テスト環境**: 本番環境での実行前に、テスト環境での動作確認を推奨します。