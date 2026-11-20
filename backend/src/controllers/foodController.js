
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');

const Food = require('../models/Food');
const Canteen = require('../models/Canteen');
const Category = require('../models/Category');

// Kiểm tra ID MongoDB
const validId = (value) =>
  typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);

// Trả về thông báo lỗi
const replyError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message
  });

// Kiểm tra quyền quản lý căn tin
const canManage = (user, canteen) =>
  user.role === 'admin' ||
  String(canteen.owner) === String(user._id);

// Xóa ảnh đã upload nếu thao tác thất bại
const removeUploadedFile = async (req) => {
  if (!req.file) return;

  try {
    await fs.unlink(req.file.path);
  } catch (error) {
    console.error('Không thể dọn ảnh upload:', error.message);
  }
};

// Kiểm tra dữ liệu món ăn
const getFoodData = (body, creating = false) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Dữ liệu món ăn không hợp lệ!');
  }

  const data = {};

  for (const field of ['name', 'description', 'image']) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') {
        throw new Error(`${field} phải là chuỗi!`);
      }

      data[field] = body[field].trim();
    }
  }

  if ((creating || body.name !== undefined) && !data.name) {
    throw new Error('Vui lòng nhập tên món!');
  }

  // Hỗ trợ giá dạng số và chuỗi từ FormData
  if (creating || body.price !== undefined) {
    const price = Number(body.price);

    if (
      body.price === undefined ||
      body.price === null ||
      String(body.price).trim() === '' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error('Giá phải là số lớn hơn hoặc bằng 0!');
    }

    data.price = price;
  }

  // Hỗ trợ boolean hoặc chuỗi từ FormData
  if (body.isAvailable !== undefined) {
    if (
      body.isAvailable !== true &&
      body.isAvailable !== false &&
      body.isAvailable !== 'true' &&
      body.isAvailable !== 'false'
    ) {
      throw new Error('isAvailable phải là true hoặc false!');
    }

    data.isAvailable =
      body.isAvailable === true || body.isAvailable === 'true';
  }

  if (creating || body.category !== undefined) {
    if (!validId(body.category)) {
      throw new Error('ID danh mục không hợp lệ!');
    }

    data.category = body.category;
  }

  return data;
};

// Xử lý lỗi MongoDB
const handleError = (res, error) => {
  console.error('Food error:', error);

  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    return replyError(res, 400, 'Dữ liệu món ăn không hợp lệ!');
  }

  return replyError(res, 500, 'Lỗi server khi xử lý món ăn!');
};

// Kiểm tra danh mục
const categoryMatches = async (categoryId, canteenId) => {
  const category = await Category.findById(categoryId);

  return Boolean(
    category &&
    category.isActive &&
    (
      !category.canteen ||
      String(category.canteen) === String(canteenId)
    )
  );
};

// 1. THÊM MÓN ĂN CÓ ẢNH
const createFood = async (req, res) => {
  let saved = false;

  try {
    const data = getFoodData(req.body, true);

    if (!validId(req.body.canteen)) {
      return replyError(res, 400, 'ID căn tin không hợp lệ!');
    }

    const canteen = await Canteen.findById(req.body.canteen);

    if (!canteen) {
      return replyError(res, 404, 'Không tìm thấy căn tin!');
    }

    if (!canManage(req.user, canteen)) {
      return replyError(res, 403, 'Bạn không quản lý căn tin này!');
    }

    if (!(await categoryMatches(data.category, canteen._id))) {
      return replyError(
        res,
        400,
        'Danh mục không hợp lệ hoặc không thuộc căn tin này!'
      );
    }

    if (req.file) {
      data.image = `/uploads/${req.file.filename}`;
    }

    const food = await Food.create({
      ...data,
      canteen: canteen._id
    });

    saved = true;

    return res.status(201).json({
      success: true,
      message: 'Thêm món thành công!',
      data: food
    });
  } catch (error) {
    if (error.message && (
      error.message.includes('phải') ||
      error.message.includes('Vui lòng') ||
      error.message.includes('không hợp lệ')
    )) {
      return replyError(res, 400, error.message);
    }

    return handleError(res, error);
  } finally {
    if (!saved) {
      await removeUploadedFile(req);
    }
  }
};

