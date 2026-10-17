const User = require('../models/userModel');


const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateProfile = async (req, res) => {
  try {
    const { phone, roomNumber, fullName } = req.body;

    const user = await User.findById(req.user._id);

    if (user) {
      user.phone = phone || user.phone;
      user.roomNumber = roomNumber || user.roomNumber;
      user.fullName = fullName || user.fullName;

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin thành công!',
        data: {
          _id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          phone: updatedUser.phone,
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
  getMe,
  updateProfile
};