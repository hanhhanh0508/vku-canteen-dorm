const mongoose = require('mongoose');
const canteenSchema = new mongoose.Schema(
    {
        name: {type: String, required: true},
        owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
        location: {type: String, required: true}, // Vị trí (VD:Khu A, Khu B)
        phone: {type: String, default: ''},
        image: {type: String, default: 'default-canteen.jpg'},
        isOpen: {type: Boolean, default: true}
    },
    { timestamps: true}
);
module.exports = mongoose.model('Canteen', canteenSchema);