/**
 * Google Drive Service
 * ��� REFACTORED: Wrapper around OAuth-authenticated Google Drive API
 * 
 * This maintains backward compatibility with existing code while using proper OAuth authentication.
 * Previously used API Key (which doesn't work for writes), now delegates to googleDriveOAuth.
 */

import driveOAuthService from './googleDriveOAuth.js';

/**
 * GoogleDriveService - Backward compatible wrapper for OAuth authentication
 * All methods delegate to the OAuth service for proper Google Drive authentication
 */
class GoogleDriveService {
  constructor() {
    // Reference to the OAuth-authenticated service
    this.oauthService = driveOAuthService;
    
    // Backward compatibility properties
    this.folderStructure = {};
    this.initialized = false;
  }

  /**
   * Initialize folder structure via OAuth
   */
  async initialize() {
    try {
      console.log('��� Initializing Google Drive via OAuth...');
      
      // OAuth service handles all authentication and initialization
      await this.oauthService.authenticate();
      await this.oauthService.initializeFolderStructure();
      
      this.initialized = true;
      console.log('✅ Google Drive initialized successfully via OAuth');
      
      return this.oauthService.folderIds;
    } catch (error) {
      console.error('❌ Google Drive initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(filePath, fileName, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return await this.oauthService.uploadFile(filePath, fileName, options);
    } catch (error) {
      console.error(`❌ Error uploading file ${fileName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get or create folder in Google Drive
   */
  async getOrCreateFolder(folderName, parentFolderId) {
    try {
      return await this.oauthService.getOrCreateFolder(folderName, parentFolderId);
    } catch (error) {
      console.error(`❌ Error getting/creating folder ${folderName}:`, error.message);
      throw error;
    }
  }

  /**
   * Create folder in Google Drive
   */
  async createFolder(folderName, parentFolderId) {
    try {
      return await this.oauthService.createFolder(folderName, parentFolderId);
    } catch (error) {
      console.error(`❌ Error creating folder ${folderName}:`, error.message);
      throw error;
    }
  }

  /**
   * Search for folder by name
   */
  async searchFolder(folderName, parentFolderId = null) {
    try {
      return await this.oauthService.searchFolder(folderName, parentFolderId);
    } catch (error) {
      console.error(`❌ Error searching folder ${folderName}:`, error.message);
      throw error;
    }
  }

  /**
   * Upload file buffer to Google Drive
   */
  async uploadBuffer(buffer, fileName, parentFolderId, mimeType = 'application/octet-stream') {
    try {
      return await this.oauthService.uploadFileBuffer(buffer, fileName, {
        folderId: parentFolderId,
        mimeType
      });
    } catch (error) {
      console.error(`❌ Error uploading buffer ${fileName}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId) {
    try {
      return await this.oauthService.deleteFile(fileId);
    } catch (error) {
      console.error(`❌ Error deleting file ${fileId}:`, error.message);
      throw error;
    }
  }

  /**
   * List files in folder
   */
  async listFiles(folderId, pageSize = 10) {
    try {
      return await this.oauthService.listFiles(folderId, pageSize);
    } catch (error) {
      console.error(`❌ Error listing files:`, error.message);
      throw error;
    }
  }

  /**
   * Placeholder methods for backward compatibility
   * (These are now handled automatically by the OAuth service)
   */
  async createInputFolders() {
    console.log('✓ Input folders handled by OAuth service');
  }

  async createOutputFolders() {
    console.log('✓ Output folders handled by OAuth service');
  }

  async createMediaFolders() {
    console.log('✓ Media folders handled by OAuth service');
  }

  async getMimeType(filePath) {
    // Delegate to OAuth service if available
    return this.oauthService.getMimeType ? this.oauthService.getMimeType(filePath) : 'application/octet-stream';
  }
}

export default GoogleDriveService;
