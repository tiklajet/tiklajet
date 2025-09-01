const mongoose = require('mongoose');

const TaskEventSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  ip:         String,
  uaHash:     String,
  startedAt:  { type: Date, default: Date.now },
  completedAt:{ type: Date },
  status:     { type: String, enum: ['started','completed','rejected'], default: 'started' }
}, { timestamps: true });

TaskEventSchema.index({ userId: 1, campaignId: 1 }, { unique: true });

module.exports = mongoose.model('TaskEvent', TaskEventSchema);
