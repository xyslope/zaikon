const TemporaryPurchaseRepository = require('../repositories/TemporaryPurchaseRepository');

class TemporaryPurchaseController {
  // 臨時購入依頼作成
  static createTempPurchase(req, res) {
    const { userId } = req.params;
    const { item_name, description, priority } = req.body;
    const sessionUser = req.session.user;

    // セッション検証
    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    // 入力検証
    if (!item_name || item_name.trim() === '') {
      return res.status(400).json({ error: 'アイテム名は必須です' });
    }

    try {
      const tempPurchase = TemporaryPurchaseRepository.create({
        user_id: userId,
        item_name: item_name.trim(),
        description: description ? description.trim() : null,
        priority: priority || 'medium',
        status: 'pending'
      });

      res.json({ 
        success: true, 
        tempPurchase,
        message: '臨時購入依頼を作成しました' 
      });
    } catch (err) {
      console.error('臨時購入依頼作成エラー:', err);
      res.status(500).json({ error: '臨時購入依頼の作成に失敗しました' });
    }
  }

  // ユーザーの臨時購入依頼一覧取得
  static getUserTempPurchases(req, res) {
    const { userId } = req.params;
    const sessionUser = req.session.user;

    // セッション検証
    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      const tempPurchases = TemporaryPurchaseRepository.findByUserId(userId);
      res.json({ success: true, tempPurchases });
    } catch (err) {
      console.error('臨時購入依頼取得エラー:', err);
      res.status(500).json({ error: '臨時購入依頼の取得に失敗しました' });
    }
  }

  // アクティブな臨時購入依頼取得
  static getActiveTempPurchases(req, res) {
    const { userId } = req.params;
    const sessionUser = req.session.user;

    // セッション検証
    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      const activePurchases = TemporaryPurchaseRepository.findActiveByUserId(userId);
      res.json({ success: true, tempPurchases: activePurchases });
    } catch (err) {
      console.error('アクティブ臨時購入依頼取得エラー:', err);
      res.status(500).json({ error: 'アクティブ臨時購入依頼の取得に失敗しました' });
    }
  }

  // 臨時購入依頼完了
  static completeTempPurchase(req, res) {
    const { tempId } = req.params;
    const sessionUser = req.session.user;

    try {
      // 臨時購入依頼の所有者確認
      const tempPurchase = TemporaryPurchaseRepository.findById(tempId);
      if (!tempPurchase) {
        return res.status(404).json({ error: '臨時購入依頼が見つかりません' });
      }

      if (!sessionUser || sessionUser.user_id !== tempPurchase.user_id) {
        return res.status(403).json({ error: '権限がありません' });
      }

      // ステータスを完了に更新
      TemporaryPurchaseRepository.updateStatus(tempId, 'completed');

      res.json({ 
        success: true, 
        message: '臨時購入依頼を完了しました' 
      });
    } catch (err) {
      console.error('臨時購入依頼完了エラー:', err);
      res.status(500).json({ error: '臨時購入依頼の完了処理に失敗しました' });
    }
  }

  // 臨時購入依頼削除
  static deleteTempPurchase(req, res) {
    const { tempId } = req.params;
    const sessionUser = req.session.user;

    try {
      // 臨時購入依頼の所有者確認
      const tempPurchase = TemporaryPurchaseRepository.findById(tempId);
      if (!tempPurchase) {
        return res.status(404).json({ error: '臨時購入依頼が見つかりません' });
      }

      if (!sessionUser || sessionUser.user_id !== tempPurchase.user_id) {
        return res.status(403).json({ error: '権限がありません' });
      }

      // 削除実行
      TemporaryPurchaseRepository.delete(tempId);

      res.json({ 
        success: true, 
        message: '臨時購入依頼を削除しました' 
      });
    } catch (err) {
      console.error('臨時購入依頼削除エラー:', err);
      res.status(500).json({ error: '臨時購入依頼の削除に失敗しました' });
    }
  }

  // 臨時購入依頼更新
  static updateTempPurchase(req, res) {
    const { tempId } = req.params;
    const { item_name, description, priority } = req.body;
    const sessionUser = req.session.user;

    try {
      // 臨時購入依頼の所有者確認
      const tempPurchase = TemporaryPurchaseRepository.findById(tempId);
      if (!tempPurchase) {
        return res.status(404).json({ error: '臨時購入依頼が見つかりません' });
      }

      if (!sessionUser || sessionUser.user_id !== tempPurchase.user_id) {
        return res.status(403).json({ error: '権限がありません' });
      }

      // 入力検証
      if (!item_name || item_name.trim() === '') {
        return res.status(400).json({ error: 'アイテム名は必須です' });
      }

      // 更新実行
      const updatedData = {
        item_name: item_name.trim(),
        description: description ? description.trim() : null,
        priority: priority || tempPurchase.priority
      };

      TemporaryPurchaseRepository.update(tempId, updatedData);

      res.json({ 
        success: true, 
        message: '臨時購入依頼を更新しました' 
      });
    } catch (err) {
      console.error('臨時購入依頼更新エラー:', err);  
      res.status(500).json({ error: '臨時購入依頼の更新に失敗しました' });
    }
  }
}

module.exports = TemporaryPurchaseController;