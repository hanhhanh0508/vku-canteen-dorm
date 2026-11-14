const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder
} = require('../controllers/orderController');

// [POST] Sinh viên tạo đơn đặt món về KTX
router.post('/', protect, checkRole('student'), createOrder);

// [GET] Sinh viên xem danh sách các đơn hàng của chính mình
router.get('/my-orders', protect, checkRole('student'), getMyOrders);

// [GET] Xem chi tiết một đơn hàng theo ID
router.get('/:id', protect, getOrderById);

// [PATCH] Sinh viên hủy đơn hàng khi còn ở trạng thái 'Chờ xác nhận'
router.patch('/:id/cancel', protect, checkRole('student'), cancelOrder);

module.exports = router;