// 2. XEM DANH SÁCH MÓN ĂN
const getAllFoods = async (req, res) => {
  const filter = {};

  for (const key of ['canteen', 'category']) {
    if (req.query[key] !== undefined) {
      if (!validId(req.query[key])) {
        return replyError(res, 400, `ID ${key} không hợp lệ!`);
      }

      filter[key] = req.query[key];
    }
  }

  if (req.query.isAvailable !== undefined) {
    if (!['true', 'false'].includes(req.query.isAvailable)) {
      return replyError(
        res,
        400,
        'isAvailable phải là true hoặc false!'
      );
    }

    filter.isAvailable = req.query.isAvailable === 'true';
  }

  try {
    const foods = await Food.find(filter)
      .populate('canteen', 'name location phone')
      .populate('category', 'name image')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: foods.length,
      data: foods
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 3. XEM CHI TIẾT MÓN ĂN
const getFoodById = async (req, res) => {
  if (!validId(req.params.id)) {
    return replyError(res, 400, 'ID món ăn không hợp lệ!');
  }

  try {
    const food = await Food.findById(req.params.id)
      .populate('canteen', 'name location phone')
      .populate('category', 'name image');

    if (!food) {
      return replyError(res, 404, 'Không tìm thấy món ăn!');
    }

    return res.status(200).json({
      success: true,
      data: food
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 4. SỬA MÓN ĂN VÀ THAY ẢNH
const updateFood = async (req, res) => {
  let saved = false;

  try {
    if (!validId(req.params.id)) {
      return replyError(res, 400, 'ID món ăn không hợp lệ!');
    }

    const data = getFoodData(req.body);

    if (req.body.canteen !== undefined) {
      return replyError(
        res,
        400,
        'Không được đổi căn tin của món!'
      );
    }

    if (!Object.keys(data).length && !req.file) {
      return replyError(res, 400, 'Chưa có dữ liệu để cập nhật!');
    }

    const food = await Food.findById(req.params.id);

    if (!food) {
      return replyError(res, 404, 'Không tìm thấy món ăn!');
    }

    const canteen = await Canteen.findById(food.canteen);

    if (!canteen) {
      return replyError(res, 404, 'Căn tin không còn tồn tại!');
    }

    if (!canManage(req.user, canteen)) {
      return replyError(
        res,
        403,
        'Bạn không quản lý món của căn tin này!'
      );
    }

    if (
      data.category &&
      !(await categoryMatches(data.category, food.canteen))
    ) {
      return replyError(res, 400, 'Danh mục không hợp lệ!');
    }

    if (req.file) {
      data.image = `/uploads/${req.file.filename}`;
    }

    Object.assign(food, data);
    await food.save();
    saved = true;

    return res.status(200).json({
      success: true,
      message: 'Sửa món thành công!',
      data: food
    });
  } catch (error) {
    if (error.message && (
      error.message.includes('phải') ||
      error.message.includes('Vui lòng') ||
      error.message.includes('không hợp lệ')
    )) {
      return replyError(res, 400, error.message);
    }

    return handleError(res, error);
  } finally {
    if (!saved) {
      await removeUploadedFile(req);
    }
  }
};

// 5. XÓA MÓN ĂN
const deleteFood = async (req, res) => {
  if (!validId(req.params.id)) {
    return replyError(res, 400, 'ID món ăn không hợp lệ!');
  }

  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return replyError(res, 404, 'Không tìm thấy món ăn!');
    }

    const canteen = await Canteen.findById(food.canteen);

    if (!canteen) {
      return replyError(res, 404, 'Căn tin không còn tồn tại!');
    }

    if (!canManage(req.user, canteen)) {
      return replyError(
        res,
        403,
        'Bạn không quản lý món của căn tin này!'
      );
    }

    await food.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Xóa món thành công!'
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 6. BẬT/TẮT CÒN MÓN – HẾT MÓN
const toggleFoodAvailability = async (req, res) => {
  if (!validId(req.params.id)) {
    return replyError(res, 400, 'ID món ăn không hợp lệ!');
  }

  const { isAvailable } = req.body || {};

  if (typeof isAvailable !== 'boolean') {
    return replyError(
      res,
      400,
      'isAvailable phải là true hoặc false!'
    );
  }

  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return replyError(res, 404, 'Không tìm thấy món ăn!');
    }

    const canteen = await Canteen.findById(food.canteen);

    if (!canteen) {
      return replyError(res, 404, 'Căn tin không tồn tại!');
    }

    if (!canManage(req.user, canteen)) {
      return replyError(
        res,
        403,
        'Bạn không có quyền thay đổi trạng thái món này!'
      );
    }

    food.isAvailable = isAvailable;
    await food.save();

    return res.status(200).json({
      success: true,
      message: isAvailable
        ? 'Món đã chuyển sang Còn món!'
        : 'Món đã chuyển sang Hết món!',
      data: food
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createFood,
  getAllFoods,
  getFoodById,
  updateFood,
  deleteFood,
  toggleFoodAvailability
};
