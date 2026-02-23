/**
 * googleDriveIntegration.js
 * Upload and manage videos on Google Drive folders
 * Folders:
 * - Main Videos: 1EhSRZD03UWYDc1JiMyAiPDAEI76g5Vlc
 * - Sub Videos: 16WmOuKTyj9MFHack9lIyzgUAO60C0BVR
 * - Queue: 1eNhp3EF_R_FH74BPsdQlvclQJq4RHs2Y
 * - Completed: 1vRmPySHkxHHCZdQzuqCctLST19S0EPWT
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Google Drive folder IDs
const FOLDERS = {
  main_videos: '1EhSRZD03UWYDc1JiMyAiPDAEI76g5Vlc',
  sub_videos: '16WmOuKTyj9MFHack9lIyzgUAO60C0BVR',
  queue: '1eNhp3EF_R_FH74BPsdQlvclQJq4RHs2Y',
  completed: '1vRmPySHkxHHCZdQzuqCctLST19S0EPWT'
};

class GoogleDriveIntegration {
  constructor() {
    // NOTE: In production, integrate with googleapis client
    // For now, we simulate with local file system
    this.localMediaDir = path.join(__dirname, '../../../backend/media');
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [
      path.join(this.localMediaDir, 'queue'),
      path.join(this.localMediaDir, 'completed'),
      path.join(this.localMediaDir, 'main-videos'),
      path.join(this.localMediaDir, 'sub-videos')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Simulate uploading main video to Google Drive
   * In production: Use googleapis library
   */
  async uploadMainVideo(filePath, fileName) {
    try {
      const sourceDir = path.join(this.localMediaDir, 'main-videos');
      const destPath = path.join(sourceDir, fileName);

      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, destPath);
        console.log(`✓ Main video uploaded (simulated): ${destPath}`);
        return {
          success: true,
          fileName: fileName,
          localPath: destPath,
          driveId: FOLDERS.main_videos
        };
      } else {
        throw new Error(`Source file not found: ${filePath}`);
      }
    } catch (error) {
      console.error('Upload main video failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get random sub-video from Google Drive folder
   * In production: Query Google Drive API
   */
  async getRandomSubVideo() {
    try {
      const subVideoDir = path.join(this.localMediaDir, 'sub-videos');
      
      if (!fs.existsSync(subVideoDir)) {
        return {
          success: false,
          error: 'Sub-video directory not found'
        };
      }

      const files = fs.readdirSync(subVideoDir)
        .filter(f => f.match(/\.(mp4|mov|avi)$/i))
        .map(f => ({
          name: f,
          path: path.join(subVideoDir, f),
          size: fs.statSync(path.join(subVideoDir, f)).size
        }));

      if (files.length === 0) {
        return {
          success: false,
          error: 'No sub-videos available'
        };
      }

      const randomFile = files[Math.floor(Math.random() * files.length)];
      return {
        success: true,
        file: randomFile,
        driveId: FOLDERS.sub_videos
      };
    } catch (error) {
      console.error('Get random sub-video failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Move main video from source to Queue folder
   */
  async moveToQueueFolder(mainVideoPath) {
    try {
      const fileName = path.basename(mainVideoPath);
      const queueDir = path.join(this.localMediaDir, 'queue');
      const destPath = path.join(queueDir, fileName);

      if (fs.existsSync(mainVideoPath)) {
        fs.copyFileSync(mainVideoPath, destPath);
        console.log(`✓ Video moved to queue: ${destPath}`);
        return {
          success: true,
          filePath: destPath,
          fileName: fileName
        };
      } else {
        throw new Error(`File not found: ${mainVideoPath}`);
      }
    } catch (error) {
      console.error('Move to queue failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Move completed mashup to Completed folder
   */
  async moveToCompletedFolder(mashupPath, mashupName) {
    try {
      const completedDir = path.join(this.localMediaDir, 'completed');
      const destPath = path.join(completedDir, mashupName);

      if (fs.existsSync(mashupPath)) {
        fs.copyFileSync(mashupPath, destPath);
        console.log(`✓ Mashup moved to completed: ${destPath}`);
        return {
          success: true,
          filePath: destPath,
          fileName: mashupName
        };
      } else {
        throw new Error(`File not found: ${mashupPath}`);
      }
    } catch (error) {
      console.error('Move to completed failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all videos in queue folder
   */
  listQueueVideos() {
    try {
      const queueDir = path.join(this.localMediaDir, 'queue');
      
      if (!fs.existsSync(queueDir)) {
        return [];
      }

      return fs.readdirSync(queueDir)
        .filter(f => f.match(/\.(mp4|mov|avi)$/i))
        .map(f => ({
          name: f,
          path: path.join(queueDir, f),
          size: fs.statSync(path.join(queueDir, f)).size,
          createdAt: fs.statSync(path.join(queueDir, f)).birthtime
        }));
    } catch (error) {
      console.error('List queue videos failed:', error);
      return [];
    }
  }

  /**
   * Get folder directory for Google Drive folder
   */
  getFolderDirectory(folderType) {
    const folderMap = {
      main_videos: 'main-videos',
      sub_videos: 'sub-videos',
      queue: 'queue',
      completed: 'completed'
    };

    return path.join(this.localMediaDir, folderMap[folderType] || folderType);
  }
}

export default new GoogleDriveIntegration();
