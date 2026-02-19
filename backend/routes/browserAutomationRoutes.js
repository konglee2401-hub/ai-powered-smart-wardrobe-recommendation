import express from 'express';
import multer from 'multer';
import { analyzeBrowser, generateImageBrowser, generateVideoBrowser, analyzeAndGenerate } from '../controllers/browserAutomationController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.post('/analyze', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'clothingImage', maxCount: 1 }
]), analyzeBrowser);

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
