import express from 'express';
import * as socialMediaController from '../controllers/socialMediaController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ==================== OAuth Routes (PUBLIC - No Auth Required) ====================
// OAuth start - must be public (user clicks "connect" without login)
router.get('/youtube/oauth/start', socialMediaController.youtubeOAuthStart);

// OAuth callback - must be public since user redirects from Google
router.get('/youtube/oauth/callback', socialMediaController.youtubeOAuthCallback);

// Get all channels (PUBLIC - list all connected channels)
router.get('/', socialMediaController.getAllAccounts);

// ==================== Authenticated Routes ====================
// All subsequent routes require authentication
router.use(protect);
router.post('/', socialMediaController.createAccount);
router.get('/:id', socialMediaController.getAccount);
router.put('/:id', socialMediaController.updateAccount);
router.delete('/:id', socialMediaController.deleteAccount);

// Account operations
router.post('/:id/test-connection', socialMediaController.testConnection);
router.post('/:id/record-post', socialMediaController.recordPost);
router.get('/:id/can-post', socialMediaController.canPostNow);
router.get('/:id/stats', socialMediaController.getStats);

// YouTube-specific operations
router.post('/youtube/verify/:id', socialMediaController.verifyYoutubeAccount);
router.delete('/youtube/:id', socialMediaController.disconnectYoutubeAccount);
router.post('/youtube/:id/upload', socialMediaController.uploadVideoToYoutube);

export default router;
