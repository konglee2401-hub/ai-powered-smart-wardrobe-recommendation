/**
 * videoMashupGenerator.js
 * Generate mashup videos using FFmpeg
 * Layout: 2/3 main video + 1/3 sub video
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

class VideoMashupGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../media/mashups');
    this.tempDir = path.join(__dirname, '../media/temp');
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate mashup: 2/3 main + 1/3 sub on right side
   * YouTube Shorts: 9:16 aspect ratio (1080x1920)
   */
  async generateMashup(mainVideoPath, subVideoPath, options = {}) {
    const {
      duration = 30,
      quality = 'high',
      aspectRatio = '9:16',
      audioSource = 'main' // main | sub | none
    } = options;

    try {
      console.log('🎬 Starting mashup generation...');

      // Generate unique ID
      const mashupId = `mashup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const outputPath = path.join(this.outputDir, `${mashupId}.mp4`);
      const thumbPath = path.join(this.outputDir, `${mashupId}-thumb.png`);

      // Get video dimensions
      const mainDimensions = await this.getVideoDimensions(mainVideoPath);
      const subDimensions = await this.getVideoDimensions(subVideoPath);

      console.log(`Main video: ${mainDimensions.width}x${mainDimensions.height}`);
      console.log(`Sub video: ${subDimensions.width}x${subDimensions.height}`);

      // YouTube Shorts: 1080x1920 (9:16)
      const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
      const targetHeight = quality === '4k' ? 1920 : quality === 'high' ? 1440 : 720;
      const targetWidth = Math.round((targetHeight * ratioW) / ratioH);

      // Scale dimensions
      const mainW = Math.round((targetWidth * 2) / 3);
      const mainH = targetHeight;
      const subW = Math.round((targetWidth * 1) / 3);
      const subH = targetHeight;

      console.log(`Target: ${targetWidth}x${targetHeight}`);
      console.log(`Main scaled: ${mainW}x${mainH}`);
      console.log(`Sub scaled: ${subW}x${subH}`);

      const audioMap = audioSource === 'none'
        ? '-an'
        : audioSource === 'sub'
          ? '-map 1:a?'
          : '-map 0:a?';

      // Build FFmpeg command for 2/3 + 1/3 layout
      const ffmpegCmd = `
ffmpeg -i "${mainVideoPath}" \
  -i "${subVideoPath}" \
  -filter_complex "[0:v]scale=${mainW}:${mainH}:force_original_aspect_ratio=decrease,pad=${mainW}:${mainH}:(ow-iw)/2:(oh-ih)/2[main]; \
  [1:v]scale=${subW}:${subH}:force_original_aspect_ratio=decrease,pad=${subW}:${subH}:(ow-iw)/2:(oh-ih)/2[sub]; \
  [main][sub]hstack=inputs=2:gap=0[out]; \
  [out]scale=${targetWidth}:${targetHeight}[final]" \
  -map "[final]" \
  ${audioMap} \
  -c:v libx264 -preset ${quality === 'high' ? 'medium' : 'fast'} \
  -crf ${quality === 'high' ? '18' : '23'} \
  ${audioSource === 'none' ? '' : '-c:a aac -b:a 128k'} \
  -t ${duration} \
  -y "${outputPath}"
      `.trim().replace(/\n\s+/g, ' ');

      console.log('Executing FFmpeg command...');
      const { stdout, stderr } = await execAsync(ffmpegCmd, { maxBuffer: 10 * 1024 * 1024 });

      if (!fs.existsSync(outputPath)) {
        throw new Error('Output video was not created');
      }

      console.log('✓ Video merged successfully');

      // Generate thumbnail
      await this.generateThumbnail(outputPath, thumbPath);

      // Get output file info
      const stats = fs.statSync(outputPath);
      const outputDimensions = await this.getVideoDimensions(outputPath);

      return {
        success: true,
        mashupId,
        outputPath,
        thumbPath,
        metadata: {
          mainVideo: {
            path: mainVideoPath,
            dimensions: mainDimensions
          },
          subVideo: {
            path: subVideoPath,
            dimensions: subDimensions
          },
          output: {
            path: outputPath,
            dimensions: outputDimensions,
            size: stats.size,
            duration,
            quality,
            aspectRatio,
            audioSource
          },
          layout: {
            main: { width: mainW, height: mainH, position: 'left' },
            sub: { width: subW, height: subH, position: 'right' }
          }
        }
      };
    } catch (error) {
      console.error('❌ Mashup generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get video dimensions using FFprobe
   */
  async getVideoDimensions(videoPath) {
    try {
      const cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`;
      const { stdout } = await execAsync(cmd);
      const [width, height] = stdout.trim().split('x').map(Number);
      return { width, height };
    } catch (error) {
      console.error('Failed to get video dimensions:', error);
      // Return default if ffprobe fails
      return { width: 1080, height: 1920 };
    }
  }

  /**
   * Generate thumbnail at specific time
   */
  async generateThumbnail(videoPath, outputThumbnailPath, timeOffset = '00:00:01') {
    try {
      const cmd = `ffmpeg -i "${videoPath}" -ss ${timeOffset} -vframes 1 -vf "scale=1280:720" -y "${outputThumbnailPath}"`;
      await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      console.log('✓ Thumbnail generated');
      return true;
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      return false;
    }
  }

  /**
   * Get video duration in seconds
   */
  async getVideoDuration(videoPath) {
    try {
      const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:csv=p=0 "${videoPath}"`;
      const { stdout } = await execAsync(cmd);
      return Math.round(parseFloat(stdout.trim()));
    } catch (error) {
      console.error('Failed to get video duration:', error);
      return 30; // Default
    }
  }

  /**
   * Cleanup temporary files
   */
  cleanupTemp() {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true });
        fs.mkdirSync(this.tempDir, { recursive: true });
        console.log('✓ Temp files cleaned');
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

export default new VideoMashupGenerator();
