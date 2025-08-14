# zaikon

## スクリプトの起動
> npm run dev

## Coolifyを使うことにしたので以下は無効

## デプロイ方法
Fly.ioの公式サイト（https://fly.io） でアカウント登録。
ローカルにFly CLIをインストール（WindowsならWingetやChocolatey、Mac/LinuxならHomebrewやスクリプトで）。
CLIでログイン fly auth login
プロジェクトディレクトリに移動して、fly launchを実行（アプリ名、リージョン、Dockerfile自動検出など対話式）。
fly deploy でデプロイ。
デプロイ完了後、生成されたURLでアプリがアクセス可能。

Flyは環境変数の設定もCLIから可能：fly secrets set ADMIN_KEY=yourkey

# Fly CLIインストール済みと仮定

cd your-project-directory
fly auth login
fly launch  # 対話に答えるだけで設定完了
fly deploy

Fly CLIでログイン（ローカル環境で）
fly secrets set コマンドで必要な環境変数（ADMIN_KEYなど）を設定
fly deploy コマンドでデプロイ

## アイコンたち
| 機能    | テキストボタン           | アイコン（Font Awesome）             |
| ----- | ----------------- | ------------------------------ |
| 追加    | `追加`              | `<i class="fas fa-plus"></i>`  |
| 削除    | `削除`              | `<i class="fas fa-trash"></i>` |
| 変更    | `変更`              | `<i class="fas fa-pen"></i>`   |
| ステータス | `Red`, `Green` など | 色付き丸いアイコン（下記参照）                |


管理者用ルート設計とアクセス制御ポリシー
本プロジェクトでは、管理者向け機能のルートは以下のように設計されています。

管理者用ページおよびAPIエンドポイントは ... の形で提供
{ADMIN_KEY} は .env ファイルに設定された秘密のキー（例: ADMIN_KEY=your_secret_key）
実環境では予測困難で十分な長さの文字列を設定してください
これにより、管理者用URLを知る者のみがアクセス可能となり、簡易的ながら認証代わりの役割を果たします
すべての管理者用APIルートはこのキー入りパスを必須とし、未認証や誤ったパスへのアクセスはリダイレクトや拒否されます
管理者キーは厳重に管理し、第三者に漏えいしないよう注意してください
将来的にはより強力な認証・認可機構（OAuth、トークン認証など）を導入することも検討してください
開発者へのお願い
新規作成する管理者用のルート・機能は必ずこのパス設計ルールに従うこと
管理者向けルートへアクセス保護が適切に設定されていることをコードレビューで確認すること
