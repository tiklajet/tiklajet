const router = require('express').Router();
const mongoose = require('mongoose');
const verifyToken = require('../middleware/authMiddleware');
const requireSponsorOrAdmin = require('../middleware/requireSponsorOrAdmin');
const Campaign = require('../models/Campaign');

console.log('[campaignRoutes] loaded');
router.use((req, _res, next) => {
  console.log('[campaignRoutes HIT]', req.method, req.originalUrl);
  next();
});

// Ping
router.get('/ping', (_req, res) => res.json({ ok: true, router: 'campaigns' }));

// EDIT (auth + sponsor/admin): title, targetUrl, payoutPerTask, staySeconds, dailyCap
router.patch('/:id', verifyToken, requireSponsorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Geçersiz id' });
    }
    const camp = await Campaign.findById(id);
    if (!camp) return res.status(404).json({ message: 'Kampanya bulunamadı' });

    // Sadece sahibi ya da admin düzenleyebilir
    const isOwner = camp.sponsorId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!(isOwner || isAdmin)) {
      return res.status(403).json({ message: 'Bu kampanyayı düzenleme yetkiniz yok' });
    }

    const { title, targetUrl, payoutPerTask, staySeconds, dailyCap } = req.body || {};
    const updates = {};

    if (typeof title === 'string' && title.trim()) updates.title = title.trim();
    if (typeof targetUrl === 'string' && targetUrl.trim()) updates.targetUrl = targetUrl.trim();

    if (payoutPerTask !== undefined) {
      if (typeof payoutPerTask !== 'number' || payoutPerTask < 0) {
        return res.status(400).json({ message: 'payoutPerTask sayısal ve 0+ olmalı' });
      }
      updates.payoutPerTask = payoutPerTask;
    }

    if (staySeconds !== undefined) {
      if (typeof staySeconds !== 'number' || staySeconds < 1) {
        return res.status(400).json({ message: 'staySeconds en az 1 olmalı' });
      }
      updates.staySeconds = staySeconds;
    }

    if (dailyCap !== undefined) {
      if (typeof dailyCap !== 'number' || dailyCap < 1) {
        return res.status(400).json({ message: 'dailyCap en az 1 olmalı' });
      }
      updates.dailyCap = dailyCap;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Güncellenecek alan yok' });
    }

    Object.assign(camp, updates);
    await camp.save();

    return res.json({ campaign: camp });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});


// LIST (public, sadece active)
router.get('/', async (_req, res) => {
  try {
    const list = await Campaign.find({ status: 'active' }).sort('-createdAt');
    return res.json({ campaigns: list });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

// STATUS (auth + sponsor/admin)
router.patch('/:id/status', verifyToken, requireSponsorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['active','paused','ended'];

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Geçersiz id' });
    if (!allowed.includes(status))           return res.status(400).json({ message: `Geçersiz status. ${allowed.join(', ')}` });

    const camp = await Campaign.findById(id);
    if (!camp) return res.status(404).json({ message: 'Kampanya bulunamadı' });

    const isOwner = camp.sponsorId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!(isOwner || isAdmin)) return res.status(403).json({ message: 'Bu kampanyayı yönetme yetkiniz yok' });

    camp.status = status;
    await camp.save();
    return res.json({ campaign: camp });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

// DETAIL (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Geçersiz id' });
    const camp = await Campaign.findById(id);
    if (!camp) return res.status(404).json({ message: 'Kampanya bulunamadı' });
    return res.json({ campaign: camp });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

module.exports = router;
