const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const adminController = require('../controllers/adminController')
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Публичный маршрут: просмотр каталога (без middleware)
router.get('/', productController.getAllProducts);
// Защищенный маршрут: добавление товара (нужен токен + роль Admin)
router.post('/', verifyToken, isAdmin, productController.createProduct);
router.put('/:id', verifyToken, isAdmin, productController.updateProduct);
router.delete('/:id', verifyToken, isAdmin, productController.deleteProduct);
router.get('/characteristics/:productId', productController.getProductCharacteristics);
router.get('/categories', adminController.getCategories);

module.exports = router;