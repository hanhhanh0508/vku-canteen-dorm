const Order = require('../models/Order');
const User = require('../models/User');
const { ORDER_STATUS, SOCKET_EVENTS } = require('../../public/js/constants');

// ==================== PHÂN HỆ SHIPPER ====================

// 1. Lấy danh sách đơn 'Sẵn sàng giao' và đơn Shipper này 'Đang giao'
exports.getShipperOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { status: ORDER_STATUS.READY },
        { status: ORDER_STATUS.DELIVERING, shipper: req.user._id }
      ]
    })
      .populate('student', 'name phone')
      .populate('canteen', 'name location')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn giao hàng', error: error.message });
  }
};

// 2. Shipper nhận đơn ('Sẵn sàng giao' -> 'Đang giao')
exports.acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });

    if (order.status !== ORDER_STATUS.READY) {
      return res.status(400).json({ success: false, message: 'Đơn này không ở trạng thái Sẵn sàng giao!' });
    }

    order.status = ORDER_STATUS.DELIVERING;
    order.shipper = req.user._id;
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, {
        orderId: order._id,
        status: order.status,
        message: `Shipper ${req.user.name} đang giao đơn tới ${order.dormBlock} - ${order.roomNumber}!`
      });
    }

    res.status(200).json({ success: true, message: 'Nhận đơn giao thành công!', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi nhận đơn', error: error.message });
  }
};

// 3. Shipper hoàn tất giao hàng ('Đang giao' -> 'Hoàn thành')
exports.completeOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng!' });

    if (order.status !== ORDER_STATUS.DELIVERING) {
      return res.status(400).json({ success: false, message: 'Chỉ hoàn thành được đơn đang ở trạng thái Đang giao!' });
    }

    order.status = ORDER_STATUS.COMPLETED;
    await order.save();

    // Phát sự kiện Real-time chặng 3 báo về Sinh viên
    const io = req.app.get('io');
    if (io) {
      io.emit(SOCKET_EVENTS.ORDER_COMPLETED, {
        orderId: order._id,
        status: order.status,
        message: 'Đơn hàng của bạn đã được giao thành công!'
      });
      io.emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, {
        orderId: order._id,
        status: order.status,
        message: 'Đơn hàng của bạn đã được giao thành công!'
      });
    }

    res.status(200).json({ success: true, message: 'Hoàn tất giao hàng thành công!', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi hoàn thành đơn', error: error.message });
  }
};

// ==================== PHÂN HỆ ADMIN (DUYỆT / KHÓA TÀI KHOẢN) ====================

// 4. Lấy danh sách tất cả tài khoản
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người dùng', error: error.message });
  }
};

// 5. Admin Duyệt ('active') hoặc Khóa ('locked') tài khoản[cite: 5]
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'locked', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ!' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản!' });

    res.status(200).json({
      success: true,
      message: status === 'active' ? 'Đã duyệt tài khoản!' : 'Đã khóa tài khoản!',
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái tài khoản', error: error.message });
  }
};