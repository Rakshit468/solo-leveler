import mongoose from 'mongoose';

const xpLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source: {
    type: String,
    required: true,
    enum: ['quest', 'achievement', 'bonus', 'penalty', 'admin']
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceModel'
  },
  sourceModel: {
    type: String,
    enum: ['Quest', 'Achievement', 'User']
  },
  amount: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  metadata: {
    questTitle: String,
    achievementName: String,
    multiplier: Number,
    bonusType: String
  },
  userLevel: {
    before: Number,
    after: Number
  },
  userXP: {
    before: Number,
    after: Number
  }
}, {
  timestamps: true
});

// Index for efficient queries
xpLogSchema.index({ user: 1, createdAt: -1 });
xpLogSchema.index({ user: 1, source: 1, createdAt: -1 });

export default mongoose.model('XPLog', xpLogSchema);