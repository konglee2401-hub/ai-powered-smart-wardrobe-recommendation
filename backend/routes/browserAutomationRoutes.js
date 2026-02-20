import express from 'express';
import multer from 'multer';
import { analyzeBrowser, generateImageBrowser, generateVideoBrowser, analyzeAndGenerate, analyzeWithBrowser, generateWithBrowser } from '../controllers/browserAutomationController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fieldSize: 50 * 1024 * 1024,      // 50MB - for large form fields (base64 images)
    fieldNameSize: 200,                // 200 bytes - for field names
    fileSize: 50 * 1024 * 1024         // 50MB - increased from 10MB
  }
});

router.post('/analyze', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'clothingImage', maxCount: 1 }
]), analyzeBrowser);

// NEW: Browser Analysis - Step 2 of VTO flow (analysis only, no generation)
router.post('/analyze-browser', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), analyzeWithBrowser);

// NEW: Browser Generation - Step 5 of VTO flow (generation only)
router.post('/generate-browser', generateWithBrowser);

router.post('/generate-image-browser', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), generateImageBrowser);

router.post('/generate-image', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), analyzeAndGenerate);

router.post('/generate-video', generateVideoBrowser);

export default router;
