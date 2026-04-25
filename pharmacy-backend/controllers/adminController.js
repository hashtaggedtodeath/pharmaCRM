const { sql, poolPromise } = require('../config/db');
const ExcelJS = require('exceljs'); // Библиотека для Excel
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Изменение статуса заказа (Только Админ)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { Status } = req.body;
        const pool = await poolPromise;

        await pool.request()
            .input('OrderId', sql.Int, id)
            .input('Status', sql.NVarChar, Status)
            .query('UPDATE Orders SET Status = @Status WHERE Id = @OrderId');

        res.json({ message: `Статус заказа №${id} изменен на "${Status}"` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при обновлении статуса' });
    }
};

// Получение товаров, которых мало на складе (меньше порога MinStockThreshold)
exports.getLowStockProducts = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT Id, Name, StockQuantity, MinStockThreshold 
            FROM Products 
            WHERE StockQuantity <= MinStockThreshold
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при получении остатков' });
    }
};

// Экспорт отчета об остатках в Excel
exports.exportStockToExcel = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT Id, Name, CategoryId, StockQuantity, SellingPrice FROM Products');
        
        // Создаем новую книгу Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Остатки на складе');

        // Задаем колонки
        worksheet.columns = [
            { header: 'ID', key: 'Id', width: 10 },
            { header: 'Наименование', key: 'Name', width: 30 },
            { header: 'Количество', key: 'StockQuantity', width: 15 },
            { header: 'Цена', key: 'SellingPrice', width: 15 }
        ];

        // Делаем заголовок жирным
        worksheet.getRow(1).font = { bold: true };

        // Добавляем данные из БД
        result.recordset.forEach(product => {
            worksheet.addRow(product);
        });

        // Настраиваем заголовки ответа, чтобы браузер понял, что это файл для скачивания
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI('Отчет_по_остаткам.xlsx'));

        // Отправляем файл пользователю
        await workbook.xlsx.write(res);
        res.status(200).end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при генерации Excel' });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Orders ORDER BY OrderDate DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при получении всех заказов' });
    }
};

exports.exportStockToPDF = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT Id, Name, StockQuantity, SellingPrice FROM Products');

        // Создаем документ PDF
        const doc = new PDFDocument({ margin: 50 });

        // Устанавливаем заголовки, чтобы браузер начал скачивание
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI('Отчет_по_остаткам.pdf'));

        // Связываем документ с ответом сервера
        doc.pipe(res);

        // Подключаем русский шрифт (который мы скопировали в корень бэкенда)
        const fontPath = path.join(__dirname, '../arial.ttf');
        if (fs.existsSync(fontPath)) {
            doc.font(fontPath);
        } else {
            console.log('Шрифт arial.ttf не найден! Русский текст может не отображаться.');
        }

        // Заголовок отчета
        doc.fontSize(20).text('ОТЧЕТ ПО ОСТАТКАМ ТОВАРОВ НА СКЛАДЕ', { align: 'center' });
        doc.moveDown(2); // Отступ вниз

        // Рисуем список товаров (простая таблица)
        result.recordset.forEach((product, index) => {
            doc.fontSize(12).text(
                `${index + 1}. Наименование: ${product.Name}`
            );
            doc.fontSize(10).fillColor('gray').text(
                `   ID: ${product.Id} | Остаток: ${product.StockQuantity} шт. | Цена продажи: ${product.SellingPrice} руб.`
            );
            doc.fillColor('black'); // Возвращаем черный цвет
            doc.moveDown(0.5);
            
            // Добавляем линию-разделитель
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.5);
        });

        // Завершаем и отправляем документ
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при генерации PDF' });
    }
};

// ================= СПРАВОЧНИКИ (Категории, Поставщики, Характеристики) =================

// КАТЕГОРИИ
exports.getCategories = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Categories');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Ошибка' }); }
};
exports.createCategory = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('Name', sql.NVarChar, req.body.Name).query('INSERT INTO Categories (Name) VALUES (@Name)');
        res.json({ message: 'Категория добавлена' });
    } catch (err) { res.status(500).json({ message: 'Ошибка' }); }
};
exports.deleteCategory = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Categories WHERE Id = @Id');
        res.json({ message: 'Категория удалена' });
    } catch (err) {
        // Ошибка 547 в MSSQL - это нарушение внешнего ключа (FOREIGN KEY)
        if (err.number === 547) {
            return res.status(400).json({ message: 'Ошибка: Невозможно удалить категорию, так как к ней привязаны существующие товары. Сначала перенесите товары в другую категорию.' });
        }
        res.status(500).json({ message: 'Внутренняя ошибка сервера при удалении' });
    }
};


