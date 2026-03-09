/**
 * Video Mashup Service
 *
 * High-level FFmpeg helper used by production flows.
 * This layer keeps the historical API surface but now delegates to the
 * template-driven video factory generator.
 */

import fs from 'fs';
import { execFileSync } from 'child_process';
import videoMashupGenerator from './videoMashupGenerator.js';

class VideoMashupService {
  constructor() {
    this.ffmpegPath = this._findFFmpegPath();
    this.ffprobePath = this._findFFprobePath();
  }

  _findFFmpegPath() {
    const ffmpegPath = 'C:\\Users\\Dell\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe';

    try {
      if (fs.existsSync(ffmpegPath)) {
        return ffmpegPath;
      }
    } catch {
      // Continue to PATH fallback.
    }

    return 'ffmpeg';
  }

  _findFFprobePath() {
    const ffprobePath = 'C:\\Users\\Dell\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffprobe.exe';

    try {
      if (fs.existsSync(ffprobePath)) {
        return ffprobePath;
      }
    } catch {
      // Continue to PATH fallback.
    }

    return 'ffprobe';
  }

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
        templateName,
        templateOverrides,
        backgroundAudioPath,
        audioPath,
        backgroundAudioVolume,
        audioVolume,
        memeOverlayPath,
        memeOverlayWindow,
        subtitleMode,
        subtitleFilePath,
        subtitleText,
        videoContext,
        affiliateKeywords,
        highlightDetection,
        clipExtraction,
        additionalVideoPaths,
        dryRun = false,
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
        templateName: templateName || (config.layout === 'pip' ? 'highlight' : undefined),
        templateOverrides,
        outputPath,
        backgroundAudioPath: backgroundAudioPath || audioPath || '',
        backgroundAudioVolume: backgroundAudioVolume ?? audioVolume ?? 0.18,
        memeOverlayPath,
        memeOverlayWindow,
        subtitleMode: subtitleMode || 'none',
        subtitleFilePath,
        subtitleText,
        videoContext,
        affiliateKeywords,
        highlightDetection,
        clipExtraction,
        additionalVideoPaths,
        dryRun,
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        outputPath: outputPath || result.outputPath,
        duration: videoDuration,
        layout: result.metadata?.layout?.type || 'factory',
        fileSize: result.metadata?.output?.size || (fs.existsSync(outputPath || result.outputPath) ? fs.statSync(outputPath || result.outputPath).size : 0),
        message: dryRun ? 'Videos planned successfully' : 'Videos merged successfully',
        metadata: result.metadata || {},
        dryRun,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async generateMashupVideo(config) {
    return this.mergeVideos({
      mainVideoPath: config.video1Path || config.mainVideoPath,
      templateVideoPath: config.video2Path || config.templateVideoPath,
      outputPath: config.outputPath,
      videoDuration: config.duration || config.videoDuration || 30,
      aspectRatio: config.aspectRatio || '9:16',
      quality: config.quality || 'high',
      audioFromMain: config.audioSource !== 'sub',
      templateName: config.templateName,
      templateOverrides: config.templateOverrides,
      backgroundAudioPath: config.backgroundAudioPath || config.audioPath,
      backgroundAudioVolume: config.backgroundAudioVolume ?? config.audioVolume,
      memeOverlayPath: config.memeOverlayPath,
      memeOverlayWindow: config.memeOverlayWindow,
      subtitleMode: config.subtitleMode,
      subtitleFilePath: config.subtitleFilePath,
      subtitleText: config.subtitleText,
      videoContext: config.videoContext,
      affiliateKeywords: config.affiliateKeywords,
      highlightDetection: config.highlightDetection,
      clipExtraction: config.clipExtraction,
      additionalVideoPaths: config.additionalVideoPaths,
      dryRun: config.dryRun,
      layout: config.layout,
    });
  }

  async generateBatchMashups(config) {
    return videoMashupGenerator.generateBatchMashups(config);
  }

  async generateGridMashup(videoPaths, options = {}) {
    return videoMashupGenerator.generateGridMashup(videoPaths, options);
  }

  listFactoryTemplates() {
    return videoMashupGenerator.listTemplates();
  }

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
        '-stream_loop', '-1',
        '-i', audioPath,
        '-filter_complex', `[0:a][1:a]amix=inputs=2:duration=first:normalize=0,volume=${volume}[a]`,
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


