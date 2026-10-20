const express = require('express');
const router = express.Router();
const { getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateProfile
} = require('../controllers/authController');

const {
  validateRegister,
  validateLogin
} = require('../middlewares/validateMiddleware');

// Tuyến đường công khai (có gắn middleware kiểm tra dữ liệu)
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Tuyến đường bảo vệ (Profile)
router.get('/me', getMe);
router.put('/profile', updateProfile);

module.exports = router;