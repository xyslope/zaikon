// c:\Users\yusakata\work\github.com\xyslope\zaikon\app.js
// Try to save from windows.
const express = require('express');
const session = require('express-session');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ItemRepository = require('./repositories/ItemRepository');
const LocationRepository = require('./repositories/LocationRepository');
const UserRepository = require('./repositories/UserRepository');
const MemberRepository = require('./repositories/MemberRepository');
const BanEmailRepository = require('./repositories/BanEmailRepository');

const app = express();
const PORT = 3000;
const nodemailer = require('nodemailer');
require('dotenv').config();

const runMigrations = require('./migrate_runner');

(async () => {
  await runMigrations();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('SQLite database connected');
  });
})();


const adminKey = process.env.ADMIN_KEY || '';
console.log('adminKey:', adminKey);

// セッション設定（元の設定を保持）
app.use(session({
  secret: 'hogehogemonger',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: false,
    httpOnly: true
  }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ステータス計算関数（元の実装を保持）
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

app.use((req, res, next) => {
  const allowedPaths = [
    /^\/$/,
    /^\/user\/[\w-]+$/,
    /^\/register/,
    /^\/send-user-link$/,
    /^\/send-admin-link$/,
    new RegExp(`^\\/admin\\/${adminKey.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`)
  ];
  console.log(req.path);
  const isAllowed = allowedPaths.some(pattern => pattern.test(req.path));
  const isAdminPath = req.path.startsWith(`/admin/${adminKey}`);

  if (isAdminPath) {
    req.session.user = { role: 'admin', name: 'Admin' };
  }

  if (!req.session.user && !isAllowed && !isAdminPath) {
    return res.redirect('/');
  }
  next();
});


// ランディングページ（変更なし）
app.get('/', (req, res) => {
  res.render('landing');
});

// ログアウト（変更なし）
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ユーザー登録（SQLite対応版）
app.get('/register', (req, res) => {
  res.render('register');
});

// GET: ユーザー編集ページ
app.get('/user/:userId/edit', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(404).send('ユーザが見つかりません');
    }
    res.render('user_edit', { user });
  } catch (err) {
    console.error(err);
    res.status(500).send('ユーザ情報取得中にエラーが発生しました');
  }
});

app.post('/register', async (req, res) => {
  const { user_name, email, user_description } = req.body;
  if (!user_name || !email || !user_description) return res.redirect('/register');
  console.log('ユーザを追加します')
  try {
    // Banリストにあるメールアドレスは登録拒否
    const banned = BanEmailRepository.findByEmail(email);
    if (banned) {
      return res.send('<p>このメールアドレスは登録を禁止されています。<a href="/register">戻る</a></p>');
    }
    console.log('許可されているユーザです。')
    try {
      const existing = await UserRepository.findByEmail(email);
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
 
    await UserRepository.createUser(newUser);
    req.session.user = newUser;
    res.redirect(`/user/${newUser.user_id}`);
  } catch (err) {
    console.error('ユーザー登録中のエラー:', err);
    res.status(500).send('ユーザー登録中にエラーが発生しました');
  }
});

// ダッシュボード（SQLite対応版）
app.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 自動ログイン処理
    if (!req.session.user || req.session.user.user_id !== userId) {
      const user = await UserRepository.findById(userId);
      if (!user) {
        return res.send(`<p>ユーザーが見つかりません。<a href="/">トップへ</a></p>`);
      }
      req.session.user = user;
    }

    const locations = await LocationRepository.findByUserId(userId);
    // locationsごとにitems・members取得
    for (const loc of locations) {
      loc.items = await ItemRepository.findByLocationId(loc.location_id);
      loc.members = await MemberRepository.findWithUserDetails(loc.location_id);
    }
    res.render('dashboard', {
      userId,
      locations,
      sessionUser: req.session.user
    });
  } catch (err) {
    res.status(500).send('データ取得中にエラーが発生しました');
  }
});

