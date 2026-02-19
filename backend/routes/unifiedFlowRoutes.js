import express from 'express';
import { protect, optionalAuth } from '../middleware/auth.js';
import { upload } from '../utils/uploadConfig.js';
import {
  analyzeUnifiedEndpoint,
  generateUnifiedEndpoint, // Import the new unified generation endpoint
  submitFeedback, // Re-import submitFeedback
  deleteFlow // Re-import deleteFlow
} from '../controllers/unifiedFlowController.js';

import {
  analyzeBrowser,
  generateImageBrowser,
  generateVideoBrowser
} from '../controllers/browserAutomationController.js';

const router = express.Router();

// Unified analysis and generation (primary endpoint)
router.post('/analyze',
  optionalAuth,
  upload.fields([
    { name: 'characterImage', maxCount: 1 },
    { name: 'productImage', maxCount: 1 }
  ]),
  analyzeUnifiedEndpoint
);

// Unified image generation (can be called separately if prompt is pre-built)
router.post('/generate', optionalAuth, generateUnifiedEndpoint);

// ============================================
// Browser Automation Routes
// ============================================

// Browser-based analysis
router.post('/browser/analyze',
  optionalAuth,
  upload.fields([
    { name: 'characterImage', maxCount: 1 },
    { name: 'clothingImage', maxCount: 1 }
  ]),
  analyzeBrowser
);

// Browser-based image generation
router.post('/browser/generate-image', optionalAuth, generateImageBrowser);

// Browser-based video generation
router.post('/browser/generate-video', optionalAuth, generateVideoBrowser);



// ============================================
// API Routes (existing)
// ============================================

// Submit feedback
router.post('/:flowId/feedback', optionalAuth, submitFeedback);

// Delete flow
router.delete('/:flowId', optionalAuth, deleteFlow);

export default router;
