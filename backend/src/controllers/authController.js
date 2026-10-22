const User = require('../models/User');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

// 1. Đăng ký tài khoản (Hạnh)
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

// 2. Đăng nhập (Hàm giữ chỗ cho Huyền)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu!'
      });
    }

    // Tìm tài khoản theo email
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    // Kiểm tra email và mật khẩu
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác!'
      });
    }

    // Tạo JWT chứa ID người dùng
    const token = generateToken(user._id.toString());

    // Trả token và thông tin người dùng, không trả mật khẩu
    return res.status(200).json({
      success: true,
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
    console.error('Login error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Lỗi server!'
    });
  }
};

// 3. Lấy thông tin cá nhân (Lệ)
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Cập nhật thông tin cá nhân (Lệ)
const updateProfile = async (req, res) => {
  try {
    const { phone, roomNumber, dormBlock, name, fullName } = req.body;

    const user = await User.findById(req.user._id);

    if (user) {
      user.phone = phone || user.phone;
      user.roomNumber = roomNumber || user.roomNumber;
      user.dormBlock = dormBlock || user.dormBlock;
      user.name = name || fullName || user.name;

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công!',
        data: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          dormBlock: updatedUser.dormBlock,
          roomNumber: updatedUser.roomNumber,
          role: updatedUser.role
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};
