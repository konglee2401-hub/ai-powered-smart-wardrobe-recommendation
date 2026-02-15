import express from 'express';
import * as modelTestController from '../controllers/modelTestController.js';

const router = express.Router();

// Get all models
router.get('/models', modelTestController.getAllModels);

// Test specific model
router.post('/models/:modelId/test', modelTestController.testModel);

// Test all models
router.post('/models/test-all', modelTestController.testAllModels);

export default router;
