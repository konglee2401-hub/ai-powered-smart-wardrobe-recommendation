import express from 'express';
import { buildVideoPrompt, generateVideo } from '../controllers/videoController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription, consumeGeneration } from '../middleware/subscription.js';
import { requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';
const router = express.Router();

router.use(protect);
router.use(requireActiveSubscription);
router.use(requireMenuAccess('generation'));
router.use(requireApiAccess('generation'));

// Build video prompt
router.post('/build-prompt', buildVideoPrompt);

// Generate video
router.post('/generate', consumeGeneration('video'), generateVideo);

export default router;
