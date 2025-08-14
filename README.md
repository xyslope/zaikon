# Zaikon - 在庫管理システム

LINE Bot連携機能付きの在庫管理Webアプリケーションです。

## 概要

ZaikonはNode.js/Express.jsベースの在庫管理システムで、以下の機能を提供します：

- **在庫管理**: アイテムの追加、編集、削除
- **場所管理**: 在庫を管理する場所の設定
- **メンバー管理**: システム利用者の管理
- **LINE Bot連携**: LINEメッセージによる在庫状況の確認
- **管理者機能**: ユーザー管理、システム設定

## 技術スタック

- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Template Engine**: EJS
- **Frontend**: HTML, CSS, JavaScript
- **Icons**: Font Awesome
- **Authentication**: セッションベース認証
- **LINE Integration**: @line/bot-sdk

## 開発環境のセットアップ

### 前提条件
- Node.js (v18以上推奨)
- npm

### インストールと起動

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# 本番サーバーの起動
npm start
```

### データベース
SQLiteデータベースが自動的に作成され、マイグレーションが実行されます。

### 環境変数
`.env`ファイルを作成し、以下の変数を設定してください：

```env
ADMIN_KEY=your_secret_admin_key
NODE_ENV=development
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
```

## テスト

```bash
# テストの実行
npm test

# カバレッジ付きテストの実行
npm run testcover
```

## デプロイ

### Fly.io デプロイ

1. Fly.ioアカウント作成とCLIインストール
   ```bash
   # CLIインストール (Mac/Linux)
   curl -L https://fly.io/install.sh | sh
   
   # ログイン
   fly auth login
   ```

2. アプリケーションのデプロイ
   ```bash
   # プロジェクトディレクトリに移動
   cd your-project-directory
   
   # 初回セットアップ
   fly launch
   
   # 環境変数の設定
   fly secrets set ADMIN_KEY=your_secret_key
   fly secrets set LINE_CHANNEL_SECRET=your_line_secret
   fly secrets set LINE_CHANNEL_ACCESS_TOKEN=your_line_token
   
   # デプロイ
   fly deploy
   ```

## プロジェクト構造

```
zaikon/
├── app.js                 # メインアプリケーション
├── db.js                 # データベース接続
├── migrate_runner.js     # マイグレーション実行
├── controllers/          # MVCコントローラー
├── repositories/         # データアクセス層
├── migrations/           # データベースマイグレーション
├── views/               # EJSテンプレート
├── public/              # 静的ファイル
└── tests/               # テストファイル
```

## 機能一覧

### 基本機能
- **アイテム管理**: 在庫アイテムの CRUD 操作
- **場所管理**: 在庫保管場所の管理
- **在庫状況表示**: 各場所の在庫レベル表示

### LINE Bot機能
- **在庫確認**: LINEメッセージで在庫状況を確認
- **ウェブフック**: LINE Messaging APIとの連携

### 管理機能
- **ユーザー管理**: メンバーの追加・編集・削除
- **システム設定**: LINE Bot設定、管理者機能

## UIアイコン

| 機能    | アイコン (Font Awesome)              |
|---------|--------------------------------------|
| 追加    | `<i class="fas fa-plus"></i>`       |
| 削除    | `<i class="fas fa-trash"></i>`      |
| 編集    | `<i class="fas fa-pen"></i>`        |
| 設定    | `<i class="fas fa-cog"></i>`        |

## セキュリティ

### 管理者認証
- 管理者用ルートは `ADMIN_KEY` による簡易認証を使用
- 管理者URLパターン: `/admin/{ADMIN_KEY}/...`
- 秘密キーは環境変数で管理し、十分な長さの予測困難な文字列を使用

### セキュリティ考慮事項
- セッションベース認証でユーザー状態を管理
- 環境変数による機密情報の管理
- LINE Bot秘密キーの適切な管理

## 開発ガイドライン

### 新機能追加時の注意点
1. 管理者用機能は必ず `ADMIN_KEY` 認証を実装
2. データベース変更時はマイグレーションファイルを作成
3. 新しいルートは適切なコントローラーに実装
4. テストケースの追加を推奨

### コードレビュー項目
- 管理者ルートのアクセス保護が適切に設定されているか
- データベースアクセスはリポジトリパターンに従っているか
- エラーハンドリングが適切に実装されているか

## 貢献

プロジェクトへの貢献は歓迎します。プルリクエストを送信する前に：

1. テストが通ることを確認
2. コードスタイルを既存コードに合わせる
3. 必要に応じてドキュメントを更新

## ライセンス

このプロジェクトのライセンス情報については、プロジェクト管理者にお問い合わせください。
