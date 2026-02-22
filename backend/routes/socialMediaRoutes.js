import express from 'express';
import * as socialMediaController from '../controllers/socialMediaController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Account management routes
router.get('/', socialMediaController.getAllAccounts);
router.post('/', socialMediaController.createAccount);
router.get('/:id', socialMediaController.getAccount);
router.put('/:id', socialMediaController.updateAccount);
router.delete('/:id', socialMediaController.deleteAccount);

// Account operations
router.post('/:id/test-connection', socialMediaController.testConnection);
router.post('/:id/record-post', socialMediaController.recordPost);
router.get('/:id/can-post', socialMediaController.canPostNow);
router.get('/:id/stats', socialMediaController.getStats);

export default router;
