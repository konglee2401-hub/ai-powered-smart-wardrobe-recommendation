/**
 * Google Drive Folder Explorer Routes
 * Endpoints for listing folders, browsing structure, and filtering files
 */

import express from 'express';
import driveService from '../services/googleDriveOAuth.js';

const router = express.Router();

/**
 * Get folder tree structure for UI
 * GET /api/drive/folders/tree
 */
router.get('/folders/tree', async (req, res) => {
  try {
    const tree = driveService.getFolderTree();
    
    if (!tree) {
      return res.status(400).json({
        error: 'Folder structure not configured',
        message: 'Run: node scripts/detectDriveFolderStructure.js',
      });
    }

    res.json({
      success: true,
      tree,
      rootId: tree.id,
    });
  } catch (error) {
    console.error('Error getting folder tree:', error);
    res.status(500).json({
      error: 'Failed to get folder tree',
      message: error.message,
    });
  }
});

/**
 * Get folder map (flat structure with paths)
 * GET /api/drive/folders/map
 */
router.get('/folders/map', async (req, res) => {
  try {
    const folders = driveService.getFolderMap();
    
    if (!folders || Object.keys(folders).length === 0) {
      return res.status(400).json({
        error: 'Folder structure not configured',
        message: 'Run: node scripts/detectDriveFolderStructure.js',
      });
    }

    res.json({
      success: true,
      folders,
      count: Object.keys(folders).length,
    });
  } catch (error) {
    console.error('Error getting folder map:', error);
    res.status(500).json({
      error: 'Failed to get folder map',
      message: error.message,
    });
  }
});

/**
 * List files in a folder with filtering
 * GET /api/drive/folders/:folderId/files
 * Query params:
 *   - type: 'image' | 'video' (optional)
 *   - pageSize: number (default 50)
 *   - orderBy: 'createdTime' | 'name' (default 'createdTime')
 */
router.get('/folders/:folderId/files', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { type, pageSize = 50, orderBy = 'createdTime' } = req.query;

    // Authenticate
    const authResult = await driveService.authenticate();
    if (!authResult.authenticated) {
      return res.status(401).json({
        error: 'Not authenticated with Google Drive',
        message: 'Please set up Google Drive OAuth first',
      });
    }

    // Build MIME type filter
    let mimeQuery = "trashed=false";
    
    if (type === 'image') {
      mimeQuery += " and mimeType in ('image/jpeg', 'image/png', 'image/gif', 'image/webp')";
    } else if (type === 'video') {
      mimeQuery += " and mimeType in ('video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo')";
    }

    const query = `parents='${folderId}' and ${mimeQuery}`;

    const drive = driveService.drive;
    if (!drive) {
      return res.status(500).json({
        error: 'Google Drive not initialized',
        message: 'Please authenticate first',
      });
    }

    // Parse orderBy - only use valid field names
    const validOrderByFields = ['createdTime', 'name', 'modifiedTime', 'starred'];
    const orderByField = orderBy?.split(' ')[0] || 'createdTime';
    const finalOrderBy = validOrderByFields.includes(orderByField) ? orderByField : 'createdTime';

    const response = await drive.files.list({
      q: query,
      spaces: 'drive',
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink, thumbnailLink)',
      pageSize: Math.min(parseInt(pageSize) || 50, 1000),
      orderBy: finalOrderBy,
    });

    const files = response.data.files || [];

    res.json({
      success: true,
      folderId,
      fileType: type || 'all',
      count: files.length,
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        createdTime: f.createdTime,
        modifiedTime: f.modifiedTime,
        size: f.size,
        type: f.mimeType.startsWith('image/') ? 'image' : 'video',
        url: f.webViewLink,
        thumbnail: f.thumbnailLink,
      })),
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      error: 'Failed to list files',
      message: error.message,
    });
  }
});

/**
 * Get files by path
 * GET /api/drive/files/by-path/:path
 * Example: /api/drive/files/by-path/Affiliate AI/Images/Uploaded?type=image
 */
router.get('/files/by-path/:path', async (req, res) => {
  try {
    const decodedPath = decodeURIComponent(req.params.path);
    const { type, pageSize = 50 } = req.query;

    const folders = driveService.getFolderMap();
    const folderId = folders[decodedPath];

    if (!folderId) {
      return res.status(404).json({
        error: 'Path not found',
        message: `Folder path "${decodedPath}" not found in configured structure`,
        availablePaths: Object.keys(folders),
      });
    }

    // Delegate to files listing
    req.params.folderId = folderId;
    return router.stack
      .find(r => r.route?.path === '/folders/:folderId/files')
      ?.route?.stack[0]
      ?.handle(req, res);
  } catch (error) {
    console.error('Error getting files by path:', error);
    res.status(500).json({
      error: 'Failed to get files by path',
      message: error.message,
    });
  }
});

/**
 * Browse folder with breadcrumb
 * GET /api/drive/browse/:folderId
 */
router.get('/browse/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const folders = driveService.getFolderMap();
    
    // Find path to this folder
    const folderPath = Object.entries(folders).find(([_, id]) => id === folderId)?.[0];
    const breadcrumb = folderPath ? folderPath.split('/') : ['Affiliate AI'];

    // Get files in this folder
    const authResult = await driveService.authenticate();
    if (!authResult.authenticated) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Please set up Google Drive OAuth first',
      });
    }

    const drive = driveService.drive;
    const query = `parents='${folderId}' and trashed=false`;
    
    const response = await drive.files.list({
      q: query,
      spaces: 'drive',
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, size)',
      pageSize: 100,
      orderBy: 'createdTime',
    });

    const items = response.data.files || [];
    
    // Separate folders and files
    const subfolders = items.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const files = items.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

    res.json({
      success: true,
      folderId,
      folderPath,
      breadcrumb,
      subfolders: subfolders.map(f => ({
        id: f.id,
        name: f.name,
        type: 'folder',
      })),
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.mimeType.startsWith('image/') ? 'image' : 'video',
        mimeType: f.mimeType,
        size: f.size,
        createdTime: f.createdTime,
      })),
    });
  } catch (error) {
    console.error('Error browsing folder:', error);
    res.status(500).json({
      error: 'Failed to browse folder',
      message: error.message,
    });
  }
});

export default router;
