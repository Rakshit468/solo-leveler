import mongoose from 'mongoose';
import { Skill, UserSkill } from '../models/Skill.js';
import User from '../models/User.js';
import Quest from '../models/Quest.js';

const getNormalizedStats = (stats = {}) => ({
  strength: stats.strength || 0,
  intelligence: stats.intelligence || 0,
  productivity: stats.productivity ?? stats.agility ?? 0,
  consistency: stats.consistency ?? stats.luck ?? 0,
});

const resolveStatName = (stat) => {
  if (stat === 'agility') return 'productivity';
  if (stat === 'luck') return 'consistency';
  return stat;
};

const getTierRequirements = (tier) => ({
  minimumLevel: ({ 1: 3, 2: 8, 3: 14, 4: 22, 5: 32 }[tier] || 3),
  minimumCategoryCompletions: tier * 4,
  minimumUnlockedSkills: Math.max(0, (tier - 1) * 2),
});

const evaluateSkillUnlock = ({ skill, user, userSkills, completedByCategory }) => {
  const lockReasons = [];
  const normalizedStats = getNormalizedStats(user.character.stats);
  const unlockedSkillNames = new Set(userSkills.map((us) => us.skill?.name).filter(Boolean));
  const tierRequirements = getTierRequirements(skill.tier);

  const requiredLevel = Math.max(skill.requirements.level || 1, tierRequirements.minimumLevel);
  if (user.character.level < requiredLevel) {
    lockReasons.push(`Requires level ${requiredLevel}. You are level ${user.character.level}.`);
  }

  const categoryCompleted = completedByCategory[skill.category] || 0;
  if (categoryCompleted < tierRequirements.minimumCategoryCompletions) {
    lockReasons.push(
      `Requires ${tierRequirements.minimumCategoryCompletions} completed ${skill.category} quests. You have ${categoryCompleted}.`
    );
  }

  if (userSkills.length < tierRequirements.minimumUnlockedSkills) {
    lockReasons.push(
      `Requires ${tierRequirements.minimumUnlockedSkills} unlocked skills. You have ${userSkills.length}.`
    );
  }

  const requiredStats = skill.requirements.stats || {};
  for (const [rawStat, required] of Object.entries(requiredStats)) {
    const stat = resolveStatName(rawStat);
    const currentValue = normalizedStats[stat] ?? 0;
    if (currentValue < required) {
      lockReasons.push(`Requires ${required} ${stat}. You have ${currentValue}.`);
    }
  }

  if ((skill.requirements.skills || []).length > 0) {
    const missing = skill.requirements.skills.filter((name) => !unlockedSkillNames.has(name));
    if (missing.length > 0) {
      lockReasons.push(`Missing prerequisite skills: ${missing.join(', ')}`);
    }
  }

  return {
    canUnlock: lockReasons.length === 0,
    lockReasons,
    tierRequirements,
  };
};

export const getSkills = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) filter.category = category;

    const skills = await Skill.find(filter).sort({ category: 1, tier: 1 });
    
    // Convert userId to ObjectId for consistent querying
    const userObjectId = typeof req.user.id === 'string' 
      ? new mongoose.Types.ObjectId(req.user.id)
      : req.user.id;
    
    const userSkills = await UserSkill.find({ user: userObjectId }).populate('skill');
    const user = await User.findById(userObjectId).select('character.level character.stats');

    const completedCountsRaw = await Quest.aggregate([
      { $match: { user: userObjectId, status: 'completed' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const completedByCategory = completedCountsRaw.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Combine skills with user progress
    const skillsWithProgress = skills.map(skill => {
      const userSkill = userSkills.find(us => us.skill._id.toString() === skill._id.toString());
      const unlockEvaluation = evaluateSkillUnlock({
        skill,
        user,
        userSkills,
        completedByCategory,
      });

      return {
        ...skill.toObject(),
        unlocked: !!userSkill,
        level: userSkill?.level || 0,
        experience: userSkill?.experience || 0,
        unlockedAt: userSkill?.unlockedAt || null,
        canUnlock: !userSkill && unlockEvaluation.canUnlock,
        lockReasons: userSkill ? [] : unlockEvaluation.lockReasons,
        tierRequirements: unlockEvaluation.tierRequirements,
      };
    });

    res.json({
      success: true,
      data: {
        skills: skillsWithProgress,
        categories: ['health', 'knowledge', 'productivity', 'creativity']
      }
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ message: 'Server error fetching skills' });
  }
};

export const unlockSkill = async (req, res) => {
  try {
    const skillId = req.params.id;
    const user = await User.findById(req.user.id);
    const skill = await Skill.findById(skillId);

    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    // Check if already unlocked
    const existingUserSkill = await UserSkill.findOne({ user: user._id, skill: skillId });
    if (existingUserSkill) {
      return res.status(400).json({ message: 'Skill already unlocked' });
    }

    const userSkills = await UserSkill.find({ user: user._id }).populate('skill');
    const completedCountsRaw = await Quest.aggregate([
      { $match: { user: user._id, status: 'completed' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const completedByCategory = completedCountsRaw.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const unlockEvaluation = evaluateSkillUnlock({
      skill,
      user,
      userSkills,
      completedByCategory,
    });

    if (!unlockEvaluation.canUnlock) {
      return res.status(400).json({
        message: unlockEvaluation.lockReasons[0],
      });
    }

    // Unlock the skill
    const userSkill = await UserSkill.create({
      user: user._id,
      skill: skillId,
      level: 1,
      experience: 0
    });

    // Apply skill effects to user
    if (skill.effects.statBonus) {
      for (const [stat, bonus] of Object.entries(skill.effects.statBonus)) {
        const normalizedStat = resolveStatName(stat);
        if (bonus > 0) {
          user.character.stats[normalizedStat] = (user.character.stats[normalizedStat] || 0) + bonus;
        }
      }
      user.character.totalStats = 
        user.character.stats.strength + 
        user.character.stats.intelligence + 
        (user.character.stats.productivity ?? user.character.stats.agility ?? 0) + 
        (user.character.stats.consistency ?? user.character.stats.luck ?? 0);
    }

    await user.save();

    const populatedUserSkill = await UserSkill.findById(userSkill._id).populate('skill');

    res.json({
      success: true,
      message: `Skill "${skill.name}" unlocked successfully!`,
      data: {
        userSkill: populatedUserSkill,
        updatedStats: user.character.stats
      }
    });
  } catch (error) {
    console.error('Unlock skill error:', error);
    res.status(500).json({ message: 'Server error unlocking skill' });
  }
};

export const getUserSkills = async (req, res) => {
  try {
    const userSkills = await UserSkill.find({ user: req.user.id })
      .populate('skill')
      .sort({ unlockedAt: -1 });

    res.json({
      success: true,
      data: userSkills
    });
  } catch (error) {
    console.error('Get user skills error:', error);
    res.status(500).json({ message: 'Server error fetching user skills' });
  }
};