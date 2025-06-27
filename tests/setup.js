// テスト環境のセットアップ
process.env.NODE_ENV = 'test';

// コンソールエラーをモック（テスト出力をクリーンに保つため）
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};