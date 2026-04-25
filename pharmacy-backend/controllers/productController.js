const { sql, poolPromise } = require('../config/db');

// Получение всех товаров
exports.getAllProducts = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Products');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при получении товаров' });
    }
};

// Добавление нового товара + Характеристики
exports.createProduct = async (req, res) => {
    try {
        const { CategoryId, Name, INN, Form, Dosage, Manufacturer, PurchasePrice, SellingPrice, ImageUrl, MinStockThreshold, ExpirationDate, Characteristics } = req.body;
        const pool = await poolPromise;

        // 1. Создаем товар и СРАЗУ получаем его новый ID (с помощью OUTPUT INSERTED.Id)
        const productResult = await pool.request()
            .input('CategoryId', sql.Int, CategoryId)
            .input('Name', sql.NVarChar, Name)
            .input('INN', sql.NVarChar, INN)
            .input('Form', sql.NVarChar, Form)
            .input('Dosage', sql.NVarChar, Dosage)
            .input('Manufacturer', sql.NVarChar, Manufacturer)
            .input('PurchasePrice', sql.Decimal(18,2), PurchasePrice)
            .input('SellingPrice', sql.Decimal(18,2), SellingPrice)
            .input('ImageUrl', sql.NVarChar, ImageUrl || null)
            .input('StockQuantity', sql.Int, 0)
            .input('MinStockThreshold', sql.Int, MinStockThreshold !== undefined ? parseInt(MinStockThreshold) : 10)
            .input('ExpirationDate', sql.Date, ExpirationDate || null)
            .query(`
                INSERT INTO Products (CategoryId, Name, INN, Form, Dosage, Manufacturer, PurchasePrice, SellingPrice, ImageUrl, StockQuantity, MinStockThreshold, ExpirationDate)
                OUTPUT INSERTED.Id 
                VALUES (@CategoryId, @Name, @INN, @Form, @Dosage, @Manufacturer, @PurchasePrice, @SellingPrice, @ImageUrl, @StockQuantity, @MinStockThreshold, @ExpirationDate)
            `);

        const newProductId = productResult.recordset[0].Id;

        // 2. Если переданы характеристики, сохраняем их привязывая к новому ID
        if (Characteristics && Characteristics.length > 0) {
            for (let char of Characteristics) {
                if (char.Name && char.Value) {
                    await pool.request()
                        .input('ProductId', sql.Int, newProductId)
                        .input('Name', sql.NVarChar, char.Name)
                        .input('Value', sql.NVarChar, char.Value)
                        .query('INSERT INTO Characteristics (ProductId, Name, Value) VALUES (@ProductId, @Name, @Value)');
                }
            }
        }

        res.status(201).json({ message: 'Товар и характеристики успешно добавлены' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при добавлении товара' });
    }
};

// Обновление товара + Характеристики
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { CategoryId, Name, INN, Form, Dosage, Manufacturer, PurchasePrice, SellingPrice, ImageUrl, StockQuantity, MinStockThreshold, ExpirationDate, Characteristics } = req.body;
        const pool = await poolPromise;

        // 1. Обновляем сам товар
        await pool.request()
            .input('Id', sql.Int, id)
            .input('CategoryId', sql.Int, CategoryId)
            .input('Name', sql.NVarChar, Name)
            .input('INN', sql.NVarChar, INN)
            .input('Form', sql.NVarChar, Form)
            .input('Dosage', sql.NVarChar, Dosage)
            .input('Manufacturer', sql.NVarChar, Manufacturer)
            .input('PurchasePrice', sql.Decimal(18,2), PurchasePrice)
            .input('SellingPrice', sql.Decimal(18,2), SellingPrice)
            .input('ImageUrl', sql.NVarChar, ImageUrl || null)
            .input('StockQuantity', sql.Int, StockQuantity)
            .input('MinStockThreshold', sql.Int, MinStockThreshold !== undefined ? parseInt(MinStockThreshold) : 10)
            .input('ExpirationDate', sql.Date, ExpirationDate || null)
            .query(`
                UPDATE Products SET 
                    CategoryId = @CategoryId, Name = @Name, INN = @INN, Form = @Form, Dosage = @Dosage,
                    Manufacturer = @Manufacturer, PurchasePrice = @PurchasePrice, SellingPrice = @SellingPrice, 
                    ImageUrl = @ImageUrl, MinStockThreshold = @MinStockThreshold,
                    ExpirationDate = @ExpirationDate
                WHERE Id = @Id
            `);

        // 2. Обновляем характеристики (самый простой путь: удалить старые и записать новые)
        if (Characteristics !== undefined) {
            await pool.request().input('ProductId', sql.Int, id).query('DELETE FROM Characteristics WHERE ProductId = @ProductId');
            
            for (let char of Characteristics) {
                if (char.Name && char.Value) {
                    await pool.request()
                        .input('ProductId', sql.Int, id)
                        .input('Name', sql.NVarChar, char.Name)
                        .input('Value', sql.NVarChar, char.Value)
                        .query('INSERT INTO Characteristics (ProductId, Name, Value) VALUES (@ProductId, @Name, @Value)');
                }
            }
        }

        res.json({ message: 'Товар и характеристики успешно обновлены' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при обновлении товара' });
    }
};

// Удаление товара
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        await pool.request().input('Id', sql.Int, id).query('DELETE FROM Products WHERE Id = @Id');
        res.json({ message: 'Товар удален' });
    } catch (err) {
        if (err.number === 547) {
            return res.status(400).json({ message: 'Невозможно удалить товар: он уже находится в оформленных заказах.' });
        }
        res.status(500).json({ message: 'Ошибка при удалении товара' });
    }
};

exports.getProductCharacteristics = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProductId', sql.Int, req.params.productId)
            .query('SELECT Name, Value FROM Characteristics WHERE ProductId = @ProductId');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Ошибка' }); }
};