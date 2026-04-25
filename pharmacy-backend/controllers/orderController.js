const { sql, poolPromise } = require('../config/db');

// Оформление заказа
exports.createOrder = async (req, res) => {
    try {
        const { DeliveryMethod, DeliveryAddress } = req.body;
        const pool = await poolPromise;
        
        // 1. Считаем итоговую сумму корзины пользователя
        const cartResult = await pool.request()
            .input('UserId', sql.Int, req.user.userId)
            .query(`
                SELECT ISNULL(SUM(p.SellingPrice * c.Quantity), 0) as TotalAmount 
                FROM CartItems c
                JOIN Products p ON c.ProductId = p.Id
                WHERE c.UserId = @UserId
            `);
            
        const totalAmount = cartResult.recordset[0].TotalAmount;
        if (totalAmount === 0) return res.status(400).json({ message: 'Корзина пуста' });

        // 2. Выполняем транзакцию (Создание заказа -> Запись товаров -> Списание со склада -> Очистка корзины)
        await pool.request()
            .input('UserId', sql.Int, req.user.userId)
            .input('DeliveryMethod', sql.NVarChar, DeliveryMethod)
            .input('DeliveryAddress', sql.NVarChar, DeliveryAddress || null)
            .input('TotalAmount', sql.Decimal(18,2), totalAmount)
            .query(`
                BEGIN TRANSACTION;
                BEGIN TRY
                    -- 1. Создаем сам заказ и получаем его ID
                    DECLARE @OrderId INT;
                    INSERT INTO Orders (UserId, DeliveryMethod, DeliveryAddress, TotalAmount)
                    VALUES (@UserId, @DeliveryMethod, @DeliveryAddress, @TotalAmount);
                    SET @OrderId = SCOPE_IDENTITY();

                    -- 2. Копируем товары из корзины в OrderItems с фиксацией цены
                    INSERT INTO OrderItems (OrderId, ProductId, Quantity, PriceAtPurchase)
                    SELECT @OrderId, c.ProductId, c.Quantity, p.SellingPrice
                    FROM CartItems c
                    JOIN Products p ON c.ProductId = p.Id
                    WHERE c.UserId = @UserId;

                    -- 3. Списываем товары со склада (Учет остатков)
                    UPDATE p
                    SET p.StockQuantity = p.StockQuantity - c.Quantity
                    FROM Products p
                    JOIN CartItems c ON p.Id = c.ProductId
                    WHERE c.UserId = @UserId;

                    -- 4. Очищаем корзину пользователя
                    DELETE FROM CartItems WHERE UserId = @UserId;

                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            `);

        res.status(201).json({ message: 'Заказ успешно оформлен!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при оформлении заказа. Возможно нет товара на складе.' });
    }
};

// Просмотр истории заказов (Для пользователя)
exports.getMyOrders = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        // 1. Получаем сами заказы пользователя
        const ordersResult = await pool.request()
            .input('UserId', sql.Int, req.user.userId)
            .query('SELECT * FROM Orders WHERE UserId = @UserId ORDER BY OrderDate DESC');

        const orders = ordersResult.recordset;

        if (orders.length === 0) {
            return res.json([]); // Если заказов нет, возвращаем пустой массив
        }

        // 2. Получаем ВСЕ товары из ВСЕХ заказов этого пользователя
        const itemsResult = await pool.request()
            .input('UserId', sql.Int, req.user.userId)
            .query(`
                SELECT oi.OrderId, p.Name, oi.Quantity, oi.PriceAtPurchase
                FROM OrderItems oi
                JOIN Orders o ON oi.OrderId = o.Id
                JOIN Products p ON oi.ProductId = p.Id
                WHERE o.UserId = @UserId
            `);

        const items = itemsResult.recordset;

        // 3. Группируем товары по заказам (добавляем массив Items в каждый заказ)
        const ordersWithItems = orders.map(order => {
            return {
                ...order,
                Items: items.filter(item => item.OrderId === order.Id)
            };
        });

        res.json(ordersWithItems);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка получения истории заказов' });
    }
};

// Повторить заказ с проверкой остатков
exports.repeatOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;

        const items = await pool.request()
            .input('OrderId', sql.Int, id)
            .query('SELECT ProductId, Quantity FROM OrderItems WHERE OrderId = @OrderId');

        if (items.recordset.length === 0) return res.status(404).json({ message: 'Заказ пуст' });

        let addedCount = 0;
        let skippedItems = [];

        for (let item of items.recordset) {
            // ПРОВЕРКА ОСТАТКА
            const prodCheck = await pool.request()
                .input('ProductId', sql.Int, item.ProductId)
                .query('SELECT Name, StockQuantity FROM Products WHERE Id = @ProductId');
                
            const product = prodCheck.recordset[0];
            if (!product || product.StockQuantity <= 0) {
                skippedItems.push(product ? product.Name : 'Неизвестный товар');
                continue; // Пропускаем товар, если его нет
            }

            // Добавляем не больше, чем есть на складе
            const qtyToAdd = Math.min(item.Quantity, product.StockQuantity);

            const checkCart = await pool.request()
                .input('UserId', sql.Int, req.user.userId)
                .input('ProductId', sql.Int, item.ProductId)
                .query('SELECT Id, Quantity FROM CartItems WHERE UserId = @UserId AND ProductId = @ProductId');

            if (checkCart.recordset.length > 0) {
                // Если товар уже в корзине, тоже проверяем, чтобы сумма не превысила склад
                let newQty = checkCart.recordset[0].Quantity + qtyToAdd;
                if (newQty > product.StockQuantity) newQty = product.StockQuantity;

                await pool.request()
                    .input('CartItemId', sql.Int, checkCart.recordset[0].Id)
                    .input('NewQty', sql.Int, newQty)
                    .query('UPDATE CartItems SET Quantity = @NewQty WHERE Id = @CartItemId');
            } else {
                await pool.request()
                    .input('UserId', sql.Int, req.user.userId)
                    .input('ProductId', sql.Int, item.ProductId)
                    .input('Quantity', sql.Int, qtyToAdd)
                    .query('INSERT INTO CartItems (UserId, ProductId, Quantity) VALUES (@UserId, @ProductId, @Quantity)');
            }
            addedCount++;
        }

        if (addedCount === 0) {
            return res.status(400).json({ message: 'Все товары из этого заказа закончились на складе.' });
        } else if (skippedItems.length > 0) {
            return res.json({ message: `Добавлено частично. Закончились: ${skippedItems.join(', ')}` });
        } else {
            res.json({ message: 'Товары из старого заказа добавлены в корзину' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при повторении заказа' });
    }
};