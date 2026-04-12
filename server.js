const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('.')); // для обслуживания HTML файлов

// Хранилище данных (в памяти, при перезапуске сбросится)
let users = {}; // userId -> { name, avatar, desc, balance, inventory, createdAt, isBanned }
let promoCodes = { NEWBIE25: { amount: 25, usesLeft: 999999, onePerUser: true, usedBy: {} } };
let nextUserId = 1;

// Генерация ID
function generateUserId() { return (nextUserId++).toString(); }

// Вспомогательные функции
function saveToMemory() { /* позже добавим файл или БД */ }

// ========== API ==========

// Создание аккаунта
app.post('/api/register', (req, res) => {
    const { name, avatar, desc } = req.body;
    const id = generateUserId();
    users[id] = {
        id,
        name: name || 'Игрок',
        avatar: avatar || '👤',
        desc: desc || '',
        balance: 0,
        inventory: [],
        createdAt: new Date().toISOString(),
        isBanned: false,
        extraOpens: false
    };
    res.json({ success: true, userId: id, user: users[id] });
});

// Вход / получение данных пользователя
app.post('/api/login', (req, res) => {
    const { userId } = req.body;
    if (!users[userId]) return res.status(404).json({ error: 'User not found' });
    if (users[userId].isBanned) return res.status(403).json({ error: 'Banned' });
    res.json({ success: true, user: users[userId] });
});

// Активация промокода
app.post('/api/promo', (req, res) => {
    const { userId, code } = req.body;
    if (!users[userId]) return res.status(404).json({ error: 'User not found' });
    const promo = promoCodes[code];
    if (!promo) return res.json({ success: false, message: 'Неверный промокод' });
    if (promo.onePerUser && promo.usedBy[userId]) return res.json({ success: false, message: 'Вы уже активировали этот промокод' });
    if (promo.usesLeft <= 0) return res.json({ success: false, message: 'Промокод использован' });
    
    promo.usesLeft--;
    if (promo.onePerUser) promo.usedBy[userId] = true;
    users[userId].balance += promo.amount;
    res.json({ success: true, message: `+${promo.amount} монет`, newBalance: users[userId].balance });
});

// Открытие сундука
app.post('/api/open', (req, res) => {
    const { userId, chestId, quantity } = req.body;
    if (!users[userId]) return res.status(404).json({ error: 'User not found' });
    if (users[userId].isBanned) return res.status(403).json({ error: 'Banned' });
    
    const maxOpen = users[userId].extraOpens ? 30 : 10;
    if (quantity > maxOpen) return res.json({ success: false, message: `Максимум ${maxOpen} открытий за раз` });
    
    // Простейший расчёт награды (монеты)
    const cost = 100 * quantity; // цена сундука пока фикс
    if (users[userId].balance < cost) return res.json({ success: false, message: 'Не хватает монет' });
    
    users[userId].balance -= cost;
    let totalGain = 0;
    const rewards = [];
    for (let i = 0; i < quantity; i++) {
        const gain = Math.floor(Math.random() * 150) + 50;
        totalGain += gain;
        rewards.push({ name: 'Монеты', value: gain, icon: '🪙' });
        users[userId].balance += gain;
    }
    
    res.json({ success: true, rewards, newBalance: users[userId].balance });
});

// Продажа предмета (заглушка)
app.post('/api/sell', (req, res) => {
    const { userId, itemId } = req.body;
    if (!users[userId]) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'Функция в разработке' });
});

// Получение списка сундуков
app.get('/api/chests', (req, res) => {
    res.json({
        chests: [
            { id: 1, name: 'Обычный сундук', icon: '📦', price: 100, rarity: 'common' },
            { id: 2, name: 'Редкий сундук', icon: '🔷', price: 250, rarity: 'rare' },
            { id: 3, name: 'Эпический сундук', icon: '🔮', price: 500, rarity: 'epic' },
        ]
    });
});

// Админ-панель (защищена простым ключом)
app.post('/api/admin/getUsers', (req, res) => {
    const { adminKey } = req.body;
    if (adminKey !== 'CHESTVERSE_ADMIN_2026') return res.status(403).json({ error: 'Invalid admin key' });
    res.json({ users: Object.values(users) });
});

app.post('/api/admin/addCoins', (req, res) => {
    const { adminKey, userId, amount } = req.body;
    if (adminKey !== 'CHESTVERSE_ADMIN_2026') return res.status(403).json({ error: 'Invalid admin key' });
    if (!users[userId]) return res.json({ error: 'User not found' });
    users[userId].balance += amount;
    res.json({ success: true, newBalance: users[userId].balance });
});

app.post('/api/admin/ban', (req, res) => {
    const { adminKey, userId } = req.body;
    if (adminKey !== 'CHESTVERSE_ADMIN_2026') return res.status(403).json({ error: 'Invalid admin key' });
    if (!users[userId]) return res.json({ error: 'User not found' });
    users[userId].isBanned = true;
    res.json({ success: true });
});

app.post('/api/admin/unban', (req, res) => {
    const { adminKey, userId } = req.body;
    if (adminKey !== 'CHESTVERSE_ADMIN_2026') return res.status(403).json({ error: 'Invalid admin key' });
    if (!users[userId]) return res.json({ error: 'User not found' });
    users[userId].isBanned = false;
    res.json({ success: true });
});

app.post('/api/admin/createPromo', (req, res) => {
    const { adminKey, code, amount, uses, onePerUser } = req.body;
    if (adminKey !== 'CHESTVERSE_ADMIN_2026') return res.status(403).json({ error: 'Invalid admin key' });
    promoCodes[code] = { amount, usesLeft: uses, onePerUser, usedBy: {} };
    res.json({ success: true });
});

app.post('/api/admin/toggleExtraOpens', (req, res) => {
    const { adminKey, userId } = req.body;
    if (adminKey !== 'CHESTVERSE_ADMIN_2026') return res.status(403).json({ error: 'Invalid admin key' });
    if (!users[userId]) return res.json({ error: 'User not found' });
    users[userId].extraOpens = !users[userId].extraOpens;
    res.json({ success: true, extraOpens: users[userId].extraOpens });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
