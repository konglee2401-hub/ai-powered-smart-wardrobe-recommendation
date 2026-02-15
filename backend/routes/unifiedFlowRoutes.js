import express from 'express';
import { protect, optionalAuth } from '../middleware/auth.js';
import { upload } from '../utils/uploadConfig.js';
import {
  createFlow,
  generateImages,
  generateVideo,
  buildVideoPromptPreview,
  getFlow,
  getFlowHistory,
  submitFeedback,
  deleteFlow,
  analyzeImages,
  buildImagePromptPreview
} from '../controllers/unifiedFlowController.js';

import {
  analyzeBrowser,
  generateImageBrowser,
  generateVideoBrowser,
  fullWorkflowBrowser
} from '../controllers/browserAutomationController.js';

const router = express.Router();

// Create new flow with uploads - allows anonymous for testing
router.post('/create',
  optionalAuth,
  upload.fields([
    { name: 'character_image', maxCount: 1 },
    { name: 'product_image', maxCount: 1 }
  ]),
  createFlow
);

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

// Browser-based full workflow
router.post('/browser/full-workflow',
  optionalAuth,
  upload.fields([
    { name: 'characterImage', maxCount: 1 },
    { name: 'clothingImage', maxCount: 1 }
  ]),
  fullWorkflowBrowser
);

// ============================================
// API Routes (existing)
// ============================================

// All other routes require authentication
// Analyze images with AI
router.post('/:flowId/analyze-images', optionalAuth, analyzeImages);

// Build image prompt preview (without generating)
router.post('/:flowId/build-image-prompt', optionalAuth, buildImagePromptPreview);

// Generate images from uploaded files
router.post('/:flowId/generate-images', optionalAuth, generateImages);

// Build video prompt preview (without generating)
router.post('/:flowId/build-video-prompt', optionalAuth, buildVideoPromptPreview);

// Generate video from selected image
router.post('/:flowId/generate-video', optionalAuth, generateVideo);

// Get flow details
router.get('/:flowId', optionalAuth, getFlow);

// Get flow history - requires auth
router.get('/', protect, getFlowHistory);

// Submit feedback
router.post('/:flowId/feedback', optionalAuth, submitFeedback);

// Delete flow
router.delete('/:flowId', optionalAuth, deleteFlow);

export default router;
