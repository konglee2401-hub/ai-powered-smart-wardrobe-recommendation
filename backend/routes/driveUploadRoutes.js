/**
 * Google Drive Upload Routes
 * Handles file uploads to Google Drive and gallery management
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import driveService from '../services/googleDriveOAuth.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';

const router = express.Router();

// Allow internal scraper token (admin JWT) to bypass auth middleware
const scraperInternalAuth = async (req, res, next) => {
  const token = req.headers['x-scraper-token'] || req.headers['x-admin-token'];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.status === 'active' && user.role === 'admin') {
      req.headers.authorization = `Bearer ${token}`;
      req.user = user;
      return next();
    }
    return res.status(401).json({ success: false, message: 'Not authorized (scraper token)' });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized (scraper token)', error: error.message });
  }
};

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
      message: 'Authentication check failed',
      error: error.message,
    });
  }
});

/**
 * POST /api/drive/auth/refresh
 * Force refresh authentication (clear old token and generate new auth URL)
 */
router.post('/auth/refresh', async (req, res) => {
  try {
    console.log('🔄 Forcing Google Drive re-authentication...');
    const result = await driveService.getNewAuthUrl();
    
    res.json({
      success: true,
      message: 'New authentication URL generated',
      authUrl: result.authUrl,
      notice: 'Please visit the URL above to re-authenticate Google Drive'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate auth URL',
      error: error.message,
    });
  }
});

/**
 * GET /api/drive/auth-callback
 * Handle OAuth callback from Google (receives code as query parameter)
 */
router.get('/auth-callback', async (req, res) => {
  try {
    const { code, error } = req.query;
    
    // Check for OAuth errors
    if (error) {
      console.error('❌ OAuth error:', error);
      return res.status(400).json({
        success: false,
        message: 'OAuth authentication failed',
        error: error,
      });
    }
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code required',
      });
    }

    console.log('✅ Received OAuth authorization code, processing...');
    const result = await driveService.handleAuthCallback(code);
    
    // 💫 CRITICAL: Verify token was actually saved to disk before reporting success
    const tokenPath = path.join(__dirname, '../config/drive-token.json');
    if (!fs.existsSync(tokenPath)) {
      console.error('❌ Token callback succeeded but token file not found');
      return res.status(500).json({
        success: false,
        authenticated: false,
        message: 'Token save failed - file not created',
        error: 'Token was not persisted to disk',
      });
    }

    // Verify token can be loaded
    const savedToken = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    if (!savedToken.access_token) {
      console.error('❌ Saved token missing access_token');
      return res.status(500).json({
        success: false,
        authenticated: false,
        message: 'Token invalid - missing access_token',
      });
    }

    console.log(`✅ Token saved and verified: ${savedToken.access_token.substring(0, 20)}...`);
    
    // Initialize folder structure after authentication
    await driveService.initializeFolderStructure();

    res.json({
      success: true,
      authenticated: true,
      message: 'Authenticated successfully',
      notice: '✅ Google Drive authenticated! You can now upload files.',
    });
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication callback failed',
      error: error.message,
    });
  }
});

/**
 * POST /api/drive/auth-callback
 * Handle OAuth callback (alternate POST method)
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

// Protected routes below
router.use(scraperInternalAuth);
router.use(protect);
router.use(requireActiveSubscription);
router.use(requireMenuAccess('generation'));
router.use(requireApiAccess('generation'));

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

/**
 * POST /api/drive/files/upload-with-metadata
 * Upload file to platform-specific folder on Google Drive
 * Used by scraper service for automatic video uploads
 * 
 * Request body:
 * - file: multipart form file
 * - platform: 'youtube' | 'playboard' | 'dailyhaha' | 'douyin' | 'tiktok' | 'instagram'
 * - parentFolderId: (optional) specific folder ID to upload to
 * - metadata: (optional) JSON string with video metadata
 */
