// Test upload ảnh và trả về đường dẫn file
exports.uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file hình ảnh để tải lên!'
      });
    }

    // Đường dẫn ảnh để lưu vào DB hoặc trả cho client hiển thị
    const imageUrl = `/uploads/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: 'Tải ảnh lên thành công!',
      data: {
        filename: req.file.filename,
        path: imageUrl,
        size: req.file.size
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi upload ảnh: ' + error.message
    });
  }
};

// Cập nhật trạng thái Căn tin (Mở cửa / Đóng cửa) & bắn Socket Realtime
exports.updateCanteenStatus = async (req, res) => {
  try {
    const { canteenId, isOpen } = req.body;

    if (canteenId === undefined || isOpen === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ canteenId và isOpen (true/false)!'
      });
    }

    // Lấy instance socket.io đã gắn ở req.app (sẽ cấu hình ở server.js)
    const io = req.app.get('io');
    if (io) {
      // Phát sự kiện realtime tới toàn bộ sinh viên đang mở app
      io.emit('canteen:status_change', {
        canteenId,
        isOpen: Boolean(isOpen),
        updatedAt: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái Căn tin thành ${isOpen ? 'MỞ CỬA' : 'ĐÓNG CỬA'} thành công!`,
      data: { canteenId, isOpen: Boolean(isOpen) }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái căn tin: ' + error.message
    });
  }
};

// Cập nhật trạng thái Món ăn (Còn món / Hết món) & bắn Socket Realtime
exports.updateFoodAvailability = async (req, res) => {
  try {
    const { foodId, isAvailable } = req.body;

    if (foodId === undefined || isAvailable === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ foodId và isAvailable (true/false)!'
      });
    }

    // Lấy instance socket.io đã gắn ở req.app
    const io = req.app.get('io');
    if (io) {
      // Phát sự kiện realtime tới toàn bộ sinh viên đang xem menu
      io.emit('food:availability_change', {
        foodId,
        isAvailable: Boolean(isAvailable),
        updatedAt: new Date()
      });
    }

    return res.status(200).json({
      success: true,
      message: `Cập nhật trạng thái món ăn thành ${isAvailable ? 'CÒN HÀNG' : 'HẾT HÀNG'} thành công!`,
      data: { foodId, isAvailable: Boolean(isAvailable) }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái món ăn: ' + error.message
    });
  }
};