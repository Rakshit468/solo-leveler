import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Quest from '../models/Quest.js';
import { Skill } from '../models/Skill.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const skillsData = [
  // Health Category
  {
    name: 'Morning Warrior',
    description: 'Early riser who conquers the morning',
    icon: '🌅',
    category: 'health',
    tier: 1,
    requirements: { level: 1, skills: [], stats: { strength: 0, intelligence: 0, agility: 0, luck: 0 } },
    effects: { xpBonus: 5, statBonus: { strength: 2, stamina: 5 }, specialAbilities: ['Early Bird Bonus'] }
  },
  {
    name: 'Fitness Enthusiast',
    description: 'Dedicated to physical improvement',
    icon: '💪',
    category: 'health',
    tier: 2,
    requirements: { level: 5, skills: ['Morning Warrior'], stats: { strength: 15, agility: 10 } },
    effects: { xpBonus: 10, statBonus: { strength: 5, agility: 3 }, specialAbilities: ['Exercise Multiplier'] }
  },
  {
    name: 'Nutrition Master',
    description: 'Expert in healthy eating habits',
    icon: '🥗',
    category: 'health',
    tier: 2,
    requirements: { level: 8, skills: [], stats: { intelligence: 15, strength: 10 } },
    effects: { xpBonus: 8, statBonus: { strength: 3, intelligence: 2 }, specialAbilities: ['Meal Planning'] }
  },
  {
    name: 'Zen Master',
    description: 'Master of meditation and mindfulness',
    icon: '🧘',
    category: 'health',
    tier: 3,
    requirements: { level: 15, skills: ['Morning Warrior'], stats: { intelligence: 25, luck: 15 } },
    effects: { xpBonus: 15, statBonus: { intelligence: 4, luck: 3 }, specialAbilities: ['Meditation Bonus', 'Stress Reduction'] }
  },

  // Knowledge Category
  {
    name: 'Curious Mind',
    description: 'Always eager to learn new things',
    icon: '🤔',
    category: 'knowledge',
    tier: 1,
    requirements: { level: 1, skills: [], stats: { intelligence: 0 } },
    effects: { xpBonus: 10, statBonus: { intelligence: 3 }, specialAbilities: ['Learning Bonus'] }
  },
  {
    name: 'Speed Reader',
    description: 'Absorbs information quickly',
    icon: '📚',
    category: 'knowledge',
    tier: 2,
    requirements: { level: 6, skills: ['Curious Mind'], stats: { intelligence: 18, agility: 12 } },
    effects: { xpBonus: 12, statBonus: { intelligence: 4, agility: 2 }, specialAbilities: ['Reading Speed Boost'] }
  },
  {
    name: 'Research Expert',
    description: 'Master of finding and analyzing information',
    icon: '🔬',
    category: 'knowledge',
    tier: 3,
    requirements: { level: 12, skills: ['Speed Reader'], stats: { intelligence: 30, luck: 15 } },
    effects: { xpBonus: 18, statBonus: { intelligence: 6, luck: 2 }, specialAbilities: ['Research Mastery'] }
  },
  {
    name: 'Knowledge Sage',
    description: 'Repository of wisdom and learning',
    icon: '🧠',
    category: 'knowledge',
    tier: 4,
    requirements: { level: 20, skills: ['Research Expert', 'Curious Mind'], stats: { intelligence: 45 } },
    effects: { xpBonus: 25, statBonus: { intelligence: 8 }, specialAbilities: ['Wisdom Bonus', 'Teaching Ability'] }
  },

  // Productivity Category
  {
    name: 'Time Keeper',
    description: 'Master of time management',
    icon: '⏰',
    category: 'productivity',
    tier: 1,
    requirements: { level: 1, skills: [], stats: { agility: 0 } },
    effects: { xpBonus: 8, statBonus: { agility: 3, intelligence: 1 }, specialAbilities: ['Time Tracking'] }
  },
  {
    name: 'Task Slayer',
    description: 'Eliminates tasks with efficiency',
    icon: '⚡',
    category: 'productivity',
    tier: 2,
    requirements: { level: 7, skills: ['Time Keeper'], stats: { agility: 20, intelligence: 15 } },
    effects: { xpBonus: 15, statBonus: { agility: 5, intelligence: 3 }, specialAbilities: ['Task Multiplier'] }
  },
  {
    name: 'Goal Crusher',
    description: 'Systematically achieves objectives',
    icon: '🎯',
    category: 'productivity',
    tier: 3,
    requirements: { level: 14, skills: ['Task Slayer'], stats: { agility: 30, strength: 20 } },
    effects: { xpBonus: 20, statBonus: { agility: 6, strength: 3 }, specialAbilities: ['Goal Setting Mastery'] }
  },

  // Creativity Category
  {
    name: 'Creative Spark',
    description: 'Ignites creative thinking',
    icon: '✨',
    category: 'creativity',
    tier: 1,
    requirements: { level: 1, skills: [], stats: { luck: 0 } },
    effects: { xpBonus: 12, statBonus: { luck: 3, intelligence: 2 }, specialAbilities: ['Inspiration Bonus'] }
  },
  {
    name: 'Artistic Soul',
    description: 'Expresses beauty through creation',
    icon: '🎨',
    category: 'creativity',
    tier: 2,
    requirements: { level: 8, skills: ['Creative Spark'], stats: { luck: 18, intelligence: 15 } },
    effects: { xpBonus: 16, statBonus: { luck: 4, intelligence: 3 }, specialAbilities: ['Artistic Creation'] }
  },
  {
    name: 'Innovation Master',
    description: 'Pioneers new ideas and solutions',
    icon: '💡',
    category: 'creativity',
    tier: 3,
    requirements: { level: 16, skills: ['Artistic Soul'], stats: { luck: 25, intelligence: 30 } },
    effects: { xpBonus: 22, statBonus: { luck: 5, intelligence: 4 }, specialAbilities: ['Innovation Breakthrough'] }
  }
];

