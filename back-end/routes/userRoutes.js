const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const verifyToken = require('../middleware/authMiddleware');
const UserStat = require('../models/UserStat');

// Router canlı mı? (debug)
router.get('/', (_req, res) => res.json({ ok: true, router: 'user' }));

// Cevapta şifreyi gizle
const sanitize = (doc) => {
  const o = doc.toObject ? doc.toObject() : { ...doc };
  delete o.password; delete o.__v;
  return o;
};

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const exists = await User.findOne({ email: req.body?.email });
    if (exists) return res.status(409).json({ message: 'E-posta kullanımda' });

    const user = await User.create(req.body || {});
    const token = jwt.sign(
      { id: user._id, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Geçersiz e-posta veya şifre' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Geçersiz e-posta veya şifre' });

    const token = jwt.sign(
      { id: user._id, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return res.json({ message: 'Giriş başarılı', token, user: sanitize(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ME (korumalı)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -__v');
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PROFIL (alternatif)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -__v');
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// HIZLI STATS (tamamlanan görev ve kazanç)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const stat = await UserStat.findOne({ userId: req.user.id });
    return res.json({
      completedCount: stat?.completedCount || 0,
      earnings: stat?.earnings || 0
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
