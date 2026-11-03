const mongoose = require('mongoose');

// Cấu trúc thông tin một món ăn
const foodSchema = new mongoose.Schema(
  {
    // Tên món ăn
    name: {
      type: String,
      required: true,
      trim: true
    },

    // Mô tả món ăn
    description: {
      type: String,
      default: '',
      trim: true
    },

    // Giá bán, không được nhỏ hơn 0
    price: {
      type: Number,
      required: true,
      min: 0
    },

    // Đường dẫn hình ảnh món ăn
    image: {
      type: String,
      default: ''
    },

    // Món ăn thuộc căn tin nào
    canteen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canteen',
      required: true
    },

    // Món ăn thuộc danh mục nào
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },

    // true: đang bán; false: ngừng bán
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    // Tự lưu ngày tạo và ngày cập nhật
    timestamps: true
  }
);

module.exports = mongoose.model('Food', foodSchema);