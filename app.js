const express = require('express');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// セッション設定
app.use(session({
  secret: 'hogehogemonger',
  resave: false,
  saveUninitialized: false,
  cookie: {  maxAge: 7 * 24 * 60 * 60 * 1000, // クッキーの有効期限（例：1週間）
    secure: false,                   // HTTPSのみでクッキー送信（開発環境では false）
    httpOnly: true                   // JSからアクセス不可（推奨）
  }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// JSON読み書き関数
function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

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

// 認証チェック（許可リスト以外は / にリダイレクト）
app.use((req, res, next) => {
  const allowedPaths = [
    /^\/$/,                  // /
    /^\/login/,              // /login or /login POST
    /^\/user\/[\w-]+$/,      // /user/xxxxx
    /^\/register/            // オプション：登録ページ
  ];

  const isAllowed = allowedPaths.some(pattern => pattern.test(req.path));

  if (!req.session.user && !isAllowed) {
    return res.redirect('/');
  }

  next();
});

// ランディング
app.get('/', (req, res) => {
  res.render('landing');
});

// ログイン
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { user_name, email } = req.body;
  const users = loadJSON('./data/users.json');
  const found = users.find(u => u.user_name === user_name && u.email === email);
  if (found) {
    req.session.user = found;
    res.redirect(`/user/${req.session.user.user_id}`);
  } else {
    res.send('<p>ユーザーが見つかりません。<a href="/login">戻る</a></p>');
  }
});

// ログアウト
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ユーザー登録
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { user_name, email } = req.body;
  if (!user_name || !email) return res.redirect('/register');
  const users = loadJSON('./data/users.json');
  const existing = users.find(u => u.user_name === user_name || u.email === email);
  if (existing) {
    return res.send('<p>同じユーザー名またはメールアドレスが既に存在します。<a href="/register">戻る</a></p>');
  }
  const newUser = {
    user_id: 'usr_' + uuidv4().slice(0, 8),
    user_name,
    email,
    created_at: new Date().toISOString()
  };
  users.push(newUser);
  saveJSON('./data/users.json', users);
  req.session.user = newUser;
  res.redirect(`/user/${user.user_id}`);
});

// ダッシュボード
app.get('/user/:userId', (req, res) => {
  const { userId } = req.params;
  const users = loadJSON('./data/users.json');

  // セッションに未ログインなら、自動でログイン
  if (!req.session.user || req.session.user.user_id !== userId) {
    const user = users.find(u => u.user_id === userId);
    if (!user) {
      return res.send(`<p>ユーザーが見つかりません。<a href="/">トップへ</a></p>`);
    }
    req.session.user = user; // 自動ログイン
  }

  const members = loadJSON('./data/members.json');
  const locations = loadJSON('./data/locations.json');

  const myLocations = members
    .filter(m => m.user_id === userId)
    .map(m => m.location_id);

  const locationList = locations.filter(loc => myLocations.includes(loc.location_id));
  res.render('dashboard', {
    userId,
    locations: locationList,
    sessionUser: req.session.user
  });
});

// 場所追加
app.post('/user/add-location', (req, res) => {
  console.log('[POST/add] セッションユーザー:', req.session.user); 
  const user = req.session.user;
  if (!user) return res.redirect('/login');
  const { location_name } = req.body;
  if (!location_name) return res.redirect('/user');
  const locations = loadJSON('./data/locations.json');
  const members = loadJSON('./data/members.json');
  const newId = 'loc_' + uuidv4().slice(0, 8);
  const now = new Date().toISOString();
  locations.push({ location_id: newId, location_name, created_by: user.user_id, created_at: now });
  members.push({ user_id: user.user_id, location_id: newId, joined_at: now });
  saveJSON('./data/locations.json', locations);
  saveJSON('./data/members.json', members);
  res.redirect(`/user/${user.user_id}`);
});

// 特定ロケーション
app.get('/location/:locationId', (req, res) => {
  const locationId = req.params.locationId;
  const sessionUser = req.session.user;
  const locations = loadJSON('./data/locations.json');
  const location = locations.find(i => i.location_id === locationId);
  const items = loadJSON('./data/items.json');
  const locItems = items.filter(i => i.location_id === locationId);

  const members = loadJSON('./data/members.json');
  const users = loadJSON('./data/users.json');
  const locationOwnerId = location ? location.created_by : null;
  const locationMembers = members
    .filter(m => m.location_id === locationId)
    .map(m => {
      const user = users.find(u => u.user_id === m.user_id);
      return {
        user_id: m.user_id,
        user_name: user ? user.user_name : '不明',
        joined_at: m.joined_at
      };
    });


    res.render('location', {
	locationId,
	locationName: location ? location.location_name : '(不明)',
	items: locItems,
	sessionUser,
	members: locationMembers,
	locationOwnerId
    });
});

