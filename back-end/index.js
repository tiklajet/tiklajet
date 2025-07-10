require('dotenv').config();
const userRoutes = require('./routes/userRoutes'); // ✅ Doğru yol
const express = require('express');
const mongoose = require('mongoose');




const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/user', userRoutes); // ✅ Doğru route: user

app.get('/', (req, res) => {
  res.send('TıklaJet Backend Başladı!');
});

// 🔧 Doğru env değişkeni adı: MONGODB_URI
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB bağlantısı başarılı');
  app.listen(PORT, () => {
    console.log(`🚀 Sunucu http://localhost:${PORT} üzerinde çalışıyor`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB bağlantı hatası:', err);
});