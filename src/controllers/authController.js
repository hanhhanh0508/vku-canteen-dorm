
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

// Đăng ký tài khoản
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      dormBlock,
      roomNumber
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Vui lòng nhập tên, email và mật khẩu!'
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: 'Email này đã được đăng ký!'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
      phone: phone || '',
      dormBlock: dormBlock || '',
      roomNumber: roomNumber || ''
    });

    return res.status(201).json({
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
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Email này đã được đăng ký!'
      });
    }

    return res.status(500).json({
      message: 'Lỗi server!'
    });
  }
};

// Đăng nhập
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Vui lòng nhập email và mật khẩu!'
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: 'Email hoặc mật khẩu không chính xác!'
      });
    }

    const token = generateToken(user._id.toString());

    return res.status(200).json({
      message: 'Đăng nhập thành công!',
      token,
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
  } catch (error) {
    return res.status(500).json({
      message: 'Lỗi server!'
    });
  }
};

module.exports = { register, login };