const sampleQuests = [
  // Daily Quests
  {
    title: 'Morning Exercise',
    description: 'Complete a 30-minute workout',
    category: 'health',
    type: 'daily',
    difficulty: 'medium',
    xpReward: 50
  },
  {
    title: 'Read for Knowledge',
    description: 'Read for at least 20 minutes',
    category: 'knowledge',
    type: 'daily',
    difficulty: 'easy',
    xpReward: 25
  },
  {
    title: 'Complete Daily Tasks',
    description: 'Finish all planned tasks for today',
    category: 'productivity',
    type: 'daily',
    difficulty: 'medium',
    xpReward: 50
  },

  // Weekly Quests
  {
    title: 'Weekly Fitness Challenge',
    description: 'Exercise 5 times this week',
    category: 'health',
    type: 'weekly',
    difficulty: 'hard',
    xpReward: 150
  },
  {
    title: 'Learning Marathon',
    description: 'Complete an online course or tutorial',
    category: 'knowledge',
    type: 'weekly',
    difficulty: 'medium',
    xpReward: 100
  },

  // Boss Battles
  {
    title: 'Master a New Skill',
    description: 'Dedicate 30 days to learning a new skill',
    category: 'knowledge',
    type: 'boss',
    difficulty: 'legendary',
    xpReward: 500
  },
  {
    title: 'Fitness Transformation',
    description: 'Complete a 90-day fitness program',
    category: 'health',
    type: 'boss',
    difficulty: 'legendary',
    xpReward: 750
  }
];

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Quest.deleteMany({});
    await Skill.deleteMany({});

    console.log('🧹 Cleared existing data');

    // Create sample user
    const user = await User.create({
      username: 'demo_user',
      email: 'demo@example.com',
      password: 'password123',
      character: {
        name: 'Solo Leveler',
        avatar: 'default-avatar.png',
        level: 5,
        xp: 250,
        xpToNextLevel: 400,
        stats: {
          strength: 15,
          intelligence: 18,
          agility: 12,
          luck: 14,
          stamina: 120
        }
      }
    });

    console.log('👤 Created demo user');

    // Create skills
    await Skill.insertMany(skillsData);
    console.log('🌟 Created skills');

    // Create sample quests for the user
    const questsWithUser = sampleQuests.map(quest => ({
      ...quest,
      user: user._id,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Due tomorrow
    }));

    await Quest.insertMany(questsWithUser);
    console.log('📋 Created sample quests');

    console.log('✅ Database seeded successfully!');
    console.log('👤 Demo user credentials: demo@example.com / password123');
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
};

const runSeed = async () => {
  await connectDB();
  await seedData();
  process.exit(0);
};

runSeed();