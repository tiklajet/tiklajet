const router = require('express').Router();
const crypto = require('crypto');
const mongoose = require('mongoose');
const TaskEvent = require('../models/TaskEvent');
const Campaign  = require('../models/Campaign');
const UserStat  = require('../models/UserStat');

const uaToHash = (ua='') => crypto.createHash('sha1').update(ua).digest('hex');
const getIp = (req) => (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();

// Görev başlat
router.post('/start', async (req, res) => {
  try {
    // 0) Auth & body
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized (token yok/geçersiz)' });

    const body = req.body || {};
    const campaignIdRaw = body.campaignId;
    if (!campaignIdRaw) return res.status(400).json({ message: 'campaignId zorunlu' });
    if (!mongoose.Types.ObjectId.isValid(campaignIdRaw)) {
      return res.status(400).json({ message: 'Geçersiz campaignId' });
    }

    // 1) ObjectId cast —> Bundan SONRA her yerde bunu kullan
    const campaignId = new mongoose.Types.ObjectId(campaignIdRaw);
    const userId     = new mongoose.Types.ObjectId(req.user.id);

    // 2) Kampanya aktif mi?
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign || campaign.status !== 'active') {
      return res.status(400).json({ message: 'Kampanya aktif değil' });
    }

    // 3) (opsiyonel) anti-fraud – değişkenler artık tanımlı
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);

    // kampanya günlük limit
    const todayCompleted = await TaskEvent.countDocuments({
      campaignId, status: 'completed', createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    if (todayCompleted >= campaign.dailyCap) {
      return res.status(429).json({ message: 'Günlük limit doldu' });
    }

    // kullanıcı başına günde 1
    const perUserToday = await TaskEvent.countDocuments({
      campaignId, userId, status: 'completed', createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    if (perUserToday >= 1) {
      return res.status(429).json({ message: 'Günlük kullanıcı limiti doldu (1)' });
    }

    // aynı cihaz
    const uaHash = uaToHash(req.headers['user-agent'] || '');
    const dupDevice = await TaskEvent.findOne({
      campaignId, uaHash, status: 'completed', createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    if (dupDevice) {
      return res.status(429).json({ message: 'Aynı cihazla bugün görev tamamlanmış' });
    }

    // 4) Event upsert
    const ip = getIp(req);
    const ev = await TaskEvent.findOneAndUpdate(
      { userId, campaignId },
      { $setOnInsert: { userId, campaignId, ip, uaHash, status: 'started', startedAt: new Date() } },
      { upsert: true, new: true }
    );

    return res.status(201).json({
      eventId: ev._id.toString(),
      staySeconds: campaign.staySeconds,
      targetUrl: campaign.targetUrl
    });
  } catch (e) {
    console.error('TASK /start error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// Görev tamamla
router.post('/complete', async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });

    const { eventId } = req.body || {};
    if (!eventId) return res.status(400).json({ message: 'eventId zorunlu' });

    const ev = await TaskEvent.findById(eventId);
    if (!ev || ev.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Kayıt yok' });
    }
    if (ev.status === 'completed') return res.json({ message: 'Zaten tamamlandı' });

    const camp = await Campaign.findById(ev.campaignId);
    if (!camp) return res.status(404).json({ message: 'Kampanya bulunamadı' });

    const elapsed = (Date.now() - new Date(ev.startedAt).getTime()) / 1000;
    if (elapsed < camp.staySeconds) {
      ev.status = 'rejected';
      await ev.save();
      return res.status(400).json({ message: `Süre yetersiz (${elapsed.toFixed(1)}s/${camp.staySeconds}s)` });
    }

    ev.status = 'completed';
    ev.completedAt = new Date();
    await ev.save();

    await UserStat.findOneAndUpdate(
      { userId: ev.userId },
      { $inc: { completedCount: 1, earnings: camp.payoutPerTask } },
      { upsert: true, new: true }
    );

    return res.json({ message: 'Tamamlandı', payout: camp.payoutPerTask });
  } catch (e) {
    console.error('TASK /complete error:', e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
