import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['health', 'knowledge', 'productivity', 'creativity']
  },
  tier: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  requirements: {
    level: { type: Number, default: 1 },
    skills: [String], // Prerequisites
    stats: {
      strength: { type: Number, default: 0 },
      intelligence: { type: Number, default: 0 },
      productivity: { type: Number, default: 0 },
      consistency: { type: Number, default: 0 }
    }
  },
  effects: {
    xpBonus: { type: Number, default: 0 }, // Percentage bonus
    statBonus: {
      strength: { type: Number, default: 0 },
      intelligence: { type: Number, default: 0 },
      productivity: { type: Number, default: 0 },
      consistency: { type: Number, default: 0 }
    },
    specialAbilities: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const userSkillSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  experience: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Composite index to prevent duplicate user-skill combinations
userSkillSchema.index({ user: 1, skill: 1 }, { unique: true });

export const Skill = mongoose.model('Skill', skillSchema);
export const UserSkill = mongoose.model('UserSkill', userSkillSchema);