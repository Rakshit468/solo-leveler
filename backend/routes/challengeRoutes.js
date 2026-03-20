import express from "express";
import { body } from "express-validator";
import {
  createChallenge,
  joinChallenge,
  leaveChallenge,
  getMyChallenges,
  getChallengeLeaderboard,
} from "../controllers/challengeController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post(
  "/",
  [
    body("title")
      .notEmpty()
      .withMessage("Challenge title is required")
      .isLength({ max: 120 })
      .withMessage("Challenge title must be under 120 characters"),
    body("startDate").notEmpty().withMessage("startDate is required"),
    body("endDate").notEmpty().withMessage("endDate is required"),
    body("rules.minQuestsPerDay")
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage("minQuestsPerDay must be between 1 and 20"),
  ],
  createChallenge
);

router.post("/:id/join", joinChallenge);
router.post("/:id/leave", leaveChallenge);
router.get("/me", getMyChallenges);
router.get("/:id/leaderboard", getChallengeLeaderboard);

export default router;
