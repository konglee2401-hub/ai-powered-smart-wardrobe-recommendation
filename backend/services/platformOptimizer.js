/**
 * Multi-Platform Video Optimizer
 * Automatically adapts affiliate videos for different platforms
 * Handles aspect ratios, durations, formats, and platform-specific requirements
 */

import fs from 'fs';
import path from 'path';

class PlatformOptimizer {
  constructor() {
    this.platformConfigs = {
      'instagram-reels': {
        aspectRatio: '9:16',
        duration: { min: 3, max: 90, optimal: 15 },
        videoCodec: 'h264',
        audioCodec: 'aac',
        resolution: { width: 1080, height: 1920 },
        framerate: 30,
        bitrate: '5000k',
        fileFormat: 'mp4',
        captionPlacement: 'bottom-center',
        maxFileSize: '100MB',
        requirements: {
          subtitles: 'recommended',
          watermark: 'none',
          musicCopyright: 'original-or-licensed',
          maxColors: 'unlimited'
        }
      },
      'youtube-shorts': {
        aspectRatio: '9:16',
        duration: { min: 15, max: 60, optimal: 30 },
        videoCodec: 'h264',
        audioCodec: 'aac',
        resolution: { width: 1080, height: 1920 },
        framerate: 24,
        bitrate: '6000k',
        fileFormat: 'mp4',
        captionPlacement: 'center',
        maxFileSize: '256MB',
        requirements: {
          subtitles: 'optional',
          watermark: 'optional',
          musicCopyright: 'licensed-only',
          maxColors: 'unlimited'
        },
        seoTags: true,
        thumbnail: {
          required: true,
          size: '1280x720',
          format: 'jpg'
        }
      },
      'tiktok': {
        aspectRatio: '9:16',
        duration: { min: 3, max: 10, optimal: 9 },
        videoCodec: 'h265',
        audioCodec: 'aac',
        resolution: { width: 1080, height: 1920 },
        framerate: 24,
        bitrate: '4000k',
        fileFormat: 'mp4',
        captionPlacement: 'top-center',
        maxFileSize: '287.6MB',
        requirements: {
          subtitles: 'recommended',
          watermark: 'none',
          musicCopyright: 'tiktok-library-only',
          maxColors: 'vibrant-preferred'
        },
        soundSync: true,
        effects: 'high-engagement'
      },
      'facebook': {
        aspectRatio: '1:1',
        duration: { min: 5, max: 600, optimal: 15 },
        videoCodec: 'h264',
        audioCodec: 'aac',
        resolution: { width: 1080, height: 1080 },
        framerate: 24,
        bitrate: '5000k',
        fileFormat: 'mp4',
        captionPlacement: 'bottom',
        maxFileSize: '4GB',
        requirements: {
          subtitles: 'required',
          watermark: 'allowed',
          musicCopyright: 'original-or-licensed'
        }
      },
      'twitter': {
        aspectRatio: '16:9',
        duration: { min: 1, max: 140, optimal: 30 },
        videoCodec: 'h264',
        audioCodec: 'aac',
        resolution: { width: 1280, height: 720 },
        framerate: 30,
        bitrate: '3000k',
        fileFormat: 'mp4',
        captionPlacement: 'center',
        maxFileSize: '512MB',
        requirements: {
          subtitles: 'recommended',
          watermark: 'none',
          musicCopyright: 'licensed-only'
        }
      }
    };

    this.optimizationDir = path.join(process.cwd(), 'affiliate-production', 'optimized');
    this.ensureOptimizationDir();
  }

  ensureOptimizationDir() {
    if (!fs.existsSync(this.optimizationDir)) {
      fs.mkdirSync(this.optimizationDir, { recursive: true });
    }
  }

