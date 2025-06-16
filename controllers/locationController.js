const { v4: uuidv4 } = require('uuid');
const LocationRepository = require('../repositories/LocationRepository');
const ItemRepository = require('../repositories/ItemRepository');
const MemberRepository = require('../repositories/MemberRepository');
const UserRepository = require('../repositories/UserRepository');
const db = require('../db');

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

class LocationController {
  static postAddLocation(req, res) {
    const user = req.session.user;
    if (!user) {
      console.warn('セッション切れで場所追加拒否');
      return res.status(401).send('セッションが切れています。再ログインしてください。');
    }

    const { location_name } = req.body;
    if (!location_name) return res.redirect(`/user/${user.user_id}`);

    try {
      const locationId = 'loc_' + uuidv4().slice(0, 8);
      const now = new Date().toISOString();
      console.log('場所を追加するよ')
      LocationRepository.create({
        location_id: locationId,
        location_name,
        owner_id: user.user_id,
        created_by: user.user_id,
        created_at: now
      });
      console.log('メンバーも追加するよ')

      MemberRepository.addMember({
        user_id: user.user_id,
        location_id: locationId,
        joined_at: now
      });
      console.log('元に戻るよ')

      res.redirect(`/user/${user.user_id}`);
    } catch (err) {
      console.error('場所追加時エラー:', err);
      res.status(500).send('場所の追加中にエラーが発生しました');
    }
  }

  static getLocation(req, res) {
    const { locationId } = req.params;
    const sessionUser = req.session.user;

    try {
      const location = LocationRepository.findById(locationId);
      if (!location) {
        return res.status(404).send('場所が見つかりません');
      }

      if (!sessionUser) {
        return res.status(403).send('アクセス権がありません（未ログイン）');
      }

      const isMember = MemberRepository.findWithUserDetails(locationId)
        .some(member => member.user_id === sessionUser.user_id);

      if (!isMember) {
        return res.status(403).send('アクセス権がありません');
      }

      const items = ItemRepository.findByLocationId(locationId);
      const members = MemberRepository.findWithUserDetails(locationId);

      res.render('location', {
        locationId,
        locationName: location.location_name,
        items,
        sessionUser,
        members,
        locationOwnerId: location.created_by,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('データ取得中にエラーが発生しました');
    }
  }

  static postDeleteLocation(req, res) {
    const { locationId } = req.params;
    const user = req.session.user;
    if (!user) return res.redirect('/login');

    try {
      const location = LocationRepository.findById(locationId);
      if (!location || location.created_by !== user.user_id) {
        return res.status(403).send('権限がありません。');
      }

      // better-sqlite3のトランザクション処理
      const deleteTransaction = db.transaction(() => {
        // 関連データを削除
        ItemRepository.deleteByLocationId(locationId);
        MemberRepository.deleteByLocationId(locationId);
        LocationRepository.delete(locationId);
      });

      deleteTransaction();

      res.redirect(`/user/${user.user_id}`);
    } catch (err) {
      console.error('場所削除エラー:', err);
      res.status(500).send('場所の削除中にエラーが発生しました');
    }
  }
}

module.exports = { LocationController, calculateStatus };