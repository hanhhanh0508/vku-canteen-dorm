
const express = require('express');
const router = express.Router();

const {
  protect,
  authorize
} = require('../middlewares/authMiddleware');

const upload = require('../middlewares/uploadMiddleware');

const {
  createFood,
  getAllFoods,
  getFoodById,
  updateFood,
  deleteFood,
  toggleFoodAvailability
} = require('../controllers/foodController');

// Tất cả API đều yêu cầu đăng nhập
router.use(protect);

// Xem thực đơn
router.get('/', getAllFoods);
router.get('/:id', getFoodById);

// Phân quyền chủ căn tin và admin
const ownerOnly = authorize('canteen_owner', 'admin');

// Thêm món có ảnh
router.post(
  '/',
  ownerOnly,
  upload.single('image'),
  createFood
);

// Sửa món có ảnh
router.put(
  '/:id',
  ownerOnly,
  upload.single('image'),
  updateFood
);

// Bật/tắt Còn món – Hết món
router.patch(
  '/:id/availability',
  ownerOnly,
  toggleFoodAvailability
);

// Xóa món
router.delete(
  '/:id',
  ownerOnly,
  deleteFood
);

module.exports = router;
