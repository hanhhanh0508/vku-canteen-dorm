const mongoose = require('mongoose');
const Category = require('../models/Category');

// Tìm kiếm và lọc món ăn trong thực đơn Canteen
const searchMenu = async (req, res) => {
  try {
    const { q, keyword, category, canteen, minPrice, maxPrice, sortBy, sortOrder } = req.query;

    const searchTerm = q || keyword;
    const filter = {};

    // 1. Tìm theo từ khóa (tên món hoặc mô tả)
    if (searchTerm) {
      filter.$or = [
        { name: { $regex: searchTerm.trim(), $options: 'i' } },
        { description: { $regex: searchTerm.trim(), $options: 'i' } }
      ];
    }

    // 2. Lọc theo danh mục (ID danh mục hoặc tìm gần đúng theo tên)
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        const matchedCategory = await Category.findOne({
          name: { $regex: category.trim(), $options: 'i' }
        });
        if (matchedCategory) {
          filter.category = matchedCategory._id;
        }
      }
    }

    // 3. Lọc theo Căn tin (Canteen ID)
    if (canteen && mongoose.Types.ObjectId.isValid(canteen)) {
      filter.canteen = canteen;
    }

    // 4. Lọc theo khoảng giá (minPrice - maxPrice)
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && !isNaN(minPrice)) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined && !isNaN(maxPrice)) filter.price.$lte = Number(maxPrice);
    }

    // 5. Mặc định chỉ lấy món đang bán (nếu trường isAvailable có tồn tại)
    filter.isAvailable = { $ne: false };

    // 6. Xử lý sắp xếp (theo giá hoặc tên)
    let sort = { createdAt: -1 };
    if (sortBy === 'price') {
      sort = { price: sortOrder === 'desc' ? -1 : 1 };
    } else if (sortBy === 'name') {
      sort = { name: sortOrder === 'desc' ? -1 : 1 };
    }

    // 7. Truy vấn từ Model Food (kết nối linh hoạt khi Huyền hoàn tất Food.js)
    let foods = [];
    try {
      const Food = mongoose.models.Food || require('../models/Food');
      foods = await Food.find(filter)
        .populate('category', 'name image')
        .populate('canteen', 'name address phone')
        .sort(sort);
    } catch (modelErr) {
      // Khi file Food.js chưa được tạo, trả về kết quả rỗng kèm thông tin filter đã xử lý
      return res.status(200).json({
        success: true,
        message: 'Đã sẵn sàng bộ lọc tìm kiếm (Chờ Model Food từ Huyền)',
        query: req.query,
        filterApplied: filter,
        data: []
      });
    }

    return res.status(200).json({
      success: true,
      count: foods.length,
      data: foods
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tìm kiếm thực đơn!',
      error: error.message
    });
  }
};

module.exports = {
  searchMenu
};