  /**
   * Adapt single video for all platforms
   */
  adaptForAllPlatforms(sourceVideoPath, metadata = {}) {
    try {
      const adaptations = {};
      const results = [];

      Object.keys(this.platformConfigs).forEach(platform => {
        const adaptation = this.adaptForPlatform(sourceVideoPath, platform, metadata);
        
        if (adaptation.success) {
          adaptations[platform] = adaptation;
          results.push({
            platform,
            status: 'success',
            optimizedPath: adaptation.optimizedPath,
            modifications: adaptation.modifications
          });
        }
      });

      return {
        success: Object.keys(adaptations).length > 0,
        sourceVideo: sourceVideoPath,
        adaptations: adaptations,
        summary: {
          totalPlatforms: Object.keys(this.platformConfigs).length,
          successfulAdaptations: results.length,
          failedAdaptations: Object.keys(this.platformConfigs).length - results.length
        },
        results
      };
    } catch (error) {
      console.error(`❌ Failed to adapt video: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Adapt video for specific platform
   */
  adaptForPlatform(sourceVideoPath, platform, metadata = {}) {
    try {
      const config = this.platformConfigs[platform];

      if (!config) {
        throw new Error(`Unknown platform: ${platform}`);
      }

      const modifications = [];
      const optimizedPath = this._getOptimizedPath(sourceVideoPath, platform);

      // Track all modifications needed
      const requiredModifications = [];

      // Aspect ratio adjustment
      requiredModifications.push({
        type: 'aspect-ratio',
        from: '16:9 (assumed)',
        to: config.aspectRatio,
        impact: 'Content will be cropped or padded'
      });

      // Duration optimization
      requiredModifications.push({
        type: 'duration',
        optimal: `${config.duration.optimal}s`,
        range: `${config.duration.min}-${config.duration.max}s`,
        action: 'Trim or extend video'
      });

      // Resolution scaling
      requiredModifications.push({
        type: 'resolution',
        to: `${config.resolution.width}x${config.resolution.height}`,
        framerate: `${config.framerate}fps`
      });

      // Subtitle positioning
      if (metadata.subtitles) {
        requiredModifications.push({
          type: 'subtitle-positioning',
          placement: config.captionPlacement,
          style: 'platform-optimized'
        });
      }

      // Platform-specific requirements
      const platformSpecific = this._getPlatformSpecificMods(platform, metadata);
      requiredModifications.push(...platformSpecific);

      return {
        success: true,
        platform,
        sourceVideo: sourceVideoPath,
        optimizedPath,
        config: {
          aspectRatio: config.aspectRatio,
          duration: config.duration.optimal,
          resolution: `${config.resolution.width}x${config.resolution.height}`,
          bitrate: config.bitrate,
          framerate: config.framerate,
          fileFormat: config.fileFormat
        },
        modifications: requiredModifications,
        estimatedProcessingTime: this._estimateProcessingTime(platform),
        fileSize: {
          estimated: this._estimateFileSize(config),
          maxAllowed: config.maxFileSize
        }
      };
    } catch (error) {
      console.error(`❌ Adaptation for ${platform} failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get platform metadata requirements
   */
  getPlatformMetadataRequirements(platform) {
    try {
      const baseMetadata = {
        title: { minLength: 3, maxLength: 100, required: true },
        description: { minLength: 0, maxLength: 5000, required: false },
        hashtags: { maxCount: 30, recommended: true },
        keywords: { maxCount: 10, recommended: true }
      };

      const platformSpecific = {
        'instagram-reels': {
          ...baseMetadata,
          hashtags: { maxCount: 30, recommended: true },
          alt_text: { required: false },
          location: { recommended: true }
        },
        'youtube-shorts': {
          ...baseMetadata,
          hashtags: { maxCount: 10, recommended: true },
          tags: { maxCount: 50, required: false },
          category: { required: true, options: [
            'Nonprofit & Activism',
            'Autos & Vehicles',
            'Comedy',
            'Beauty & Fashion',
            'Education',
            'Entertainment',
            'Food & Drink',
            'Gaming',
            'Music',
            'Pets & Animals',
            'Sports',
            'Travel & Events'
          ]},
          made_for_kids: { required: true }
        },
        'tiktok': {
          ...baseMetadata,
          hashtags: { maxCount: 50, recommended: true },
          sound: { required: false, licensing: 'tiktok-library-only' },
          effects: { recommended: true },
          challenges: { optional: true }
        },
        'facebook': {
          ...baseMetadata,
          thumbnail: { required: false, recommended: true },
          scheduling: { recommended: true },
          targeting: { optional: true }
        }
      };

      return platform in platformSpecific 
        ? { ...platformSpecific[platform], platform }
        : baseMetadata;
    } catch (error) {
      console.error(`❌ Failed to get metadata requirements: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Batch optimize multiple videos
   */
  batchOptimizeForPlatforms(videoList, platforms = ['instagram-reels', 'youtube-shorts', 'tiktok']) {
    try {
      const batchResults = [];
      const operationSummary = {
        totalVideos: videoList.length,
        totalPlatforms: platforms.length,
        totalAdaptations: 0,
        successfulAdaptations: 0,
        failedAdaptations: 0,
        estimatedTotalSize: '0GB',
        estimatedProcessingTime: '0 hours'
      };

      videoList.forEach(video => {
        const adaptations = this.adaptForAllPlatforms(video.path, video.metadata);
        
        if (adaptations.success) {
          adaptations.results.forEach(result => {
            operationSummary.totalAdaptations++;
            if (result.status === 'success') {
              operationSummary.successfulAdaptations++;
            } else {
              operationSummary.failedAdaptations++;
            }
          });
        }

        batchResults.push({
          videoId: video.id,
          fileName: path.basename(video.path),
          result: adaptations
        });
      });

      return {
        success: true,
        operationSummary,
        batchResults,
        nextSteps: [
          'Review optimizations',
          'Upload to each platform',
          'Monitor analytics',
          'A/B test variations'
        ]
      };
    } catch (error) {
      console.error(`❌ Batch optimization failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get upload checklist for specific platform
   */
  getUploadChecklist(platform) {
    try {
      const config = this.platformConfigs[platform];

      if (!config) {
        throw new Error(`Unknown platform: ${platform}`);
      }

      return {
        platform,
        preUploadChecklist: [
          {
            task: 'Video Format',
            value: config.fileFormat.toUpperCase(),
            status: 'pending'
          },
          {
            task: 'Aspect Ratio',
            value: config.aspectRatio,
            status: 'pending'
          },
          {
            task: 'Duration',
            value: `${config.duration.min}-${config.duration.max}s (optimal: ${config.duration.optimal}s)`,
            status: 'pending'
          },
          {
            task: 'Resolution',
            value: `${config.resolution.width}x${config.resolution.height}`,
            status: 'pending'
          },
          {
            task: 'Framerate',
            value: `${config.framerate}fps`,
            status: 'pending'
          },
          {
            task: 'File Size',
            value: `Max: ${config.maxFileSize}`,
            status: 'pending'
          },
          {
            task: 'Subtitles',
            value: config.requirements.subtitles,
            status: 'pending'
          },
          {
            task: 'Music Copyright',
            value: config.requirements.musicCopyright,
            status: 'pending'
          }
        ],
        contentGuidelinesChecklist: [
          {
            guideline: 'Affiliate links clearly disclosed',
            status: 'pending'
          },
          {
            guideline: 'No misleading claims',
            status: 'pending'
          },
          {
            guideline: 'Strong opening hook (first 3 seconds)',
            status: 'pending'
          },
          {
            guideline: 'Clear call-to-action',
            status: 'pending'
          },
          {
            guideline: 'Mobile-friendly format',
            status: 'pending'
          },
          {
            guideline: 'Proper color balance',
            status: 'pending'
          },
          {
            guideline: 'Audio levels normalized',
            status: 'pending'
          }
        ]
      };
    } catch (error) {
      console.error(`❌ Failed to get checklist: ${error.message}`);
      return { error: error.message };
    }
  }

  // ==================== PRIVATE METHODS ====================

  _getOptimizedPath(sourceVideoPath, platform) {
    const dir = this.optimizationDir;
    const basename = path.basename(sourceVideoPath, path.extname(sourceVideoPath));
    return path.join(dir, `${basename}-${platform}.mp4`);
  }

  _getPlatformSpecificMods(platform, metadata) {
    const mods = [];

    if (platform === 'tiktok') {
      mods.push({
        type: 'sound-sync',
        requirement: 'Video and audio perfectly synced',
        recommendedMusic: 'TikTok trending sounds'
      });

      mods.push({
        type: 'color-grading',
        requirement: 'Vibrant, saturated colors preferred',
        adjustment: '120% saturation'
      });
    }

    if (platform === 'youtube-shorts') {
      mods.push({
        type: 'thumbnail-generation',
        requirement: 'Custom 1280x720 thumbnail',
        impact: 'Critical for click-through rate'
      });
    }

    if (platform === 'facebook') {
      mods.push({
        type: 'square-format',
        adjustment: 'Convert to 1:1 aspect ratio',
        padding: 'Add letterbox/pillarbox if needed'
      });
    }

    return mods;
  }

  _estimateProcessingTime(platform) {
    const times = {
      'instagram-reels': '2-3 minutes',
      'youtube-shorts': '3-5 minutes',
      'tiktok': '2-3 minutes',
      'facebook': '2-3 minutes',
      'twitter': '1-2 minutes'
    };

    return times[platform] || '2-3 minutes';
  }

  _estimateFileSize(config) {
    // Based on bitrate and duration
    const baseBitrate = parseInt(config.bitrate) / 1000; // Convert to Mbps
    const avgDuration = Math.floor((config.duration.min + config.duration.max) / 2);
    const sizeMB = (baseBitrate * avgDuration) / 8;
    
    return sizeMB < 100 ? `${sizeMB.toFixed(1)}MB` : `${(sizeMB / 1024).toFixed(1)}GB`;
  }
}

export default PlatformOptimizer;
