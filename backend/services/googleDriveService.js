/**
 * Google Drive Service
 * Manages cloud file storage, folder structure, and file operations
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

class GoogleDriveService {
  constructor() {
    this.apiKey = process.env.DRIVE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/drive/v3';
    this.folderStructure = {
      root: null,
      inputs: null,
      outputs: null,
      templates: null,
      media: null,
      batches: null,
      analytics: null,
    };
    this.initialized = false;
  }

  /**
   * Initialize Google Drive folder structure
   */
  async initialize() {
    try {
      console.log('Initializing Google Drive folder structure...');
      
      // Get or create root folder
      this.folderStructure.root = await this.getOrCreateFolder(
        'SmartWardrobe-Production',
        null
      );

      // Create main folders
      this.folderStructure.inputs = await this.getOrCreateFolder(
        'inputs',
        this.folderStructure.root
      );

      this.folderStructure.outputs = await this.getOrCreateFolder(
        'outputs',
        this.folderStructure.root
      );

      this.folderStructure.templates = await this.getOrCreateFolder(
        'templates',
        this.folderStructure.root
      );

      this.folderStructure.media = await this.getOrCreateFolder(
        'media-library',
        this.folderStructure.root
      );

      this.folderStructure.batches = await this.getOrCreateFolder(
        'batches',
        this.folderStructure.root
      );

      this.folderStructure.analytics = await this.getOrCreateFolder(
        'analytics',
        this.folderStructure.root
      );

      // Create subfolders for inputs
      await this.createInputFolders();

      // Create subfolders for outputs
      await this.createOutputFolders();

      // Create subfolders for media
      await this.createMediaFolders();

      this.initialized = true;
      console.log('✅ Google Drive initialized successfully');

      return this.folderStructure;
    } catch (error) {
      console.error('❌ Google Drive initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create input folder structure
   */
  async createInputFolders() {
    const inputTypes = ['images', 'videos', 'audio', 'documents'];
    
    for (const type of inputTypes) {
      const folder = await this.getOrCreateFolder(
        type,
        this.folderStructure.inputs
      );
      this.folderStructure[`inputs_${type}`] = folder;
    }
  }

  /**
   * Create output folder structure
   */
  async createOutputFolders() {
    const outputTypes = [
      'generated-videos',
      'processed-images',
      'batch-results',
      'reports',
      'thumbnails',
    ];

    for (const type of outputTypes) {
      const folder = await this.getOrCreateFolder(
        type,
        this.folderStructure.outputs
      );
      this.folderStructure[`outputs_${type}`] = folder;
    }
  }

  /**
   * Create media library folder structure
   */
  async createMediaFolders() {
    const mediaTypes = ['videos', 'images', 'audio', 'templates', 'presets'];

    for (const type of mediaTypes) {
      const folder = await this.getOrCreateFolder(
        type,
        this.folderStructure.media
      );
      this.folderStructure[`media_${type}`] = folder;
    }
  }

  /**
   * Get or create folder
   */
  async getOrCreateFolder(folderName, parentFolderId = null) {
    try {
      // Check if folder exists
      const existing = await this.searchFolder(folderName, parentFolderId);
      if (existing) {
        return existing;
      }

      // Create new folder
      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      if (parentFolderId) {
        metadata.parents = [parentFolderId];
      }

      const response = await axios.post(
        `${this.baseUrl}/files?key=${this.apiKey}`,
        metadata,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response.data.id;
    } catch (error) {
      console.error(`Error creating folder ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Search for folder
   */
  async searchFolder(folderName, parentFolderId = null) {
    try {
      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      if (parentFolderId) {
        query += ` and '${parentFolderId}' in parents`;
      }

      const response = await axios.get(
        `${this.baseUrl}/files?key=${this.apiKey}&q=${encodeURIComponent(query)}&spaces=drive&pageSize=1`
      );

      return response.data.files && response.data.files.length > 0
        ? response.data.files[0].id
        : null;
    } catch (error) {
      console.error(`Error searching folder ${folderName}:`, error);
      return null;
    }
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(filePath, fileName, parentFolderId, metadata = {}) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const fileStats = fs.statSync(filePath);

      const fileMetadata = {
        name: fileName,
        ...metadata,
      };

      if (parentFolderId) {
        fileMetadata.parents = [parentFolderId];
      }

      const form = new FormData();
      form.append('metadata', JSON.stringify(fileMetadata), {
        contentType: 'application/json',
      });
      form.append('file', fileStream, {
        filename: fileName,
        contentType: this.getMimeType(filePath),
      });

      const response = await axios.post(
        `${this.baseUrl}/files?uploadType=multipart&key=${this.apiKey}`,
        form,
        {
          headers: form.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      return {
        id: response.data.id,
        name: response.data.name,
        mimeType: response.data.mimeType,
        webViewLink: response.data.webViewLink,
        size: fileStats.size,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error(`Error uploading file ${fileName}:`, error.message);
      throw error;
    }
  }

  /**
   * Upload file with resumable session (for large files)
   */
  async uploadLargeFile(filePath, fileName, parentFolderId, onProgress) {
    try {
      const fileStats = fs.statSync(filePath);
      const totalSize = fileStats.size;

      const fileMetadata = {
        name: fileName,
        parents: parentFolderId ? [parentFolderId] : [],
      };

      // Initialize resumable session
      const response = await axios.post(
        `${this.baseUrl}/files?uploadType=resumable&key=${this.apiKey}`,
        fileMetadata,
        {
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'Content-Type': 'application/json',
          },
        }
      );

      const sessionUri = response.headers['location'];

      // Upload file in chunks
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
      let uploadedBytes = 0;
      let buffer = Buffer.alloc(0);

      return new Promise((resolve, reject) => {
        fileStream.on('data', async (chunk) => {
          buffer = Buffer.concat([buffer, chunk]);

          if (buffer.length >= chunkSize || uploadedBytes + buffer.length === totalSize) {
            fileStream.pause();

            try {
              uploadedBytes += buffer.length;
              const isLastChunk = uploadedBytes === totalSize;

              const uploadResponse = await axios.put(
                sessionUri,
                buffer,
                {
                  headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': buffer.length,
                    'X-Goog-Upload-Offset': uploadedBytes - buffer.length,
                    ...(isLastChunk && {
                      'X-Goog-Upload-Command': 'finalize',
                    }),
                  },
                }
              );

              if (onProgress) {
                onProgress(uploadedBytes, totalSize);
              }

              if (isLastChunk) {
                resolve({
                  id: uploadResponse.data.id,
                  name: uploadResponse.data.name,
                  webViewLink: uploadResponse.data.webViewLink,
                  size: totalSize,
                  uploadedAt: new Date(),
                });
              } else {
                buffer = Buffer.alloc(0);
                fileStream.resume();
              }
            } catch (error) {
              reject(error);
            }
          }
        });

        fileStream.on('error', reject);
      });
    } catch (error) {
      console.error(`Error uploading large file ${fileName}:`, error.message);
      throw error;
    }
  }

  /**
   * Download file from Google Drive
   */
  async downloadFile(fileId, outputPath) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/files/${fileId}?alt=media&key=${this.apiKey}`,
        {
          responseType: 'stream',
        }
      );

      return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(outputPath);

        response.data.pipe(writeStream);

        writeStream.on('finish', () => {
          resolve({
            path: outputPath,
            size: fs.statSync(outputPath).size,
            downloadedAt: new Date(),
          });
        });

        writeStream.on('error', reject);
      });
    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error.message);
      throw error;
    }
  }

  /**
   * List files in folder
   */
  async listFiles(folderId, pageSize = 50) {
    try {
      const query = `'${folderId}' in parents and trashed=false`;

      const response = await axios.get(
        `${this.baseUrl}/files?key=${this.apiKey}&q=${encodeURIComponent(
          query
        )}&pageSize=${pageSize}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink)`
      );

      return response.data.files || [];
    } catch (error) {
      console.error(`Error listing files in folder ${folderId}:`, error.message);
      return [];
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/files/${fileId}?key=${this.apiKey}&fields=*`
      );

      return response.data;
    } catch (error) {
      console.error(`Error getting file metadata ${fileId}:`, error.message);
      return null;
    }
  }

  /**
   * Delete file or folder
   */
  async deleteFile(fileId) {
    try {
      await axios.delete(`${this.baseUrl}/files/${fileId}?key=${this.apiKey}`);

      return true;
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error.message);
      throw error;
    }
  }

  /**
   * Move file to different folder
   */
  async moveFile(fileId, newParentFolderId) {
    try {
      const response = await axios.patch(
        `${this.baseUrl}/files/${fileId}?key=${this.apiKey}&addParents=${newParentFolderId}&fields=parents`,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error moving file ${fileId}:`, error.message);
      throw error;
    }
  }

  /**
   * Copy file
   */
  async copyFile(fileId, newName, targetFolderId) {
    try {
      const metadata = {
        name: newName,
        parents: [targetFolderId],
      };

      const response = await axios.post(
        `${this.baseUrl}/files/${fileId}/copy?key=${this.apiKey}`,
        metadata,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error copying file ${fileId}:`, error.message);
      throw error;
    }
  }

  /**
   * Create batch folder with organized structure
   */
  async createBatchFolder(batchId, batchName) {
    try {
      // Create main batch folder
      const batchFolder = await this.getOrCreateFolder(
        `${batchName}-${batchId}`,
        this.folderStructure.batches
      );

      // Create subfolders
      const inputFolder = await this.getOrCreateFolder(
        'inputs',
        batchFolder
      );
      const outputFolder = await this.getOrCreateFolder(
        'outputs',
        batchFolder
      );
      const logFolder = await this.getOrCreateFolder(
        'logs',
        batchFolder
      );

      return {
        batchId,
        folderId: batchFolder,
        folders: {
          input: inputFolder,
          output: outputFolder,
          logs: logFolder,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      console.error(`Error creating batch folder:`, error.message);
      throw error;
    }
  }

  /**
   * Get folder structure info
   */
  async getFolderInfo(folderId) {
    try {
      const files = await this.listFiles(folderId);
      const metadata = await this.getFileMetadata(folderId);

      return {
        id: folderId,
        name: metadata?.name,
        fileCount: files.length,
        files: files.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.mimeType,
          size: f.size,
          createdTime: f.createdTime,
          link: f.webViewLink,
          thumbnail: f.thumbnailLink,
        })),
      };
    } catch (error) {
      console.error(`Error getting folder info:`, error.message);
      return null;
    }
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
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.aac': 'audio/aac',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get public sharing link for file
   */
  async getShareLink(fileId) {
    try {
      // Make file publicly readable
      await axios.post(
        `${this.baseUrl}/files/${fileId}/permissions?key=${this.apiKey}`,
        {
          role: 'reader',
          type: 'anyone',
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const metadata = await this.getFileMetadata(fileId);
      return metadata.webViewLink;
    } catch (error) {
      console.error(`Error getting share link:`, error.message);
      throw error;
    }
  }

  /**
   * Search files by name or type
   */
  async searchFiles(query, folderIdFilter = null) {
    try {
      let searchQuery = `name contains '${query}' and trashed=false`;

      if (folderIdFilter) {
        searchQuery += ` and '${folderIdFilter}' in parents`;
      }

      const response = await axios.get(
        `${this.baseUrl}/files?key=${this.apiKey}&q=${encodeURIComponent(
          searchQuery
        )}&spaces=drive&pageSize=50&fields=files(id,name,mimeType,size,webViewLink,thumbnailLink)`
      );

      return response.data.files || [];
    } catch (error) {
      console.error(`Error searching files:`, error.message);
      return [];
    }
  }

  /**
   * Get folder statistics
   */
  async getFolderStats(folderId) {
    try {
      const files = await this.listFiles(folderId, 1000);

      const stats = {
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
        byType: {},
      };

      files.forEach((file) => {
        const type = file.mimeType.split('/')[0];
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error(`Error getting folder stats:`, error.message);
      return null;
    }
  }
}

export default GoogleDriveService;
