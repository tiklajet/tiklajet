// back-end/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return res.status(401).json({ message: 'Token yok' });

  const token = h.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // .env: JWT_SECRET
    req.user = decoded; // { id: ... }
    next();
  } catch {
    return res.status(401).json({ message: 'Geçersiz / süresi dolmuş token' });
  }
};