// アイテム追加
app.post('/location/:locationId/add', (req, res) => {
  const locationId = req.params.locationId;
  const items = loadJSON('./data/items.json');
  const newItem = {
    item_id: 'itm_' + uuidv4().slice(0, 8),
    item_name: req.body.item_name,
    location_id: locationId,
    yellow: parseInt(req.body.yellow || '1', 10),
    green: parseInt(req.body.green || '3', 10),
    purple: parseInt(req.body.purple || '6', 10),
    amount: parseInt(req.body.amount || '0', 10),
    status: calculateStatus(req.body.amount, req.body.yellow, req.body.green, req.body.purple),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  items.push(newItem);
  saveJSON('./data/items.json', items);
  res.redirect(`/location/${locationId}`);
});

// アイテム数更新
app.post('/location/:locationId/update', (req, res) => {
  const locationId = req.params.locationId;
  const { item_id, new_amount } = req.body;
  const items = loadJSON('./data/items.json');
  const target = items.find(i => i.item_id === item_id);
  if (target) {
    target.amount = Number(new_amount);
    target.updated_on = new Date().toISOString();
    target.status = calculateStatus(target.amount, target.yellow, target.green, target.purple);
    saveJSON('./data/items.json', items);
  }
  res.redirect(`/location/${locationId}`);
});

app.post('/location/:locationId/delete', (req, res) => {
  const { locationId } = req.params;
  const sessionUser = req.session.user;
  if (!sessionUser) return res.redirect('/login');

  const locations = loadJSON('./data/locations.json');
  const location = locations.find(l => l.location_id === locationId);

  // 作成者でない場合は拒否
  if (!location || location.created_by !== sessionUser.user_id) {
    return res.status(403).send('権限がありません。');
  }

  // 関連データ削除
  saveJSON('./data/locations.json', locations.filter(l => l.location_id !== locationId));
  saveJSON('./data/items.json', loadJSON('./data/items.json').filter(i => i.location_id !== locationId));
  saveJSON('./data/members.json', loadJSON('./data/members.json').filter(m => m.location_id !== locationId));

  res.redirect(`/user/${user.user_id}`);
});


app.post('/location/:locationId/delete-item', (req, res) => {
  const { locationId } = req.params;
  const { item_id } = req.body;

  if (!item_id) return res.redirect(`/location/${locationId}`);

  const items = loadJSON('./data/items.json');
  const filtered = items.filter(i => i.item_id !== item_id);
  saveJSON('./data/items.json', filtered);

  res.redirect(`/location/${locationId}`);
});

app.post('/location/:locationId/remove-member', (req, res) => {
  const { locationId } = req.params;
  const { user_id } = req.body;
  const sessionUser = req.session.user;

  if (!sessionUser) return res.redirect('/login');

  let members = loadJSON('./data/members.json');

  // メンバーを削除
  members = members.filter(m => !(m.location_id === locationId && m.user_id === user_id));
  saveJSON('./data/members.json', members);

  // 残りメンバーがいなければ location/items も削除
  const remaining = members.filter(m => m.location_id === locationId);
  if (remaining.length === 0) {
    const locations = loadJSON('./data/locations.json').filter(l => l.location_id !== locationId);
    saveJSON('./data/locations.json', locations);

    const items = loadJSON('./data/items.json').filter(i => i.location_id !== locationId);
    saveJSON('./data/items.json', items);

    res.redirect(`/user/${user.user_id}`);
  }

  res.redirect(`/location/${locationId}`);
});

// メンバー追加
app.post('/add-member', (req, res) => {
  const { location_id, user_name } = req.body;
  if (!location_id || !user_name) return res.redirect(`/location/${location_id}`);
  const users = loadJSON('./data/users.json');
  const members = loadJSON('./data/members.json');
  let user = users.find(u => u.user_name === user_name);
  if (!user) {
    return res.send(`<p>ユーザ「${user_name}」は存在しません。<a href="/user/add?name=${user_name}&location=${location_id}">作成しますか？</a></p>`);
  }
  const already = members.some(m => m.user_id === user.user_id && m.location_id === location_id);
  if (!already) {
    members.push({
      user_id: user.user_id,
      location_id,
      joined_at: new Date().toISOString()
    });
    saveJSON('./data/members.json', members);
  }
  res.redirect(`/location/${location_id}`);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
