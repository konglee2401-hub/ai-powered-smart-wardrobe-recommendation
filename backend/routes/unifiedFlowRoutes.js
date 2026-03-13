import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription, consumeGeneration } from '../middleware/subscription.js';
import { requireMenuAccess, requireApiAccess, enforceAiProviderAccess, enforceBrowserAutomationAccess } from '../middleware/permissions.js';
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
router.use(protect);
router.use(requireActiveSubscription);
router.use(requireMenuAccess('generation'));
router.use(requireApiAccess('generation'));

// Unified analysis and generation (primary endpoint)
router.post('/analyze',
  enforceAiProviderAccess(),
  upload.fields([
    { name: 'characterImage', maxCount: 1 },
    { name: 'productImage', maxCount: 1 }
  ]),
  analyzeUnifiedEndpoint
);

// Unified image generation (can be called separately if prompt is pre-built)
router.post('/generate', enforceAiProviderAccess(), consumeGeneration('image'), generateUnifiedEndpoint);

// ============================================
// Browser Automation Routes
// ============================================

// Browser-based analysis
router.post('/browser/analyze',
  enforceBrowserAutomationAccess(),
  upload.fields([
    { name: 'characterImage', maxCount: 1 },
    { name: 'clothingImage', maxCount: 1 }
  ]),
  analyzeBrowser
);

// Browser-based image generation
router.post('/browser/generate-image', enforceBrowserAutomationAccess(), consumeGeneration('image'), generateImageBrowser);

// Browser-based video generation
router.post('/browser/generate-video', enforceBrowserAutomationAccess(), consumeGeneration('video'), generateVideoBrowser);



// ============================================
// API Routes (existing)
// ============================================

// Submit feedback
router.post('/:flowId/feedback', submitFeedback);

// Delete flow
router.delete('/:flowId', deleteFlow);

export default router;
