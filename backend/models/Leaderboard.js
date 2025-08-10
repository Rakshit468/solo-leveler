import mongoose from 'mongoose';

const leaderboardEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['overall', 'weekly', 'monthly', 'health', 'knowledge', 'productivity', 'creativity']
  },
  period: {
    year: Number,
    month: Number,
    week: Number
  },
  rank: {
    type: Number,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  metrics: {
    totalXP: Number,
    questsCompleted: Number,
    streakDays: Number,
    level: Number,
    achievementsUnlocked: Number
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient ranking queries
leaderboardEntrySchema.index({ type: 1, 'period.year': 1, 'period.month': 1, 'period.week': 1, rank: 1 });
leaderboardEntrySchema.index({ user: 1, type: 1 });

export default mongoose.model('LeaderboardEntry', leaderboardEntrySchema);