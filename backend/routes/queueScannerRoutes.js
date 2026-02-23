/**
 * queueScannerRoutes.js
 * Routes for queue scanner operations
 */

import { Router } from 'express';
import { QueueScannerController } from '../controllers/queueScannerController.js';

const router = Router();

// Queue Scanner endpoints
router.post('/scan-now', QueueScannerController.triggerScan);
router.get('/status', QueueScannerController.getStatus);
router.post('/initialize', QueueScannerController.initialize);
router.get('/queue-videos', QueueScannerController.listQueueVideos);
router.get('/random-sub-video', QueueScannerController.getRandomSubVideo);

export default router;
