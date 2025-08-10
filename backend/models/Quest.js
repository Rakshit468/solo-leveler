import mongoose from 'mongoose';

const questSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    enum: ['health', 'knowledge', 'productivity', 'creativity', 'social', 'other']
  },
  type: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'boss', 'custom'],
    default: 'custom'
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard', 'legendary'],
    default: 'medium'
  },
  xpReward: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'paused'],
    default: 'active'
  },
  progress: {
    current: { type: Number, default: 0 },
    target: { type: Number, default: 1 }
  },
  streak: {
    current: { type: Number, default: 0 },
    best: { type: Number, default: 0 }
  },
  dueDate: Date,
  completedAt: Date,
  completionHistory: [{
    date: { type: Date, default: Date.now },
    xpEarned: Number,
    notes: String
  }],
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  recurrence: {
    enabled: { type: Boolean, default: false },
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    daysOfWeek: [Number], // 0 = Sunday, 1 = Monday, etc.
    nextDue: Date
  },
  requirements: {
    level: { type: Number, default: 1 },
    skills: [String],
    completedQuests: [mongoose.Schema.Types.ObjectId]
  }
}, {
  timestamps: true
});

// Index for efficient queries
questSchema.index({ user: 1, status: 1, type: 1 });
questSchema.index({ user: 1, dueDate: 1 });

// Calculate XP based on difficulty and type
questSchema.methods.calculateXP = function() {
  const baseXP = {
    easy: 25,
    medium: 50,
    hard: 100,
    legendary: 250
  };
  
  const typeMultiplier = {
    daily: 1,
    weekly: 3,
    boss: 5,
    custom: 1
  };
  
  return baseXP[this.difficulty] * typeMultiplier[this.type];
};

// Mark quest as completed
questSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress.current = this.progress.target;
  
  // Update streak for recurring quests
  if (this.recurrence.enabled) {
    this.streak.current += 1;
    this.streak.best = Math.max(this.streak.current, this.streak.best);
  }
  
  // Record completion history
  this.completionHistory.push({
    date: new Date(),
    xpEarned: this.xpReward,
    notes: 'Quest completed successfully'
  });
  
  return this;
};

export default mongoose.model('Quest', questSchema);