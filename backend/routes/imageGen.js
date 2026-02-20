import express from 'express';
import multer from 'multer';
import {
  getProviders,
  generateImages,
  browserGenerateImages
} from '../controllers/imageGenController.js';

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

// Get available providers
router.get('/providers', getProviders);

// Generate images via API
router.post('/generate', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), generateImages);

// Generate images via browser automation
router.post('/browser-generate', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), browserGenerateImages);

export default router;