const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Все маршруты здесь защищены: нужен токен И роль Admin
router.put('/orders/:id/status', verifyToken, isAdmin, adminController.updateOrderStatus);
router.get('/reports/low-stock', verifyToken, isAdmin, adminController.getLowStockProducts);
router.get('/reports/export-stock-excel', verifyToken, isAdmin, adminController.exportStockToExcel);
router.get('/reports/export-stock-pdf', verifyToken, isAdmin, adminController.exportStockToPDF);
router.get('/orders', verifyToken, isAdmin, adminController.getAllOrders);
// Справочники (Категории)
router.get('/categories', verifyToken, isAdmin, adminController.getCategories);
router.post('/categories', verifyToken, isAdmin, adminController.createCategory);
router.delete('/categories/:id', verifyToken, isAdmin, adminController.deleteCategory);

// Справочники (Поставщики)
router.get('/suppliers', verifyToken, isAdmin, adminController.getSuppliers);
router.post('/suppliers', verifyToken, isAdmin, adminController.createSupplier);
router.delete('/suppliers/:id', verifyToken, isAdmin, adminController.deleteSupplier);

// Справочники (Характеристики)
router.get('/characteristics/:productId', verifyToken, isAdmin, adminController.getCharacteristics);
router.post('/characteristics', verifyToken, isAdmin, adminController.createCharacteristic);
router.delete('/characteristics/:id', verifyToken, isAdmin, adminController.deleteCharacteristic);

// Приемка товаров
router.get('/receipts', verifyToken, isAdmin, adminController.getReceipts);
router.post('/receipts', verifyToken, isAdmin, adminController.createReceipt);

// Отчеты
router.get('/reports/sales-by-time', verifyToken, isAdmin, adminController.getSalesByTime);
router.get('/reports/popular-products', verifyToken, isAdmin, adminController.getPopularProducts);
router.get('/reports/sales-excel', verifyToken, isAdmin, adminController.exportSalesExcel);
router.get('/reports/sales-pdf', verifyToken, isAdmin, adminController.exportSalesPDF);
router.get('/reports/popular-excel', verifyToken, isAdmin, adminController.exportPopularExcel);
router.get('/reports/popular-pdf', verifyToken, isAdmin, adminController.exportPopularPDF);

module.exports = router;