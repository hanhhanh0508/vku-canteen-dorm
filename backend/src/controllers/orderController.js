const Order = require('../models/Order');
const Food = require('../models/Food');
const Canteen = require('../models/Canteen');

/**
 * @desc    Sinh viên tạo đơn đặt món về KTX
 * @route   POST /api/orders
 * @access  Private (Chỉ dành cho Sinh viên - 'student')
 */
const createOrder = async (req, res) => {
  try {
    const studentId = req.user._id;
    const {
      canteenId,
      canteen: canteenFromBody,
      items,
      dormBlock,
      roomNumber,
      phone,
      note
    } = req.body;

    const targetCanteenId = canteenId || canteenFromBody;

    // 1. Kiểm tra Căn tin có tồn tại
    if (!targetCanteenId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ID Căn tin đặt món (canteenId)!'
      });
    }

    const canteenDoc = await Canteen.findById(targetCanteenId);
    if (!canteenDoc) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin Căn tin!'
      });
    }

    if (!canteenDoc.isOpen) {
      return res.status(400).json({
        success: false,
        message: 'Căn tin này hiện đang đóng cửa, vui lòng quay lại sau!'
      });
    }

    // 2. Kiểm tra danh sách món đặt
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách món đặt không được để trống!'
      });
    }

    // 3. Kiểm tra địa chỉ giao nhận KTX
    const finalDormBlock = (dormBlock || req.user.dormBlock || '').trim();
    const finalRoomNumber = (roomNumber || req.user.roomNumber || '').trim();
    const finalPhone = (phone || req.user.phone || '').trim();

    if (!finalDormBlock) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Tòa KTX nhận hàng (vd: Khu A, Khu B, Khu K...)!'
      });
    }

    if (!finalRoomNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Số phòng KTX nhận hàng (vd: P.302)!'
      });
    }

    if (!finalPhone) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Số điện thoại liên hệ nhận hàng!'
      });
    }

    // 4. Lấy chi tiết món ăn từ DB, kiểm tra tính hợp lệ và tính tổng tiền
    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const foodId = item.foodId || item.food;
      const quantity = Number(item.quantity);

      if (!foodId) {
        return res.status(400).json({
          success: false,
          message: 'Mỗi món ăn phải có ID món (foodId)!'
        });
      }

      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Số lượng món đặt phải tối thiểu là 1!'
        });
      }

      const foodDoc = await Food.findById(foodId);
      if (!foodDoc) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy món ăn có ID: ${foodId}`
        });
      }

      // Kiểm tra món có thuộc căn tin này không
      if (foodDoc.canteen.toString() !== targetCanteenId.toString()) {
        return res.status(400).json({
          success: false,
          message: `Món "${foodDoc.name}" không thuộc Căn tin đã chọn!`
        });
      }

      // Kiểm tra món còn phục vụ không
      if (!foodDoc.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Món "${foodDoc.name}" hiện đang tạm ngưng phục vụ!`
        });
      }

      const itemTotal = foodDoc.price * quantity;
      totalAmount += itemTotal;

      processedItems.push({
        food: foodDoc._id,
        quantity,
        price: foodDoc.price
      });
    }

    // 5. Khởi tạo đơn hàng mới
    const newOrder = await Order.create({
      student: studentId,
      canteen: targetCanteenId,
      items: processedItems,
      totalAmount,
      dormBlock: finalDormBlock,
      roomNumber: finalRoomNumber,
      phone: finalPhone,
      note: (note || '').trim(),
      status: 'Chờ xác nhận'
    });

    // Populate dữ liệu để trả về đầy đủ thông tin
    const populatedOrder = await Order.findById(newOrder._id)
      .populate('student', 'name email phone dormBlock roomNumber')
      .populate('canteen', 'name location phone')
      .populate('items.food', 'name price image');

    // 6. Phát sự kiện Socket.io thời gian thực tới phòng của Căn tin (để Căn tin nhận thông báo ngay)
    const io = req.app.get('io');
    if (io) {
      const canteenRoom = `canteen_${targetCanteenId}`;
      io.to(canteenRoom).emit('order:new', populatedOrder);
    }

    return res.status(201).json({
      success: true,
      message: 'Đặt đơn hàng KTX thành công! Đang chờ Căn tin xác nhận.',
      order: populatedOrder
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo đơn hàng KTX!',
      error: error.message
    });
  }
};

/**
 * @desc    Sinh viên xem lịch sử đơn hàng cá nhân
 * @route   GET /api/orders/my-orders
 * @access  Private (Chỉ dành cho Sinh viên)
 */
const getMyOrders = async (req, res) => {
  try {
    const studentId = req.user._id;

    const orders = await Order.find({ student: studentId })
      .sort({ createdAt: -1 })
      .populate('canteen', 'name location phone')
      .populate('items.food', 'name price image');

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy lịch sử đơn hàng!',
      error: error.message
    });
  }
};

/**
 * @desc    Xem chi tiết một đơn hàng theo ID
 * @route   GET /api/orders/:id
 * @access  Private (Sinh viên sở hữu đơn, Canteen Owner, Shipper hoặc Admin)
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('student', 'name email phone dormBlock roomNumber')
      .populate('canteen', 'name location phone owner')
      .populate('items.food', 'name price image');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng!'
      });
    }

    // Kiểm tra quyền truy cập chi tiết đơn:
    // Người dùng là sinh viên tạo đơn HOẶC là admin, shipper, hoặc chủ căn tin
    const isOwnerStudent = order.student && order.student._id.equals(req.user._id);
    const isPrivileged = ['admin', 'shipper'].includes(req.user.role);
    const isCanteenOwner = req.user.role === 'canteen_owner' && 
      order.canteen && 
      order.canteen.owner && 
      order.canteen.owner.equals(req.user._id);

    if (!isOwnerStudent && !isPrivileged && !isCanteenOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thông tin chi tiết đơn hàng này!'
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết đơn hàng!',
      error: error.message
    });
  }
};

/**
 * @desc    Sinh viên hủy đơn hàng khi trạng thái còn là 'Chờ xác nhận'
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private (Chỉ dành cho Sinh viên)
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng cần hủy!'
      });
    }

    // 1. Kiểm tra đơn hàng có phải của sinh viên này không
    if (order.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không thể hủy đơn hàng của người khác!'
      });
    }

    // 2. Chỉ cho phép hủy khi đang ở trạng thái 'Chờ xác nhận'
    if (order.status !== 'Chờ xác nhận') {
      return res.status(400).json({
        success: false,
        message: `Không thể hủy đơn! Đơn hàng hiện đang ở trạng thái "${order.status}".`
      });
    }

    // 3. Cập nhật trạng thái sang 'Đã hủy'
    order.status = 'Đã hủy';
    await order.save();

    // 4. Bắn thông báo Socket.io đến Căn tin
    const io = req.app.get('io');
    if (io) {
      const canteenRoom = `canteen_${order.canteen}`;
      io.to(canteenRoom).emit('order:cancelled', {
        orderId: order._id,
        message: `Đơn hàng #${order._id} đã được sinh viên hủy.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Hủy đơn hàng thành công!',
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi hủy đơn hàng!',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder
};

