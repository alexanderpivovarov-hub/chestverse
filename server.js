const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// ========== ОТДАЧА HTML СТРАНИЦ ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ========== ВАШИ API (оставьте как есть) ==========
// ... (весь ваш код с /api/register, /api/login и т.д.)
// ...

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
