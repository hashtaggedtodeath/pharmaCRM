const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/', verifyToken, orderController.createOrder); // Оформить
router.get('/my', verifyToken, orderController.getMyOrders); // История
router.post('/:id/repeat', verifyToken, orderController.repeatOrder);

module.exports = router;