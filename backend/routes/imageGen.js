import express from 'express';
import multer from 'multer';
import {
  getProviders,
  generateImages,
  browserGenerateImages,
  resumeImageGeneration
} from '../controllers/imageGenController.js';
import { protect } from '../middleware/auth.js';
import { requireApiAccess, requireMenuAccess, enforceAiProviderAccess } from '../middleware/permissions.js';
import { requireActiveSubscription, consumeGeneration } from '../middleware/subscription.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fieldSize: 50 * 1024 * 1024,      // 50MB - for large form fields (base64 images)
    fieldNameSize: 200,                // 200 bytes - for field names
    fileSize: 50 * 1024 * 1024         // 50MB - increased from 10MB
  }
});

router.use(protect);
router.use(requireMenuAccess('generation'));
router.use(requireApiAccess('generation'));
router.use(requireActiveSubscription);

// Get available providers
router.get('/providers', getProviders);

// Generate images via API
router.post('/generate', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), enforceAiProviderAccess(), consumeGeneration('image'), generateImages);

// Generate images via browser automation
router.post('/browser-generate', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), enforceAiProviderAccess(), consumeGeneration('image'), browserGenerateImages);

// Resume image generation
router.post('/resume/:sessionId', resumeImageGeneration);

export default router;
