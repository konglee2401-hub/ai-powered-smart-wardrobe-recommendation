/**
 * Cloud Batch Queue Routes
 */

const express = require('express');
const router = express.Router();
const cloudBatchQueueController = require('../controllers/cloudBatchQueueController');

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

module.exports = router;
