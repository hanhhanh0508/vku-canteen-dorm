const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập tên danh mục!'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  image: {
    type: String,
    default: ''
  },
  canteen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Canteen',
    default: null // null nghĩa là danh mục chung, hoặc có thể gán theo Căn tin cụ thể
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