// POST: ユーザー情報更新
app.post('/user/:userId/edit', async (req, res) => {
  const sessionUser = req.session.user;
  if (!sessionUser) return res.redirect('/login');

  const { userId } = req.params;
  if (sessionUser.user_id !== userId) return res.status(403).send('権限がありません');

  const { user_name, user_description } = req.body;
  if (!user_name || !user_description) return res.redirect(`/user/${userId}/edit`);

  try {
    await UserRepository.updateUser({
      user_id: userId,
      user_name,
      user_description
    });

    // セッション情報更新
    req.session.user.user_name = user_name;
    req.session.user.user_description = user_description;

    res.redirect(`/user/${userId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('ユーザー情報更新中にエラーが発生しました');
  }
});

// 場所追加（SQLite対応版）
app.post('/user/:userId/add-location', async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/');

  const { location_name } = req.body;
  if (!location_name) return res.redirect(`/user/${user.user_id}`);

  try {
    const locationId = 'loc_' + uuidv4().slice(0, 8);
    const now = new Date().toISOString();
    console.log('場所を追加するよ')
    await LocationRepository.create({
      location_id: locationId,
      location_name,
      owner_id: user.user_id,      // ここを追加
      created_by: user.user_id,
      created_at: now
    });
    console.log('メンバーも追加するよ')

    await MemberRepository.addMember({
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
});

app.get('/location/:locationId', (req, res) => {
  const { locationId } = req.params;
  const sessionUser = req.session.user;

  try {
    const location = LocationRepository.findById(locationId);
    if (!location) {
      return res.status(404).send('場所が見つかりません');
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
});

// アイテム追加（SQLite対応版）
app.post('/location/:locationId/add', async (req, res) => {
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

    await ItemRepository.addItem(newItem);
    res.redirect(`/location/${locationId}`);
  } catch (err) {
    console.error(err); // ←★ここを追加
    res.status(500).send('アイテム追加中にエラーが発生しました');
  }
});

// amount増減・編集
app.post('/location/:locationId/item/:itemId/amount', async (req, res) => {
  const { locationId, itemId } = req.params;
  const { action, value } = req.body;
  try {
    const item = await ItemRepository.findByLocationId(locationId).find(i => i.item_id === itemId);
    if (!item) return res.redirect(`/location/${locationId}`);
    let newAmount = item.amount;
    if (action === 'increment') newAmount = item.amount + 1;
    if (action === 'decrement') newAmount = Math.max(0, item.amount - 1);
    if (action === 'set' && typeof value !== 'undefined') newAmount = Math.max(0, parseInt(value, 10));
    await ItemRepository.updateAmount(itemId, newAmount);
    res.redirect(`/location/${locationId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('amount変更中にエラーが発生しました');
  }
});

// inuse状態切替+必要ならamount-1
app.post('/location/:locationId/item/:itemId/inuse', async (req, res) => {
  const { locationId, itemId } = req.params;
  const { current_inuse } = req.body;
  try {
    // アイテム取得
    const item = await ItemRepository.findByLocationId(locationId).find(i => i.item_id === itemId);
    if (!item) return res.redirect(`/location/${locationId}`);
    let newInuse = (parseInt(current_inuse, 10) + 1) % 3;
    let newAmount = item.amount;
    // 2→0 のときamountを-1
    if (parseInt(current_inuse, 10) === 2 && newInuse === 0) {
      newAmount = Math.max(0, newAmount - 1);
      await ItemRepository.updateInuseAndAmount(itemId, newInuse, newAmount);
    } else {
      await ItemRepository.updateInuse(itemId, newInuse);
    }
    res.redirect(`/location/${locationId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('inuse切り替え中にエラーが発生しました');
  }
});

// アイテム数更新（SQLite対応版）
app.post('/location/:locationId/update', async (req, res) => {
  const { locationId } = req.params;
  const { item_id, new_amount } = req.body;

  try {
    const item = await ItemRepository.findById(item_id);
    if (!item) {
      return res.redirect(`/location/${locationId}`);
    }

    await ItemRepository.updateAmount(
      item_id,
      Number(new_amount),
      calculateStatus(new_amount, item.yellow, item.green, item.purple)
    );

    res.redirect(`/location/${locationId}`);
  } catch (err) {
    res.status(500).send('アイテム更新中にエラーが発生しました');
  }
});

// 場所削除（SQLite対応版）
app.post('/location/:locationId/delete', async (req, res) => {
  const { locationId } = req.params;
  const user = req.session.user;
  if (!user) return res.redirect('/login');

  try {
    const location = await LocationRepository.findById(locationId);
    if (!location || location.created_by !== user.user_id) {
      return res.status(403).send('権限がありません。');
    }

    await db.transaction()
      .then(() => LocationRepository.delete(locationId))
      .then(() => ItemRepository.deleteByLocationId(locationId))
      .then(() => MemberRepository.deleteByLocationId(locationId))
      .commit();

    res.redirect(`/user/${user.user_id}`);
  } catch (err) {
    res.status(500).send('場所の削除中にエラーが発生しました');
  }
});

// アイテム削除（SQLite対応版）
app.post('/location/:locationId/delete-item', async (req, res) => {
  const { locationId } = req.params;
  const { item_id } = req.body;

  if (!item_id) return res.redirect(`/location/${locationId}`);

  try {
    await ItemRepository.delete(item_id);
    res.redirect(`/location/${locationId}`);
  } catch (err) {
    res.status(500).send('アイテム削除中にエラーが発生しました');
  }
});

// メンバー削除（SQLite対応版）
app.post('/location/:locationId/remove-member', async (req, res) => {
  const { locationId } = req.params;
  const { user_id } = req.body;
  const user = req.session.user;

  if (!user) return res.redirect('/login');

  try {
    await MemberRepository.removeMember(user_id, locationId);

    // 残りメンバーがいない場合は場所も削除
    const remaining = await MemberRepository.findByLocationId(locationId);
    if (remaining.length === 0) {
      await db.transaction()
        .then(() => LocationRepository.delete(locationId))
        .then(() => ItemRepository.deleteByLocationId(locationId))
        .commit();

      return res.redirect(`/user/${user.user_id}`);
    }

    res.redirect(`/location/${locationId}`);
  } catch (err) {
    res.status(500).send('メンバー削除中にエラーが発生しました');
  }
});

// メンバー追加（SQLite対応版）
app.post('/add-member', async (req, res) => {
  const { location_id, user_name } = req.body;
  if (!location_id || !user_name) return res.redirect(`/location/${location_id}`);

  try {
    const user = await UserRepository.findByUsername(user_name);
    if (!user) {
      return res.send(`<p>ユーザ「${user_name}」は存在しません。<a href="/user/add?name=${user_name}&location=${location_id}">作成しますか？</a></p>`);
    }

    await MemberRepository.addMember({
      user_id: user.user_id,
      location_id,
      joined_at: new Date().toISOString()
    });

    res.redirect(`/location/${location_id}`);
  } catch (err) {
    res.status(500).send('メンバー追加中にエラーが発生しました');
  }
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

// メール送信設定
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// POST: メールアドレスからユーザページ送信
app.post('/send-user-link', async (req, res) => {
  const { email } = req.body;
  console.log('POST /send-user-link called');
  console.log('Request body:', req.body);
  if (!email) {
    return res.status(400).send('メールアドレスを入力してください');
  }

  try {
    const user = UserRepository.findByEmail(email);
    if (!user) {
      return res.status(404).send('該当ユーザが見つかりません');
    }

    const userPageUrl = `http://localhost:${PORT}/user/${user.user_id}`;
    
    const mailOptions = {
      from: 'zaikon_at_ecofirm.com <zaikon_at_ecofirm.com>',
      to: email,
      subject: 'Zaikon ユーザページのご案内',
      text: `Zaikonでのあなたのユーザページです。\n保存してご使用ください。\n\n${userPageUrl}`
    };

    await transporter.sendMail(mailOptions);

    res.send('ユーザページのURLをメールで送信しました。');
  } catch (err) {
    console.error(err);
    res.status(500).send('メール送信中にエラーが発生しました');
  }
});

// POST: 管理者メールアドレスにAdminページリンク送信
app.post('/send-admin-link', async (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminKey = process.env.ADMIN_KEY || '';
  if (!adminEmail) {
    return res.status(500).send('管理者メールアドレスが設定されていません');
  }

  try {
    // Admin用の特別なトークンや認証はここではなし（簡易版）
    const adminPageUrl = `http://localhost:${PORT}/admin/${adminKey}`;

    const mailOptions = {
      from: 'zaikon_at_ecofirm.com <zaikon_at_ecofirm.com>',
      to: adminEmail,
      subject: 'Zaikon 管理者ページのご案内',
      text: `管理者ページへのリンクです。\n保存してご使用ください。\n\n${adminPageUrl}`
    };

    await transporter.sendMail(mailOptions);

    res.send('管理者ページのURLをメールで送信しました。');
  } catch (err) {
    console.error(err);
    res.status(500).send('メール送信中にエラーが発生しました');
  }
});


// POST: DBクリア（全テーブルのデータ削除）
app.post(`/admin/${adminKey}/clear-db`, async (req, res) => {
  try {
    // トランザクションで削除処理
    await db.transaction(() => {
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM locations').run();
      db.prepare('DELETE FROM items').run();
      db.prepare('DELETE FROM members').run();
    })();
    res.send('データベースのデータを全てクリアしました');
  } catch (err) {
    console.error(err);
    res.status(500).send('DBクリア処理中にエラーが発生しました');
  }
});

// POST: ユーザ一括削除
app.post(`/admin/${adminKey}/delete-users`, async (req, res) => {
  try {
    db.prepare('DELETE FROM users').run();
    res.send('ユーザを一括削除しました');
  } catch (err) {
    console.error(err);
    res.status(500).send('ユーザ一括削除中にエラーが発生しました');
  }
});

// POST: 場所一括削除
app.post(`/admin/${adminKey}/delete-locations`, async (req, res) => {
  try {
    db.prepare('DELETE FROM locations').run();
    res.send('場所を一括削除しました');
  } catch (err) {
    console.error(err);
    res.status(500).send('場所一括削除中にエラーが発生しました');
  }
});

// POST: 指定ユーザ削除
app.post(`/admin/${adminKey}/delete-user`, async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).send('ユーザIDが指定されていません');
  }

  try {
    db.prepare('DELETE FROM users WHERE user_id = ?').run(user_id);
    res.redirect(`/admin/${adminKey}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('ユーザ削除中にエラーが発生しました');
  }
});

// POST: Banメール追加
app.post(`/admin/${adminKey}/ban-email/add`, async (req, res) => {
  const { email, reason } = req.body;
  if (!email) {
    return res.status(400).send('メールアドレスを入力してください');
  }

  try {
    BanEmailRepository.add(email, reason || '');
    res.redirect(`/admin/${adminKey}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Banメールの追加中にエラーが発生しました');
  }
});

// POST: Banメール削除
app.post(`/admin/${adminKey}/ban-email/delete`, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).send('メールアドレスが指定されていません');
  }

  try {
    BanEmailRepository.removeByEmail(email);
    res.redirect(`/admin/${adminKey}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Banメールの削除中にエラーが発生しました');
  }
});

// 拡張：管理者ページにbanEmailsデータを渡す
app.get(`/admin/${adminKey}`, async (req, res) => {
  try {
    const users = await UserRepository.findAll();
    const locations = await LocationRepository.getAllLocations();
    const banEmails = await BanEmailRepository.findAll();
    res.render('admin', { users, locations, banEmails, ADMIN_KEY: adminKey });
  } catch (err) {
    console.error(err);
    res.status(500).send('管理者ページ読み込み中にエラーが発生しました');
  }
});


// API: ユーザ要補充リスト取得
app.get('/api/dashboard/:userId/replenish', (req, res) => {
  const { userId } = req.params;
  try {
    const items = ItemRepository.findItemsByUserWithConditions(userId, 2, null);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '要補充リスト取得中にエラーが発生しました' });
  }
});

// API: ユーザ買い物リスト取得
app.get('/api/dashboard/:userId/shopping', (req, res) => {
  const { userId } = req.params;
  try {
    const items = ItemRepository.findItemsByUserWithConditions(userId, null, 'Red');
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '買い物リスト取得中にエラーが発生しました' });
  }
});

// POST: 指定場所削除
app.post(`/admin/${adminKey}/delete-location`, async (req, res) => {
  const { location_id } = req.body;
  if (!location_id) {
    return res.status(400).send('場所IDが指定されていません');
  }

  try {
    db.prepare('DELETE FROM locations WHERE location_id = ?').run(location_id);
    res.redirect(`/admin/${adminKey}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('場所削除中にエラーが発生しました');
  }
});

// GET: ユーザ名部分検索API
app.get('/api/users', (req, res) => {
  const { query } = req.query;
  if (!query || query.trim() === '') {
    return res.json([]);
  }

  try {
    const users = UserRepository.searchByUsernameLike(query);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ユーザ検索中にエラーが発生しました' });
  }
});
// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('SQLite database connected');
});

module.exports = app;