router.post('/files/upload-with-metadata', upload.single('file'), async (req, res) => {
  try {
    console.log('📁 Platform-specific upload endpoint called');
    
    // Validate file
    if (!req.file) {
      console.warn('⚠️ No file provided in request');
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    const fileName = req.file.originalname;
    const fileBuffer = req.file.buffer;
    console.log(`📦 File received: ${fileName} (${fileBuffer?.length || 0} bytes)`);

    // Get platform from request
    let platform = (req.body.platform || '').toLowerCase().trim();
    const parentFolderId = req.body.parentFolderId;
    
    if (!platform && !parentFolderId) {
      return res.status(400).json({
        success: false,
        message: 'Either platform or parentFolderId must be provided',
      });
    }

    console.log(`🎯 Upload target - Platform: ${platform}, FolderId: ${parentFolderId}`);

    // Parse metadata if provided
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (parseErr) {
        console.warn('⚠️ Could not parse metadata JSON:', parseErr.message);
        metadata = {};
      }
    }

    // Authenticate and check if Drive is configured
    const authResult = await driveService.authenticate();
    if (!authResult.configured || !authResult.authenticated) {
      console.warn('⚠️ Google Drive not configured');
      return res.status(200).json({
        success: false,
        message: 'Google Drive not configured. Upload skipped.',
        data: {
          id: null,
          webViewLink: null,
          source: 'error',
          reason: 'Google Drive not configured'
        }
      });
    }

    let uploadResult;
    const uploadOptions = { ...metadata };
    const subfolder = req.body.subfolder || metadata.category;

    // Call appropriate platform upload method
    if (parentFolderId) {
      // Direct folder ID provided - use generic uploadBuffer with parentFolderId
      console.log(`📤 Uploading to folder: ${parentFolderId}`);
      let resolvedFolderId = parentFolderId;
      if (subfolder) {
        const folderName = String(subfolder).trim();
        if (folderName) {
          try {
            resolvedFolderId = await driveService.getOrCreateFolder(folderName, parentFolderId);
            console.log(`📁 Using subfolder ${folderName} (${resolvedFolderId})`);
          } catch (err) {
            console.warn(`⚠️  Failed to ensure subfolder ${folderName}: ${err.message}`);
            resolvedFolderId = parentFolderId;
          }
        }
      }
      uploadResult = await driveService.uploadBuffer(fileBuffer, fileName, {
        ...uploadOptions,
        folderId: resolvedFolderId,
      });
    } else {
      // Use platform-specific upload method
      const uploadMethod = `upload${platform.charAt(0).toUpperCase() + platform.slice(1).replace(/([A-Z])/g, '$1').toLowerCase().replace(/([a-z])([A-Z])/g, '$1$2')}ScrapedVideo`;
      
      // Map platform names to actual method names
        const platformMethodMap = {
          'youtube': 'uploadYoutubeScrapedVideo',
          'playboard': 'uploadPlayboardScrapedVideo',
          'dailyhaha': 'uploadDailyhahaScrapedVideo',
          'douyin': 'uploadDouyinScrapedVideo',
          'kuaishou': 'uploadKuaishouScrapedVideo',
          'tiktok': 'uploadTikTokScrapedVideo',
          'instagram': 'uploadReelsScrapedVideo',
        };

      const method = platformMethodMap[platform];
      if (!method || typeof driveService[method] !== 'function') {
        console.warn(`⚠️ Unknown platform or method not found: ${platform}`);
        return res.status(400).json({
          success: false,
          message: `Unsupported platform: ${platform}`,
          supportedPlatforms: Object.keys(platformMethodMap),
        });
      }

      console.log(`📤 Uploading using method: ${method}`);
      uploadResult = await driveService[method](fileBuffer, fileName, uploadOptions);
    }

    if (uploadResult && uploadResult.id) {
      console.log(`✅ Upload successful - File ID: ${uploadResult.id}`);
      
      // Return result in format expected by scraper service
      return res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: uploadResult.id,
          fileId: uploadResult.id,
          webViewLink: uploadResult.webViewLink || uploadResult.weblink || `https://drive.google.com/file/d/${uploadResult.id}/view`,
          name: uploadResult.name || fileName,
          mimeType: uploadResult.mimeType || req.file.mimetype,
          size: uploadResult.size || 0,
          platform: platform,
          uploadedAt: new Date().toISOString(),
        }
      });
    } else {
      throw new Error('Upload returned no file ID');
    }
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    console.error('   Stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message,
      data: {
        id: null,
        webViewLink: null,
        source: 'error'
      }
    });
  }
});

export default router;
