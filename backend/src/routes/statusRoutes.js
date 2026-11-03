const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const {
  uploadImage,
  updateCanteenStatus,
  updateFoodAvailability
} = require('../controllers/statusController');

// Route tải lên hình ảnh đơn (key form-data là 'image')
router.post('/upload', upload.single('image'), uploadImage);

// Route cập nhật trạng thái hoạt động Căn tin (Realtime)
router.patch('/canteen', updateCanteenStatus);

// Route cập nhật trạng thái món ăn còn/hết (Realtime)
router.patch('/food', updateFoodAvailability);

module.exports = router;