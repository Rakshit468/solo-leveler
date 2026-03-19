import express from "express";
import { body } from "express-validator";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import {
  register,
  login,
  getProfile,
  updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Register route with validation
router.post(
  "/register",
  [
    body("username")
      .isLength({ min: 3, max: 20 })
      .withMessage("Username must be between 3-20 characters")
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username can only contain letters, numbers, and underscores"
      ),
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
    body("characterName")
      .optional()
      .isLength({ min: 1, max: 30 })
      .withMessage("Character name must be between 1-30 characters"),
  ],
  register
);

// Login route with validation
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

// Protected routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// --- Google OAuth Routes ---

// Validate that the requested origin is a known frontend (prevents open redirect).
const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  const allowed = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://localhost:5174",
  ].filter(Boolean);
  if (allowed.includes(origin)) return true;
  // Allow any Vercel preview/production deployment for this project.
  return /^https:\/\/[\w-]+\.vercel\.app$/.test(origin);
};

// Start Google OAuth — encode the requesting frontend origin in the state JWT
// so the callback can redirect back to the correct deployment.
router.get("/google", (req, res, next) => {
  const requestedOrigin = req.query.origin
    ? decodeURIComponent(req.query.origin)
    : "";
  const origin = isAllowedOrigin(requestedOrigin)
    ? requestedOrigin
    : process.env.CLIENT_URL || "http://localhost:5173";

  const state = jwt.sign({ origin }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state,
  })(req, res, next);
});

// Google OAuth callback — decode state to find the correct frontend to redirect to.
router.get(
  "/google/callback",
  (req, res, next) => {
    // Decode origin from state before passport consumes the request.
    let clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    try {
      const decoded = jwt.verify(req.query.state, process.env.JWT_SECRET);
      if (decoded.origin && isAllowedOrigin(decoded.origin)) {
        clientUrl = decoded.origin;
      }
    } catch (_) {
      // state invalid or expired — fall back to CLIENT_URL
    }
    req._oauthClientUrl = clientUrl;

    passport.authenticate("google", {
      session: false,
      failureRedirect: `${clientUrl}/login`,
    })(req, res, next);
  },
  (req, res) => {
    const clientUrl = req._oauthClientUrl ||
      process.env.CLIENT_URL ||
      "http://localhost:5173";
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.redirect(`${clientUrl}/auth/callback?token=${token}`);
  }
);

export default router;
