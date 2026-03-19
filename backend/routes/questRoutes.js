import express from 'express';
import { body } from 'express-validator';
import { 
  getQuests, 
  createQuest, 
  updateQuest, 
  completeQuest, 
  deleteQuest,
  getDashboardData,
  getGoogleCalendarAuthUrl,
  googleCalendarCallback,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
  syncQuestToGoogleCalendar,
  syncAllQuestsToGoogleCalendar
} from '../controllers/questController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Google Calendar OAuth callback must be public because user returns from Google.
router.get('/google-calendar/callback', googleCalendarCallback);

// All routes below are protected
router.use(protect);

router.get('/google-calendar/auth-url', getGoogleCalendarAuthUrl);
router.get('/google-calendar/status', getGoogleCalendarStatus);
router.delete('/google-calendar/disconnect', disconnectGoogleCalendar);
router.post('/google-calendar/sync-all', syncAllQuestsToGoogleCalendar);
router.post('/:id/google-calendar/sync', syncQuestToGoogleCalendar);

// Quest CRUD routes
router.get('/', getQuests);
router.get('/dashboard', getDashboardData);

router.post('/', [
  body('title')
    .notEmpty()
    .withMessage('Quest title is required')
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters'),
  body('category')
    .isIn(['health', 'knowledge', 'productivity', 'creativity', 'social', 'other'])
    .withMessage('Invalid category'),
  body('type')
    .isIn(['daily', 'weekly', 'boss', 'custom'])
    .withMessage('Invalid quest type'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard', 'legendary'])
    .withMessage('Invalid difficulty level')
], createQuest);

router.put('/:id', updateQuest);
router.post('/:id/complete', completeQuest);
router.delete('/:id', deleteQuest);

export default router;