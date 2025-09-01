const router = require('express').Router();
const mongoose = require('mongoose');
const Payout = require('../models/Payout');
const PayoutAccount = require('../models/PayoutAccount');
const UserStat = require('../models/UserStat');

const MIN_PAYOUT = 50;
const MAX_PAYOUT = 10000;

// DEBUG: router yüklendi mi?
console.log('[payoutRoutes] loaded');

// DEBUG: bu router'a düşen her isteği yaz
router.use((req, _res, next) => {
  console.log('[payoutRoutes HIT]', req.method, 'path=', req.path, 'url=', req.originalUrl);
  next();
});

// Ping
router.get('/ping', (_req, res) => res.json({ ok: true, router: 'payout' }));

// Wallet
router.get('/wallet', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });

    const stat = await UserStat.findOne({ userId: req.user.id });
    const earnings = stat?.earnings || 0;

    const userObjId = new mongoose.Types.ObjectId(req.user.id);
    const agg = await Payout.aggregate([
      { $match: { userId: userObjId } },
      { $group: { _id: '$status', sum: { $sum: '$amount' } } }
    ]);

    let pending = 0, paid = 0;
    agg.forEach(a => { if (a._id === 'pending') pending = a.sum; if (a._id === 'paid') paid = a.sum; });

    const available = Math.max(0, earnings - pending - paid);
    res.json({ earnings, pending, paid, available, minThreshold: MIN_PAYOUT });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Account create/update
router.post('/account', async (req, res) => {
  try {
    const { method, fullName, iban, paparaNumber } = req.body || {};
    if (!method || !fullName) return res.status(400).json({ message: 'method ve fullName zorunlu' });
    if (method === 'iban' && !iban) return res.status(400).json({ message: 'IBAN gerekli' });
    if (method === 'papara' && !paparaNumber) return res.status(400).json({ message: 'Papara numarası gerekli' });

    const doc = await PayoutAccount.findOneAndUpdate(
      { userId: req.user.id },
      { method, fullName, iban, paparaNumber },
      { upsert: true, new: true }
    );
    res.status(201).json({ account: doc });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Account get
router.get('/account', async (req, res) => {
  try {
    const acc = await PayoutAccount.findOne({ userId: req.user.id });
    if (!acc) return res.status(404).json({ message: 'Hesap bulunamadı' });
    res.json({ account: acc });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Payout request
router.post('/request', async (req, res) => {
  try {
    const { amount } = req.body || {};
    if (!amount || amount <= 0)  return res.status(400).json({ message: 'Geçersiz tutar' });
    if (amount > MAX_PAYOUT)     return res.status(400).json({ message: `Max ${MAX_PAYOUT} TL` });

    const acc = await PayoutAccount.findOne({ userId: req.user.id });
    if (!acc) return res.status(400).json({ message: 'Önce ödeme hesabı ekleyin' });

    const stat = await UserStat.findOne({ userId: req.user.id });
    const earnings = stat?.earnings || 0;

    const userObjId = new mongoose.Types.ObjectId(req.user.id);
    const agg = await Payout.aggregate([
      { $match: { userId: userObjId } },
      { $group: { _id: '$status', sum: { $sum: '$amount' } } }
    ]);
    let pending = 0, paid = 0;
    agg.forEach(a => { if (a._id === 'pending') pending = a.sum; if (a._id === 'paid') paid = a.sum; });

    const available = Math.max(0, earnings - pending - paid);
    if (available < MIN_PAYOUT) return res.status(400).json({ message: `En az ${MIN_PAYOUT} TL` });
    if (amount > available)      return res.status(400).json({ message: `Maksimum talep ${available} TL` });

    const payout = await Payout.create({ userId: req.user.id, amount, status: 'pending' });
    res.status(201).json({ payout });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
