import express from 'express';
import * as modelTestController from '../controllers/modelTestController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = express.Router();
router.use(protect);
router.use(requireRole('admin'));

// Get all models
router.get('/models', modelTestController.getAllModels);

// Test specific model
router.post('/models/:modelId/test', modelTestController.testModel);

// Test all models
router.post('/models/test-all', modelTestController.testAllModels);

export default router;
