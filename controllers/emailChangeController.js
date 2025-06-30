const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/UserRepository');

// メモリ内での一時的な変更リクエスト保存
const changeRequests = new Map();

class EmailChangeController {
  // メール変更リクエスト生成
  static generateChangeRequest(req, res) {
    const { userId } = req.params;
    const { newEmail } = req.body;
    const sessionUser = req.session.user;

    // セッション検証
    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    // メールアドレス検証
    if (!newEmail || !newEmail.includes('@')) {
      return res.status(400).json({ error: '有効なメールアドレスを入力してください' });
    }

    // 同じメールアドレスかチェック
    if (sessionUser.email === newEmail) {
      return res.status(400).json({ error: '現在のメールアドレスと同じです' });
    }

    // 既存のユーザーがそのメールアドレスを使用していないかチェック
    const existingUser = UserRepository.findByEmail(newEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'このメールアドレスは既に使用されています' });
    }

    try {
      // 変更コード生成（30分有効）
      const changeCode = uuidv4();
      const expiresAt = Date.now() + 30 * 60 * 1000; // 30分

      // 変更リクエストを保存
      changeRequests.set(changeCode, {
        userId,
        currentEmail: sessionUser.email,
        newEmail,
        expiresAt,
        createdAt: Date.now()
      });

      // 古い期限切れリクエストを削除（クリーンアップ）
      for (const [code, request] of changeRequests.entries()) {
        if (request.expiresAt < Date.now()) {
          changeRequests.delete(code);
        }
      }

      res.json({ 
        success: true, 
        changeCode,
        message: 'メール変更リクエストが生成されました' 
      });
    } catch (err) {
      console.error('メール変更リクエスト生成エラー:', err);
      res.status(500).json({ error: 'リクエスト生成中にエラーが発生しました' });
    }
  }

  // メール変更確認ページ表示
  static showChangeConfirmPage(req, res) {
    const { changeCode } = req.params;

    const request = changeRequests.get(changeCode);
    if (!request) {
      return res.status(404).send('変更リクエストが見つからないか、期限切れです。');
    }

    // 期限チェック
    if (request.expiresAt < Date.now()) {
      changeRequests.delete(changeCode);
      return res.status(410).send('変更リクエストの期限が切れています。再度お試しください。');
    }

    // 確認ページをレンダリング（簡単なHTMLページ）
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>メールアドレス変更確認</title>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
    .container { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
    .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
    .btn:hover { background: #0056b3; }
    .cancel { background: #6c757d; margin-left: 10px; }
    .cancel:hover { background: #5a6268; }
  </style>
</head>
<body>
  <div class="container">
    <h2>メールアドレス変更確認</h2>
    <p><strong>現在のメール:</strong> ${request.currentEmail}</p>
    <p><strong>新しいメール:</strong> ${request.newEmail}</p>
    <p>このメールアドレス変更を実行しますか？</p>
    
    <form method="POST" action="/api/email/confirm-change">
      <input type="hidden" name="changeCode" value="${changeCode}">
      <button type="submit" class="btn">変更を確定</button>
      <button type="button" class="btn cancel" onclick="window.close()">キャンセル</button>
    </form>
  </div>
</body>
</html>`;

    res.send(html);
  }

  // メール変更実行
  static confirmEmailChange(req, res) {
    const { changeCode } = req.body;

    const request = changeRequests.get(changeCode);
    if (!request) {
      return res.status(404).send('変更リクエストが見つからないか、期限切れです。');
    }

    // 期限チェック
    if (request.expiresAt < Date.now()) {
      changeRequests.delete(changeCode);
      return res.status(410).send('変更リクエストの期限が切れています。');
    }

    try {
      // データベースでメールアドレスを更新
      UserRepository.updateEmail(request.userId, request.newEmail);

      // 変更リクエストを削除
      changeRequests.delete(changeCode);

      // 成功ページ
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>メールアドレス変更完了</title>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
    .container { border: 1px solid #28a745; padding: 20px; border-radius: 8px; background: #d4edda; }
    .success { color: #155724; }
  </style>
</head>
<body>
  <div class="container">
    <h2 class="success">メールアドレス変更完了</h2>
    <p>メールアドレスが正常に変更されました。</p>
    <p><strong>新しいメール:</strong> ${request.newEmail}</p>
    <p>次回ログイン時から新しいメールアドレスをご使用ください。</p>
    <button onclick="window.close()" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">閉じる</button>
  </div>
</body>
</html>`;

      res.send(html);
    } catch (err) {
      console.error('メールアドレス変更エラー:', err);
      res.status(500).send('メールアドレス変更中にエラーが発生しました。');
    }
  }
}

module.exports = EmailChangeController;