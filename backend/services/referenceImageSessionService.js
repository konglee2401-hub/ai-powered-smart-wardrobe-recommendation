/**
 * Reference Image Session Management Service
 * Handles storage and retrieval of reference images for video generation workflows
 */

import fs from 'fs';
import path from 'path';

class ReferenceImageSessionService {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.join(process.cwd(), 'sessions');
    this.ensureBaseDir();
  }

  /**
   * Ensure base directory exists
   */
  ensureBaseDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Create or get a session directory
   * @param {string} sessionId - Unique session identifier
   * @returns {string} - Path to session directory
   */
  createSession(sessionId) {
    const sessionDir = path.join(this.baseDir, `session-${sessionId}`);
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      console.log(`✨ Created session: ${sessionId}`);
    }

    return sessionDir;
  }

  /**
   * Save reference image (character, product, etc.)
   * @param {string} sessionId - Session ID  
   * @param {string} imageType - Type of image (character, product, outfit1, outfit2, etc.)
   * @param {string} imageBase64 - Base64 encoded image data
   * @returns {Object} - { success, path, size, type }
   */
  async saveReferenceImage(sessionId, imageType, imageBase64) {
    try {
      const sessionDir = this.createSession(sessionId);
      const imagesDir = path.join(sessionDir, 'images');

      if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
      }

      // Parse base64
      const base64Match = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) {
        throw new Error('Invalid base64 format');
      }

      const imageFormat = base64Match[1];
      const imageBuffer = Buffer.from(base64Match[2], 'base64');
      const imagePath = path.join(imagesDir, `${imageType}.${imageFormat}`);

      // Save file
      fs.writeFileSync(imagePath, imageBuffer);

      const fileSizeKB = (imageBuffer.length / 1024).toFixed(2);

      console.log(`📸 Saved ${imageType} image: ${fileSizeKB}KB`);

      return {
        success: true,
        type: imageType,
        path: imagePath,
        relativePath: path.relative(this.baseDir, imagePath),
        format: imageFormat,
        size: imageBuffer.length,
        sizeKB: fileSizeKB,
        savedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to save reference image: ${error.message}`);
      return {
        success: false,
        type: imageType,
        error: error.message
      };
    }
  }

  /**
   * Get reference image as base64
   * @param {string} sessionId - Session ID
   * @param {string} imageType - Type of image
   * @returns {Object} - { success, imageBase64, path }
   */
  async getReferenceImage(sessionId, imageType) {
    try {
      const sessionDir = path.join(this.baseDir, `session-${sessionId}`);
      const imagesDir = path.join(sessionDir, 'images');

      // Find the image file (try common formats)
      const formats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      let imagePath = null;

      for (const format of formats) {
        const checkPath = path.join(imagesDir, `${imageType}.${format}`);
        if (fs.existsSync(checkPath)) {
          imagePath = checkPath;
          break;
        }
      }

      if (!imagePath) {
        return {
          success: false,
          error: `Reference image not found: ${imageType}`
        };
      }

      // Read and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const format = path.extname(imagePath).substring(1);
      const imageBase64 = `data:image/${format};base64,${imageBuffer.toString('base64')}`;

      console.log(`✅ Retrieved reference image: ${imageType}`);

      return {
        success: true,
        type: imageType,
        imageBase64: imageBase64,
        path: imagePath,
        format: format,
        size: imageBuffer.length
      };

    } catch (error) {
      console.error(`❌ Failed to get reference image: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all reference images in a session
   * @param {string} sessionId - Session ID
   * @returns {Object} - { success, images: [] }
   */
  listReferenceImages(sessionId) {
    try {
      const imagesDir = path.join(this.baseDir, `session-${sessionId}`, 'images');

      if (!fs.existsSync(imagesDir)) {
        return { success: true, images: [] };
      }

      const images = fs.readdirSync(imagesDir).map(filename => {
        const fullPath = path.join(imagesDir, filename);
        const stat = fs.statSync(fullPath);
        return {
          type: path.parse(filename).name,
          filename: filename,
          size: stat.size,
          sizeKB: (stat.size / 1024).toFixed(2),
          format: path.extname(filename).substring(1),
          savedAt: new Date(stat.mtimeMs).toISOString()
        };
      });

      console.log(`✅ Found ${images.length} reference images in session`);

      return {
        success: true,
        sessionId: sessionId,
        images: images,
        count: images.length
      };

    } catch (error) {
      console.error(`❌ Failed to list reference images: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save analysis metadata for a session
   * @param {string} sessionId - Session ID
   * @param {Object} analysis - Analysis object
   * @returns {Object} - { success, path }
   */
  async saveAnalysis(sessionId, analysis) {
    try {
      const sessionDir = this.createSession(sessionId);
      const analysisPath = path.join(sessionDir, 'analysis.json');

      const analysisData = {
        ...analysis,
        savedAt: new Date().toISOString(),
        sessionId: sessionId
      };

      fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));

      console.log(`📋 Saved analysis data for session`);

      return {
        success: true,
        path: analysisPath,
        savedAt: analysisData.savedAt
      };

    } catch (error) {
      console.error(`❌ Failed to save analysis: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get analysis metadata for a session
   * @param {string} sessionId - Session ID
   * @returns {Object} - { success, analysis }
   */
  getAnalysis(sessionId) {
    try {
      const analysisPath = path.join(this.baseDir, `session-${sessionId}`, 'analysis.json');

      if (!fs.existsSync(analysisPath)) {
        return {
          success: false,
          error: 'Analysis not found for this session'
        };
      }

      const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

      console.log(`✅ Retrieved analysis for session`);

      return {
        success: true,
        analysis: analysis
      };

    } catch (error) {
      console.error(`❌ Failed to get analysis: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save videos metadata
   * @param {string} sessionId - Session ID
   * @param {Array} videos - Array of video objects
   * @returns {Object} - { success, count }
   */
  async saveVideosMetadata(sessionId, videos) {
    try {
      const sessionDir = this.createSession(sessionId);
      const videosDir = path.join(sessionDir, 'videos');

      if (!fs.existsSync(videosDir)) {
        fs.mkdirSync(videosDir, { recursive: true });
      }

      const metadataPath = path.join(videosDir, 'metadata.json');
      const metadata = {
        sessionId: sessionId,
        videos: videos,
        generatedAt: new Date().toISOString(),
        count: videos.length
      };

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      console.log(`🎬 Saved ${videos.length} videos metadata`);

      return {
        success: true,
        count: videos.length,
        path: metadataPath
      };

    } catch (error) {
      console.error(`❌ Failed to save videos metadata: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get session summary/metadata
   * @param {string} sessionId - Session ID
   * @returns {Object} - Session summary with all data
   */
  getSessionSummary(sessionId) {
    try {
      const sessionDir = path.join(this.baseDir, `session-${sessionId}`);

      if (!fs.existsSync(sessionDir)) {
        return {
          success: false,
          error: `Session not found: ${sessionId}`
        };
      }

      // Get images
      const imagesResult = this.listReferenceImages(sessionId);
      const images = imagesResult.images || [];

      // Get analysis
      const analysisResult = this.getAnalysis(sessionId);
      const analysis = analysisResult.analysis || null;

      // Get videos metadata
      const videosMetadataPath = path.join(sessionDir, 'videos', 'metadata.json');
      let videos = [];
      if (fs.existsSync(videosMetadataPath)) {
        videos = JSON.parse(fs.readFileSync(videosMetadataPath, 'utf8')).videos || [];
      }

      // Get directory size
      const dirSize = this._getDirectorySize(sessionDir);

      return {
        success: true,
        sessionId: sessionId,
        path: sessionDir,
        summary: {
          images: {
            count: images.length,
            list: images
          },
          analysis: {
            exists: !!analysis,
            data: analysis
          },
          videos: {
            count: videos.length,
            list: videos
          },
          totalSize: dirSize,
          totalSizeKB: (dirSize / 1024).toFixed(2),
          createdAt: fs.statSync(sessionDir).birthtime.toISOString()
        }
      };

    } catch (error) {
      console.error(`❌ Failed to get session summary: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete session and all its data
   * @param {string} sessionId - Session ID
   * @returns {Object} - { success, deletedAt }
   */
  async deleteSession(sessionId) {
    try {
      const sessionDir = path.join(this.baseDir, `session-${sessionId}`);

      if (fs.existsSync(sessionDir)) {
        this._deleteDirectory(sessionDir);
        console.log(`🗑️  Deleted session: ${sessionId}`);
      }

      return {
        success: true,
        sessionId: sessionId,
        deletedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to delete session: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean old sessions (older than maxAgeDays)
   * @param {number} maxAgeDays - Maximum age in days (default 7)
   * @returns {Object} - { success, deleted: number }
   */
  async cleanupOldSessions(maxAgeDays = 7) {
    try {
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - maxAgeMs;

      const dirs = fs.readdirSync(this.baseDir);
      let deleted = 0;

      for (const dir of dirs) {
        const sessionDir = path.join(this.baseDir, dir);
        const stat = fs.statSync(sessionDir);

        if (stat.isDirectory() && stat.mtimeMs < cutoffTime) {
          this._deleteDirectory(sessionDir);
          deleted++;
        }
      }

      if (deleted > 0) {
        console.log(`🗑️  Cleaned ${deleted} old sessions`);
      }

      return { success: true, deleted };

    } catch (error) {
      console.error(`❌ Failed to cleanup old sessions: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Recursively get directory size
   * @private
   */
  _getDirectorySize(dir) {
    let size = 0;
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        size += this._getDirectorySize(filePath);
      } else {
        size += stat.size;
      }
    }

    return size;
  }

  /**
   * Helper: Recursively delete directory
   * @private
   */
  _deleteDirectory(dir) {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        const curPath = path.join(dir, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this._deleteDirectory(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(dir);
    }
  }
}

export default ReferenceImageSessionService;
