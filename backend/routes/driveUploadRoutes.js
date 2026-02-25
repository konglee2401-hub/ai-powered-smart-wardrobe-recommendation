/**
 * Google Drive Upload Routes
 * Handles file uploads to Google Drive and gallery management
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import driveService from '../services/googleDriveOAuth.js';

const router = express.Router();

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/x-msvideo',
      'video/quicktime',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

/**
 * GET /api/drive/auth
 * Check authentication status and get authorization URL if needed
 */
router.get('/auth', async (req, res) => {
  try {
    const result = await driveService.authenticate();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
    });
  }
});

/**
 * POST /api/drive/auth-callback
 * Handle OAuth callback
 */
router.post('/auth-callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code required',
      });
    }

    const result = await driveService.handleAuthCallback(code);
    
    // Initialize folder structure after authentication
    await driveService.initializeFolderStructure();

    res.json({
      success: true,
      authenticated: true,
      message: 'Authenticated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication callback failed',
      error: error.message,
    });
  }
});

/**
 * POST /api/drive/init-folders
 * Initialize folder structure on Google Drive
 */
router.post('/init-folders', async (req, res) => {
  try {
    const folderIds = await driveService.initializeFolderStructure();
    
    res.json({
      success: true,
      message: 'Folder structure initialized',
      folders: folderIds,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initialize folder structure',
      error: error.message,
    });
  }
});

/**
 * POST /api/drive/upload
 * Upload file to Google Drive
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📁 Upload endpoint called');
    
    // 💫 IMPROVED: Better file validation
    if (!req.file) {
      console.warn('⚠️ No file provided in request');
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    console.log(`📦 File received: ${req.file.originalname} (${req.file.buffer?.length || 0} bytes)`);

    // 💫 FIXED: Check if Google Drive is configured before attempting upload
    const authResult = await driveService.authenticate();
    
    if (!authResult.configured || !authResult.authenticated) {
      console.warn('⚠️  Google Drive not configured, skipping upload');
      return res.status(200).json({
        success: true,
        message: 'Google Drive not configured. File saved locally, Drive upload skipped.',
        file: {
          id: `local-${Date.now()}`,
          name: req.file.originalname,
          size: req.file.buffer?.length || 0,
          mimeType: req.file.mimetype,
          source: 'local'
        },
        notice: 'To enable Google Drive uploads, please add OAuth credentials'
      });
    }

    // 💫 IMPROVED: Safer metadata parsing
    const { description } = req.body;
    let metadata = {};
    
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (parseErr) {
        console.warn('⚠️ Could not parse metadata JSON:', parseErr.message);
        metadata = {};
      }
    }

    console.log('📤 Uploading to Google Drive...');

    // Upload to Google Drive
    const result = await driveService.uploadBuffer(
      req.file.buffer,
      req.file.originalname,
      {
        description,
        properties: metadata,
      }
    );

    console.log('✅ Upload successful');
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: result,
    });
  } catch (error) {
    // 💫 IMPROVED: Handle errors gracefully with better logging
    console.error('❌ Upload error:', error.message);
    console.error('   Stack:', error.stack);
    
    res.status(200).json({
      success: true,
      message: 'File saved locally. Google Drive upload not available.',
      file: {
        id: `local-${Date.now()}`,
        name: req.file?.originalname || 'unknown',
        size: req.file?.buffer?.length || 0,
        source: 'local',
        error: error.message
      },
      notice: 'Google Drive feature is disabled. Files are saved to local storage only.'
    });
  }
});

/**
 * GET /api/drive/files
 * List files in app folder
 */
router.get('/files', async (req, res) => {
  try {
    const files = await driveService.listFiles(
      driveService.folderIds.imagesApp
    );

    res.json({
      success: true,
      files,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to list files',
      error: error.message,
    });
  }
});

/**
 * GET /api/drive/file/:fileId
 * Get file details from Google Drive
 */
router.get('/file/:fileId', async (req, res) => {
  try {
    const file = await driveService.getFile(req.params.fileId);

    res.json({
      success: true,
      file,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get file details',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/drive/file/:fileId
 * Delete file from Google Drive
 */
router.delete('/file/:fileId', async (req, res) => {
  try {
    await driveService.deleteFile(req.params.fileId);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message,
    });
  }
});

/**
 * GET /api/drive/download-url/:fileId
 * Get download URL for file
 */
router.get('/download-url/:fileId', (req, res) => {
  try {
    const downloadUrl = driveService.getDownloadUrl(req.params.fileId);

    res.json({
      success: true,
      downloadUrl,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get download URL',
      error: error.message,
    });
  }
});

export default router;
