import express from 'express';
import * as batchController from '../controllers/batchProcessingController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Batch job CRUD routes
router.get('/', batchController.getAllJobs);
router.post('/', batchController.createJob);
router.get('/:id', batchController.getJob);
router.delete('/:id', batchController.deleteJob);

// Item management
router.post('/:id/add-items', batchController.addItems);
router.put('/:id/update-progress', batchController.updateProgress);
router.get('/:id/next-item', batchController.getNextItem);

// Job control operations
router.post('/:id/pause', batchController.pauseJob);
router.post('/:id/resume', batchController.resumeJob);
router.post('/:id/cancel', batchController.cancelJob);
router.post('/:id/retry-failed', batchController.retryFailed);

// Job status and statistics
router.get('/:id/status', batchController.getStatus);
router.get('/:id/stats', batchController.getStats);
router.get('/:id/can-process-more', batchController.canProcessMore);

// Results and exports
router.get('/:id/export-results', batchController.exportResults);

export default router;
