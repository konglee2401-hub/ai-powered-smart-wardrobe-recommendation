import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { analyzeBrowser, generateImageBrowser, generateVideoBrowser, generateVideo, analyzeAndGenerate, analyzeWithBrowser, generateWithBrowser, generateMultiVideoSequence, serveGeneratedImage } from '../controllers/browserAutomationController.js';
import { protect } from '../middleware/auth.js';
import { requireApiAccess, enforceBrowserAutomationAccess } from '../middleware/permissions.js';
import { requireActiveSubscription, consumeGeneration } from '../middleware/subscription.js';

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

router.use(protect);
router.use(requireApiAccess('browser-automation'));
router.use(requireActiveSubscription);

router.post('/analyze', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'clothingImage', maxCount: 1 }
]), enforceBrowserAutomationAccess(), analyzeBrowser);

// NEW: Browser Analysis - Step 2 of VTO flow (analysis only, no generation)
router.post('/analyze-browser', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), enforceBrowserAutomationAccess(), analyzeWithBrowser);

// NEW: Browser Generation - Step 5 of VTO flow (generation only)
router.post('/generate-browser', enforceBrowserAutomationAccess(), generateWithBrowser);

router.post('/generate-image-browser', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), enforceBrowserAutomationAccess(), consumeGeneration('image'), generateImageBrowser);

router.post('/generate-image', upload.fields([
  { name: 'characterImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 }
]), enforceBrowserAutomationAccess(), consumeGeneration('image'), analyzeAndGenerate);

router.post('/generate-video', enforceBrowserAutomationAccess(), consumeGeneration('video'), generateVideoBrowser);

// 💫 NEW: Download video endpoint
router.get('/download-video/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = req.query.path ? decodeURIComponent(req.query.path) : null;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    // Send file with proper headers
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err.message);
        res.status(500).json({ error: 'Download failed' });
      }
    });
  } catch (error) {
    console.error('Download error:', error.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

// 💫 NEW: Video preview endpoint (stream video)
router.get('/preview-video/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = req.query.path ? decodeURIComponent(req.query.path) : null;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Get file stats for streaming
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Accept-Ranges', 'bytes');
    
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Preview error:', error.message);
    res.status(500).json({ error: 'Preview failed' });
  }
});

// 💫 NEW: Delete temporary file endpoint
router.post('/delete-temp-file', (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    
    // Build path - try multiple common locations
    const possiblePaths = [
      path.join(process.cwd(), 'temp', filename),
      path.join(process.cwd(), 'generated', filename),
      path.join(process.cwd(), 'downloads', filename),
      path.join(process.cwd(), 'uploads', filename),
      path.join(process.cwd(), filename)
    ];
    
    let deleted = false;
    let deletedPath = null;
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          deleted = true;
          deletedPath = filePath;
          console.log(`🗑️  Deleted temp file: ${filePath}`);
          break;
        } catch (err) {
          console.warn(`⚠️  Could not delete file ${filePath}: ${err.message}`);
        }
      }
    }
    
    if (deleted) {
      res.json({ success: true, message: `File deleted: ${deletedPath}` });
    } else {
      res.status(404).json({ success: false, error: 'File not found in any temp location', filename });
    }
  } catch (error) {
    console.error('Delete temp file error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete file' });
  }
});

// 💫 NEW: Video generation endpoint for Google Flow (supports image uploads)
router.post('/generate-video-with-provider', enforceBrowserAutomationAccess(), consumeGeneration('video'), generateVideo);

// 💫 NEW: Multi-video generation endpoint with content use cases
router.post('/generate-multi-video-sequence', enforceBrowserAutomationAccess(), consumeGeneration('video'), generateMultiVideoSequence);

// 📸 NEW: Serve generated images endpoint
router.get('/generated-image/:id', serveGeneratedImage);

export default router;
