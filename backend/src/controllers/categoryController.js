const Category = require('../models/Category');

// 1. Lấy danh sách tất cả danh mục
const getAllCategories = async (req, res) => {
  try {
    const { canteen, all } = req.query;
    const filter = {};

    // Nếu không yêu cầu lấy toàn bộ thì mặc định chỉ lấy danh mục đang hoạt động
    if (all !== 'true') {
      filter.isActive = true;
    }

    // Nếu có truyền ID căn tin, lấy danh mục của căn tin đó hoặc danh mục dùng chung (canteen: null)
    if (canteen) {
      filter.$or = [{ canteen }, { canteen: null }];
    }

    const categories = await Category.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách danh mục!',
      error: error.message
    });
  }
};

// 2. Lấy thông tin chi tiết 1 danh mục
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục!'
      });
    }

    return res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin danh mục!',
      error: error.message
    });
  }
};

// 3. Tạo danh mục mới (Admin hoặc Chủ Căn tin)
const createCategory = async (req, res) => {
  try {
    const { name, description, image, canteen } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên danh mục không được để trống!'
      });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      image: image || '',
      canteen: canteen || null
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công!',
      data: category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo danh mục!',
      error: error.message
    });
  }
};

// 4. Cập nhật danh mục
const updateCategory = async (req, res) => {
  try {
    const { name, description, image, isActive, canteen } = req.body;

    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục để cập nhật!'
      });
    }

    category.name = name !== undefined ? name.trim() : category.name;
    category.description = description !== undefined ? description : category.description;
    category.image = image !== undefined ? image : category.image;
    category.isActive = isActive !== undefined ? isActive : category.isActive;
    if (canteen !== undefined) category.canteen = canteen;

    const updatedCategory = await category.save();

    return res.status(200).json({
      success: true,
      message: 'Cập nhật danh mục thành công!',
      data: updatedCategory
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật danh mục!',
      error: error.message
    });
  }
};

// 5. Xóa danh mục
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục để xóa!'
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Xóa danh mục thành công!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa danh mục!',
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
