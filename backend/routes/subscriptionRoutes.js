import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import { getMySubscription, listSubscriptions, assignSubscription } from '../controllers/subscriptionController.js';

const router = express.Router();

router.use(protect);

router.get('/me', getMySubscription);
router.get('/', requireRole('admin'), listSubscriptions);
router.post('/assign', requireRole('admin'), assignSubscription);

export default router;
