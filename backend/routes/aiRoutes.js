import express from 'express';
import aiController from '../controllers/aiController.js';
import optionsController from '../controllers/optionsController.js';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { analyzeUnifiedEndpoint, buildPromptEndpoint, getProviderStatus, generateUnifiedEndpoint } from '../controllers/unifiedFlowController.js';
import { executeAffiliateVideoTikTokEndpoint, generateVideoFromAnalysisEndpoint, generateVoiceoverEndpoint, finalizeAffiliateVideoEndpoint, getAffiliateVideoPreviewEndpoint } from '../controllers/affiliateVideoTikTokController.js';

const router = express.Router();

// Public routes
router.get('/options', optionsController.getAllOptions);
router.get('/options/:category', optionsController.getOptionsByCategory);
router.get('/export', aiController.exportOptions);
router.get('/models', aiController.getAvailableModels);
router.get('/providers', aiController.getAvailableProviders);
router.get('/provider-status', getProviderStatus);
router.get('/use-cases', aiController.getUseCases);
router.get('/focus-areas', aiController.getFocusAreas);

// Unified Flow endpoints
router.post('/analyze-unified', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), analyzeUnifiedEndpoint);

// Build prompt from analysis (receives analysis data and options, returns prompt)
router.post('/build-prompt-unified', buildPromptEndpoint);

// Generate images from prompt only (no file upload needed)
router.post('/generate-unified', generateUnifiedEndpoint);

// ============================================================
// AFFILIATE VIDEO TIKTOK FLOW
// ============================================================

router.post('/affiliate-video-tiktok', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), executeAffiliateVideoTikTokEndpoint);

// 💫 Get flow preview data (Step 2 images for real-time display)
router.get('/affiliate-video-tiktok/preview/:flowId', getAffiliateVideoPreviewEndpoint);

// Generate video from analysis
router.post('/affiliate-video-tiktok/generate-video', generateVideoFromAnalysisEndpoint);

// Generate voiceover
router.post('/affiliate-video-tiktok/generate-voiceover', generateVoiceoverEndpoint);

// Finalize package
router.post('/affiliate-video-tiktok/finalize', finalizeAffiliateVideoEndpoint);

// Image analysis with fallback
router.post('/analyze-character', upload.single('image'), aiController.analyzeCharacterImage);
router.post('/analyze-product', upload.single('image'), aiController.analyzeProductImage);

// Build prompt from analysis
router.post('/build-prompt', aiController.buildPrompt);

// Options management
router.post('/options', optionsController.addOption);
router.post('/options/save-extracted', optionsController.saveExtractedOptions);
router.delete('/options/:category/:value', protect, optionsController.deleteOption);
router.get('/prompt-options', aiController.getPromptOptionsTranslated);

// Protected routes (cần đăng nhập để thêm/xóa options)
router.post('/discover-options', protect, aiController.discoverOptions);

export default router;
