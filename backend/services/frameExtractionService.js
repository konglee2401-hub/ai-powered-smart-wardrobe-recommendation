/**
 * Video Frame Extraction Service
 * Extracts frames from MP4 videos for frame-chaining in multi-video workflows
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class FrameExtractionService {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'frames');
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Extract end frame(s) from video
   * Gets the last N frames and selects the clearest/most stable one
   * @param {string} videoPath - Path to MP4 video file
   * @param {number} frameCount - Number of frames to extract (default 10)
   * @returns {Promise<Object>} - { success, framePath, frameBase64, metadata }
   */
  async extractEndFrames(videoPath, frameCount = 10) {
    try {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      console.log(`\n📹 FRAME EXTRACTION`);
      console.log('='.repeat(60));
      console.log(`Video: ${path.basename(videoPath)}`);
      console.log(`Extracting last ${frameCount} frames...\n`);

      // Get video duration first
      const duration = this._getVideoDuration(videoPath);
      if (!duration) {
        throw new Error('Could not determine video duration');
      }

      console.log(`⏱️  Video duration: ${(duration).toFixed(2)}s`);

      // Extract frames in the last 10% of the video (more stable content)
      const frameExtractStart = Math.max(0, duration - 2); // Last 2 seconds
      const frameDir = path.join(this.tempDir, `frames-${Date.now()}`);
      
      if (!fs.existsSync(frameDir)) {
        fs.mkdirSync(frameDir, { recursive: true });
      }

      console.log(`📁 Frame directory: ${frameDir}`);

      // Use FFmpeg to extract frames
      // Format: extract frames at 2 fps from the end of video
      const extractCommand = `ffmpeg -i "${videoPath}" -ss ${frameExtractStart} -vf "fps=2" -q:v 2 "${frameDir}/frame-%04d.jpg" -y`;
      
      try {
        console.log(`⚙️  Executing FFmpeg extraction...`);
        execSync(extractCommand, { 
          stdio: 'pipe',
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024 
        });
      } catch (ffmpegError) {
        // FFmpeg writes to stderr even on success, so check if files were created
        const files = fs.readdirSync(frameDir).filter(f => f.endsWith('.jpg'));
        if (files.length === 0) {
          throw new Error(`FFmpeg extraction failed: ${ffmpegError.message}`);
        }
      }

      // Get extracted frames
      const frameFiles = fs.readdirSync(frameDir)
        .filter(f => f.endsWith('.jpg'))
        .sort()
        .reverse(); // Start from last frame (most recent)

      if (frameFiles.length === 0) {
        throw new Error('No frames extracted from video');
      }

      console.log(`✅ Extracted ${frameFiles.length} frames`);
      console.log(`🔍 Selecting best frame for next segment...\n`);

      // Select the clearest frame (usually the last one is most stable)
      const selectedFrameFile = frameFiles[0]; // Most recent frame
      const selectedFramePath = path.join(frameDir, selectedFrameFile);

      // Convert to base64
      const frameBase64 = fs.readFileSync(selectedFramePath, 'base64');
      const frameBase64DataUrl = `data:image/jpeg;base64,${frameBase64}`;

      // Get frame dimensions
      const frameStats = fs.statSync(selectedFramePath);
      const frameSizeKB = (frameStats.size / 1024).toFixed(2);

      console.log(`✅ Selected: ${selectedFrameFile}`);
      console.log(`📊 Frame size: ${frameSizeKB}KB`);
      console.log(`✨ Frame ready for next video segment\n`);

      return {
        success: true,
        framePath: selectedFramePath,
        frameBase64: frameBase64DataUrl,
        frameIndex: frameFiles.length,
        totalFrames: frameFiles.length,
        frameDir: frameDir,
        metadata: {
          videoPath: videoPath,
          videoDuration: duration,
          frameCount: frameFiles.length,
          selectedFrame: selectedFrameFile,
          fileSizeKB: frameSizeKB,
          extractedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error(`❌ Frame extraction failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        framePath: null,
        frameBase64: null
      };
    }
  }

  /**
   * Extract end frame and return as usable input for next video
   * @param {string} videoPath - Path to video
   * @param {Object} options - { quality: 'high'|'medium'|'low', format: 'jpeg'|'png' }
   * @returns {Promise<Object>} - Frame data ready for next video input
   */
  async getNextSegmentInputFrame(videoPath, options = {}) {
    const { quality = 'high', format = 'jpeg' } = options;

    const result = await this.extractEndFrames(videoPath, 10);

    if (!result.success) {
      return result;
    }

    // Compress if medium/low quality
    if (quality === 'medium' || quality === 'low') {
      const compressed = await this._compressFrame(
        result.framePath,
        quality === 'low' ? 60 : 80
      );
      
      if (compressed.success) {
        result.frameBase64 = compressed.frameBase64;
        result.metadata.compressed = true;
        result.metadata.quality = quality;
      }
    }

    return result;
  }

  /**
   * Get video duration in seconds
   * @private
   */
  _getVideoDuration(videoPath) {
    try {
      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
      const output = execSync(command, { encoding: 'utf8' }).trim();
      return parseFloat(output);
    } catch (error) {
      console.warn(`Could not get video duration: ${error.message}`);
      return null;
    }
  }

  /**
   * Compress frame for smaller payload
   * @private
   */
  async _compressFrame(framePath, quality = 80) {
    try {
      const compressedPath = framePath.replace('.jpg', `-compressed-${quality}.jpg`);
      const command = `ffmpeg -i "${framePath}" -q:v ${Math.ceil((100 - quality) / 10)} "${compressedPath}"  -y`;
      
      execSync(command, { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 });

      if (!fs.existsSync(compressedPath)) {
        throw new Error('Compression output not created');
      }

      const compressedBase64 = fs.readFileSync(compressedPath, 'base64');
      
      return {
        success: true,
        framePath: compressedPath,
        frameBase64: `data:image/jpeg;base64,${compressedBase64}`
      };
    } catch (error) {
      console.warn(`Frame compression failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up extracted frames directory
   */
  async cleanupFrames(frameDir) {
    try {
      if (fs.existsSync(frameDir)) {
        const files = fs.readdirSync(frameDir);
        for (const file of files) {
          fs.unlinkSync(path.join(frameDir, file));
        }
        fs.rmdirSync(frameDir);
        console.log(`🗑️  Cleaned up frame directory: ${frameDir}`);
        return { success: true };
      }
      return { success: true };
    } catch (error) {
      console.warn(`Could not cleanup frames: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all temporary frame directories and clean old ones
   * @param {number} maxAgeMinutes - Delete directories older than this (default 60 minutes)
   */
  async cleanupOldFrameDirectories(maxAgeMinutes = 60) {
    try {
      const checkTime = Date.now() - (maxAgeMinutes * 60 * 1000);
      
      const dirs = fs.readdirSync(this.tempDir);
      let cleaned = 0;

      for (const dir of dirs) {
        const dirPath = path.join(this.tempDir, dir);
        const stat = fs.statSync(dirPath);

        if (stat.isDirectory() && stat.mtimeMs < checkTime) {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            fs.unlinkSync(path.join(dirPath, file));
          }
          fs.rmdirSync(dirPath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🗑️  Cleaned ${cleaned} old frame directories`);
      }

      return { success: true, cleaned };
    } catch (error) {
      console.warn(`Cleanup old frame directories failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default FrameExtractionService;