// ПОСТАВЩИКИ
exports.getSuppliers = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Suppliers');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Ошибка' }); }
};
exports.createSupplier = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('Name', sql.NVarChar, req.body.Name)
            .input('ContactInfo', sql.NVarChar, req.body.ContactInfo)
            .query('INSERT INTO Suppliers (Name, ContactInfo) VALUES (@Name, @ContactInfo)');
        res.json({ message: 'Поставщик добавлен' });
    } catch (err) { res.status(500).json({ message: 'Ошибка' }); }
};
exports.deleteSupplier = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Suppliers WHERE Id = @Id');
        res.json({ message: 'Поставщик удален' });
    } catch (err) {
        if (err.number === 547) {
            return res.status(400).json({ message: 'Ошибка: Невозможно удалить поставщика, так как от него уже есть оформленные поступления товаров.' });
        }
        res.status(500).json({ message: 'Внутренняя ошибка сервера при удалении' });
    }
};

// ХАРАКТЕРИСТИКИ (Привязаны к товару)
exports.getCharacteristics = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().input('ProductId', sql.Int, req.params.productId).query('SELECT * FROM Characteristics WHERE ProductId = @ProductId');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Ошибка' }); }
};
exports.createCharacteristic = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ProductId', sql.Int, req.body.ProductId)
            .input('Name', sql.NVarChar, req.body.Name)
            .input('Value', sql.NVarChar, req.body.Value)
            .query('INSERT INTO Characteristics (ProductId, Name, Value) VALUES (@ProductId, @Name, @Value)');
        res.json({ message: 'Характеристика добавлена' });
    } catch (err) { res.status(500).json({ message: 'Ошибка' }); }
};
exports.deleteCharacteristic = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().input('Id', sql.Int, req.params.id).query('DELETE FROM Characteristics WHERE Id = @Id');
        res.json({ message: 'Характеристика удалена' });
    } catch (err) { res.status(500).json({ message: 'Ошибка' }); }
};

// ================= ПРИЕМКА ТОВАРОВ (Receipts) =================

