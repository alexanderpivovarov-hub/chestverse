const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// CORS - разрешаем запросы с любых доменов
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.json());
app.use(express.static(__dirname));

// Отдаём страницу
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Хранилище
let users = {};
let promoCodes = { NEWBIE25: { amount: 25, usesLeft: 999999, onePerUser: true, usedBy: {} } };
let nextUserId = 1;
function generateUserId() { return (nextUserId++).toString(); }

// API
app.post('/api/register', (req, res) => {
    const { name, avatar, desc } = req.body;
    const id = generateUserId();
    users[id] = { id, name: name || 'Игрок', avatar: avatar || '👤', desc: desc || '', balance: 100, inventory: [], createdAt: new Date().toISOString(), isBanned: false, extraOpens: false };
    res.json({ success: true, userId: id, user: users[id] });
});

app.post('/api/login', (req, res) => {
    const { userId } = req.body;
    if (!users[userId]) return res.status(404).json({ error: 'User not found' });
    if (users[userId].isBanned) return res.status(403).json({ error: 'Banned' });
    res.json({ success: true, user: users[userId] });
});

app.post('/api/promo', (req, res) => {
    const { userId, code } = req.body;
    const promo = promoCodes[code];
    if (!promo) return res.json({ success: false, message: 'Неверный промокод' });
    if (promo.onePerUser && promo.usedBy[userId]) return res.json({ success: false, message: 'Уже активирован' });
    if (promo.usesLeft <= 0) return res.json({ success: false, message: 'Промокод использован' });
    promo.usesLeft--;
    if (promo.onePerUser) promo.usedBy[userId] = true;
    users[userId].balance += promo.amount;
    res.json({ success: true, message: `+${promo.amount} монет`, newBalance: users[userId].balance });
});

app.post('/api/open', (req, res) => {
    const { userId, chestId, quantity, mode } = req.body;
    if (!users[userId]) return res.status(404).json({ error: 'User not found' });
    if (users[userId].isBanned) return res.status(403).json({ error: 'Banned' });
    const maxOpen = users[userId].extraOpens ? 30 : 10;
    if (quantity > maxOpen) return res.json({ success: false, message: `Максимум ${maxOpen} открытий` });
    let price = 100 * (mode === 'boost' ? 3 : 1);
    let cost = price * quantity;
    if (users[userId].balance < cost) return res.json({ success: false, message: 'Не хватает монет' });
    users[userId].balance -= cost;
    let rewards = [];
    for (let i = 0; i < quantity; i++) {
        let gain = Math.floor(Math.random() * 150) + 50;
        if (mode === 'boost') gain = Math.floor(gain * 1.5);
        rewards.push({ name: 'Монеты', value: gain, icon: '🪙' });
        users[userId].balance += gain;
    }
    res.json({ success: true, rewards, newBalance: users[userId].balance });
});

app.get('/api/chests', (req, res) => {
    res.json({ chests: [
        { id: 1, name: 'Обычный сундук', icon: '📦', price: 100, rarity: 'common' },
        { id: 2, name: 'Редкий сундук', icon: '🔷', price: 250, rarity: 'rare' },
        { id: 3, name: 'Эпический сундук', icon: '🔮', price: 500, rarity: 'epic' }
    ] });
});

// АДМИНКА
const ADMIN_KEY = process.env.ADMIN_KEY || 'CHESTVERSE_ADMIN_2026';
app.post('/api/admin/getUsers', (req, res) => {
    if (req.body.adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'Invalid admin key' });
    res.json({ users: Object.values(users) });
});
app.post('/api/admin/addCoins', (req, res) => {
    if (req.body.adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'Invalid admin key' });
    if (users[req.body.userId]) users[req.body.userId].balance += req.body.amount;
    res.json({ success: true });
});
app.post('/api/admin/ban', (req, res) => {
    if (req.body.adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'Invalid admin key' });
    if (users[req.body.userId]) users[req.body.userId].isBanned = true;
    res.json({ success: true });
});
app.post('/api/admin/unban', (req, res) => {
    if (req.body.adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'Invalid admin key' });
    if (users[req.body.userId]) users[req.body.userId].isBanned = false;
    res.json({ success: true });
});
app.post('/api/admin/createPromo', (req, res) => {
    if (req.body.adminKey !== ADMIN_KEY) return res.status(403).json({ error: 'Invalid admin key' });
    promoCodes[req.body.code] = { amount: req.body.amount, usesLeft: req.body.uses || 999, onePerUser: req.body.onePerUser || true, usedBy: {} };
    res.json({ success: true });
});

app.listen(port, () => console.log(`Server running on port ${port}`));