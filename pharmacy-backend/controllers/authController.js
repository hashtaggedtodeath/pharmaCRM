const { sql, poolPromise } = require('../config/db');
const bcrypt = require('bcryptjs'); // Для шифрования паролей
const jwt = require('jsonwebtoken'); // Для создания токенов

// Регистрация нового пользователя
exports.register = async (req, res) => {
    try {
        const { email, password, fullName, phone } = req.body;
        const pool = await poolPromise;

        // 1. Проверяем, есть ли уже такой email в базе
        const userExist = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query('SELECT Id FROM Users WHERE Email = @Email');

        if (userExist.recordset.length > 0) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }

        // 2. Шифруем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Сохраняем пользователя в БД (по умолчанию даем роль 'User')
        await pool.request()
            .input('Role', sql.NVarChar, 'User')
            .input('Email', sql.NVarChar, email)
            .input('PasswordHash', sql.NVarChar, hashedPassword)
            .input('FullName', sql.NVarChar, fullName)
            .input('Phone', sql.NVarChar, phone || '')
            .query(`
                INSERT INTO Users (Role, Email, PasswordHash, FullName, Phone) 
                VALUES (@Role, @Email, @PasswordHash, @FullName, @Phone)
            `);

        res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (err) {
        console.error('Ошибка при регистрации:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Авторизация (Login)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await poolPromise;

        // 1. Ищем пользователя по email
        const result = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @Email');

        const user = result.recordset[0];
        if (!user) {
            return res.status(400).json({ message: 'Неверный email или пароль' });
        }

        // 2. Проверяем правильность пароля
        const validPassword = await bcrypt.compare(password, user.PasswordHash);
        if (!validPassword) {
            return res.status(400).json({ message: 'Неверный email или пароль' });
        }

        // 3. Создаем JWT токен (в него зашиваем ID и роль пользователя)
        const token = jwt.sign(
            { userId: user.Id, role: user.Role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' } // Токен "протухнет" через 24 часа
        );

        // Отправляем токен и данные пользователя фронтенду
        res.json({
            token,
            user: {
                id: user.Id,
                email: user.Email,
                fullName: user.FullName,
                role: user.Role
            }
        });
    } catch (err) {
        console.error('Ошибка при авторизации:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};