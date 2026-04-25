const jwt = require('jsonwebtoken');

// 1. Проверка: Авторизован ли пользователь (есть ли токен)
exports.verifyToken = (req, res, next) => {
    // Токен обычно передается в заголовке Authorization в формате "Bearer <token>"
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
        return res.status(401).json({ message: 'Доступ запрещен. Токен не предоставлен' });
    }

    const token = authHeader.split(' ')[1]; // Отрезаем слово "Bearer "

    if (!token) {
        return res.status(401).json({ message: 'Доступ запрещен. Неверный формат токена' });
    }

    try {
        // Расшифровываем токен нашим секретным ключом
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Записываем данные юзера (userId, role) в объект запроса
        next(); // Пропускаем запрос дальше
    } catch (err) {
        return res.status(401).json({ message: 'Недействительный или просроченный токен' });
    }
};

// 2. Проверка: Является ли пользователь Администратором
exports.isAdmin = (req, res, next) => {
    // Эта функция должна работать ПОСЛЕ verifyToken, чтобы req.user уже существовал
    if (req.user && req.user.role === 'Admin') {
        next(); // Если админ - пропускаем
    } else {
        return res.status(403).json({ message: 'Доступ запрещен. Требуются права Администратора' });
    }
};