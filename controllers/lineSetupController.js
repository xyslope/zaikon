const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/UserRepository');

// 一時的なリンク用ストレージ（本番環境ではRedisなどを使用）
const pendingLinks = new Map();

class LineSetupController {
  // LINE連携用のQRコード生成
  static generateLinkCode(req, res) {
    const { userId } = req.params;
    const sessionUser = req.session.user;

    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    // 一意のリンクコードを生成（10分間有効）
    const linkCode = uuidv4().slice(0, 8);
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10分後

    pendingLinks.set(linkCode, {
      userId,
      userName: sessionUser.user_name,
      expiresAt
    });

    // 古い期限切れのコードを削除
    for (const [code, data] of pendingLinks.entries()) {
      if (data.expiresAt < Date.now()) {
        pendingLinks.delete(code);
      }
    }

    const baseUrl = (process.env.BASE_URL || `http://localhost:3000`).replace(/\/+$/, '');
    const linkUrl = `${baseUrl}/line-setup/${linkCode}`;

    res.json({
      linkCode,
      linkUrl,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkUrl)}`,
      expiresAt
    });
  }

  // LINE友だち追加用のページ
  static showLinkPage(req, res) {
    const { linkCode } = req.params;
    const linkData = pendingLinks.get(linkCode);

    if (!linkData || linkData.expiresAt < Date.now()) {
      return res.status(404).send(`
        <h1>リンクが無効です</h1>
        <p>このリンクは既に期限切れか、存在しません。</p>
        <p>Zaikonアプリから新しいリンクを生成してください。</p>
      `);
    }

    const botUrl = `https://line.me/R/ti/p/@${process.env.LINE_BOT_ID || 'your-bot-id'}`;
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Zaikon LINE連携</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; text-align: center; padding: 20px; }
          .container { max-width: 400px; margin: 0 auto; }
          .user-info { background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .line-btn { 
            background: #00C300; color: white; padding: 15px 30px; 
            border: none; border-radius: 25px; font-size: 16px; 
            text-decoration: none; display: inline-block; margin: 20px 0;
          }
          .instructions { text-align: left; background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔗 Zaikon LINE連携</h1>
          
          <div class="user-info">
            <strong>${linkData.userName}</strong> さんのLINE連携設定
          </div>

          <div class="instructions">
            <h3>📋 設定手順</h3>
            <ol>
              <li>下のボタンでZaikon Botを友だち追加</li>
              <li>Botに「${linkCode}」と送信</li>
              <li>自動的にLINE IDが設定されます</li>
            </ol>
          </div>

          <a href="${botUrl}" class="line-btn">
            📱 Zaikon Bot を友だち追加
          </a>

          <p><strong>リンクコード: ${linkCode}</strong></p>
          <p><small>このリンクは ${new Date(linkData.expiresAt).toLocaleString('ja-JP')} まで有効です</small></p>
        </div>
      </body>
      </html>
    `);
  }

  // LINE Botからのユーザー連携処理
  static linkUserAccount(req, res) {
    const { linkCode, lineUserId, displayName } = req.body;
    
    const linkData = pendingLinks.get(linkCode);
    if (!linkData || linkData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'リンクコードが無効です' });
    }

    try {
      // ユーザーのLINE IDを更新
      const user = UserRepository.findById(linkData.userId);
      if (!user) {
        return res.status(404).json({ error: 'ユーザーが見つかりません' });
      }

      UserRepository.updateUser({
        user_id: linkData.userId,
        user_name: user.user_name,
        user_description: user.user_description,
        line_user_id: lineUserId
      });

      // 使用済みのリンクコードを削除
      pendingLinks.delete(linkCode);

      res.json({ 
        success: true, 
        message: `${linkData.userName}さんのLINE連携が完了しました`,
        userName: linkData.userName
      });

    } catch (error) {
      console.error('LINE連携エラー:', error);
      res.status(500).json({ error: 'LINE連携処理中にエラーが発生しました' });
    }
  }

  // LINE連携解除
  static removeLinkConnection(req, res) {
    const { userId } = req.params;
    const sessionUser = req.session.user;

    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      // ユーザーのLINE連携情報を取得
      const user = UserRepository.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'ユーザーが見つかりません' });
      }

      if (!user.line_user_id) {
        return res.status(400).json({ error: 'LINE連携されていません' });
      }

      // LINE連携を解除（line_user_idをNULLに設定）
      UserRepository.updateUser({
        user_id: userId,
        user_name: user.user_name,
        user_description: user.user_description,
        line_user_id: null
      });

      res.json({ 
        success: true, 
        message: 'LINE連携を解除しました' 
      });

    } catch (error) {
      console.error('LINE連携解除エラー:', error);
      res.status(500).json({ error: 'LINE連携解除処理中にエラーが発生しました' });
    }
  }
}

module.exports = LineSetupController;