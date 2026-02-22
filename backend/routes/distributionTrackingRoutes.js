import express from 'express';
import * as distributionController from '../controllers/distributionTrackingController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Distribution tracking CRUD routes
router.get('/', distributionController.getAllDistributions);
router.post('/', distributionController.createDistribution);
router.get('/:id', distributionController.getDistribution);

// Distribution operations
router.put('/:id/platform-status', distributionController.updatePlatformStatus);
router.get('/:id/summary', distributionController.getSummary);
router.get('/:id/status', distributionController.getStatus);
router.post('/:id/retry-failed', distributionController.retryFailed);
router.get('/:id/metrics', distributionController.getMetrics);
router.put('/:id/metrics', distributionController.updateMetrics);
router.get('/:id/monitoring-due', distributionController.isMonitoringDue);

// Recent distributions
router.get('/recent/list', distributionController.getRecent);

export default router;
