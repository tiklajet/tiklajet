const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  sponsorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true, trim: true },
  targetUrl:   { type: String, required: true, trim: true },
  payoutPerTask:{ type: Number, default: 0.5 },
  staySeconds: { type: Number, default: 3, min: 1, max: 300 },
  dailyCap:    { type: Number, default: 100 },
  status:      { type: String, enum: ['draft','active','paused','ended'], default: 'active' }
}, { timestamps: true });

CampaignSchema.index({ sponsorId: 1, status: 1 });

module.exports = mongoose.model('Campaign', CampaignSchema);
