const express = require('express');
const router = express.Router();

// 1. Import các hàm từ Controller
const {
  register,
  login,
  getMe,
  updateProfile
} = require('../controllers/authController');

// 2. Import các Middleware
const { protect } = require('../middlewares/authMiddleware');
const {
  validateRegister,
  validateLogin
} = require('../middlewares/validateMiddleware');

// 3. Tuyến đường công khai (Public Routes - Có kiểm tra validate dữ liệu)
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// 4. Tuyến đường bảo vệ (Protected Routes - Bắt buộc có Bearer Token)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;