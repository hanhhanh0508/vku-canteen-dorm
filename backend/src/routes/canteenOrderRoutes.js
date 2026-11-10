const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getCanteenOrders,
  updateCanteenOrderStatus
} = require('../controllers/canteenOrderController');

const router = express.Router();
router.use(protect, authorize('canteen_owner'));
router.get('/', getCanteenOrders);
router.patch('/:id/status', updateCanteenOrderStatus);
module.exports = router;
