/**
 * Cloud Batch Queue Routes
 */

import express from 'express';
import cloudBatchQueueController from '../controllers/cloudBatchQueueController.js';

const router = express.Router();

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
