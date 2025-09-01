const mongoose = require('mongoose');

const PayoutAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  method: { type: String, enum: ['iban','papara'], required: true },
  fullName: { type: String, required: true, trim: true },
  iban: { type: String, trim: true },
  paparaNumber: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('PayoutAccount', PayoutAccountSchema);
