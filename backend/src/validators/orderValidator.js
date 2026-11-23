// backend/src/validators/orderValidator.js

// Danh sách các Tòa KTX hợp lệ tại VKU
const ALLOWED_DORM_BLOCKS = [
  'Khu A',
  'Khu B',
  'Khu K',
  'Tòa A',
  'Tòa B',
  'Tòa K'
];

// Helper kiểm tra ObjectId hợp lệ 24 ký tự hex
const isValidObjectId = (id) =>
  typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);

// Ký tự HTML/Script nguy hiểm không được phép trong số phòng
const DANGEROUS_ROOM_REGEX = /[<>{}[\]\\\/`^~|&;$%="']/;

/**
 * Middleware tiền kiểm tra (validate) dữ liệu gửi lên khi tạo đơn hàng KTX
 * Đảm bảo chặn sớm các dữ liệu rác trước khi truy vấn sâu vào database
 */
const validateCreateOrderInput = (req, res, next) => {
  const { canteenId, canteen, items, dormBlock, roomNumber, phone, note } = req.body;
  const targetCanteenId = canteenId || canteen;

  // 1. Kiểm tra ID Căn tin
  if (!targetCanteenId || !isValidObjectId(String(targetCanteenId))) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp ID Căn tin hợp lệ!'
    });
  }

  // 2. Kiểm tra danh sách món đặt (items)
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Danh sách món đặt không được để trống!'
    });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      return res.status(400).json({
        success: false,
        message: `Món ăn tại vị trí ${i + 1} không hợp lệ!`
      });
    }

    const foodId = item.foodId || item.food;
    if (!foodId || !isValidObjectId(String(foodId))) {
      return res.status(400).json({
        success: false,
        message: `ID món ăn tại vị trí ${i + 1} không hợp lệ!`
      });
    }

    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: `Số lượng món tại vị trí ${i + 1} phải là số nguyên lớn hơn hoặc bằng 1!`
      });
    }
  }

  // 3. Kiểm tra Tòa KTX (dormBlock)
  if (!dormBlock || typeof dormBlock !== 'string' || !ALLOWED_DORM_BLOCKS.includes(dormBlock.trim())) {
    return res.status(400).json({
      success: false,
      message: 'Tòa KTX không hợp lệ. Vui lòng chọn Khu A, Khu B hoặc Khu K.'
    });
  }

  // 4. Kiểm tra Số phòng KTX (roomNumber)
  if (!roomNumber || typeof roomNumber !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp Số phòng KTX!'
    });
  }

  const cleanRoom = roomNumber.trim();
  if (cleanRoom.length < 1 || cleanRoom.length > 20) {
    return res.status(400).json({
      success: false,
      message: 'Số phòng KTX phải có độ dài từ 1 đến 20 ký tự!'
    });
  }

  if (/<[^>]*>/i.test(cleanRoom) || DANGEROUS_ROOM_REGEX.test(cleanRoom)) {
    return res.status(400).json({
      success: false,
      message: 'Số phòng KTX chứa ký tự không hợp lệ!'
    });
  }

  // 5. Kiểm tra Số điện thoại (phone)
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp Số điện thoại nhận hàng!'
    });
  }

  const cleanPhone = phone.trim();
  if (!/^0[35789]\d{8}$/.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam 10 số bắt đầu bằng 0 (vd: 0901234567).'
    });
  }

  // 6. Kiểm tra Ghi chú (note - tùy chọn)
  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Ghi chú phải là chuỗi ký tự!'
      });
    }

    if (note.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Ghi chú không được vượt quá 200 ký tự!'
      });
    }
  }

  next();
};

module.exports = {
  ALLOWED_DORM_BLOCKS,
  isValidObjectId,
  validateCreateOrderInput
};
