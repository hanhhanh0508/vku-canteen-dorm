const express = require('express');
const router = express.Router();

// Kiểm tra đăng nhập và vai trò người dùng
const {
  protect,
  authorize
} = require('../middlewares/authMiddleware');

// Các hàm xử lý món ăn, mình sẽ viết ở bước tiếp theo
const {
  createFood,
  getAllFoods,
  getFoodById,
  updateFood,
  deleteFood
} = require('../controllers/foodController');

// Các đường dẫn bên dưới đều yêu cầu đăng nhập
router.use(protect);

// Xem danh sách món ăn
router.get('/', getAllFoods);

// Xem chi tiết một món ăn
router.get('/:id', getFoodById);

// Chỉ chủ căn tin hoặc quản trị viên được thêm món
router.post(
  '/',
  authorize('canteen_owner', 'admin'),
  createFood
);

// Chỉ chủ căn tin hoặc quản trị viên được sửa món
router.put(
  '/:id',
  authorize('canteen_owner', 'admin'),
  updateFood
);

// Chỉ chủ căn tin hoặc quản trị viên được xóa món
router.delete(
  '/:id',
  authorize('canteen_owner', 'admin'),
  deleteFood
);

module.exports = router;
