import express from 'express';
import * as videoConfigController from '../controllers/videoGenerationConfigController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Configuration CRUD routes
router.get('/', videoConfigController.getAllConfigs);
router.post('/', videoConfigController.createConfig);
router.get('/:id', videoConfigController.getConfig);
router.put('/:id', videoConfigController.updateConfig);
router.delete('/:id', videoConfigController.deleteConfig);

// Configuration operations
router.get('/:id/check-due', videoConfigController.checkDueExecution);
router.post('/:id/execute-now', videoConfigController.executeNow);
router.get('/:id/execution-history', videoConfigController.getExecutionHistory);
router.post('/:id/toggle-automation', videoConfigController.toggleAutomation);

// Get default settings and options
router.get('/defaults/all', videoConfigController.getDefaults);

export default router;
