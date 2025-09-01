const mongoose = require('mongoose');

const PayoutSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:  { type: Number, required: true, min: 1 },
  status:  { type: String, enum: ['pending','paid','rejected'], default: 'pending' },
  note:    { type: String, trim: true },
  paidAt:  { type: Date }
}, { timestamps: true });

PayoutSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Payout', PayoutSchema);
