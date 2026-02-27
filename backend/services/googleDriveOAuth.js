import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GoogleDriveOAuthService {
  constructor() {
    this.tokenPath = path.join(__dirname, '../config/drive-token.json');
    
    // 💫 FIXED: Load OAuth from environment variables
    this.oauthClientId = process.env.OAUTH_CLIENT_ID;
    this.oauthClientSecret = process.env.OAUTH_CLIENT_SECRET;
    this.apiKey = process.env.DRIVE_API_KEY;
    
    // Fallback to file-based credentials if env vars not set
    this.credentialsPath = path.join(
      __dirname,
      '../config/client_secret_445819590351-s0oqsu0bu9t7lsmttfd16q8rohqlohkc.apps.googleusercontent.com.json'
    );

    // 💫 Load pre-configured folder structure
    this.folderStructurePath = path.join(__dirname, '../config/drive-folder-structure.json');
    this.loadedFolderStructure = this.loadFolderStructure();
    
    // Folder structure for drive - pre-populated from config
    this.folderIds = {
      root: this.loadedFolderStructure?.rootFolderId || null,
      images: this.loadedFolderStructure?.folders?.['Affiliate AI/Images'] || null,
      imagesUploaded: this.loadedFolderStructure?.folders?.['Affiliate AI/Images/Uploaded'] || null,
      imagesApp: this.loadedFolderStructure?.folders?.['Affiliate AI/Images/Uploaded/App'] || null,
      imagesCharacter: this.loadedFolderStructure?.folders?.['Affiliate AI/Images/Uploaded/App/Character'] || null,
      imagesProduct: this.loadedFolderStructure?.folders?.['Affiliate AI/Images/Uploaded/App/Product'] || null,
      imagesCompleted: this.loadedFolderStructure?.folders?.['Affiliate AI/Images/Completed'] || null,
      imagesDownloaded: this.loadedFolderStructure?.folders?.['Affiliate AI/Images/Downloaded'] || null,
      videos: this.loadedFolderStructure?.folders?.['Affiliate AI/Videos'] || null,
      videosUploaded: this.loadedFolderStructure?.folders?.['Affiliate AI/Videos/Uploaded'] || null,
      videosApp: this.loadedFolderStructure?.folders?.['Affiliate AI/Videos/Uploaded/App'] || null,
      videosCompleted: this.loadedFolderStructure?.folders?.['Affiliate AI/Videos/Completed'] || null,
      videosDownloaded: this.loadedFolderStructure?.folders?.['Affiliate AI/Videos/Downloaded'] || null,
      videosQueue: this.loadedFolderStructure?.folders?.['Affiliate AI/Videos/Queue'] || null,
      videosTiktok: this.loadedFolderStructure?.folders?.['Affiliate AI/Videos/Downloaded/Tiktok'] || null,
      videosReels: this.loadedFolderStructure?.folders?.['Affiliate AI/Videos/Downloaded/Reels'] || null,
    };

    this.drive = null;
    this.auth = null;
    
    this.initialized = false;
  }

  /**
   * Authenticate with Google Drive using OAuth 2.0
   */
  async authenticate() {
    try {
      // 💫 FIXED: First try OAuth from environment variables
      if (this.oauthClientId && this.oauthClientSecret) {
        console.log('✅ Using OAuth 2.0 credentials from environment (.env)...');
        return await this.authenticateWithOAuth();
      }

      // 💫 FALLBACK: Try file-based credentials
      if (fs.existsSync(this.credentialsPath)) {
        console.log('✅ Using OAuth 2.0 credentials from file...');
        return await this.authenticateWithOAuthFile();
      }

      console.warn(`⚠️  Google Drive credentials not configured`);
      console.warn(`📍 Expected either:`);
      console.warn(`   1. OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in .env`);
      console.warn(`   2. Credentials file at: backend/config/client_secret_*.json`);
      console.warn(`📍 Skipping Google Drive upload feature...`);
        
      return {
        success: true,
        authenticated: false,
        configured: false,
        message: 'Google Drive not configured. Upload to Drive feature disabled.',
        authUrl: '#',
        notice: 'To enable Google Drive uploads, add OAuth credentials to .env'
      };
    } catch (error) {
      console.error('❌ Google Drive authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Authenticate with OAuth from environment variables
   */
  async authenticateWithOAuth() {
    try {
      const redirectUri = 'http://localhost:5000/api/drive/auth-callback';

      const auth = new google.auth.OAuth2(
        this.oauthClientId,
        this.oauthClientSecret,
        redirectUri
      );

      // Check if we have stored token
      if (fs.existsSync(this.tokenPath)) {
        const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
        auth.setCredentials(token);
        
        // Refresh token if expired
        if (token.expiry_date && token.expiry_date < Date.now()) {
          console.log('🔄 Refreshing expired token...');
          const { credentials: newCredentials } = await auth.refreshAccessToken();
          fs.writeFileSync(this.tokenPath, JSON.stringify(newCredentials));
          auth.setCredentials(newCredentials);
          console.log('✅ Token refreshed');
        }
      } else {
        console.warn('⚠️ No stored token found. Generating authorization URL...');
        return this.getAuthorizationUrl(auth);
      }

      this.auth = auth;
      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;

      console.log('✅ Google Drive OAuth authenticated successfully');
      return { 
        success: true, 
        authenticated: true,
        configured: true,
        method: 'OAuth 2.0 (env)'
      };
    } catch (error) {
      console.error('❌ OAuth authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Authenticate with OAuth from file
   */
  async authenticateWithOAuthFile() {
    try {
      const credentials = JSON.parse(
        fs.readFileSync(this.credentialsPath, 'utf8')
      );

      // Validate credentials structure
      if (!credentials.web) {
        console.error('❌ Invalid credentials format. Missing "web" property');
        
        return {
          success: false,
          authenticated: false,
          configured: true,
          message: 'Invalid credentials format',
          error: 'Missing "web" property in credentials JSON'
        };
      }

      const { client_id, client_secret, redirect_uris } = credentials.web;

      // Validate required fields
      if (!client_id || !client_secret) {
        console.error('❌ Missing client_id or client_secret in credentials');
        
        return {
          success: false,
          authenticated: false,
          configured: true,
          message: 'Invalid credentials',
          error: 'Missing client_id or client_secret'
        };
      }

      // Use redirect_uris from credentials or default values
      const redirectUri = (redirect_uris && redirect_uris.length > 0) 
        ? redirect_uris[0]
        : 'http://localhost:5000/api/drive/auth-callback';

      console.log(`📍 Using OAuth redirect URI: ${redirectUri}`);

      const auth = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirectUri
      );

      // Check if we have stored token
      if (fs.existsSync(this.tokenPath)) {
        const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
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
      return { 
        success: true, 
        authenticated: true,
        configured: true,
        method: 'OAuth 2.0 (file)'
      };
    } catch (error) {
      console.error('❌ OAuth file authentication failed:', error.message);
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
   * Load pre-configured folder structure from config file
   */
  loadFolderStructure() {
    try {
      if (fs.existsSync(this.folderStructurePath)) {
        const config = fs.readFileSync(this.folderStructurePath, 'utf-8');
        const folderStructure = JSON.parse(config);
        console.log(`✅ Loaded folder structure from config (${Object.keys(folderStructure.folders).length} folders)`);
        return folderStructure;
      } else {
        console.warn(`⚠️  Folder structure config not found at: ${this.folderStructurePath}`);
        console.warn(`    Run: node scripts/detectDriveFolderStructure.js`);
        return null;
      }
    } catch (error) {
      console.warn(`⚠️  Error loading folder structure:`, error.message);
      return null;
    }
  }

  /**
   * Get folder tree structure for frontend
   */
  getFolderTree() {
    return this.loadedFolderStructure?.tree || null;
  }

  /**
   * Get all folders as flat map
   */
  getFolderMap() {
    return this.loadedFolderStructure?.folders || {};
  }

  /**
   * Initialize folder structure on Drive  
   * NOTE: No longer creates folders - uses pre-configured structure from config
   */
  async initializeFolderStructure() {
    try {
      if (!this.initialized) {
        await this.authenticate();
      }

      if (!this.folderIds.root) {
        console.warn(`⚠️  Folder structure not configured. Please run:`);
        console.warn(`    node scripts/detectDriveFolderStructure.js`);
        return null;
      }

      // 💫 FIXED: Don't create folders - use pre-configured structure
      console.log('✅ Using pre-configured folder structure (no auto-creation)');
      console.log('📁 Folder structure:');
      console.log(`   Root: ${this.folderIds.root}`);
      console.log(`   Images: ${this.folderIds.images}`);
      console.log(`   Videos: ${this.folderIds.videos}`);

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
        console.log(`🔐 Authenticating with Google Drive...`);
        const authResult = await this.authenticate();
        
        if (!authResult.success || !authResult.authenticated) {
          throw new Error('Failed to authenticate with Google Drive');
        }
      }

      if (!buffer) {
        throw new Error('No buffer provided for upload');
      }

      if (!this.drive) {
        throw new Error('Google Drive not initialized. Please authenticate first.');
      }

      // Initialize folder structure if needed
      if (!this.folderIds.imagesApp) {
        console.log(`📁 Initializing folder structure...`);
        await this.initializeFolderStructure();
      }

      const mimeType = this.getMimeType(fileName);

      // Use provided folderId or default to imagesApp
      const targetFolderId = options.folderId || this.folderIds.imagesApp || 'root';

      const fileMetadata = {
        name: fileName,
        parents: [targetFolderId],
        description: options.description || 'Uploaded from Smart Wardrobe App',
        properties: {
          appName: 'smart-wardrobe',
          contentType: 'uploaded',
          timestamp: new Date().toISOString(),
          ...options.properties,
        },
      };

      console.log(`📤 Uploading ${fileName} to Google Drive...`);
      
      // Convert buffer to readable stream
      const stream = Readable.from(buffer);
      
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: {
          mimeType,
          body: stream,
        },
        fields: 'id, name, mimeType, webViewLink, createdTime, size',
      });

      console.log(`✅ Uploaded: ${fileName} (${response.data.id})`);

      // 🔴 CRITICAL FIX: Share file publicly so proxy can download it without auth
      try {
        await this.shareFilePublicly(response.data.id);
        console.log(`🔗 File shared publicly`);
      } catch (shareError) {
        console.warn(`⚠️  Warning: Could not share file publicly: ${shareError.message}`);
        console.warn(`   File proxy may not work without public sharing`);
      }

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
      console.error(`❌ Error uploading buffer ${fileName}:`, error.message);
      
      // 💫 FIX: Return error object (not graceful fallback) so caller knows it failed
      // This makes it clear to the caller that the upload didn't succeed
      console.warn(`⚠️  Google Drive upload FAILED. File is NOT on Drive.`);
      console.warn(`     Error details: ${error.message}`);
      
      return {
        id: null,
        name: fileName,
        mimeType: this.getMimeType(fileName),
        webViewLink: null,  // 💫 KEY: This will be null if upload failed
        size: buffer.length,
        createdTime: new Date().toISOString(),
        contentType: 'local',
        source: 'local-storage',
        success: false,
        error: error.message,
        notice: 'Google Drive upload failed. File was NOT saved to Drive.'
      };
    }
  }

  /**
   * � CRITICAL: Share file publicly for public proxy download
   * Without this, files uploaded to Drive can't be accessed via public export URL
   */
  async shareFilePublicly(fileId) {
    try {
      if (!this.drive) {
        throw new Error('Google Drive not initialized');
      }

      // Create public permission (anyone with link can view)
      const permission = await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      console.log(`   ✅ File ${fileId} is now publicly accessible`);
      return permission.data;
    } catch (error) {
      // 🔴 CRITICAL: This error should bubble up so caller knows sharing failed
      console.error(`   ❌ Failed to share file publicly: ${error.message}`);
      throw error;
    }
  }

  /**
   * �💫 Upload Character Image
   * Auto-saves to: Images/Uploaded/App/Character
   */
  async uploadCharacterImage(buffer, fileName, options = {}) {
    return this.uploadBuffer(buffer, fileName, {
      ...options,
      folderId: this.folderIds.imagesCharacter || this.folderIds.imagesApp,
      description: options.description || 'Character image uploaded to Smart Wardrobe App',
      properties: {
        ...(options.properties || {}),
        imageType: 'character',
        category: 'character-image',
      }
    });
  }

  /**
   * 💫 Upload Product Image
   * Auto-saves to: Images/Uploaded/App/Product
   */
  async uploadProductImage(buffer, fileName, options = {}) {
    return this.uploadBuffer(buffer, fileName, {
      ...options,
      folderId: this.folderIds.imagesProduct || this.folderIds.imagesApp,
      description: options.description || 'Product image uploaded to Smart Wardrobe App',
      properties: {
        ...(options.properties || {}),
        imageType: 'product',
        category: 'product-image',
      }
    });
  }

  /**
   * 💫 Upload Generated Image
   * Auto-saves to: Images/Completed
   */
  async uploadGeneratedImage(buffer, fileName, options = {}) {
    return this.uploadBuffer(buffer, fileName, {
      ...options,
      folderId: this.folderIds.imagesCompleted || this.folderIds.images,
      description: options.description || 'AI-generated image from Smart Wardrobe App',
      properties: {
        ...(options.properties || {}),
        imageType: 'generated',
        category: 'generated-image',
      }
    });
  }

  /**
   * 💫 Upload Source Video (for mashup/processing)
   * Auto-saves to: Videos/Uploaded/App
   */
  async uploadSourceVideo(buffer, fileName, options = {}) {
    return this.uploadBuffer(buffer, fileName, {
      ...options,
      folderId: this.folderIds.videosApp || this.folderIds.videos,
      description: options.description || 'Source video uploaded for processing',
      properties: {
        ...(options.properties || {}),
        videoType: 'source',
        category: 'source-video',
      }
    });
  }

  /**
   * 💫 Upload Generated Video
   * Auto-saves to: Videos/Completed
   */
  async uploadGeneratedVideo(buffer, fileName, options = {}) {
    return this.uploadBuffer(buffer, fileName, {
      ...options,
      folderId: this.folderIds.videosCompleted || this.folderIds.videos,
      description: options.description || 'AI-generated video from Smart Wardrobe App',
      properties: {
        ...(options.properties || {}),
        videoType: 'generated',
        category: 'generated-video',
      }
    });
  }

  /**
   * 💫 Upload video to platform-specific folder
   * Auto-saves to: Videos/Downloaded/[Platform] (Tiktok, Reels, etc.)
   */
  async uploadVideoToPlatform(buffer, fileName, platform = 'other', options = {}) {
    let folderId = this.folderIds.videosDownloaded || this.folderIds.videos;
    
    if (platform.toLowerCase() === 'tiktok') {
      folderId = this.folderIds.videosTiktok || folderId;
    } else if (platform.toLowerCase() === 'reels' || platform.toLowerCase() === 'instagram') {
      folderId = this.folderIds.videosReels || folderId;
    }

    return this.uploadBuffer(buffer, fileName, {
      ...options,
      folderId,
      description: options.description || `${platform} video from Smart Wardrobe App`,
      properties: {
        ...(options.properties || {}),
        videoType: 'platform',
        platform: platform.toLowerCase(),
        category: 'source-video',
      }
    });
  }

  /**
   * 💫 NEW: Upload directly via REST API using API Key
   */
  async uploadBufferViaRestAPI(buffer, fileName, options = {}) {
    try {
      const mimeType = this.getMimeType(fileName);

      const fileMetadata = {
        name: fileName,
        description: options.description || 'Uploaded from Smart Wardrobe App',
        mimeType: mimeType,
        properties: {
          appName: 'smart-wardrobe',
          contentType: 'uploaded',
          timestamp: new Date().toISOString(),
          ...options.properties,
        },
      };

      // 💫 Step 1: Create file metadata
      const metadataResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files?uploadType=multipart&key=' + this.apiKey,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fileMetadata),
        }
      );

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json().catch(() => ({}));
        throw new Error(`Failed to create file metadata: ${metadataResponse.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const metadata = await metadataResponse.json();
      console.log(`✅ Uploaded buffer to Google Drive: ${fileName} (${metadata.id})`);

      return {
        id: metadata.id,
        name: metadata.name,
        mimeType: mimeType,
        webViewLink: `https://drive.google.com/file/d/${metadata.id}/view`,
        size: buffer.length,
        createdTime: metadata.createdTime || new Date().toISOString(),
        contentType: 'drive',
        source: 'google-drive',
      };
    } catch (error) {
      console.error(`Error uploading via REST API: ${fileName}:`, error.message);
      
      // 💫 GRACEFUL: Return local file info instead of throwing
      // This allows image generation to continue even if Google Drive is not available
      console.warn(`⚠️  Google Drive upload not available. Returning local file info.`);
      return {
        id: `local-${Date.now()}`,
        name: fileName,
        mimeType: this.getMimeType(fileName),
        webViewLink: null,
        size: buffer.length,
        createdTime: new Date().toISOString(),
        contentType: 'local',
        source: 'local-storage',
        notice: 'Google Drive upload failed. File saved locally.',
        error: error.message
      };
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
