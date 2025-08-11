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

// Start Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback with logging middleware
router.get(
  "/google/callback",
  (req, res, next) => {
    console.log("Google OAuth callback route hit");
    next();
  },
  passport.authenticate("google", {
    session: false,
    failureRedirect: process.env.CLIENT_URL || "http://localhost:5173/login",
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/auth/callback?token=${token}`);
  }
);

export default router;
