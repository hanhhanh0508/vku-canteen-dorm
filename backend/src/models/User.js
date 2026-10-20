const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['student', 'canteen_owner', 'shipper', 'admin'], 
    default: 'student' 
  },
  phone: { type: String, default: '' },
  dormBlock: { type: String, default: '' }, // Tòa KTX (vd: Tòa A, Tòa B)
  roomNumber: { type: String, default: '' }  // Số phòng (vd: P.302)
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);