// Получение истории всех поступлений (с деталями)
exports.getReceipts = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT r.Id, s.Name as SupplierName, r.ReceiptDate,
                   ri.ProductId, p.Name as ProductName, ri.Quantity, ri.PurchasePrice
            FROM Receipts r
            JOIN Suppliers s ON r.SupplierId = s.Id
            JOIN ReceiptItems ri ON r.Id = ri.ReceiptId
            JOIN Products p ON ri.ProductId = p.Id
            ORDER BY r.ReceiptDate DESC
        `);

        // Группируем товары по накладным
        const receipts = [];
        result.recordset.forEach(row => {
            let receipt = receipts.find(r => r.Id === row.Id);
            if (!receipt) {
                receipt = {
                    Id: row.Id,
                    SupplierName: row.SupplierName,
                    ReceiptDate: row.ReceiptDate,
                    Items: [],
                    TotalAmount: 0
                };
                receipts.push(receipt);
            }
            receipt.Items.push({
                ProductName: row.ProductName,
                Quantity: row.Quantity,
                PurchasePrice: row.PurchasePrice
            });
            receipt.TotalAmount += (row.Quantity * row.PurchasePrice);
        });

        res.json(receipts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка получения истории поступлений' });
    }
};

// Оформление нового поступления
exports.createReceipt = async (req, res) => {
    try {
        const { SupplierId, ProductId, Quantity, PurchasePrice } = req.body;
        
        if (!SupplierId || !ProductId || !Quantity || !PurchasePrice) {
            return res.status(400).json({ message: 'Заполните все поля!' });
        }

        const pool = await poolPromise;

        // Делаем всё через транзакцию (Создаем Receipt -> Добавляем в ReceiptItems -> Увеличиваем StockQuantity у Products)
        await pool.request()
            .input('SupplierId', sql.Int, SupplierId)
            .input('ProductId', sql.Int, ProductId)
            .input('Quantity', sql.Int, Quantity)
            .input('PurchasePrice', sql.Decimal(18,2), PurchasePrice)
            .query(`
                BEGIN TRANSACTION;
                BEGIN TRY
                    -- 1. Создаем запись о поступлении
                    DECLARE @ReceiptId INT;
                    INSERT INTO Receipts (SupplierId, ReceiptDate) VALUES (@SupplierId, GETDATE());
                    SET @ReceiptId = SCOPE_IDENTITY();

                    -- 2. Добавляем товар в состав поступления
                    INSERT INTO ReceiptItems (ReceiptId, ProductId, Quantity, PurchasePrice)
                    VALUES (@ReceiptId, @ProductId, @Quantity, @PurchasePrice);

                    -- 3. УВЕЛИЧИВАЕМ ОСТАТОК ТОВАРА НА СКЛАДЕ
                    UPDATE Products 
                    SET StockQuantity = StockQuantity + @Quantity, 
                        PurchasePrice = @PurchasePrice -- обновляем закупочную цену (вдруг изменилась)
                    WHERE Id = @ProductId;

                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            `);

        res.status(201).json({ message: 'Поступление успешно оформлено! Остаток товара на складе обновлен.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при оформлении поступления' });
    }
};

// ================= СТАТИСТИКА И ОТЧЕТЫ =================

// Отчет: Продажи в разрезе времени (по дням)
exports.getSalesByTime = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const pool = await poolPromise;
        
        let query = `
            SELECT 
                CAST(OrderDate AS DATE) as Date,
                COUNT(Id) as OrdersCount,
                SUM(TotalAmount) as TotalRevenue
            FROM Orders
            WHERE Status != 'Отменен'
        `;

        const request = pool.request();
        
        // Добавляем фильтр, если переданы даты
        if (startDate && endDate) {
            query += ` AND OrderDate >= @startDate AND OrderDate <= DATEADD(day, 1, @endDate) `; // DATEADD чтобы включить конец дня
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
        }

        query += ` GROUP BY CAST(OrderDate AS DATE) ORDER BY Date DESC`;
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Ошибка получения статистики' }); }
};

// Отчет: Популярность товаров
exports.getPopularProducts = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                p.Id, p.Name,
                SUM(oi.Quantity) as TotalSoldQuantity,
                SUM(oi.Quantity * oi.PriceAtPurchase) as TotalRevenue
            FROM OrderItems oi
            JOIN Orders o ON oi.OrderId = o.Id
            JOIN Products p ON oi.ProductId = p.Id
            WHERE o.Status != 'Отменен'
            GROUP BY p.Id, p.Name
            ORDER BY TotalSoldQuantity DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ message: 'Ошибка получения статистики' }); }
};

// ================= ЭКСПОРТЫ ДЛЯ СТАТИСТИКИ =================

// Экспорт продаж (Excel) С ФИЛЬТРОМ ПО ДАТАМ
exports.exportSalesExcel = async (req, res) => {
    try {
        const { startDate, endDate } = req.query; // Получаем даты от клиента
        const pool = await poolPromise;
        
        // Строим динамический запрос
        let query = "SELECT CAST(OrderDate AS DATE) as Date, COUNT(Id) as OrdersCount, SUM(TotalAmount) as TotalRevenue FROM Orders WHERE Status != 'Отменен'";
        const request = pool.request();
        if (startDate && endDate) {
            query += " AND OrderDate >= @startDate AND OrderDate <= DATEADD(day, 1, @endDate)";
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
        }
        query += " GROUP BY CAST(OrderDate AS DATE) ORDER BY Date DESC";
        
        const result = await request.query(query); // Выполняем запрос
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Продажи');
        worksheet.columns = [
            { header: 'Дата', key: 'Date', width: 15 },
            { header: 'Количество заказов', key: 'OrdersCount', width: 20 },
            { header: 'Выручка (руб)', key: 'TotalRevenue', width: 20 }
        ];
        worksheet.getRow(1).font = { bold: true };
        
        result.recordset.forEach(row => worksheet.addRow({ Date: new Date(row.Date).toLocaleDateString(), OrdersCount: row.OrdersCount, TotalRevenue: row.TotalRevenue }));
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI('Продажи.xlsx'));
        await workbook.xlsx.write(res);
        res.status(200).end();
    } catch (err) { res.status(500).json({ message: 'Ошибка Excel' }); }
};

// Экспорт продаж (PDF) С ФИЛЬТРОМ ПО ДАТАМ
exports.exportSalesPDF = async (req, res) => {
    try {
        const { startDate, endDate } = req.query; // Получаем даты от клиента
        const pool = await poolPromise;
        
        // Строим динамический запрос
        let query = "SELECT CAST(OrderDate AS DATE) as Date, COUNT(Id) as OrdersCount, SUM(TotalAmount) as TotalRevenue FROM Orders WHERE Status != 'Отменен'";
        const request = pool.request();
        if (startDate && endDate) {
            query += " AND OrderDate >= @startDate AND OrderDate <= DATEADD(day, 1, @endDate)";
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
        }
        query += " GROUP BY CAST(OrderDate AS DATE) ORDER BY Date DESC";
        
        const result = await request.query(query); // Выполняем запрос
        
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI('Продажи.pdf'));
        doc.pipe(res);
        
        const fontPath = path.join(__dirname, '../arial.ttf');
        if (fs.existsSync(fontPath)) doc.font(fontPath);

        // Добавим в заголовок PDF информацию о выбранном периоде
        let title = 'ОТЧЕТ ПО ПРОДАЖАМ (ПО ДНЯМ)';
        if (startDate && endDate) {
            title += `\nс ${new Date(startDate).toLocaleDateString()} по ${new Date(endDate).toLocaleDateString()}`;
        }
        
        doc.fontSize(16).text(title, { align: 'center' }).moveDown(2);
        
        result.recordset.forEach(row => {
            doc.fontSize(12).text(`Дата: ${new Date(row.Date).toLocaleDateString()} | Заказов: ${row.OrdersCount} шт. | Выручка: ${row.TotalRevenue} руб.`);
            doc.moveDown(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);
        });
        doc.end();
    } catch (err) { res.status(500).json({ message: 'Ошибка PDF' }); }
};

// Экспорт популярных товаров (Excel)
exports.exportPopularExcel = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT p.Name, SUM(oi.Quantity) as TotalSoldQuantity, SUM(oi.Quantity * oi.PriceAtPurchase) as TotalRevenue FROM OrderItems oi JOIN Orders o ON oi.OrderId = o.Id JOIN Products p ON oi.ProductId = p.Id WHERE o.Status != 'Отменен' GROUP BY p.Id, p.Name ORDER BY TotalSoldQuantity DESC");
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Популярные товары');
        worksheet.columns = [
            { header: 'Товар', key: 'Name', width: 30 },
            { header: 'Продано (шт)', key: 'TotalSoldQuantity', width: 15 },
            { header: 'Выручка (руб)', key: 'TotalRevenue', width: 20 }
        ];
        worksheet.getRow(1).font = { bold: true };
        result.recordset.forEach(row => worksheet.addRow(row));
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI('Популярные_товары.xlsx'));
        await workbook.xlsx.write(res);
        res.status(200).end();
    } catch (err) { res.status(500).json({ message: 'Ошибка Excel' }); }
};

// Экспорт популярных товаров (PDF)
exports.exportPopularPDF = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT p.Name, SUM(oi.Quantity) as TotalSoldQuantity, SUM(oi.Quantity * oi.PriceAtPurchase) as TotalRevenue FROM OrderItems oi JOIN Orders o ON oi.OrderId = o.Id JOIN Products p ON oi.ProductId = p.Id WHERE o.Status != 'Отменен' GROUP BY p.Id, p.Name ORDER BY TotalSoldQuantity DESC");
        
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + encodeURI('Популярные_товары.pdf'));
        doc.pipe(res);
        
        const fontPath = path.join(__dirname, '../arial.ttf');
        if (fs.existsSync(fontPath)) doc.font(fontPath);

        doc.fontSize(18).text('ОТЧЕТ ПО ПОПУЛЯРНОСТИ ТОВАРОВ', { align: 'center' }).moveDown(2);
        
        result.recordset.forEach((row, i) => {
            doc.fontSize(12).text(`${i+1}. ${row.Name} | Продано: ${row.TotalSoldQuantity} шт. | На сумму: ${row.TotalRevenue} руб.`);
            doc.moveDown(0.5).moveTo(50, doc.y).lineTo(550, doc.y).stroke().moveDown(0.5);
        });
        doc.end();
    } catch (err) { res.status(500).json({ message: 'Ошибка PDF' }); }
};