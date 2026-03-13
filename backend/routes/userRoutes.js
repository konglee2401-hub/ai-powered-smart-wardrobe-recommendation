import express from 'express';
import { protect } from '../middleware/auth.js';
import { getMe, getMySettings, updateMySettings, getMyAccess, changeMyPassword } from '../controllers/userController.js';

const router = express.Router();

router.use(protect);

router.get('/me', getMe);
router.get('/me/settings', getMySettings);
router.put('/me/settings', updateMySettings);
router.get('/me/access', getMyAccess);
router.put('/me/password', changeMyPassword);

export default router;
