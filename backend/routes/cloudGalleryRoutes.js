/**
 * Cloud Gallery Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const cloudGalleryController = require('../controllers/cloudGalleryController');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/temp');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Initialize gallery
router.post('/init', cloudGalleryController.initializeGallery);

// Get media library overview
router.get('/library', cloudGalleryController.getMediaLibrary);

// Get media by type
router.get('/type/:type', cloudGalleryController.getMediaByType);

// Upload media
router.post('/upload', upload.single('file'), cloudGalleryController.uploadMedia);

// Download media
router.post('/download/:fileId', cloudGalleryController.downloadMedia);

// Get media preview
router.get('/preview/:fileId', cloudGalleryController.getMediaPreview);

// Search media
router.get('/search', cloudGalleryController.searchMedia);

// Get gallery URLs
router.get('/urls', cloudGalleryController.getGalleryUrls);

// Organize by collection
router.get('/collections', cloudGalleryController.organizeByCollection);

// Manage batch media
router.post('/batch', cloudGalleryController.manageBatchMedia);

// Cache management
router.get('/cache/stats', cloudGalleryController.getCacheStats);
router.post('/cache/clear', cloudGalleryController.clearCache);

module.exports = router;
