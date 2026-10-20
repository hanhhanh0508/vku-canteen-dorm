// src/middlewares/validateMiddleware.js

const isValidEmail = (email) => {
  const re = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(String(email).toLowerCase());
};

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ: họ tên, email và mật khẩu'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Định dạng email không hợp lệ'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu phải chứa ít nhất 6 ký tự'
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập đầy đủ email và mật khẩu'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Định dạng email không hợp lệ'
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin
};