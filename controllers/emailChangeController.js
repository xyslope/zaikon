const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/UserRepository');
const BanEmailRepository = require('../repositories/BanEmailRepository');

// 一時的なメール変更用ストレージ（本番環境ではRedisなどを使用）
const pendingEmailChanges = new Map();

class EmailChangeController {
  // メール変更リクエスト生成
  static generateChangeRequest(req, res) {
    const { userId } = req.params;
    const { newEmail } = req.body;
    const sessionUser = req.session.user;

    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    if (!newEmail || !newEmail.includes('@')) {
      return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
    }

    try {
      // 新しいメールアドレスがBANされていないかチェック
      const banned = BanEmailRepository.findByEmail(newEmail);
      if (banned) {
        return res.status(400).json({ error: 'このメールアドレスは使用できません' });
      }

      // 新しいメールアドレスが既に使用されていないかチェック
      const existing = UserRepository.findByEmail(newEmail);
      if (existing) {
        return res.status(400).json({ error: 'このメールアドレスは既に使用されています' });
      }

      // 一意の変更コードを生成（30分間有効）
      const changeCode = uuidv4().slice(0, 12);
      const expiresAt = Date.now() + 30 * 60 * 1000; // 30分後

      pendingEmailChanges.set(changeCode, {
        userId,
        currentEmail: sessionUser.email,
        newEmail,
        userName: sessionUser.user_name,
        expiresAt
      });

      // 古い期限切れのコードを削除
      for (const [code, data] of pendingEmailChanges.entries()) {
        if (data.expiresAt < Date.now()) {
          pendingEmailChanges.delete(code);
        }
      }

      res.json({
        success: true,
        changeCode,
        message: 'メール変更の確認メールを現在のメールアドレスに送信します'
      });

    } catch (error) {
      console.error('メール変更リクエスト生成エラー:', error);
      res.status(500).json({ error: 'メール変更リクエスト処理中にエラーが発生しました' });
    }
  }

  // メール変更確認ページ
  static showChangeConfirmPage(req, res) {
    const { changeCode } = req.params;
    const changeData = pendingEmailChanges.get(changeCode);

    if (!changeData || changeData.expiresAt < Date.now()) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>メール変更 - リンク無効</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: sans-serif; text-align: center; padding: 20px;">
          <h1>❌ リンクが無効です</h1>
          <p>このリンクは既に期限切れか、存在しません。</p>
          <p>Zaikonアプリから新しいメール変更リクエストを送信してください。</p>
        </body>
        </html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>メールアドレス変更の確認</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
          .container { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .warning { background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff9800; }
          .btn { background: #2196F3; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
          .btn:hover { background: #1976D2; }
          .btn-cancel { background: #757575; margin-left: 10px; }
          .btn-cancel:hover { background: #424242; }
        </style>
      </head>
      <body>
        <h1>📧 メールアドレス変更の確認</h1>
        
        <div class="container">
          <h3>変更内容の確認</h3>
          <p><strong>ユーザー:</strong> ${changeData.userName}</p>
          <p><strong>現在のメール:</strong> ${changeData.currentEmail}</p>
          <p><strong>新しいメール:</strong> ${changeData.newEmail}</p>
        </div>

        <div class="warning">
          <strong>⚠️ 重要な注意事項</strong>
          <ul>
            <li>メールアドレスを変更すると、今後は新しいメールアドレスでログインします</li>
            <li>この操作は取り消せません</li>
            <li>変更後は新しいメールアドレスに通知が送信されます</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <button class="btn" onclick="confirmChange()">✅ メールアドレスを変更する</button>
          <button class="btn btn-cancel" onclick="window.close()">❌ キャンセル</button>
        </div>

        <div class="info">
          <small>このリンクは ${new Date(changeData.expiresAt).toLocaleString('ja-JP')} まで有効です</small>
        </div>

        <script>
          async function confirmChange() {
            if (!confirm('本当にメールアドレスを変更しますか？\\n\\nこの操作は取り消せません。')) {
              return;
            }

            try {
              const response = await fetch('/api/email/confirm-change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changeCode: '${changeCode}' })
              });
              
              const result = await response.json();
              
              if (response.ok) {
                alert('✅ ' + result.message);
                window.close();
              } else {
                alert('❌ ' + (result.error || 'エラーが発生しました'));
              }
            } catch (error) {
              alert('❌ 通信エラーが発生しました');
            }
          }
        </script>
      </body>
      </html>
    `);
  }

  // メール変更実行
  static confirmEmailChange(req, res) {
    const { changeCode } = req.body;
    
    const changeData = pendingEmailChanges.get(changeCode);
    if (!changeData || changeData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'メール変更コードが無効です' });
    }

    try {
      // 再度チェック（並行リクエスト対策）
      const banned = BanEmailRepository.findByEmail(changeData.newEmail);
      if (banned) {
        return res.status(400).json({ error: 'このメールアドレスは使用できません' });
      }

      const existing = UserRepository.findByEmail(changeData.newEmail);
      if (existing) {
        return res.status(400).json({ error: 'このメールアドレスは既に使用されています' });
      }

      // ユーザーのメールアドレスを更新
      const user = UserRepository.findById(changeData.userId);
      if (!user) {
        return res.status(404).json({ error: 'ユーザーが見つかりません' });
      }

      UserRepository.updateUserEmail(changeData.userId, changeData.newEmail);

      // 使用済みの変更コードを削除
      pendingEmailChanges.delete(changeCode);

      res.json({ 
        success: true, 
        message: `メールアドレスを ${changeData.newEmail} に変更しました`
      });

    } catch (error) {
      console.error('メール変更実行エラー:', error);
      res.status(500).json({ error: 'メール変更処理中にエラーが発生しました' });
    }
  }
}

module.exports = EmailChangeController;