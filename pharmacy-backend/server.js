const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { poolPromise } = require('./config/db'); // Подключаем базу для проверки
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes'); 

const app = express();

// Настройка Middleware
app.use(cors()); // Разрешаем запросы с других доменов (от нашего React-приложения)
app.use(express.json()); // Позволяет серверу понимать JSON формат


app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes); 
app.use('/api/cart', cartRoutes);   
app.use('/api/orders', orderRoutes); 
app.use('/api/admin', adminRoutes); 
// Базовый маршрут для проверки работы сервера
app.get('/api/test', (req, res) => {
    res.json({ message: 'Сервер аптеки работает и готов к приему запросов!' });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});