const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['student', 'canteen_owner', 'shipper', 'admin'], 
    default: 'student' 
  },
  phone: { type: String, default: '' },
  dormBlock: { type: String, default: '' }, // Tòa KTX (vd: Tòa A)
  roomNumber: { type: String, default: '' }  // Số phòng KTX (vd: 302)
}, { timestamps: true });

// Mã hóa mật khẩu tự động trước khi lưu
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// So sánh mật khẩu khi đăng nhập
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);