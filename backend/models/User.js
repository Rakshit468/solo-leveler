import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import XPLog from "./XPLog.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function () {
        // Password is not required if the user signed up with Google
        return !this.google.id;
      },
      minlength: 6,
    },
    character: {
      name: {
        type: String,
        default: "Unnamed Hero",
      },
      avatar: {
        type: String,
        default: "default-avatar.png",
      },
      level: {
        type: Number,
        default: 1,
      },
      xp: {
        type: Number,
        default: 0,
      },
      xpToNextLevel: {
        type: Number,
        default: 100,
      },
      stats: {
        strength: { type: Number, default: 10 },
        intelligence: { type: Number, default: 10 },
        productivity: { type: Number, default: 10 },
        consistency: { type: Number, default: 10 },
        stamina: { type: Number, default: 100 },
      },
      totalStats: {
        type: Number,
        default: 40,
      },
      gold: {
        type: Number,
        default: 0,
      },
    },
    google: {
      id: { type: String },
      displayName: { type: String },
    },
    achievements: [
      {
        name: String,
        description: String,
        icon: String,
        unlockedAt: Date,
      },
    ],
    streaks: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastActivity: Date,
    },
    preferences: {
      theme: {
        type: String,
        default: "dark",
        enum: ["light", "dark"],
      },
      notifications: {
        questReminders: { type: Boolean, default: true },
        levelUps: { type: Boolean, default: true },
        achievements: { type: Boolean, default: true },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate XP to next level
userSchema.methods.calculateXPToNextLevel = function () {
  const baseXP = 100;
  return Math.floor(baseXP * Math.pow(this.character.level, 1.5));
};

// Level up method
userSchema.methods.levelUp = function () {
  this.character.stats.productivity =
    this.character.stats.productivity ?? this.character.stats.agility ?? 10;
  this.character.stats.consistency =
    this.character.stats.consistency ?? this.character.stats.luck ?? 10;

  while (this.character.xp >= this.character.xpToNextLevel) {
    this.character.xp -= this.character.xpToNextLevel;
    this.character.level += 1;

    // Increase stats on level up
    this.character.stats.strength += Math.floor(Math.random() * 3) + 1;
    this.character.stats.intelligence += Math.floor(Math.random() * 3) + 1;
    this.character.stats.productivity += Math.floor(Math.random() * 3) + 1;
    this.character.stats.consistency += Math.floor(Math.random() * 2) + 1;
    this.character.stats.stamina = Math.min(
      this.character.stats.stamina + 10,
      200
    );

    this.character.totalStats =
      this.character.stats.strength +
      this.character.stats.intelligence +
      this.character.stats.productivity +
      this.character.stats.consistency;

    this.character.xpToNextLevel = this.calculateXPToNextLevel();
  }
  return this.character.level;
};

userSchema.methods.addXP = async function (
  amount,
  source,
  sourceId,
  reason,
  metadata
) {
  const previousLevel = this.character.level;
  const previousXP = this.character.xp;

  this.character.xp += amount;
  const newLevel = this.levelUp();

  await this.save();

  // Log XP gain
  await XPLog.create({
    user: this._id,
    source,
    sourceId,
    sourceModel:
      source === "quest"
        ? "Quest"
        : source === "achievement"
        ? "Achievement"
        : "User",
    amount,
    reason,
    metadata,
    userLevel: { before: previousLevel, after: this.character.level },
    userXP: { before: previousXP, after: this.character.xp },
  });

  return {
    leveledUp: newLevel > previousLevel,
    newLevel: this.character.level,
    newXP: this.character.xp,
    newXPToNextLevel: this.character.xpToNextLevel,
  };
};

export default mongoose.model("User", userSchema);
