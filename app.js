// c:\Users\yusakata\work\github.com\xyslope\zaikon\app.js
// Try to save from windows.
const express = require('express');
const session = require('express-session');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const ItemRepository = require('./repositories/ItemRepository');
const LocationRepository = require('./repositories/LocationRepository');
const UserRepository = require('./repositories/UserRepository');
const MemberRepository = require('./repositories/MemberRepository');
const BanEmailRepository = require('./repositories/BanEmailRepository');
const TemporaryPurchaseRepository = require('./repositories/TemporaryPurchaseRepository');

// Controllers
const UserController = require('./controllers/userController');
const { LocationController, calculateStatus } = require('./controllers/locationController');
const ItemController = require('./controllers/itemController');
const LineController = require('./controllers/lineController');
const LineSetupController = require('./controllers/lineSetupController');
const EmailChangeController = require('./controllers/emailChangeController');
const TemporaryPurchaseController = require('./controllers/temporaryPurchaseController');
const { Client, middleware } = require('@line/bot-sdk');

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

// セッション設定（session-file-store使用）
const FileStore = require('session-file-store')(session);
const fs = require('fs');

const sessionDir = process.env.NODE_ENV === 'production' 
  ? '/data/sessions' 
  : path.join(__dirname, 'data', 'sessions');
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

app.use(session({
  store: new FileStore({
    path: sessionDir,
  }),
  secret: 'hogehogemonger',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    secure: false,
    httpOnly: true
  }
}));

// LINE Webhook（JSONパーサーより前に配置）
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

