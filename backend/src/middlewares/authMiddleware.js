const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization;
  const parts = authorization ? authorization.trim().split(/\s+/) : [];

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return res.status(401).json({ message: 'Yêu cầu Bearer token.' });
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error('JWT_SECRET chưa được cấu hình.'));
  }

  try {
    req.user = jwt.verify(parts[1], process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }

  return next();
}

module.exports = authMiddleware;