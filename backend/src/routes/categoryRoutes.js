const express = require('express');
const router = express.Router();

const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const { searchMenu } = require('../controllers/menuSearchController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// 1. Tuyến đường công khai
// Lấy danh sách tất cả danh mục
router.get('/', getAllCategories);

// Tìm kiếm món ăn / thực đơn đa tiêu chí (đặt trước /:id để tránh trùng route param)
router.get('/search', searchMenu);

// Chi tiết 1 danh mục theo ID
router.get('/:id', getCategoryById);

// 2. Tuyến đường bảo vệ: Chỉ Admin hoặc Canteen Owner mới được thêm/sửa/xóa danh mục
router.post('/', protect, authorize('admin', 'canteen_owner'), createCategory);
router.put('/:id', protect, authorize('admin', 'canteen_owner'), updateCategory);
router.delete('/:id', protect, authorize('admin', 'canteen_owner'), deleteCategory);

module.exports = router;
