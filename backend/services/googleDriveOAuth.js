/**
 * Google Drive OAuth 2.0 Service
 * Handles authentication and file operations with Google Drive
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GoogleDriveOAuthService {
  constructor() {
    this.tokenPath = path.join(__dirname, '../config/drive-token.json');
    this.credentialsPath = path.join(
      __dirname,
      '../config/client_secret_445819590351-s0oqsu0bu9t7lsmttfd16q8rohqlohkc.apps.googleusercontent.com.json'
    );
    
    this.drive = null;
    this.auth = null;
    
    // Folder structure for drive
    this.folderIds = {
      root: '1ayZjev8zPy-k0NT5e4-yiP7gggRD6CVV', // Main "Affiliate AI" folder
      videos: null,
      images: null,
      imagesUploaded: null,
      imagesApp: null,
    };

    this.initialized = false;
  }

  /**
   * Authenticate with Google Drive using OAuth 2.0
   */
  async authenticate() {
    try {
      const credentials = JSON.parse(
        fs.readFileSync(this.credentialsPath)
      );

      const { client_id, client_secret, redirect_uris } = credentials.web;

      const auth = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      // Check if we have stored token
      if (fs.existsSync(this.tokenPath)) {
        const token = JSON.parse(fs.readFileSync(this.tokenPath));
        auth.setCredentials(token);
        
        // Refresh token if expired
        if (token.expiry_date && token.expiry_date < Date.now()) {
          const { credentials: newCredentials } = await auth.refreshAccessToken();
          fs.writeFileSync(this.tokenPath, JSON.stringify(newCredentials));
          auth.setCredentials(newCredentials);
        }
      } else {
        console.warn('⚠️ No stored token found. Generating authorization URL...');
        return this.getAuthorizationUrl(auth);
      }

      this.auth = auth;
      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;

      console.log('✅ Google Drive OAuth authenticated successfully');
      return { success: true, authenticated: true };
    } catch (error) {
      console.error('❌ Google Drive authentication failed:', error);
      throw error;
    }
  }

  /**
   * Generate authorization URL for user to authenticate
   */
  getAuthorizationUrl(auth) {
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file'
    ];

    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });

    return {
      success: true,
      authenticated: false,
      authUrl,
      message: 'Visit this URL to authenticate with Google Drive',
    };
  }

  /**
   * Handle OAuth callback and store token
   */
  async handleAuthCallback(code) {
    try {
      const credentials = JSON.parse(
        fs.readFileSync(this.credentialsPath)
      );

      const { client_id, client_secret, redirect_uris } = credentials.web;

      const auth = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      const { tokens } = await auth.getToken(code);
      
      // Store token for future use
      fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));

      this.auth = auth;
      auth.setCredentials(tokens);
      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;

      console.log('✅ Google Drive authenticated and token saved');
      return { success: true, authenticated: true };
    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      throw error;
    }
  }

  /**
   * Initialize folder structure on Drive
   */
  async initializeFolderStructure() {
    try {
      if (!this.initialized) {
        await this.authenticate();
      }

      console.log('📁 Initializing folder structure...');

      // Create Videos folder
      this.folderIds.videos = await this.getOrCreateFolder(
        'Videos',
        this.folderIds.root
      );

      // Create Images folder
      this.folderIds.images = await this.getOrCreateFolder(
        'Images',
        this.folderIds.root
      );

      // Create Uploaded subfolder under Images
      this.folderIds.imagesUploaded = await this.getOrCreateFolder(
        'Uploaded',
        this.folderIds.images
      );

      // Create Downloaded subfolder under Images
      const imagesDownloaded = await this.getOrCreateFolder(
        'Downloaded',
        this.folderIds.images
      );

      // Create App subfolder under Uploaded
      this.folderIds.imagesApp = await this.getOrCreateFolder(
        'App',
        this.folderIds.imagesUploaded
      );

      console.log('✅ Folder structure initialized:', this.folderIds);
      return this.folderIds;
    } catch (error) {
      console.error('❌ Failed to initialize folder structure:', error);
      throw error;
    }
  }

  /**
   * Get or create folder
   */
  async getOrCreateFolder(folderName, parentFolderId) {
    try {
      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
        spaces: 'drive',
        pageSize: 1,
        fields: 'files(id, name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        console.log(`📁 Found existing folder: ${folderName}`);
        return response.data.files[0].id;
      }

      // Create new folder
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      };

      const createResponse = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });

      console.log(`✅ Created folder: ${folderName} (${createResponse.data.id})`);
      return createResponse.data.id;
    } catch (error) {
      console.error(`Error with folder ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(filePath, fileName, options = {}) {
    try {
      if (!this.initialized) {
        await this.authenticate();
      }

      if (!this.folderIds.imagesApp) {
        await this.initializeFolderStructure();
      }

      const fileStats = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);

      // Determine MIME type
      const mimeType = this.getMimeType(filePath);

      const fileMetadata = {
        name: fileName,
        parents: [options.folderId || this.folderIds.imagesApp],
        description: options.description || 'Uploaded from Smart Wardrobe App',
        properties: {
          appName: 'smart-wardrobe',
          contentType: 'uploaded',
          timestamp: new Date().toISOString(),
          ...options.properties,
        },
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: {
          mimeType,
          body: fileStream,
        },
        fields: 'id, name, mimeType, webViewLink, createdTime, size',
      });

      console.log(`✅ Uploaded file: ${fileName} (${response.data.id})`);

      return {
        id: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        webViewLink: response.data.webViewLink,
        size: fileStats.size,
        createdTime: response.data.createdTime,
        contentType: 'drive',
        source: 'google-drive',
      };
    } catch (error) {
      console.error(`Error uploading file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Upload buffer/blob to Google Drive
   */
  async uploadBuffer(buffer, fileName, options = {}) {
    try {
      if (!this.initialized) {
        await this.authenticate();
      }

      if (!this.folderIds.imagesApp) {
        await this.initializeFolderStructure();
      }

      const mimeType = this.getMimeType(fileName);

      const fileMetadata = {
        name: fileName,
        parents: [options.folderId || this.folderIds.imagesApp],
        description: options.description || 'Uploaded from Smart Wardrobe App',
        properties: {
          appName: 'smart-wardrobe',
          contentType: 'uploaded',
          timestamp: new Date().toISOString(),
          ...options.properties,
        },
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: {
          mimeType,
          body: buffer,
        },
        fields: 'id, name, mimeType, webViewLink, createdTime, size',
      });

      console.log(`✅ Uploaded buffer: ${fileName} (${response.data.id})`);

      return {
        id: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        webViewLink: response.data.webViewLink,
        size: buffer.length,
        createdTime: response.data.createdTime,
        contentType: 'drive',
        source: 'google-drive',
      };
    } catch (error) {
      console.error(`Error uploading buffer ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Get list of files in folder
   */
  async listFiles(folderId = null, pageSize = 50) {
    try {
      if (!this.initialized) {
        await this.authenticate();
      }

      const response = await this.drive.files.list({
        q: `${folderId ? `'${folderId}' in parents and ` : ''}trashed=false and mimeType!='application/vnd.google-apps.folder'`,
        spaces: 'drive',
        pageSize,
        fields: 'files(id, name, mimeType, webViewLink, createdTime, size, thumbnailLink)',
        orderBy: 'createdTime desc',
      });

      return response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        createdTime: file.createdTime,
        size: file.size,
        thumbnailLink: file.thumbnailLink,
        contentType: 'drive',
        source: 'google-drive',
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId) {
    try {
      if (!this.initialized) {
        await this.authenticate();
      }

      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, webViewLink, createdTime, size, thumbnailLink',
      });

      return {
        id: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        webViewLink: response.data.webViewLink,
        createdTime: response.data.createdTime,
        size: response.data.size,
        thumbnailLink: response.data.thumbnailLink,
        contentType: 'drive',
        source: 'google-drive',
      };
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId) {
    try {
      if (!this.initialized) {
        await this.authenticate();
      }

      await this.drive.files.delete({ fileId });
      console.log(`✅ Deleted file: ${fileId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get download URL for file
   */
  getDownloadUrl(fileId) {
    if (!this.initialized) {
      throw new Error('Not authenticated');
    }
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mkv': 'video/x-matroska',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

// Export singleton instance
const driveService = new GoogleDriveOAuthService();

export default driveService;
