// src/controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// 1. Hàm register của Hạnh (giữ nguyên)
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, dormBlock, roomNumber } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email này đã được đăng ký!' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
      phone: phone || '',
      dormBlock: dormBlock || '',
      roomNumber: roomNumber || ''
    });

    if (user) {
      res.status(201).json({
        message: 'Đăng ký tài khoản thành công!',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          dormBlock: user.dormBlock,
          roomNumber: user.roomNumber
        }
      });
    } else {
      res.status(400).json({ message: 'Thông tin tài khoản không hợp lệ!' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server!', error: error.message });
  }
};

// 2. Các hàm giữ chỗ (Chờ Huyền và Lệ code xong để thay thế)
const login = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API login đang chờ Huyền tích hợp.'
  });
};

const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API getMe đang chờ Lệ tích hợp.'
  });
};

const updateProfile = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API updateProfile đang chờ Lệ tích hợp.'
  });
};

// Export đủ 4 hàm để file authRoutes.js gọi không bị lỗi
module.exports = {
  register,
  login,
  getMe,
  updateProfile
};