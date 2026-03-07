/**
 * Video Mashup Service
 *
 * High-level FFmpeg helper used by production flows. The older implementation
 * depended on shell features such as `grep` and `/bin/bash`, which breaks on
 * Windows. This version keeps the public service surface but delegates the
 * primary 2/3 + 1/3 mashup work to the cross-platform generator service.
 */

import fs from 'fs';
import { execFileSync } from 'child_process';
import videoMashupGenerator from './videoMashupGenerator.js';

class VideoMashupService {
  constructor() {
    this.ffmpegPath = 'ffmpeg';
    this.ffprobePath = 'ffprobe';
  }

  /**
   * Reads video duration using ffprobe so duration checks work across Windows
   * and Linux without relying on shell pipes.
   */
  getVideoDuration(videoPath) {
    try {
      const output = execFileSync(this.ffprobePath, [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ], { encoding: 'utf8' }).trim();

      return Math.round(Number.parseFloat(output) || 0);
    } catch (error) {
      console.error('Error getting video duration:', error);
      return 0;
    }
  }

  /**
   * Legacy merge API retained for callers that still pass explicit main/template
   * video paths. The output uses the standard mashup generator so the layout
   * stays consistent with queue scanner jobs.
   */
  async mergeVideos(config) {
    try {
      const {
        mainVideoPath,
        templateVideoPath,
        outputPath,
        videoDuration = 30,
        aspectRatio = '9:16',
        quality = 'high',
        audioFromMain = true,
      } = config;

      if (!fs.existsSync(mainVideoPath)) {
        return { success: false, error: `Main video not found: ${mainVideoPath}` };
      }
      if (!fs.existsSync(templateVideoPath)) {
        return { success: false, error: `Template video not found: ${templateVideoPath}` };
      }

      const result = await videoMashupGenerator.generateMashup(mainVideoPath, templateVideoPath, {
        duration: videoDuration,
        quality,
        aspectRatio,
        audioSource: audioFromMain ? 'main' : 'sub',
      });

      if (!result.success) {
        return result;
      }

      if (outputPath && outputPath !== result.outputPath) {
        fs.copyFileSync(result.outputPath, outputPath);
      }

      return {
        success: true,
        outputPath: outputPath || result.outputPath,
        duration: videoDuration,
        layout: '2-3-1-3',
        fileSize: fs.statSync(outputPath || result.outputPath).size,
        message: 'Videos merged successfully',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Newer orchestrators call `generateMashupVideo`; keep it as a thin wrapper
   * around `mergeVideos` so older and newer code paths share the same encoder.
   */
  async generateMashupVideo(config) {
    return this.mergeVideos({
      mainVideoPath: config.video1Path || config.mainVideoPath,
      templateVideoPath: config.video2Path || config.templateVideoPath,
      outputPath: config.outputPath,
      videoDuration: config.duration || 30,
      aspectRatio: config.aspectRatio || '9:16',
      quality: config.quality || 'high',
      audioFromMain: config.audioSource !== 'sub',
    });
  }

  /**
   * Adds a background audio track to an existing rendered video.
   */
  addAudioTrack(config) {
    try {
      const {
        videoPath,
        audioPath,
        outputPath,
        volume = 1,
      } = config;

      if (!fs.existsSync(videoPath)) {
        return { success: false, error: `Video not found: ${videoPath}` };
      }
      if (!fs.existsSync(audioPath)) {
        return { success: false, error: `Audio not found: ${audioPath}` };
      }

      execFileSync(this.ffmpegPath, [
        '-i', videoPath,
        '-i', audioPath,
        '-filter_complex', `[0:a][1:a]amix=inputs=2:duration=first,volume=${volume}[a]`,
        '-map', '0:v:0',
        '-map', '[a]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-y',
        outputPath,
      ], { stdio: 'inherit' });

      return {
        success: true,
        outputPath,
        duration: this.getVideoDuration(videoPath),
        audioPath,
        volume,
        message: 'Audio added successfully',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Burns an external subtitle file into a rendered video.
   */
  addCaptions(config) {
    try {
      const {
        videoPath,
        outputPath,
        subtitleFilePath,
      } = config;

      if (!fs.existsSync(videoPath)) {
        return { success: false, error: `Video not found: ${videoPath}` };
      }
      if (!subtitleFilePath || !fs.existsSync(subtitleFilePath)) {
        return { success: false, error: 'subtitleFilePath is required and must exist' };
      }

      execFileSync(this.ffmpegPath, [
        '-i', videoPath,
        '-vf', `subtitles=${subtitleFilePath.replace(/\\/g, '/')}`,
        '-c:v', 'libx264',
        '-crf', '23',
        '-c:a', 'copy',
        '-y',
        outputPath,
      ], { stdio: 'inherit' });

      return {
        success: true,
        outputPath,
        message: 'Captions added successfully',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Applies a simple transition effect to an already-rendered clip.
   */
  applyTransition(config) {
    try {
      const {
        videoPath,
        outputPath,
        transitionType = 'fade',
      } = config;

      if (!fs.existsSync(videoPath)) {
        return { success: false, error: `Video not found: ${videoPath}` };
      }

      const filter = transitionType === 'blur'
        ? 'boxblur=8'
        : transitionType === 'zoom'
          ? 'scale=iw*1.05:ih*1.05,crop=iw/1.05:ih/1.05'
          : 'fade=t=in:st=0:d=0.4,fade=t=out:st=0.4:d=0.4';

      execFileSync(this.ffmpegPath, [
        '-i', videoPath,
        '-vf', filter,
        '-c:v', 'libx264',
        '-crf', '23',
        '-c:a', 'copy',
        '-y',
        outputPath,
      ], { stdio: 'inherit' });

      return {
        success: true,
        outputPath,
        transitionType,
        message: 'Transition applied successfully',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new VideoMashupService();
