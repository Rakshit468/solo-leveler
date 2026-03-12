import dotenv from "dotenv";
dotenv.config();

console.log("MONGODB_URI from env:", JSON.stringify(process.env.MONGODB_URI));

// Check for required environment variables
const requiredEnv = [
  "MONGODB_URI",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "API_URL",
];
for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    throw new Error(
      `FATAL ERROR: Environment variable ${envVar} is not defined.`
    );
  }
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/database.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import socketHandler from "./sockets/socketHandler.js";
import passport from "./config/passport.js";
import { Skill } from "./models/Skill.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import questRoutes from "./routes/questRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";

const app = express();

// ✅ Trust proxy for Railway/Heroku/etc. (needed for Google OAuth redirects)
app.set("trust proxy", 1);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CORS_ORIGIN || "http://localhost:5173",
      "http://localhost:5173", // allow local testing too
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Auto-initialize skills if database is empty
const initializeSkills = async () => {
  try {
    const skillCount = await Skill.countDocuments();
    if (skillCount === 0) {
      console.log("📚 Initializing skills...");
      const skillsData = [
        // Health Category
        {
          name: 'Morning Warrior',
          description: 'Early riser who conquers the morning',
          icon: '🌅',
          category: 'health',
          tier: 1,
          requirements: { level: 1, skills: [], stats: { strength: 0, intelligence: 0, agility: 0, luck: 0 } },
          effects: { xpBonus: 5, statBonus: { strength: 2, intelligence: 0, agility: 0, luck: 0 }, specialAbilities: ['Early Bird Bonus'] }
        },
        {
          name: 'Fitness Enthusiast',
          description: 'Dedicated to physical improvement',
          icon: '💪',
          category: 'health',
          tier: 2,
          requirements: { level: 5, skills: ['Morning Warrior'], stats: { strength: 15, agility: 10, intelligence: 0, luck: 0 } },
          effects: { xpBonus: 10, statBonus: { strength: 5, intelligence: 0, agility: 3, luck: 0 }, specialAbilities: ['Exercise Multiplier'] }
        },
        {
          name: 'Nutrition Master',
          description: 'Expert in healthy eating habits',
          icon: '🥗',
          category: 'health',
          tier: 2,
          requirements: { level: 8, skills: [], stats: { intelligence: 15, strength: 10, agility: 0, luck: 0 } },
          effects: { xpBonus: 8, statBonus: { strength: 3, intelligence: 2, agility: 0, luck: 0 }, specialAbilities: ['Meal Planning'] }
        },
        {
          name: 'Zen Master',
          description: 'Master of meditation and mindfulness',
          icon: '🧘',
          category: 'health',
          tier: 3,
          requirements: { level: 15, skills: ['Morning Warrior'], stats: { intelligence: 25, luck: 15, strength: 0, agility: 0 } },
          effects: { xpBonus: 15, statBonus: { strength: 0, intelligence: 4, agility: 0, luck: 3 }, specialAbilities: ['Meditation Bonus', 'Stress Reduction'] }
        },
        // Knowledge Category
        {
          name: 'Curious Mind',
          description: 'Always eager to learn new things',
          icon: '🤔',
          category: 'knowledge',
          tier: 1,
          requirements: { level: 1, skills: [], stats: { intelligence: 0, strength: 0, agility: 0, luck: 0 } },
          effects: { xpBonus: 10, statBonus: { strength: 0, intelligence: 3, agility: 0, luck: 0 }, specialAbilities: ['Learning Bonus'] }
        },
        {
          name: 'Speed Reader',
          description: 'Absorbs information quickly',
          icon: '📚',
          category: 'knowledge',
          tier: 2,
          requirements: { level: 6, skills: ['Curious Mind'], stats: { intelligence: 18, agility: 12, strength: 0, luck: 0 } },
          effects: { xpBonus: 12, statBonus: { strength: 0, intelligence: 4, agility: 2, luck: 0 }, specialAbilities: ['Reading Speed Boost'] }
        },
        {
          name: 'Research Expert',
          description: 'Master of finding and analyzing information',
          icon: '🔬',
          category: 'knowledge',
          tier: 3,
          requirements: { level: 12, skills: ['Speed Reader'], stats: { intelligence: 30, luck: 15, strength: 0, agility: 0 } },
          effects: { xpBonus: 18, statBonus: { strength: 0, intelligence: 6, agility: 0, luck: 2 }, specialAbilities: ['Research Mastery'] }
        },
        {
          name: 'Knowledge Sage',
          description: 'Repository of wisdom and learning',
          icon: '🧠',
          category: 'knowledge',
          tier: 4,
          requirements: { level: 20, skills: ['Research Expert', 'Curious Mind'], stats: { intelligence: 45, strength: 0, agility: 0, luck: 0 } },
          effects: { xpBonus: 25, statBonus: { strength: 0, intelligence: 8, agility: 0, luck: 0 }, specialAbilities: ['Wisdom Bonus', 'Teaching Ability'] }
        },
        // Productivity Category
        {
          name: 'Time Keeper',
          description: 'Master of time management',
          icon: '⏰',
          category: 'productivity',
          tier: 1,
          requirements: { level: 1, skills: [], stats: { agility: 0, strength: 0, intelligence: 0, luck: 0 } },
          effects: { xpBonus: 8, statBonus: { strength: 0, intelligence: 1, agility: 3, luck: 0 }, specialAbilities: ['Time Tracking'] }
        },
        {
          name: 'Task Slayer',
          description: 'Eliminates tasks with efficiency',
          icon: '⚡',
          category: 'productivity',
          tier: 2,
          requirements: { level: 7, skills: ['Time Keeper'], stats: { agility: 20, intelligence: 15, strength: 0, luck: 0 } },
          effects: { xpBonus: 15, statBonus: { strength: 0, intelligence: 3, agility: 5, luck: 0 }, specialAbilities: ['Task Multiplier'] }
        },
        {
          name: 'Goal Crusher',
          description: 'Systematically achieves objectives',
          icon: '🎯',
          category: 'productivity',
          tier: 3,
          requirements: { level: 14, skills: ['Task Slayer'], stats: { agility: 30, strength: 20, intelligence: 0, luck: 0 } },
          effects: { xpBonus: 20, statBonus: { strength: 3, intelligence: 0, agility: 6, luck: 0 }, specialAbilities: ['Goal Setting Mastery'] }
        },
        // Creativity Category
        {
          name: 'Creative Spark',
          description: 'Ignites creative thinking',
          icon: '✨',
          category: 'creativity',
          tier: 1,
          requirements: { level: 1, skills: [], stats: { luck: 0, strength: 0, intelligence: 0, agility: 0 } },
          effects: { xpBonus: 12, statBonus: { strength: 0, intelligence: 2, agility: 0, luck: 3 }, specialAbilities: ['Inspiration Bonus'] }
        },
        {
          name: 'Artistic Soul',
          description: 'Expresses beauty through creation',
          icon: '🎨',
          category: 'creativity',
          tier: 2,
          requirements: { level: 8, skills: ['Creative Spark'], stats: { luck: 18, intelligence: 15, strength: 0, agility: 0 } },
          effects: { xpBonus: 16, statBonus: { strength: 0, intelligence: 3, agility: 0, luck: 4 }, specialAbilities: ['Artistic Creation'] }
        },
        {
          name: 'Innovation Master',
          description: 'Pioneers new ideas and solutions',
          icon: '💡',
          category: 'creativity',
          tier: 3,
          requirements: { level: 16, skills: ['Artistic Soul'], stats: { luck: 25, intelligence: 30, strength: 0, agility: 0 } },
          effects: { xpBonus: 22, statBonus: { strength: 0, intelligence: 4, agility: 0, luck: 5 }, specialAbilities: ['Innovation Breakthrough'] }
        }
      ];
      
      await Skill.insertMany(skillsData);
      console.log("✅ Skills initialized successfully!");
    }
  } catch (error) {
    console.error("❌ Error initializing skills:", error);
  }
};

// Initialize skills after a short delay to ensure DB connection is ready
setTimeout(initializeSkills, 1000);
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN || "http://localhost:5173",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Passport init
app.use(passport.initialize());

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Debug request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/quests", questRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/skills", skillRoutes);

// Test route
app.get("/api/test", (req, res) => {
  res.status(200).send("API test route is working!");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    message: "Solo Leveling API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Socket.io connection handling
socketHandler(io);

// Error Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🎮 Socket.io server ready`);
});
