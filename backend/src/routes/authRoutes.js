const express = require('express');
const router = express.Router();
const { getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);

module.exports = router;