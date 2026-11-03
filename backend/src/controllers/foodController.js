const mongoose = require('mongoose');
const Food = require('../models/Food');
const Canteen = require('../models/Canteen');
const Category = require('../models/Category');

// Kiểm tra ID có đúng định dạng MongoDB hay không
const validId = (value) =>
  typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);

// Trả thông báo lỗi cho phía người dùng
const replyError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message
  });

// Admin hoặc đúng chủ căn tin mới được quản lý món
const canManage = (user, canteen) =>
  user.role === 'admin' ||
  String(canteen.owner) === String(user._id);

// Kiểm tra và chỉ lấy những trường được phép nhập
const getFoodData = (body, creating = false) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Dữ liệu phải là một đối tượng JSON!');
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

  if (creating || body.price !== undefined) {
    if (
      typeof body.price !== 'number' ||
      !Number.isFinite(body.price) ||
      body.price < 0
    ) {
      throw new Error('Giá phải là số lớn hơn hoặc bằng 0!');
    }

    data.price = body.price;
  }

  if (body.isAvailable !== undefined) {
    if (typeof body.isAvailable !== 'boolean') {
      throw new Error('isAvailable phải là true hoặc false!');
    }

    data.isAvailable = body.isAvailable;
  }

  if (creating || body.category !== undefined) {
    if (!validId(body.category)) {
      throw new Error('ID danh mục không hợp lệ!');
    }

    data.category = body.category;
  }

  return data;
};

// Phân biệt lỗi dữ liệu và lỗi server
const handleError = (res, error) => {
  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    return replyError(res, 400, 'Dữ liệu món ăn không hợp lệ!');
  }

  return replyError(res, 500, 'Lỗi server khi xử lý món ăn!');
};

// Danh mục phải đang hoạt động và dùng được cho căn tin
const categoryMatches = async (categoryId, canteenId) => {
  const category = await Category.findById(categoryId);

  return category &&
    category.isActive &&
    (
      !category.canteen ||
      String(category.canteen) === String(canteenId)
    );
};

// 1. Thêm món ăn
const createFood = async (req, res) => {
  let data;

  try {
    data = getFoodData(req.body, true);
  } catch (error) {
    return replyError(res, 400, error.message);
  }

  if (!validId(req.body.canteen)) {
    return replyError(res, 400, 'ID căn tin không hợp lệ!');
  }

  try {
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
        'Danh mục phải đang hoạt động và dùng được cho căn tin này!'
      );
    }

    const food = await Food.create({
      ...data,
      canteen: canteen._id
    });

    return res.status(201).json({
      success: true,
      message: 'Thêm món thành công!',
      data: food
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 2. Xem danh sách món, có thể lọc theo căn tin hoặc danh mục
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

// 3. Xem chi tiết một món
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

// 4. Sửa món ăn
const updateFood = async (req, res) => {
  if (!validId(req.params.id)) {
    return replyError(res, 400, 'ID món ăn không hợp lệ!');
  }

  let data;

  try {
    data = getFoodData(req.body);
  } catch (error) {
    return replyError(res, 400, error.message);
  }

  if (req.body.canteen !== undefined) {
    return replyError(
      res,
      400,
      'Không đổi căn tin của món qua API này!'
    );
  }

  if (!Object.keys(data).length) {
    return replyError(res, 400, 'Chưa có trường hợp lệ để cập nhật!');
  }

  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return replyError(res, 404, 'Không tìm thấy món ăn!');
    }

    const canteen = await Canteen.findById(food.canteen);

    if (!canteen) {
      return replyError(res, 404, 'Căn tin của món không còn tồn tại!');
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
      return replyError(
        res,
        400,
        'Danh mục phải đang hoạt động và dùng được cho căn tin này!'
      );
    }

    // Chỉ cập nhật những trường đã kiểm tra
    Object.assign(food, data);
    await food.save();

    return res.status(200).json({
      success: true,
      message: 'Sửa món thành công!',
      data: food
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 5. Xóa món ăn
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
      return replyError(res, 404, 'Căn tin của món không còn tồn tại!');
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

module.exports = {
  createFood,
  getAllFoods,
  getFoodById,
  updateFood,
  deleteFood
};