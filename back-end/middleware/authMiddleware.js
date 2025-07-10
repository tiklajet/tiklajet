const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Yetkisiz erişim: Token bulunamadı' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, 'gizliAnahtar');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Geçersiz token' });
  }
};

module.exports = verifyToken;
