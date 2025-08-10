import express from 'express';
import { 
  getSkills, 
  unlockSkill, 
  getUserSkills 
} from '../controllers/skillController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getSkills);
router.get('/user', getUserSkills);
router.post('/:id/unlock', unlockSkill);

export default router;