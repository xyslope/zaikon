const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/UserRepository');
const BanEmailRepository = require('../repositories/BanEmailRepository');
const LocationRepository = require('../repositories/LocationRepository');
const ItemRepository = require('../repositories/ItemRepository');
const MemberRepository = require('../repositories/MemberRepository');

class UserController {
  static getUserEdit(req, res) {
    const { userId } = req.params;
    try {
      const user = UserRepository.findById(userId);
      if (!user) {
        return res.status(404).send('ユーザが見つかりません');
      }
      res.render('user_edit', { user });
    } catch (err) {
      console.error(err);
      res.status(500).send('ユーザ情報取得中にエラーが発生しました');
    }
  }

  static postRegister(req, res) {
    const { user_name, email, user_description } = req.body;
    if (!user_name || !email || !user_description) return res.redirect('/register');
    console.log('ユーザを追加します')
    try {
      const banned = BanEmailRepository.findByEmail(email);
      if (banned) {
        return res.send('<p>このメールアドレスは登録を禁止されています。<a href="/register">戻る</a></p>');
      }
      console.log('許可されているユーザです。')
      try {
        const existing = UserRepository.findByEmail(email);
        console.log('existing:', existing);
        if (existing) {
          return res.send('<p>同じメールアドレスが既に存在します。<a href="/register">戻る</a></p>');
        }
      } catch (err) {
        console.error('findByUsernameOrEmail error:', err);
        return res.status(500).send('ユーザー検索中にエラーが発生しました');
      }
      console.log('ほんとうにユーザを追加します。')

      const newUser = {
        user_id: 'usr_' + uuidv4().slice(0, 8),
        user_name,
        email,
        user_description,
        created_at: new Date().toISOString()
      };
      console.log('DBにユーザを追加します')
 
      UserRepository.createUser(newUser);
      req.session.user = newUser;
      res.redirect(`/user/${newUser.user_id}`);
    } catch (err) {
      console.error('ユーザー登録中のエラー:', err);
      res.status(500).send('ユーザー登録中にエラーが発生しました');
    }
  }

  static getUserDashboard(req, res) {
    const { userId } = req.params;

    try {
      if (!req.session.user || req.session.user.user_id !== userId) {
        const user = UserRepository.findById(userId);
        if (!user) {
          return res.status(404).send(`<p>ユーザーが見つかりません。<a href="/">トップへ</a></p>`);
        }
        req.session.user = user;
      }

      const locations = LocationRepository.findByUserId(userId);
      for (const loc of locations) {
        loc.items = ItemRepository.findByLocationId(loc.location_id);
        loc.members = MemberRepository.findWithUserDetails(loc.location_id);
      }
      res.render('dashboard', {
        userId,
        locations,
        sessionUser: req.session.user
      });
    } catch (err) {
      res.status(500).send('データ取得中にエラーが発生しました');
    }
  }

  static postUserEdit(req, res) {
    const sessionUser = req.session.user;
    if (!sessionUser) return res.redirect('/login');

    const { userId } = req.params;
    if (sessionUser.user_id !== userId) return res.status(403).send('権限がありません');

    const { user_name, user_description, line_user_id } = req.body;
    if (!user_name || !user_description) return res.redirect(`/user/${userId}/edit`);

    try {
      UserRepository.updateUser({
        user_id: userId,
        user_name,
        user_description,
        line_user_id: line_user_id || null
      });

      req.session.user.user_name = user_name;
      req.session.user.user_description = user_description;
      req.session.user.line_user_id = line_user_id || null;

      res.redirect(`/user/${userId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('ユーザー情報更新中にエラーが発生しました');
    }
  }
}

module.exports = UserController;