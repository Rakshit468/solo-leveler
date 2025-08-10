import dotenv from "dotenv";
dotenv.config();

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

// Middleware
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
