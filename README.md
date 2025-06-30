# Zaikon - 在庫管理システム

Zaikonは、LINE Bot連携機能を搭載したNode.js/Express製の在庫管理ウェブアプリケーションです。複数人でのアイテム共有、在庫状況の可視化、自動通知などの機能を提供します。

## 🚀 主要機能

### 📦 在庫管理
- **アイテム管理**: アイテムの追加、編集、削除、移動
- **ステータス管理**: 在庫量に基づく自動ステータス設定（Red/Yellow/Green/Purple）
- **使用状況追跡**: アイテムの使用状態管理（未使用/使用中/使用済み）
- **臨時購入依頼**: 必要なアイテムの購入リクエスト管理
- **しきい値設定**: アイテムごとのカスタムしきい値設定

### 👥 ユーザー・場所管理
- **ユーザー登録**: メールベースのユーザー登録・認証
- **場所（ロケーション）管理**: 複数の保管場所をグループで管理
- **メンバー管理**: 場所への参加者追加・削除
- **権限管理**: 管理者機能とユーザー権限の分離

### 📱 LINE Bot連携
- **自動通知**: 要補充リスト、買い物リストのLINE配信
- **QRコード連携**: ワンタイムリンクでの簡単セットアップ
- **連携管理**: LINE連携の設定・解除機能

### 🔧 高度な機能
- **メール変更**: セキュアなメールアドレス変更システム
- **臨時購入依頼**: 緊急購入アイテムの管理システム
- **リアルタイム更新**: Ajax ベースのスムーズなUI更新
- **セキュリティ**: セッション管理、メール禁止リスト、管理者認証

## 🛠️ 技術スタック

- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Frontend**: EJS, Font Awesome
- **Session**: express-session + session-file-store
- **Mail**: Nodemailer
- **LINE**: @line/bot-sdk
- **Testing**: Jest, Supertest

## 📋 セットアップ手順

### 1. 前提条件
```bash
# Node.js 18+ がインストールされていること
node --version

# npm パッケージマネージャーが利用可能であること
npm --version
```

### 2. プロジェクトのクローン・セットアップ
```bash
# リポジトリをクローン
git clone <repository-url>
cd zaikon

# 依存関係をインストール
npm install

# 環境変数ファイルをコピー
cp .env.example .env  # .env.example がある場合
```

### 3. 環境変数の設定
`.env` ファイルを作成し、以下を設定：

```env
# アプリケーション設定
NODE_ENV=development
BASE_URL=http://localhost:3000
ADMIN_KEY=your_secure_admin_key_here

# データベース（本番環境のみ、開発環境は自動生成）
# DATABASE_PATH=/data/zaikon.db

# メール設定
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@example.com

# LINE Bot設定（オプション）
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_BOT_ID=your_line_bot_id
```

### 4. データベースの初期化
```bash
# マイグレーションを実行
npm run migrate

# または手動でマイグレーション
node repositories/migrateall.js
```

### 5. アプリケーションの起動
```bash
# 開発環境での起動（nodemon使用）
npm run dev

# 本番環境での起動
npm start
```

アプリケーションは `http://localhost:3000` でアクセス可能になります。

## 📖 使用方法

### 初回セットアップ
1. `http://localhost:3000` にアクセス
2. 「Register」からユーザー登録
3. メールアドレスとユーザー名を入力して登録完了
4. 登録したメールアドレスでログイン用URLを取得

### 基本的な使い方

#### 1. 場所の作成・管理
- ダッシュボードから「場所を追加」
- 場所名を入力して作成
- 必要に応じてメンバーを招待

#### 2. アイテムの管理
- 場所ページでアイテムを追加
- しきい値（Yellow/Green/Purple）を設定
- 在庫数量を管理・更新

#### 3. LINE連携の設定
- ユーザー編集ページから「LINE連携」
- QRコードをスキャンしてBotを友だち追加
- 表示されたコードをBotに送信

#### 4. 通知機能の活用
- 要補充リスト: 在庫が少ないアイテムの一覧
- 買い物リスト: 在庫が空のアイテムの一覧
- LINEで自動通知受信可能

### 管理者機能
管理者は `http://localhost:3000/admin/{ADMIN_KEY}` でアクセス：
- 全ユーザー・場所の管理
- データベースの一括操作
- メール禁止リストの管理

## 🔌 API仕様

### 認証
セッションベース認証を使用。ログイン後は自動的にセッションが管理されます。

### エンドポイント一覧

#### ユーザー管理
```http
GET    /user/:userId                    # ユーザーダッシュボード
POST   /register                        # ユーザー登録
GET    /user/:userId/edit               # ユーザー編集ページ
POST   /user/:userId/edit               # ユーザー情報更新
POST   /send-user-link                  # ログインリンクメール送信
```

#### 場所・アイテム管理
```http
POST   /user/:userId/add-location       # 場所追加
GET    /location/:locationId            # 場所詳細
POST   /location/:locationId/add        # アイテム追加
POST   /location/:locationId/item/:itemId/edit  # アイテム編集
POST   /location/:locationId/delete-item        # アイテム削除
```

#### LINE連携API
```http
POST   /api/line/generate-link/:userId         # リンクコード生成
GET    /line-setup/:linkCode                   # 連携ページ表示
POST   /api/line/link-account                  # アカウント連携実行
POST   /api/line/remove-link/:userId           # 連携解除
POST   /api/dashboard/:userId/line/replenish   # 要補充リスト送信
POST   /api/dashboard/:userId/line/shopping    # 買い物リスト送信
```

#### メール変更API
```http
POST   /api/email/request-change/:userId  # メール変更リクエスト
GET    /email-change/:changeCode          # 変更確認ページ
POST   /api/email/confirm-change          # メール変更実行
```

