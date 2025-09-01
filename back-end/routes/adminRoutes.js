const router = require('express').Router();
const Payout = require('../models/Payout');
const User = require('../models/user');
const Campaign = require('../models/Campaign');
const TaskEvent = require('../models/TaskEvent');
const UserStat = require('../models/UserStat');

console.log('[adminRoutes] loaded');
router.use((req, _res, next) => {
  if (req.path === '/ping' || req.path.startsWith('/payouts') || req.path === '/dashboard') {
    console.log('[adminRoutes HIT]', req.method, req.originalUrl);
  }
  next();
});

// Ping
router.get('/ping', (_req, res) => res.json({ ok: true, router: 'admin' }));

// Payout listesi: ?status=pending|paid|rejected|all  &  ?limit=100
router.get('/payouts', async (req, res) => {
  const { status = 'pending', limit = 200 } = req.query;
  const filter = status === 'all' ? {} : { status };
  const list = await Payout.find(filter)
    .sort('-createdAt')
    .limit(Number(limit) || 200)
    .populate('userId', 'name email');
  res.json({ payouts: list });
});

// Payout'ı PAID işaretle
router.post('/payouts/:id/mark-paid', async (req, res) => {
  const p = await Payout.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Payout bulunamadı' });
  if (p.status !== 'pending') return res.status(400).json({ message: 'Sadece pending durum işaretlenir' });

  p.status = 'paid';
  p.paidAt = new Date();
  await p.save();
  res.json({ payout: p });
});

// Payout'ı REDDET (opsiyonel)
router.post('/payouts/:id/reject', async (req, res) => {
  const p = await Payout.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Payout bulunamadı' });
  if (p.status !== 'pending') return res.status(400).json({ message: 'Sadece pending durum reddedilir' });

  p.status = 'rejected';
  if (req.body?.note) p.note = req.body.note;
  await p.save();
  res.json({ payout: p });
});

// Dashboard özeti
router.get('/dashboard', async (_req, res) => {
  const totals = {};
  totals.users = await User.countDocuments();
  totals.campaigns = await Campaign.countDocuments();
  totals.tasksCompleted = await TaskEvent.countDocuments({ status: 'completed' });

  const sumStats = await UserStat.aggregate([
    { $group: { _id: null, earnings: { $sum: '$earnings' }, completed: { $sum: '$completedCount' } } }
  ]);
  totals.totalEarnings = sumStats[0]?.earnings || 0;
  totals.totalCompletions = sumStats[0]?.completed || 0;

  const payoutAgg = await Payout.aggregate([{ $group: { _id: '$status', sum: { $sum: '$amount' } } }]);
  let pending = 0, paid = 0, rejected = 0;
  payoutAgg.forEach(a => {
    if (a._id === 'pending') pending = a.sum;
    if (a._id === 'paid')    paid    = a.sum;
    if (a._id === 'rejected') rejected = a.sum;
  });

  res.json({ totals, payouts: { pending, paid, rejected } });
});

module.exports = router;
