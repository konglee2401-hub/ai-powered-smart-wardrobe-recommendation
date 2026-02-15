import express from 'express';
import { 
  runMultipleFlows, 
  getAvailableFlows, 
  runSingleFlow 
} from '../controllers/multiFlowController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

/**
 * Multi-Flow Automation Routes
 * Handles parallel browser automation flows
 */

// Get available flow types
router.get('/flows', getAvailableFlows);

// Run multiple flows in parallel
router.post('/run', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'clothingImage', maxCount: 1 }
]), runMultipleFlows);

// Run single flow
router.post('/single', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'clothingImage', maxCount: 1 }
]), runSingleFlow);

export default router;
