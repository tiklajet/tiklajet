// back-end/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const verifyToken  = require('./middleware/authMiddleware');
const requireAdmin = require('./middleware/requireAdmin');

const userRoutes     = require('./routes/userRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const taskRoutes     = require('./routes/taskRoutes');
const payoutRoutes   = require('./routes/payoutRoutes');
const adminRoutes    = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// --- Global middleware'ler (ROUTER'lardan ÖNCE) ---
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 })); // 15 dk / 300 istek

// Sağlık
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Router mount'ları (TEK ve 404'tan ÖNCE) ---
app.use('/api/user', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/tasks', verifyToken, taskRoutes);
app.use('/api/payout', verifyToken, payoutRoutes);
app.use('/api/admin', verifyToken, requireAdmin, adminRoutes);

// Root
app.get('/', (_req, res) => res.send('TıklaJet Backend Başladı!'));

// 404 EN SONDA
app.use((req, res) =>
  res.status(404).json({ ok: false, path: req.originalUrl, message: 'Not found' })
);

// MongoDB + server  (deprecated uyarısını temizledik)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`)))
  .catch(err => console.error('MongoDB error:', err));
