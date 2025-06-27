const { v4: uuidv4 } = require('uuid');
const ItemRepository = require('../repositories/ItemRepository');

function calculateStatus(amount, yellow, green, purple) {
  amount = Number(amount);
  yellow = Number(yellow);
  green = Number(green);
  purple = Number(purple);
  if (amount >= purple) return 'Purple';
  if (amount >= green) return 'Green';
  if (amount >= yellow) return 'Yellow';
  return 'Red';
}

class ItemController {
  static postAddItem(req, res) {
    const { locationId } = req.params;
    const { item_name, yellow, green, purple, amount } = req.body;

    try {
      const now = new Date().toISOString();
      const yellowVal = parseInt(yellow || '1', 10);
      const greenVal = parseInt(green || '3', 10);
      const purpleVal = parseInt(purple || '6', 10);
      const amountVal = parseInt(amount || '0', 10);
      const newItem = {
        item_id: 'itm_' + uuidv4().slice(0, 8),
        item_name,
        location_id: locationId,
        yellow: yellowVal,
        green: greenVal,
        purple: purpleVal,
        amount: amountVal,
        status: calculateStatus(amountVal, yellowVal, greenVal, purpleVal),
        inuse: 0,
        created_at: now,
        updated_at: now
      };

      ItemRepository.addItem(newItem);
      res.redirect(`/location/${locationId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('アイテム追加中にエラーが発生しました');
    }
  }

  static postUpdateAmount(req, res) {
    const { locationId, itemId } = req.params;
    const { action, value } = req.body;
    try {
      const item = ItemRepository.findByLocationId(locationId).find(i => i.item_id === itemId);
      if (!item) return res.redirect(`/location/${locationId}`);
      let newAmount = item.amount;
      if (action === 'increment') newAmount = item.amount + 1;
      if (action === 'decrement') newAmount = Math.max(0, item.amount - 1);
      if (action === 'set' && typeof value !== 'undefined') newAmount = Math.max(0, parseInt(value, 10));
      ItemRepository.updateAmount(itemId, newAmount);
      res.redirect(`/location/${locationId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('amount変更中にエラーが発生しました');
    }
  }

  static postUpdateInuse(req, res) {
    const { locationId, itemId } = req.params;
    const { current_inuse } = req.body;
    try {
      const item = ItemRepository.findByLocationId(locationId).find(i => i.item_id === itemId);
      if (!item) return res.redirect(`/location/${locationId}`);
      let newInuse = (parseInt(current_inuse, 10) + 1) % 3;
      let newAmount = item.amount;
      if (parseInt(current_inuse, 10) === 2 && newInuse === 0) {
        newAmount = Math.max(0, newAmount - 1);
        ItemRepository.updateInuseAndAmount(itemId, newInuse, newAmount);
      } else {
        ItemRepository.updateInuse(itemId, newInuse);
      }
      res.redirect(`/location/${locationId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('inuse切り替え中にエラーが発生しました');
    }
  }

  static postUpdateItem(req, res) {
    const { locationId } = req.params;
    const { item_id, new_amount } = req.body;

    try {
      const item = ItemRepository.findById(item_id);
      if (!item) {
        return res.redirect(`/location/${locationId}`);
      }

      ItemRepository.updateAmount(
        item_id,
        Number(new_amount),
        calculateStatus(new_amount, item.yellow, item.green, item.purple)
      );

      res.redirect(`/location/${locationId}`);
    } catch (err) {
      res.status(500).send('アイテム更新中にエラーが発生しました');
    }
  }

  static postDeleteItem(req, res) {
    const { locationId } = req.params;
    const { item_id } = req.body;

    if (!item_id) return res.redirect(`/location/${locationId}`);

    try {
      ItemRepository.delete(item_id);
      res.redirect(`/location/${locationId}`);
    } catch (err) {
      res.status(500).send('アイテム削除中にエラーが発生しました');
    }
  }

  static getReplenishList(req, res) {
    const { userId } = req.params;
    try {
      const items = ItemRepository.findItemsByUserWithConditions(userId, 2, null);
      res.json(items);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '要補充リスト取得中にエラーが発生しました' });
    }
  }

  static getShoppingList(req, res) {
    const { userId } = req.params;
    try {
      const items = ItemRepository.findItemsByUserWithConditions(userId, null, 'Red');
      res.json(items);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: '買い物リスト取得中にエラーが発生しました' });
    }
  }

  static getItemEdit(req, res) {
    const { itemId } = req.params;
    try {
      const item = ItemRepository.findById(itemId);
      if (!item) {
        return res.status(404).json({ error: 'アイテムが見つかりません' });
      }
      res.json(item);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'アイテム取得中にエラーが発生しました' });
    }
  }

  static postEditItem(req, res) {
    const { locationId, itemId } = req.params;
    const { item_name, yellow, green, purple, amount } = req.body;

    try {
      const yellowVal = parseInt(yellow, 10);
      const greenVal = parseInt(green, 10);
      const purpleVal = parseInt(purple, 10);
      const amountVal = parseInt(amount, 10);
      
      const status = calculateStatus(amountVal, yellowVal, greenVal, purpleVal);
      
      const itemData = {
        item_name,
        yellow: yellowVal,
        green: greenVal,
        purple: purpleVal,
        amount: amountVal,
        status
      };

      ItemRepository.updateItem(itemId, itemData);
      res.redirect(`/location/${locationId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('アイテム編集中にエラーが発生しました');
    }
  }}

module.exports = ItemController;
module.exports.calculateStatus = calculateStatus;