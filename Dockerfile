FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションファイルをコピー
COPY . .

# データディレクトリを作成（永続化用）
RUN mkdir -p /data /data/sessions

# ポート3000を公開
EXPOSE 3000

# アプリケーションを開始
CMD ["npm", "start"]