if (lineConfig.channelAccessToken && lineConfig.channelSecret) {
  const { Client, middleware } = require('@line/bot-sdk');
  const client = new Client(lineConfig);
  
  app.post('/webhook', middleware(lineConfig), (req, res) => {
    Promise.all(req.body.events.map(handleLineEvent))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error('LINE Webhook error:', err);
        res.status(500).end();
      });
  });

  function handleLineEvent(event) {
    if (event.type === 'message' && event.message.type === 'text') {
      const linkCode = event.message.text.trim();
      const lineUserId = event.source.userId;
      
      console.log(`LINE Bot: リンクコード受信 ${linkCode} from ${lineUserId}`);
      
      // 直接LineSetupControllerを呼び出し
      const result = LineSetupController.linkUserAccount({
        body: { linkCode, lineUserId }
      }, {
        json: (data) => data,
        status: () => ({ json: (data) => data })
      });
      
      const message = result.success 
        ? `✅ ${result.userName}さんのLINE連携完了！\n\n要補充リストなどの通知を受け取れるようになりました。`
        : `❌ リンクコード「${linkCode}」が見つかりません。\n\n正しいコードかご確認ください。`;
        
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: message
      });
    }
    return Promise.resolve(null);
  }
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// 認証ミドルウェアを名前付き関数に切り出す
function authMiddleware(req, res, next) {
  const allowedPaths = [
    /^\/$/,
    /^\/user\/[\w-]+$/,
    /^\/register/,
    /^\/send-user-link$/,
    /^\/send-admin-link$/,
    /^\/webhook$/,
    /^\/line-setup\/[\w-]+$/,
    /^\/email-change\/[\w-]+$/,
    new RegExp(`^\\/admin\\/${adminKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
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
}

// テスト時は認証スキップ、そうでなければ認証ミドルウェアを使う
if (process.env.NODE_ENV === 'test') {
  app.use((req, res, next) => {
    req.session.user = {
      user_id: 'user-sampleuser',
      user_name: '住人A',
      role: 'test'
    };
    next();
  });
} else {
  app.use(authMiddleware);
}

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
app.get('/user/:userId/edit', UserController.getUserEdit);

app.post('/register', UserController.postRegister);

// ダッシュボード（SQLite対応版）
app.get('/user/:userId', UserController.getUserDashboard);

// POST: ユーザー情報更新
app.post('/user/:userId/edit', UserController.postUserEdit);

// 場所追加（SQLite対応版）
app.post('/user/:userId/add-location', LocationController.postAddLocation);

app.get('/location/:locationId', LocationController.getLocation);

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
    const item = ItemRepository.findById(item_id);
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
app.post('/location/:locationId/delete', LocationController.postDeleteLocation);

// アイテム編集API（JSON）
app.get('/api/item/:itemId', ItemController.getItemEdit);

// アイテム編集
app.post('/location/:locationId/item/:itemId/edit', ItemController.postEditItem);

// アイテム削除（SQLite対応版）
app.post('/location/:locationId/delete-item', async (req, res) => {
  const { locationId } = req.params;
  const { item_id } = req.body;

  if (!item_id) return res.redirect(`/location/${locationId}`);

  try {    await ItemRepository.delete(item_id);
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
    MemberRepository.removeMember(user_id, locationId);

    // 残りメンバーがいない場合は場所も削除
    const remaining = MemberRepository.findByLocationId(locationId);
    if (remaining.length === 0) {
      const deleteTransaction = db.transaction(() => {
        ItemRepository.deleteByLocationId(locationId);
        LocationRepository.delete(locationId);
      });
      deleteTransaction();

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
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT) || 25,
  secure: process.env.SMTP_SECURE === 'true' || false,
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  } : undefined
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

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const userPageUrl = `${baseUrl}/user/${user.user_id}`;

    const mailOptions = {
      from: 'Zaikon <zaikon@ecofirm.com>',
      to: email,
      subject: 'Zaikon ユーザページのご案内',
      text: `Zaikonでのあなたのユーザページです。\n保存してご使用ください。\n\n${userPageUrl}`
    };

    console.log('SMTP設定:', {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT) || 25,
      secure: process.env.SMTP_SECURE === 'true' || false
    });
    console.log('メール送信オプション:', mailOptions);

    await transporter.sendMail(mailOptions);
    console.log('メール送信成功:', email);

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
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const adminPageUrl = `${baseUrl}/admin/${adminKey}`;

    const mailOptions = {
      from: 'Zaikon <zaikon@ecofirm.com>',
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

// API: 要補充リストをLINEで送信
app.post('/api/dashboard/:userId/line/replenish', LineController.sendReplenishList);

// API: 買い物リストをLINEで送信
app.post('/api/dashboard/:userId/line/shopping', LineController.sendShoppingList);

// LINE連携用エンドポイント
app.post('/api/line/generate-link/:userId', LineSetupController.generateLinkCode);
app.get('/line-setup/:linkCode', LineSetupController.showLinkPage);
app.post('/api/line/link-account', LineSetupController.linkUserAccount);


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

// API: アイテム移動用のロケーション一覧取得
app.get('/api/item/:itemId/locations', ItemController.getAvailableLocations);

// API: アイテム移動実行
app.post('/api/item/:itemId/move', ItemController.postMoveItem);

// LINE連携解除
app.post('/api/line/remove-link/:userId', LineSetupController.removeLinkConnection);

// メール変更用エンドポイント
app.post('/api/email/request-change/:userId', EmailChangeController.generateChangeRequest);
app.get('/email-change/:changeCode', EmailChangeController.showChangeConfirmPage);
app.post('/api/email/confirm-change', EmailChangeController.confirmEmailChange);

// 臨時購入依頼API
app.post('/api/temp-purchase/:userId', TemporaryPurchaseController.createTempPurchase);
app.get('/api/temp-purchase/:userId', TemporaryPurchaseController.getUserTempPurchases);
app.get('/api/temp-purchase/:userId/active', TemporaryPurchaseController.getActiveTempPurchases);
app.post('/api/temp-purchase/:tempId/complete', TemporaryPurchaseController.completeTempPurchase);
app.post('/api/temp-purchase/:tempId/delete', TemporaryPurchaseController.deleteTempPurchase);
app.post('/api/temp-purchase/:tempId/update', TemporaryPurchaseController.updateTempPurchase);

module.exports = app;
