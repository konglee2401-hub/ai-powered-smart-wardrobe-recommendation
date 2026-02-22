import express from 'express';
import * as monitoringController from '../controllers/monitoringStatsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Current and historical stats
router.get('/current', monitoringController.getCurrentStats);
router.get('/by-period', monitoringController.getStatsByPeriod);

// Specific stat categories
router.get('/video-stats', monitoringController.getVideoStats);
router.get('/distribution-stats', monitoringController.getDistributionStats);
router.get('/engagement-stats', monitoringController.getEngagementStats);
router.get('/account-health', monitoringController.getAccountHealth);
router.get('/system-health', monitoringController.getSystemHealth);

// Errors and alerts
router.get('/errors-alerts', monitoringController.getErrorsAndAlerts);
router.post('/add-error', monitoringController.addError);
router.post('/add-alert', monitoringController.addAlert);
router.put('/acknowledge-alert', monitoringController.acknowledgeAlert);

// Dashboard and cleanup
router.get('/dashboard', monitoringController.getDashboard);
router.post('/clear-old-records', monitoringController.clearOldRecords);

export default router;
