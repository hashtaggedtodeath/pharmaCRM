const { sql, poolPromise } = require('../config/db');

// Получить корзину пользователя
exports.getCart = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserId', sql.Int, req.user.userId)
            .query(`
                SELECT c.Id as CartItemId, p.Id as ProductId, p.Name, p.SellingPrice, c.Quantity, (p.SellingPrice * c.Quantity) as TotalPrice
                FROM CartItems c
                JOIN Products p ON c.ProductId = p.Id
                WHERE c.UserId = @UserId
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при получении корзины' });
    }
};

// Добавить товар в корзину
exports.addToCart = async (req, res) => {
    try {
        const { ProductId, Quantity } = req.body;
        const pool = await poolPromise;

        // Проверяем, есть ли уже этот товар в корзине
        const checkCart = await pool.request()
            .input('UserId', sql.Int, req.user.userId)
            .input('ProductId', sql.Int, ProductId)
            .query('SELECT Id, Quantity FROM CartItems WHERE UserId = @UserId AND ProductId = @ProductId');

        if (checkCart.recordset.length > 0) {
            // Если есть - обновляем количество
            await pool.request()
                .input('CartItemId', sql.Int, checkCart.recordset[0].Id)
                .input('NewQty', sql.Int, checkCart.recordset[0].Quantity + (Quantity || 1))
                .query('UPDATE CartItems SET Quantity = @NewQty WHERE Id = @CartItemId');
        } else {
            // Если нет - добавляем новую запись
            await pool.request()
                .input('UserId', sql.Int, req.user.userId)
                .input('ProductId', sql.Int, ProductId)
                .input('Quantity', sql.Int, Quantity || 1)
                .query('INSERT INTO CartItems (UserId, ProductId, Quantity) VALUES (@UserId, @ProductId, @Quantity)');
        }

        res.status(200).json({ message: 'Товар добавлен в корзину' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при добавлении в корзину' });
    }
};

// Очистить корзину (или удалить 1 товар - для диплома сделаем пока очистку конкретного)
exports.removeFromCart = async (req, res) => {
    try {
        const { id } = req.params; // Id записи в корзине
        const pool = await poolPromise;
        await pool.request()
            .input('CartItemId', sql.Int, id)
            .input('UserId', sql.Int, req.user.userId)
            .query('DELETE FROM CartItems WHERE Id = @CartItemId AND UserId = @UserId');
        res.json({ message: 'Товар удален из корзины' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при удалении из корзины' });
    }
};

// Изменение количества товара в корзине (+ или -)
exports.updateCartQuantity = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const pool = await poolPromise;

        // Получаем текущее количество в корзине И доступный остаток на складе
        const cartItem = await pool.request()
            .input('CartItemId', sql.Int, id)
            .input('UserId', sql.Int, req.user.userId)
            .query(`
                SELECT c.Quantity as CartQty, p.StockQuantity 
                FROM CartItems c
                JOIN Products p ON c.ProductId = p.Id
                WHERE c.Id = @CartItemId AND c.UserId = @UserId
            `);

        if (cartItem.recordset.length === 0) return res.status(404).json({ message: 'Товар не найден' });

        let currentQty = cartItem.recordset[0].CartQty;
        let stockQty = cartItem.recordset[0].StockQuantity;
        let newQty = currentQty;

        if (action === 'increase') {
            // ЗАЩИТА: Проверяем, хватает ли товара на складе
            if (currentQty + 1 > stockQty) {
                return res.status(400).json({ message: `Доступно только ${stockQty} шт.` });
            }
            newQty += 1;
        }
        if (action === 'decrease') newQty -= 1;

        if (newQty <= 0) {
            await pool.request().input('CartItemId', sql.Int, id).query('DELETE FROM CartItems WHERE Id = @CartItemId');
        } else {
            await pool.request().input('CartItemId', sql.Int, id).input('NewQty', sql.Int, newQty).query('UPDATE CartItems SET Quantity = @NewQty WHERE Id = @CartItemId');
        }

        res.json({ message: 'Количество обновлено' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при обновлении количества' });
    }
};