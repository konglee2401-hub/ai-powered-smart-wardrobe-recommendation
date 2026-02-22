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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    const { description, metadata } = req.body;

    // Upload to Google Drive
    const result = await driveService.uploadBuffer(
      req.file.buffer,
      req.file.originalname,
      {
        description,
        properties: metadata ? JSON.parse(metadata) : {},
      }
    );

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message,
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
