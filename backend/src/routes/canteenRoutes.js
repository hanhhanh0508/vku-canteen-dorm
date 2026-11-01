const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware'); 
const { checkRole } = require('../middlewares/roleMiddleware'); 
const {
  createCanteen,
  getAllCanteens,
  getCanteenById,
  updateCanteen,
  deleteCanteen
} = require('../controllers/canteenController');

// Import Middleware
const { protect } = require('../middlewares/authMiddleware'); 
const { checkRole } = require('../middlewares/roleMiddleware'); 

// [GET] Xem danh sách & chi tiết Căn tin (Không bắt buộc đăng nhập)
router.get('/', getAllCanteens);
router.get('/:id', getCanteenById);

// Thay fakeAuth bằng protect
router.post('/', protect, checkRole('canteen_owner', 'admin'), createCanteen);
router.put('/:id', protect, checkRole('canteen_owner', 'admin'), updateCanteen);
router.delete('/:id', protect, checkRole('canteen_owner', 'admin'), deleteCanteen);

module.exports = router;
