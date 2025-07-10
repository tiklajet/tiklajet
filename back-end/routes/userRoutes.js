const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/authMiddleware');

//register
router.post('/register', async (req, res) => { 
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Geçersiz e-posta veya şifre' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Geçersiz e-posta veya şifre' });
    }

    // Token oluştur
    const token = jwt.sign({ userId: user._id }, 'gizliAnahtar', {
      expiresIn: '1h',
    });

    res.status(200).json({
      message: 'Giriş başarılı',
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

///
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gizli rota
router.get('/secret', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Gizli veriye erişildi', userId: req.userId });
});


module.exports = router;