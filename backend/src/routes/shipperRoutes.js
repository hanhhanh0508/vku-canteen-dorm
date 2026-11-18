const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getShipperOrders,
  acceptOrder,
  completeOrder,
  getAllUsers,
  updateUserStatus
} = require('../controllers/shipperController');

// API dành cho Shipper[cite: 5]
router.get('/orders', protect, authorize('shipper', 'admin'), getShipperOrders);
router.patch('/orders/:id/accept', protect, authorize('shipper'), acceptOrder);
router.patch('/orders/:id/complete', protect, authorize('shipper'), completeOrder);

// API dành cho Admin duyệt/khóa tài khoản[cite: 5]
router.get('/admin/users', protect, authorize('admin'), getAllUsers);
router.patch('/admin/users/:id/status', protect, authorize('admin'), updateUserStatus);

module.exports = router;