module.exports = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'admin' || role === 'sponsor') return next();
  return res.status(403).json({ message: 'Sponsor veya admin yetkisi gerekli' });
};
