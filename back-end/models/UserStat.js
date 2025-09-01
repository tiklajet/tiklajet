const mongoose = require('mongoose');

const UserStatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  completedCount: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 } // TL toplam kazanç
}, { timestamps: true });

module.exports = mongoose.model('UserStat', UserStatSchema);
