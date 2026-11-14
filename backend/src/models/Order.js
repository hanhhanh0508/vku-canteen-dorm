const mongoose = require('mongoose');

// Schema từng món trong đơn hàng
const orderItemSchema = new mongoose.Schema({
  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    required: [true, 'ID món ăn không được để trống!']
  },
  quantity: {
    type: Number,
    required: [true, 'Số lượng món phải lớn hơn hoặc bằng 1!'],
    min: [1, 'Số lượng tối thiểu là 1']
  },
  price: {
    type: Number,
    required: [true, 'Giá món ăn không được để trống!'],
    min: [0, 'Giá không được âm']
  }
}, { _id: false });

// Schema Đơn hàng KTX (Order)
const orderSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Đơn hàng phải thuộc về một Sinh viên!']
  },
  canteen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canteen',
    required: [true, 'Đơn hàng phải thuộc về một Căn tin!']
  },
  items: {
    type: [orderItemSchema],
    required: true,
    validate: [
      (arr) => Array.isArray(arr) && arr.length > 0,
      'Đơn hàng phải có ít nhất 1 món ăn!'
    ]
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Tổng tiền không được âm']
  },
  dormBlock: {
    type: String,
    required: [true, 'Vui lòng cung cấp Tòa KTX (vd: Khu A, Khu B, Khu K...)'],
    trim: true
  },
  roomNumber: {
    type: String,
    required: [true, 'Vui lòng cung cấp Số phòng KTX (vd: P.302)'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Vui lòng cung cấp Số điện thoại nhận hàng'],
    trim: true
  },
  note: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['Chờ xác nhận', 'Đang chế biến', 'Sẵn sàng giao', 'Đang giao', 'Hoàn thành', 'Đã hủy'],
      message: '{VALUE} không phải là trạng thái hợp lệ!'
    },
    default: 'Chờ xác nhận'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);