#### 臨時購入依頼API
```http
POST   /api/temp-purchase/:userId         # 購入依頼作成
GET    /api/temp-purchase/:userId         # 購入依頼一覧
GET    /api/temp-purchase/:userId/active  # アクティブな依頼
POST   /api/temp-purchase/:tempId/complete # 依頼完了
POST   /api/temp-purchase/:tempId/delete   # 依頼削除
POST   /api/temp-purchase/:tempId/update   # 依頼更新
```

#### 管理者API
```http
GET    /admin/:adminKey                   # 管理者ダッシュボード
POST   /admin/:adminKey/clear-db          # DB全削除
POST   /admin/:adminKey/delete-user       # ユーザー削除
POST   /admin/:adminKey/ban-email/add     # メール禁止追加
POST   /admin/:adminKey/ban-email/delete  # メール禁止解除
```

### レスポンス形式
```json
{
  "success": true,
  "message": "操作が正常に完了しました",
  "data": { /* 結果データ */ }
}
```

エラー時：
```json
{
  "error": "エラーメッセージ",
  "status": 400
}
```

## 🧪 テスト

### テストの実行
```bash
# 全テスト実行
npm test

# カバレッジ付きテスト実行
npm run testcover
```

### テストファイル
- `tests/app.test.js` - アプリケーション基本機能
- `tests/user.test.js` - ユーザー関連機能
- `tests/location.test.js` - 場所管理機能
- `tests/register.test.js` - ユーザー登録機能

## 🚀 デプロイ

### Fly.io デプロイメント

1. **Fly.io アカウント作成・CLI インストール**
```bash
# Fly CLI インストール（Linux/macOS）
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
pwsh -c "iwr https://fly.io/install.ps1 -useb | iex"

# ログイン
fly auth login
```

2. **アプリケーション設定**
```bash
# プロジェクトディレクトリで初期化
fly launch

# 環境変数設定
fly secrets set ADMIN_KEY=your_secure_admin_key
fly secrets set GMAIL_USER=your_email@gmail.com
fly secrets set GMAIL_PASS=your_app_password
fly secrets set ADMIN_EMAIL=admin@example.com

# LINE Bot（オプション）
fly secrets set LINE_CHANNEL_ACCESS_TOKEN=your_token
fly secrets set LINE_CHANNEL_SECRET=your_secret
fly secrets set LINE_BOT_ID=your_bot_id
```

3. **デプロイ実行**
```bash
fly deploy
```

### Docker デプロイメント
```bash
# イメージビルド
docker build -t zaikon .

# コンテナ実行
docker run -p 3000:3000 \
  -e ADMIN_KEY=your_key \
  -e GMAIL_USER=your_email \
  -e GMAIL_PASS=your_password \
  -v ./data:/data \
  zaikon
```

## 🔒 セキュリティ

### 実装済みセキュリティ機能
- **セッション管理**: ファイルベースのセッションストア
- **管理者認証**: URL パスベースの管理者アクセス制限
- **メール禁止リスト**: 不正なメールアドレスのブロック
- **入力検証**: SQLインジェクション対策
- **CSRF保護**: 適切なセッション管理

### セキュリティ推奨事項
1. **ADMIN_KEY を強力に設定**: 32文字以上のランダム文字列
2. **HTTPS を使用**: 本番環境では必須
3. **定期的なバックアップ**: データベースファイルのバックアップ
4. **アップデート**: 依存関係の定期的な更新

## 🛠️ 開発・コントリビューション

### 開発環境の準備
```bash
# リポジトリのフォーク・クローン
git clone your-fork-url
cd zaikon

# 開発ブランチ作成
git checkout -b feature/your-feature

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

### コード規約
- **ES6+** の JavaScript 構文を使用
- **MVC パターン** に従った構造
- **Repository パターン** でデータアクセス層を分離
- **適切なエラーハンドリング** の実装

### プロジェクト構造
```
zaikon/
├── app.js                 # メインアプリケーション
├── db.js                  # データベース接続
├── migrate_runner.js      # マイグレーション実行
├── controllers/           # コントローラー層
├── repositories/          # データアクセス層
├── views/                 # EJS テンプレート
├── public/                # 静的ファイル
├── migrations/            # データベースマイグレーション
├── tests/                 # テストファイル
└── data/                  # データベース・セッション
```

## 📊 データベース設計

### 主要テーブル
- **users**: ユーザー情報、LINE連携ID
- **locations**: 場所・グループ情報
- **items**: アイテム情報、在庫数、しきい値
- **members**: ユーザーと場所の関連付け
- **ban_emails**: 禁止メールアドレスリスト
- **temporary_purchases**: 臨時購入依頼

### マイグレーション管理
- `migrations/` ディレクトリの連番ファイル
- Up/Down パターンでロールバック対応
- 自動実行による環境間一貫性

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### データベース関連
```bash
# データベースファイルが見つからない
npm run migrate

# マイグレーションエラー
rm -rf data/zaikon.db  # 開発環境のみ
npm run migrate
```

#### LINE Bot 連携
```bash
# Webhook URLの設定確認
curl -X POST https://your-app.fly.dev/webhook
```

#### メール送信エラー
- Gmail App Password の確認
- 2段階認証の有効化
- 環境変数の設定確認

#### セッションエラー
```bash
# セッションファイル削除
rm -rf data/sessions/*
```

## 📝 ライセンス

ISC License

## 👥 作者・コントリビューター

- **Main Developer**: [Your Name]
- **Contributors**: [List contributors]

## 📞 サポート・お問い合わせ

- **Issues**: GitHub Issues でバグ報告・機能要求
- **Email**: [your-email@example.com]
- **Documentation**: [Wiki or Docs URL]

---

Zaikon を使用していただき、ありがとうございます！ 🎉