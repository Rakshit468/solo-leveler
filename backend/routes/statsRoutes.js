import express from 'express';
import { 
  getStats, 
  getLeaderboard, 
  addXP, 
  getAnalytics 
} from '../controllers/statsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getStats);
router.get('/leaderboard', getLeaderboard);
router.get('/analytics', getAnalytics);
router.post('/xp', addXP);

export default router;