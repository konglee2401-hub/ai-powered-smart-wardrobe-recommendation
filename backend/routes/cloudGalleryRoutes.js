/**
 * Cloud Gallery Routes
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import cloudGalleryController from '../controllers/cloudGalleryController.js';

const router = express.Router();

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

// 💫 NEW: Get media by asset category (character-image, product-image, etc.)
router.get('/category/:category', cloudGalleryController.getMediaByCategory);

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

export default router;
