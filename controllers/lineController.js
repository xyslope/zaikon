const { Client } = require('@line/bot-sdk');
const ItemRepository = require('../repositories/ItemRepository');
const UserRepository = require('../repositories/UserRepository');

class LineController {
  static async sendReplenishList(req, res) {
    const { userId } = req.params;
    const sessionUser = req.session.user;

    // セッションチェック
    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      // 要補充リスト（inuse=2）のアイテムを取得
      const replenishItems = ItemRepository.findItemsByUserWithConditions(userId, 2, null);
      
      if (replenishItems.length === 0) {
        return res.json({ message: '要補充のアイテムはありません' });
      }

      // LINE用のメッセージを作成
      const message = createReplenishMessage(replenishItems, sessionUser.user_name);
      
      // LINE設定チェック
      const lineConfig = {
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
      };

      if (!lineConfig.channelAccessToken) {
        return res.status(500).json({ 
          error: 'LINE設定が不完全です。管理者にお問い合わせください。' 
        });
      }

      const client = new Client(lineConfig);
      
      // ユーザーのLINE ID設定を取得
      const user = UserRepository.findById(userId);
      if (!user || !user.line_user_id) {
        return res.status(400).json({ 
          error: 'LINE送信先が設定されていません。ユーザー編集画面でLINE IDを設定してください。' 
        });
      }

      // LINEメッセージ送信
      await client.pushMessage(user.line_user_id, {
        type: 'text',
        text: message
      });

      res.json({ 
        message: 'LINEに要補充リストを送信しました',
        itemCount: replenishItems.length
      });

    } catch (error) {
      console.error('LINE送信エラー:', error);
      res.status(500).json({ 
        error: 'LINE送信中にエラーが発生しました: ' + error.message 
      });
    }
  }

  static async sendShoppingList(req, res) {
    const { userId } = req.params;
    const sessionUser = req.session.user;

    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      // 買い物リスト（status=Red）のアイテムを取得
      const shoppingItems = ItemRepository.findItemsByUserWithConditions(userId, null, 'Red');
      
      if (shoppingItems.length === 0) {
        return res.json({ message: '買い物が必要なアイテムはありません' });
      }

      const message = createShoppingMessage(shoppingItems, sessionUser.user_name);
      
      const lineConfig = {
        channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
        channelSecret: process.env.LINE_CHANNEL_SECRET,
      };

      if (!lineConfig.channelAccessToken) {
        return res.status(500).json({ 
          error: 'LINE設定が不完全です。管理者にお問い合わせください。' 
        });
      }

      const client = new Client(lineConfig);
      
      // ユーザーのLINE ID設定を取得
      const user = UserRepository.findById(userId);
      if (!user || !user.line_user_id) {
        return res.status(400).json({ 
          error: 'LINE送信先が設定されていません。ユーザー編集画面でLINE IDを設定してください。' 
        });
      }

      await client.pushMessage(user.line_user_id, {
        type: 'text',
        text: message
      });

      res.json({ 
        message: 'LINEに買い物リストを送信しました',
        itemCount: shoppingItems.length
      });

    } catch (error) {
      console.error('LINE送信エラー:', error);
      res.status(500).json({ 
        error: 'LINE送信中にエラーが発生しました: ' + error.message 
      });
    }
  }
}

// 要補充リスト用のメッセージを作成
function createReplenishMessage(items, userName) {
  const header = `🔔 要補充リスト - ${userName}さん\n\n`;
  
  let body = '';
  const locationGroups = {};
  
  // 場所ごとにグループ化
  items.forEach(item => {
    if (!locationGroups[item.location_name]) {
      locationGroups[item.location_name] = [];
    }
    locationGroups[item.location_name].push(item);
  });

  // 場所ごとにメッセージを作成
  Object.keys(locationGroups).forEach(locationName => {
    body += `📍 ${locationName}\n`;
    locationGroups[locationName].forEach(item => {
      body += `  • ${item.item_name} (現在の在庫: ${item.amount})\n`;
    });
    body += '\n';
  });

  const footer = `合計 ${items.length} 個のアイテムが要補充です。\n\n⏰ ${new Date().toLocaleString('ja-JP')}`;
  
  return header + body + footer;
}

// 買い物リスト用のメッセージを作成
function createShoppingMessage(items, userName) {
  const header = `🛒 買い物リスト - ${userName}さん\n\n`;
  
  let body = '';
  const locationGroups = {};
  
  items.forEach(item => {
    if (!locationGroups[item.location_name]) {
      locationGroups[item.location_name] = [];
    }
    locationGroups[item.location_name].push(item);
  });

  Object.keys(locationGroups).forEach(locationName => {
    body += `📍 ${locationName}\n`;
    locationGroups[locationName].forEach(item => {
      body += `  • ${item.item_name} (在庫切れ)\n`;
    });
    body += '\n';
  });

  const footer = `合計 ${items.length} 個のアイテムが在庫切れです。\n\n⏰ ${new Date().toLocaleString('ja-JP')}`;
  
  return header + body + footer;
}

module.exports = LineController;