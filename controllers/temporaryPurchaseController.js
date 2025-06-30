const { v4: uuidv4 } = require('uuid');
const TemporaryPurchaseRepository = require('../repositories/TemporaryPurchaseRepository');

class TemporaryPurchaseController {
  // 臨時購入依頼作成
  static createTempPurchase(req, res) {
    const { userId } = req.params;
    const { item_name, description, priority, requested_for_user, expires_hours } = req.body;
    const sessionUser = req.session.user;

    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    if (!item_name || item_name.trim().length === 0) {
      return res.status(400).json({ error: 'アイテム名を入力してください' });
    }

    try {
      const now = new Date().toISOString();
      let expiresAt = null;
      
      // 期限設定（デフォルトは24時間）
      if (expires_hours) {
        const expireDate = new Date();
        expireDate.setHours(expireDate.getHours() + parseInt(expires_hours, 10));
        expiresAt = expireDate.toISOString();
      } else {
        const expireDate = new Date();
        expireDate.setHours(expireDate.getHours() + 24); // デフォルト24時間
        expiresAt = expireDate.toISOString();
      }

      const tempPurchase = {
        temp_id: 'tmp_' + uuidv4().slice(0, 12),
        item_name: item_name.trim(),
        description: description ? description.trim() : null,
        requested_by: userId,
        requested_for_user: requested_for_user || userId,
        priority: parseInt(priority, 10) || 1,
        status: 'pending',
        created_at: now,
        expires_at: expiresAt
      };

      TemporaryPurchaseRepository.create(tempPurchase);

      res.json({ 
        success: true, 
        message: '臨時購入依頼を作成しました',
        temp_id: tempPurchase.temp_id
      });

    } catch (error) {
      console.error('臨時購入依頼作成エラー:', error);
      res.status(500).json({ error: '臨時購入依頼の作成中にエラーが発生しました' });
    }
  }

  // ユーザーの臨時購入依頼一覧取得
  static getUserTempPurchases(req, res) {
    const { userId } = req.params;
    const sessionUser = req.session.user;

    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      const purchases = TemporaryPurchaseRepository.findByUser(userId);
      res.json(purchases);
    } catch (error) {
      console.error('臨時購入依頼取得エラー:', error);
      res.status(500).json({ error: '臨時購入依頼の取得中にエラーが発生しました' });
    }
  }

  // アクティブな臨時購入依頼一覧取得
  static getActiveTempPurchases(req, res) {
    const { userId } = req.params;
    const sessionUser = req.session.user;

    if (!sessionUser || sessionUser.user_id !== userId) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      const purchases = TemporaryPurchaseRepository.findActivePurchases(userId);
      res.json(purchases);
    } catch (error) {
      console.error('アクティブ臨時購入依頼取得エラー:', error);
      res.status(500).json({ error: '臨時購入依頼の取得中にエラーが発生しました' });
    }
  }

  // 臨時購入依頼完了
  static completeTempPurchase(req, res) {
    const { tempId } = req.params;
    const sessionUser = req.session.user;

    if (!sessionUser) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      const purchase = TemporaryPurchaseRepository.findById(tempId);
      if (!purchase) {
        return res.status(404).json({ error: '臨時購入依頼が見つかりません' });
      }

      // 自分が依頼したもの、または自分への依頼のみ完了可能
      if (purchase.requested_by !== sessionUser.user_id && 
          purchase.requested_for_user !== sessionUser.user_id) {
        return res.status(403).json({ error: 'この依頼を完了する権限がありません' });
      }

      TemporaryPurchaseRepository.markAsCompleted(tempId, sessionUser.user_id);

      res.json({ 
        success: true, 
        message: '臨時購入依頼を完了しました'
      });

    } catch (error) {
      console.error('臨時購入依頼完了エラー:', error);
      res.status(500).json({ error: '臨時購入依頼の完了処理中にエラーが発生しました' });
    }
  }

  // 臨時購入依頼削除
  static deleteTempPurchase(req, res) {
    const { tempId } = req.params;
    const sessionUser = req.session.user;

    if (!sessionUser) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      const purchase = TemporaryPurchaseRepository.findById(tempId);
      if (!purchase) {
        return res.status(404).json({ error: '臨時購入依頼が見つかりません' });
      }

      // 自分が依頼したもののみ削除可能
      if (purchase.requested_by !== sessionUser.user_id) {
        return res.status(403).json({ error: 'この依頼を削除する権限がありません' });
      }

      TemporaryPurchaseRepository.delete(tempId);

      res.json({ 
        success: true, 
        message: '臨時購入依頼を削除しました'
      });

    } catch (error) {
      console.error('臨時購入依頼削除エラー:', error);
      res.status(500).json({ error: '臨時購入依頼の削除処理中にエラーが発生しました' });
    }
  }

  // 臨時購入依頼更新
  static updateTempPurchase(req, res) {
    const { tempId } = req.params;
    const { item_name, description, priority } = req.body;
    const sessionUser = req.session.user;

    if (!sessionUser) {
      return res.status(403).json({ error: '権限がありません' });
    }

    try {
      const purchase = TemporaryPurchaseRepository.findById(tempId);
      if (!purchase) {
        return res.status(404).json({ error: '臨時購入依頼が見つかりません' });
      }

      // 自分が依頼したもののみ更新可能
      if (purchase.requested_by !== sessionUser.user_id) {
        return res.status(403).json({ error: 'この依頼を更新する権限がありません' });
      }

      const updates = {};
      if (item_name !== undefined) updates.item_name = item_name.trim();
      if (description !== undefined) updates.description = description ? description.trim() : null;
      if (priority !== undefined) updates.priority = parseInt(priority, 10);

      TemporaryPurchaseRepository.update(tempId, updates);

      res.json({ 
        success: true, 
        message: '臨時購入依頼を更新しました'
      });

    } catch (error) {
      console.error('臨時購入依頼更新エラー:', error);
      res.status(500).json({ error: '臨時購入依頼の更新処理中にエラーが発生しました' });
    }
  }
}

module.exports = TemporaryPurchaseController;