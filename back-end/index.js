// back-end/index.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// 1) HEALTH (404'tan ÖNCE) – Render health check buraya bakıyor
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// 2) ROUTER’LAR
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/payout', require('./routes/payoutRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// 3) 404 – en sonda
app.use((req, res) => res.status(404).json({ ok:false, path:req.originalUrl, message:'Not found' }));

const PORT = process.env.PORT || 4000;

// Sunucuyu HER HALDE başlat (Mongo çalışmasa bile health dönebilsin)
app.listen(PORT, () => console.log('🚀 http://localhost:' + PORT));

// Mongo'ya ayrı bağlan; hata olsa bile app ayakta kalsın
(async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB bağlantısı başarılı');
    } else {
      console.warn('⚠️  MONGODB_URI tanımlı değil; DB bağlanmadı');
    }
  } catch (e) {
    console.error('❌ MongoDB bağlantı hatası:', e.message);
  }
})();
