const Order = require('../models/Order');
const Food = require('../models/Food');
const Canteen = require('../models/Canteen');
const {
  ALLOWED_DORM_BLOCKS,
  isValidObjectId
} = require('../validators/orderValidator');

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

    // 1. Kiểm tra ID Căn tin hợp lệ & Tồn tại
    if (!targetCanteenId || !isValidObjectId(String(targetCanteenId))) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ID Căn tin hợp lệ!'
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

    // 3. Kiểm tra Tòa KTX
    const finalDormBlock = typeof dormBlock === 'string' ? dormBlock.trim() : '';
    if (!finalDormBlock || !ALLOWED_DORM_BLOCKS.includes(finalDormBlock)) {
      return res.status(400).json({
        success: false,
        message: 'Tòa KTX không hợp lệ. Vui lòng chọn Khu A, Khu B hoặc Khu K.'
      });
    }

    // 4. Kiểm tra Số phòng KTX
    const finalRoomNumber = typeof roomNumber === 'string' ? roomNumber.trim() : '';
    if (!finalRoomNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp Số phòng KTX!'
      });
    }

    if (finalRoomNumber.length < 1 || finalRoomNumber.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Số phòng KTX phải có độ dài từ 1 đến 20 ký tự!'
      });
    }

    if (/<[^>]*>/i.test(finalRoomNumber) || /[<>{}[\]\\\/`^~|&;$%="']/.test(finalRoomNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Số phòng KTX chứa ký tự không hợp lệ!'
      });
    }

    // 5. Kiểm tra Số điện thoại
    const finalPhone = typeof phone === 'string' ? phone.trim() : '';
    if (!finalPhone || !/^0[35789]\d{8}$/.test(finalPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam 10 số bắt đầu bằng 0 (vd: 0901234567).'
      });
    }

    // 6. Kiểm tra Ghi chú (nếu có)
    let finalNote = '';
    if (note !== undefined && note !== null) {
      if (typeof note !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Ghi chú phải là chuỗi ký tự!'
        });
      }
      finalNote = note.trim();
      if (finalNote.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Ghi chú không được vượt quá 200 ký tự!'
        });
      }
    }

    // 7. Lấy chi tiết món ăn từ DB, kiểm tra tính hợp lệ và tính tổng tiền
    let totalAmount = 0;
    const processedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const foodId = item.foodId || item.food;
      const quantity = Number(item.quantity);

      if (!foodId || !isValidObjectId(String(foodId))) {
        return res.status(400).json({
          success: false,
          message: `ID món ăn tại vị trí ${i + 1} không hợp lệ!`
        });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Số lượng món đặt phải là số nguyên lớn hơn hoặc bằng 1!'
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

      // Kiểm tra món còn phục vụ không (isAvailable)
      if (!foodDoc.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Món '${foodDoc.name}' hiện đã hết món.`
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

    // 8. Khởi tạo đơn hàng mới (Bảo mật: student gắn từ req.user, status & totalAmount không lấy từ client)
    const newOrder = await Order.create({
      student: studentId,
      canteen: targetCanteenId,
      items: processedItems,
      totalAmount,
      dormBlock: finalDormBlock,
      roomNumber: finalRoomNumber,
      phone: finalPhone,
      note: finalNote,
      status: 'Chờ xác nhận'
    });

    // Populate dữ liệu để trả về đầy đủ thông tin
    const populatedOrder = await Order.findById(newOrder._id)
      .populate('student', 'name email phone dormBlock roomNumber')
      .populate('canteen', 'name location phone')
      .populate('items.food', 'name price image');

    // 9. Phát sự kiện Socket.io thời gian thực tới phòng của Căn tin
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

    if (!isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.'
      });
    }

    const order = await Order.findById(id)
      .populate('student', 'name email phone dormBlock roomNumber')
      .populate('canteen', 'name location phone owner')
      .populate('items.food', 'name price image');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng.'
      });
    }

    // Kiểm tra quyền truy cập chi tiết đơn:
    // 1. Sinh viên phải là người tạo ra đơn hàng này
    const userId = req.user._id || req.user.id;
    const studentOwnerId = order.student?._id || order.student;
    const isOwnerStudent = studentOwnerId && studentOwnerId.toString() === userId.toString();

    // 2. Quyền đặc quyền: Admin hoặc Shipper
    const isPrivileged = ['admin', 'shipper'].includes(req.user.role);

    // 3. Chủ Căn tin sở hữu quán nhận đơn này
    const isCanteenOwner = req.user.role === 'canteen_owner' && 
      order.canteen && 
      order.canteen.owner && 
      order.canteen.owner.toString() === userId.toString();

    if (!isOwnerStudent && !isPrivileged && !isCanteenOwner) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn hàng này.'
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
    const studentId = req.user._id || req.user.id;

    if (!isValidObjectId(id)) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng cần hủy!'
      });
    }

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
