/*const express = require('express');
const router = express.Router();
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

// Các API yêu cầu đăng nhập và đúng vai trò (canteen_owner hoặc admin)
router.post('/', protect, checkRole('canteen_owner', 'admin'), createCanteen);
router.put('/:id', protect, checkRole('canteen_owner', 'admin'), updateCanteen);
router.delete('/:id', protect, checkRole('canteen_owner', 'admin'), deleteCanteen);

module.exports = router;
*/
const express = require('express');
const router = express.Router();
const {
  createCanteen,
  getAllCanteens,
  getCanteenById,
  updateCanteen,
  deleteCanteen
} = require('../controllers/canteenController');

const { checkRole } = require('../middlewares/roleMiddleware');

// 🛠️ FAKE MIDDLEWARE TẠM THỜI (Bỏ qua Login & JWT)
const fakeAuth = (req, res, next) => {
  req.user = {
    _id: '65f1a2b3c4d5e6f7a8b9c0d1', // Một ObjectId MongoDB giả hợp lệ
    name: 'Chủ Căn Tin Giả Lập',
    role: 'canteen_owner' // 👈 Thay đổi thành 'student' hoặc 'admin' để test phân quyền!
  };
  next();
};

// --- ROUTE CẤU HÌNH TEST ---
// GET: Không cần Auth
router.get('/', getAllCanteens);
router.get('/:id', getCanteenById);

// POST/PUT/DELETE: Dùng fakeAuth tạm thời thay cho protect
router.post('/', fakeAuth, checkRole('canteen_owner', 'admin'), createCanteen);
router.put('/:id', fakeAuth, checkRole('canteen_owner', 'admin'), updateCanteen);
router.delete('/:id', fakeAuth, checkRole('canteen_owner', 'admin'), deleteCanteen);

module.exports = router;