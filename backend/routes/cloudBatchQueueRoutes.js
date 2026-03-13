/**
 * Cloud Batch Queue Routes
 */

import express from 'express';
import cloudBatchQueueController from '../controllers/cloudBatchQueueController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';

const router = express.Router();
router.use(protect);
router.use(requireActiveSubscription);
router.use(requireMenuAccess('video-pipeline'));
router.use(requireApiAccess('video-pipeline'));

// Initialize queue
router.post('/init', cloudBatchQueueController.initializeQueue);

// Batch management
router.post('/create', cloudBatchQueueController.createBatch);
router.get('/all', cloudBatchQueueController.getAllBatches);
router.get('/stats', cloudBatchQueueController.getQueueStats);

// Single batch operations
router.get('/:batchId/status', cloudBatchQueueController.getBatchStatus);
router.post('/:batchId/add-item', cloudBatchQueueController.addItemToBatch);
router.post('/:batchId/process', cloudBatchQueueController.processBatch);
router.post('/:batchId/process-sync', cloudBatchQueueController.processBatchSync);
router.post('/:batchId/process-next', cloudBatchQueueController.nextItem);
router.get('/:batchId/output', cloudBatchQueueController.getBatchOutput);
router.delete('/:batchId', cloudBatchQueueController.deleteBatch);

export default router;
