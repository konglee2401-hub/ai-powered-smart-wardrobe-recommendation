/**
 * queueScannerRoutes.js
 * Routes for queue scanner operations
 */

import { Router } from 'express';
import { QueueScannerController } from '../controllers/queueScannerController.js';
import { protect } from '../middleware/auth.js';
import { requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';
import { requireQueueAccess } from '../middleware/permissions.js';
import { requireActiveSubscription, consumeScrape } from '../middleware/subscription.js';

const router = Router();

router.use(protect);
router.use(requireMenuAccess('video-pipeline'));
router.use(requireApiAccess('video-pipeline'));
router.use(requireQueueAccess('queue-settings'));
router.use(requireActiveSubscription);

// Queue Scanner endpoints
router.post('/scan-now', consumeScrape('limit'), QueueScannerController.triggerScan);
router.get('/status', QueueScannerController.getStatus);
router.post('/initialize', QueueScannerController.initialize);
router.get('/settings', QueueScannerController.getSettings);
router.put('/settings', QueueScannerController.saveSettings);
router.get('/queue-videos', QueueScannerController.listQueueVideos);
router.get('/random-sub-video', QueueScannerController.getRandomSubVideo);

export default router;
