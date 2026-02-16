import express from 'express';
import multer from 'multer';
import * as browserAutomationController from '../controllers/browserAutomationController.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Analyze images using browser automation
router.post('/analyze', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'clothingImage', maxCount: 1 }
]), browserAutomationController.analyzeBrowser);

// Generate image using browser automation
router.post('/generate-image', browserAutomationController.generateImageBrowser);

// Generate video using browser automation
router.post('/generate-video', browserAutomationController.generateVideoBrowser);

// Full workflow: Analyze + Generate
router.post('/full-workflow', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'clothingImage', maxCount: 1 }
]), browserAutomationController.fullWorkflowBrowser);

export default router;
