const Canteen = require('../models/Canteen');
// 1. [POST] /api/canteens - Tạo Căn tin mới
const createCanteen = async (req, res) => {
    try {
        const { name, location, phone, image} = req.body;
        const canteen = await Canteen.create({
            name,
            location, 
            phone,
            image,
            owner: req.user._id // Lấy ID của tài khoản đang đăng nhập từ authMiddleware
        });
        res.status(201).json({
            success: true,
            message: 'Tạo Căn tin thành công!',
            data: canteen
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const getAllCanteens = async (req, res) =>{
    try {
        // populate('owner') để lấy thêm tên, email, phone của chủ quán
        const canteens = await Canteen.find().populate('owner', 'name email phone');
        res.status(200).json({
            success: true,
            count: canteens.length,
            data: canteens
        });
    } catch (error) {
        res.status(500).json({success:false, message: error.message});
    }
};
// 3. [GET] /api/canteens/:id - Xem chi tiết 1 Căn tin
const getCanteenById = async (req, res) => {
    try{
        const canteen = await Canteen.findById(req.params.id).populate('owner', 'name email phone');
        if (!canteen){
            return res.status(404).json({ success: false, message: 'Không tìm thấy Căn tin này!'});

        }
        res.status(200).json({success:true, data: canteen});
    } catch (error) {
        res.status(500).json({success:false, message: error.message});
    }
};
// 4. [PUT] /api/canteens/:id - Chỉnh sửa thông tin Căn tin
const updateCanteen = async(req,res) => {
    try{
        const canteen = await Canteen.findById(req.params.id);
        if (!canteen) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy Căn tin này!' });
        }
        //Kiểm tra quyền: Chỉ Admin hoặc đúng Owner sở hữu Căn tin mới được sửa
        if (canteen.owner.toString() !== req.user._id.toString()&&req.user.role !== 'admin'){
           return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa Căn tin này! '}); 
        }
        const updatedCanteen = await Canteen.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true}
        );
        res.status(200).json({
            success: true,
            message: 'Cập nhật Căn tin thành công!',
            data: updatedCanteen
        });
    } catch (error) {
        res.status(500).json({success: false, message: error.message});
    }
};
// 5. [DELETE] /api/canteens/:id - Xóa Căn tin (Dành cho Admin hoặc Owner)
const deleteCanteen = async (req, res) => {
    try {
        const canteen = await Canteen.findById(req.params.id);
        if(!canteen) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy Căn tin này!' });
        }
        //Kiểm tra quyền: Chỉ Admin hoặc đúng Owner sở hữu Căn tin mới được xóa
        if (canteen.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa Căn tin này!' });
        }
        await canteen.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Đã xóa Căn tin thành công!'
        });
    } catch (error) {
        res.status(500).json({success: false, message: error.message});
    }
};
module.exports = {
    createCanteen,
    getAllCanteens,
    getCanteenById,
    updateCanteen,
    deleteCanteen
};