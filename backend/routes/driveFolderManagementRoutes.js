/**
 * Drive Folder Management Routes
 * Manages folder creation and retrieval for organizing uploaded content
 */

import express from 'express';
import multer from 'multer';
import GoogleDriveOAuthService from '../services/googleDriveOAuth.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireMenuAccess, requireApiAccess } from '../middleware/permissions.js';

const router = express.Router();
router.use(protect);
router.use(requireActiveSubscription);
router.use(requireMenuAccess('generation'));
router.use(requireApiAccess('generation'));
let driveService = null;

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB for videos
  },
});

/**
 * Initialize Google Drive service
 */
async function initDriveService() {
  if (!driveService) {
    driveService = GoogleDriveOAuthService;
    const auth = await driveService.authenticate();
    if (!auth.authenticated) {
      console.warn('⚠️  Google Drive not authenticated');
      return false;
    }
  }
  return true;
}

/**
 * POST /api/drive/folders/ensure-youtube-folder
 * Ensure YouTube folder exists under Videos -> Downloaded
 */
router.post('/folders/ensure-youtube-folder', async (req, res) => {
  try {
    const { parentFolderId, folderName = 'youtube' } = req.body;
    
    if (!parentFolderId) {
      return res.status(400).json({
        success: false,
        error: 'parentFolderId is required'
      });
    }
    
    // Initialize Drive service
    const isAuth = await initDriveService();
    if (!isAuth) {
      return res.status(503).json({
        success: false,
        error: 'Google Drive not configured'
      });
    }
    
    console.log(`🔍 Ensuring YouTube folder exists under parent: ${parentFolderId}`);
    
    // Check if YouTube folder already exists
    let youtubeFolder = await driveService.findFolderByName(folderName, parentFolderId);
    
    if (youtubeFolder) {
      console.log(`✅ YouTube folder already exists: ${youtubeFolder.id}`);
      return res.json({
        success: true,
        folderId: youtubeFolder.id,
        name: youtubeFolder.name,
        action: 'existing'
      });
    }
    
    // Create YouTube folder
    console.log(`📁 Creating YouTube folder...`);
    youtubeFolder = await driveService.createFolder(folderName, parentFolderId);
    
    if (!youtubeFolder) {
      throw new Error('Failed to create YouTube folder');
    }
    
    console.log(`✅ YouTube folder created: ${youtubeFolder.id}`);
    
    res.json({
      success: true,
      folderId: youtubeFolder.id,
      name: youtubeFolder.name,
      action: 'created'
    });
  } catch (error) {
    console.error('❌ Drive folder management error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/drive/files/upload
 * Upload a file to Google Drive
 */
router.post('/files/upload', upload.single('file'), async (req, res) => {
  try {
    const { parentFolderId, mimeType } = req.body;
    
    if (!parentFolderId) {
      return res.status(400).json({
        success: false,
        error: 'parentFolderId is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    // Initialize Drive service
    const isAuth = await initDriveService();
    if (!isAuth) {
      return res.status(503).json({
        success: false,
        error: 'Google Drive not configured'
      });
    }
    
    const fileName = req.file.originalname;
    const fileBuffer = req.file.buffer;
    const fileMimeType = mimeType || req.file.mimetype;
    
    console.log(`📤 Uploading file: ${fileName} to folder: ${parentFolderId}`);
    
    // Upload file to Drive
    const uploadedFile = await driveService.uploadFileBuffer(
      fileBuffer,
      fileName,
      parentFolderId,
      fileMimeType
    );
    
    if (!uploadedFile) {
      throw new Error('Failed to upload file');
    }
    
    console.log(`✅ File uploaded: ${uploadedFile.id}`);
    
    res.json({
      success: true,
      data: {
        id: uploadedFile.id,
        name: uploadedFile.name,
        webViewLink: uploadedFile.webViewLink,
        thumbnailLink: uploadedFile.thumbnailLink,
        mimeType: uploadedFile.mimeType,
        size: uploadedFile.size
      }
    });
  } catch (error) {
    console.error('❌ File upload error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/drive/folders/:parentId/list
 * List folders under a parent folder
 */
router.get('/folders/:parentId/list', async (req, res) => {
  try {
    const { parentId } = req.params;
    
    // Initialize Drive service
    const isAuth = await initDriveService();
    if (!isAuth) {
      return res.status(503).json({
        success: false,
        error: 'Google Drive not configured'
      });
    }
    
    console.log(`📂 Listing folders under: ${parentId}`);
    
    const folders = await driveService.listFolders(parentId);
    
    res.json({
      success: true,
      folders: folders || [],
      count: (folders || []).length
    });
  } catch (error) {
    console.error('❌ Error listing folders:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/drive/folders/structure
 * Get the pre-configured folder structure
 */
router.get('/folders/structure', async (req, res) => {
  try {
    // Initialize Drive service to get folder structure
    const isAuth = await initDriveService();
    if (!isAuth) {
      return res.status(503).json({
        success: false,
        error: 'Google Drive not configured'
      });
    }
    
    const folderIds = driveService.folderIds;
    
    res.json({
      success: true,
      structure: folderIds
    });
  } catch (error) {
    console.error('❌ Error getting folder structure:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
