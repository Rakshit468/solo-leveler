import { Skill, UserSkill } from '../models/Skill.js';
import User from '../models/User.js';

export const getSkills = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = {};
    if (category) filter.category = category;

    const skills = await Skill.find(filter).sort({ category: 1, tier: 1 });
    const userSkills = await UserSkill.find({ user: req.user.id }).populate('skill');

    // Combine skills with user progress
    const skillsWithProgress = skills.map(skill => {
      const userSkill = userSkills.find(us => us.skill._id.toString() === skill._id.toString());
      return {
        ...skill.toObject(),
        unlocked: !!userSkill,
        level: userSkill?.level || 0,
        experience: userSkill?.experience || 0,
        unlockedAt: userSkill?.unlockedAt || null
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

    // Check requirements
    if (user.character.level < skill.requirements.level) {
      return res.status(400).json({ 
        message: `Requires level ${skill.requirements.level}. You are level ${user.character.level}.`
      });
    }

    // Check stat requirements
    const userStats = user.character.stats;
    const requiredStats = skill.requirements.stats;
    
    for (const [stat, required] of Object.entries(requiredStats)) {
      if (userStats[stat] < required) {
        return res.status(400).json({
          message: `Requires ${required} ${stat}. You have ${userStats[stat]}.`
        });
      }
    }

    // Check prerequisite skills
    if (skill.requirements.skills.length > 0) {
      const prerequisiteSkills = await Skill.find({ name: { $in: skill.requirements.skills } });
      const userUnlockedSkills = await UserSkill.find({ 
        user: user._id,
        skill: { $in: prerequisiteSkills.map(s => s._id) }
      });

      if (userUnlockedSkills.length < prerequisiteSkills.length) {
        return res.status(400).json({
          message: `Missing prerequisite skills: ${skill.requirements.skills.join(', ')}`
        });
      }
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
        if (bonus > 0) {
          user.character.stats[stat] += bonus;
        }
      }
      user.character.totalStats = 
        user.character.stats.strength + 
        user.character.stats.intelligence + 
        user.character.stats.agility + 
        user.character.stats.luck;
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