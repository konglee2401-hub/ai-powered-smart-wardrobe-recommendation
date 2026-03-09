/**
 * videoMashupGenerator.js
 *
 * Video factory engine for mashup-style production.
 * Keeps the legacy generateMashup(main, sub, options) API intact while adding:
 * - template-driven layouts
 * - clip extraction helpers
 * - highlight scoring from audio packet spikes
 * - subtitle preparation
 * - meme/music overlays
 * - TikTok/Shorts vertical rendering
 * - batch rendering with bounded concurrency
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AutoSubtitleService from './autoSubtitleService.js';
import { VIDEO_FACTORY_BASE_TEMPLATES, VIDEO_FACTORY_TEMPLATE_SEEDS, VIDEO_FACTORY_TEMPLATES } from './videoFactoryTemplateCatalog.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUALITY_PRESETS = {
  low: {
    crf: 24,
    preset: 'veryfast',
    resolutions: {
      '9:16': { width: 540, height: 960 },
      '16:9': { width: 960, height: 540 },
      '1:1': { width: 540, height: 540 },
    },
  },
  medium: {
    crf: 21,
    preset: 'fast',
    resolutions: {
      '9:16': { width: 720, height: 1280 },
      '16:9': { width: 1280, height: 720 },
      '1:1': { width: 720, height: 720 },
    },
  },
  high: {
    crf: 18,
    preset: 'medium',
    resolutions: {
      '9:16': { width: 1080, height: 1920 },
      '16:9': { width: 1920, height: 1080 },
      '1:1': { width: 1080, height: 1080 },
    },
  },
  '4k': {
    crf: 17,
    preset: 'slow',
    resolutions: {
      '9:16': { width: 2160, height: 3840 },
      '16:9': { width: 3840, height: 2160 },
      '1:1': { width: 2160, height: 2160 },
    },
  },
};

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);
const DEFAULT_TEMPLATE_NAME = 'reaction';
const FACTORY_TEMPLATE_MAP = Object.freeze({
  ...VIDEO_FACTORY_BASE_TEMPLATES,
  ...VIDEO_FACTORY_TEMPLATE_SEEDS,
});

function cloneTemplate(value) {
  return JSON.parse(JSON.stringify(value));
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}

function sanitizeFileToken(value = '') {
  return String(value)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function quoteFilterValue(value) {
  return String(value)
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}

class VideoMashupGenerator {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.outputDir = path.join(this.projectRoot, 'media', 'mashups');
    this.tempDir = path.join(this.projectRoot, 'media', 'temp');
    this.factoryCacheDir = path.join(this.projectRoot, 'media', 'video-factory-cache');
    this.ffmpegPath = this._findFFmpegPath();
    this.ffprobePath = this._findFFprobePath();
    this.subtitleService = new AutoSubtitleService();
    this.ensureDirectories();
  }

  _findFFmpegPath() {
    const ffmpegPath = 'C:\\Users\\Dell\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe';

    try {
      if (fs.existsSync(ffmpegPath)) {
        return ffmpegPath;
      }
    } catch {
      // Fall back to PATH resolution.
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
      // Fall back to PATH resolution.
    }

    return 'ffprobe';
  }

  ensureDirectories() {
    [
      this.outputDir,
      this.tempDir,
      this.factoryCacheDir,
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  listTemplates() {
    return VIDEO_FACTORY_TEMPLATES.map((template) => ({ ...template }));
  }

  resolveQualityPreset(quality = 'high', aspectRatio = '9:16') {
    const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.high;
    const resolution = preset.resolutions[aspectRatio] || preset.resolutions['9:16'];
    return {
      quality: QUALITY_PRESETS[quality] ? quality : 'high',
      crf: preset.crf,
      preset: preset.preset,
      width: resolution.width,
      height: resolution.height,
    };
  }

  async loadTemplate(templateName = DEFAULT_TEMPLATE_NAME, overrides = {}) {
    if (typeof templateName === 'object' && templateName !== null) {
      return {
        name: templateName.name || DEFAULT_TEMPLATE_NAME,
        ...cloneTemplate(templateName),
        ...overrides,
      };
    }

    const safeName = sanitizeFileToken(templateName || DEFAULT_TEMPLATE_NAME) || DEFAULT_TEMPLATE_NAME;
    const template = cloneTemplate(FACTORY_TEMPLATE_MAP[safeName] || FACTORY_TEMPLATE_MAP[DEFAULT_TEMPLATE_NAME]);

    return {
      ...template,
      ...overrides,
      canvas: {
        ...(template.canvas || {}),
        ...(overrides.canvas || {}),
      },
      overlay: {
        ...(template.overlay || {}),
        ...(overrides.overlay || {}),
      },
      meme: {
        ...(template.meme || {}),
        ...(overrides.meme || {}),
      },
      background: {
        ...(template.background || {}),
        ...(overrides.background || {}),
      },
      split: {
        ...(template.split || {}),
        ...(overrides.split || {}),
      },
    };
  }

  async getMediaInfo(videoPath) {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error(`Media file not found: ${videoPath}`);
    }

    const { stdout } = await execFileAsync(this.ffprobePath, [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      videoPath,
    ], {
      maxBuffer: 10 * 1024 * 1024,
    });

    const parsed = JSON.parse(stdout || '{}');
    const streams = parsed.streams || [];
    const format = parsed.format || {};
    const videoStream = streams.find((stream) => stream.codec_type === 'video') || {};
    const audioStream = streams.find((stream) => stream.codec_type === 'audio') || null;

    return {
      path: videoPath,
      width: Number(videoStream.width) || 1080,
      height: Number(videoStream.height) || 1920,
      duration: Number(format.duration || videoStream.duration) || 0,
      hasAudio: Boolean(audioStream),
      audioCodec: audioStream?.codec_name || null,
      videoCodec: videoStream.codec_name || null,
      frameRate: videoStream.avg_frame_rate || null,
      size: Number(format.size) || fs.statSync(videoPath).size,
    };
  }

  async getVideoDimensions(videoPath) {
    const info = await this.getMediaInfo(videoPath);
    return { width: info.width, height: info.height };
  }

  async getVideoDuration(videoPath) {
    const info = await this.getMediaInfo(videoPath);
    return Math.round(info.duration || 0);
  }
  buildHighlightWindows(packetLines = [], options = {}) {
    const {
      windowSeconds = 1,
      thresholdPercentile = 95,
      clipDuration = 6,
      maxHighlights = 3,
    } = options;

    if (!packetLines.length) {
      return [];
    }

    const buckets = new Map();
    packetLines.forEach(({ time, size }) => {
      const bucket = Math.floor(time / windowSeconds) * windowSeconds;
      buckets.set(bucket, (buckets.get(bucket) || 0) + size);
    });

    const values = Array.from(buckets.values()).sort((a, b) => a - b);
    const thresholdIndex = Math.max(0, Math.floor((thresholdPercentile / 100) * (values.length - 1)));
    const threshold = values[thresholdIndex] || 0;
    const sortedBuckets = Array.from(buckets.entries())
      .map(([startTime, score]) => ({ startTime, score }))
      .sort((a, b) => b.score - a.score);

    const picked = [];
    for (const candidate of sortedBuckets) {
      if (candidate.score < threshold) {
        continue;
      }

      const overlapsExisting = picked.some((highlight) =>
        Math.abs(highlight.startTime - candidate.startTime) < clipDuration
      );

      if (overlapsExisting) {
        continue;
      }

      picked.push({
        startTime: Math.max(0, candidate.startTime),
        endTime: Math.max(windowSeconds, candidate.startTime + clipDuration),
        score: candidate.score,
      });

      if (picked.length >= maxHighlights) {
        break;
      }
    }

    return picked.sort((a, b) => a.startTime - b.startTime);
  }

  async detectHighlights(videoPath, options = {}) {
    const resolved = {
      windowSeconds: clampNumber(options.windowSeconds, 1, 10, 1),
      thresholdPercentile: clampNumber(options.thresholdPercentile, 50, 99, 95),
      clipDuration: clampNumber(options.clipDuration, 2, 30, 6),
      maxHighlights: clampNumber(options.maxHighlights, 1, 20, 3),
    };

    try {
      const info = await this.getMediaInfo(videoPath);
      if (!info.hasAudio) {
        return {
          success: true,
          method: 'fallback-no-audio',
          sourcePath: videoPath,
          highlights: this.buildEvenlySpacedHighlights(info.duration, resolved.clipDuration, resolved.maxHighlights),
        };
      }

      const { stdout } = await execFileAsync(this.ffprobePath, [
        '-v',
        'error',
        '-select_streams',
        'a:0',
        '-show_entries',
        'packet=pts_time,size',
        '-of',
        'csv=p=0',
        videoPath,
      ], {
        maxBuffer: 20 * 1024 * 1024,
      });

      const packetLines = String(stdout || '')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const [time, size] = line.split(',');
          return {
            time: Number(time),
            size: Number(size),
          };
        })
        .filter((item) => Number.isFinite(item.time) && Number.isFinite(item.size));

      const highlights = this.buildHighlightWindows(packetLines, resolved);
      if (!highlights.length) {
        return {
          success: true,
          method: 'fallback-even-spacing',
          sourcePath: videoPath,
          highlights: this.buildEvenlySpacedHighlights(info.duration, resolved.clipDuration, resolved.maxHighlights),
        };
      }

      return {
        success: true,
        method: 'audio-packet-spike',
        sourcePath: videoPath,
        highlights,
      };
    } catch (error) {
      const duration = await this.getVideoDuration(videoPath).catch(() => 0);
      return {
        success: true,
        method: 'fallback-error',
        sourcePath: videoPath,
        error: error.message,
        highlights: this.buildEvenlySpacedHighlights(duration, resolved.clipDuration, resolved.maxHighlights),
      };
    }
  }

  buildEvenlySpacedHighlights(duration = 0, clipDuration = 6, maxHighlights = 3) {
    const resolvedDuration = Math.max(clipDuration, Number(duration) || clipDuration);
    const count = Math.max(1, maxHighlights);
    const spacing = resolvedDuration / count;

    return Array.from({ length: count }).map((_, index) => {
      const startTime = Math.max(0, Math.min(resolvedDuration - clipDuration, Math.floor(index * spacing)));
      return {
        startTime,
        endTime: startTime + clipDuration,
        score: 0,
      };
    });
  }

  async extractClips(videoPath, options = {}) {
    const segmentDuration = clampNumber(options.segmentDuration, 2, 120, 20);
    const maxClips = clampNumber(options.maxClips, 1, 200, 24);
    const duration = await this.getVideoDuration(videoPath);
    const clipCount = Math.max(1, Math.min(maxClips, Math.ceil(duration / segmentDuration)));
    const clipDir = path.join(
      this.factoryCacheDir,
      `clips-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );

    fs.mkdirSync(clipDir, { recursive: true });

    const clips = [];
    for (let index = 0; index < clipCount; index += 1) {
      const startTime = index * segmentDuration;
      if (startTime >= duration) {
        break;
      }

      const currentDuration = Math.min(segmentDuration, Math.max(1, duration - startTime));
      const clipPath = path.join(clipDir, `clip-${String(index + 1).padStart(3, '0')}.mp4`);

      await execFileAsync(this.ffmpegPath, [
        '-y',
        '-ss',
        String(startTime),
        '-t',
        String(currentDuration),
        '-i',
        videoPath,
        '-c',
        'copy',
        '-avoid_negative_ts',
        'make_zero',
        clipPath,
      ], {
        maxBuffer: 10 * 1024 * 1024,
      });

      clips.push({
        index,
        clipPath,
        startTime,
        endTime: startTime + currentDuration,
        duration: currentDuration,
      });
    }

    return {
      success: true,
      sourcePath: videoPath,
      clipDir,
      clips,
    };
  }

  async prepareSubtitleFile(options = {}, duration = 30) {
    const {
      subtitleFilePath = '',
      subtitleText = '',
      subtitleMode = 'none',
      videoContext = '',
      affiliateKeywords = [],
      subtitleStyle = 'engaging',
      platform = 'youtube-shorts',
      subtitleOutputPath = '',
    } = options;

    if (subtitleFilePath && fs.existsSync(subtitleFilePath)) {
      return {
        success: true,
        subtitleFilePath,
        source: 'provided-file',
      };
    }

    if (subtitleMode === 'none') {
      return {
        success: true,
        subtitleFilePath: '',
        source: 'disabled',
      };
    }

    let subtitles = [];
    if (subtitleText) {
      subtitles = this.buildSubtitlesFromText(subtitleText, duration);
    } else {
      try {
        const generated = await this.subtitleService.generateAffiliateSubtitles(videoContext || 'AI video factory clip', {
          duration,
          affiliateKeywords,
          platform,
          style: subtitleStyle,
        });
        subtitles = generated.subtitles || [];
      } catch {
        subtitles = this.buildSubtitlesFromText(videoContext || 'AI video factory clip', duration);
      }
    }

    if (!subtitles.length) {
      return {
        success: true,
        subtitleFilePath: '',
        source: 'empty',
      };
    }

    const srt = this.subtitleService.convertToSRT(subtitles);
    if (!srt.success) {
      return {
        success: false,
        error: srt.error || 'Failed to build subtitle content',
      };
    }

    const outputPath = subtitleOutputPath || path.join(
      this.tempDir,
      `subs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.srt`
    );
    fs.writeFileSync(outputPath, srt.content, 'utf8');

    return {
      success: true,
      subtitleFilePath: outputPath,
      source: subtitleText ? 'subtitle-text' : 'generated',
      subtitleCount: subtitles.length,
    };
  }

  buildSubtitlesFromText(text, duration = 30) {
    const words = String(text || '')
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!words.length) {
      return [];
    }

    const chunkSize = Math.max(3, Math.min(8, Math.ceil(words.length / Math.max(1, Math.ceil(duration / 3)))));
    const chunks = [];
    for (let index = 0; index < words.length; index += chunkSize) {
      chunks.push(words.slice(index, index + chunkSize).join(' '));
    }

    const segmentDuration = duration / chunks.length;
    return chunks.map((chunk, index) => ({
      index: index + 1,
      startTime: Number((index * segmentDuration).toFixed(2)),
      endTime: Number(((index + 1) * segmentDuration).toFixed(2)),
      text: chunk,
      duration: segmentDuration,
      isAffiliateTerm: /(deal|discount|link|shop|offer|buy|sale)/i.test(chunk),
      isCallout: /(!|now|today|bio|link)/i.test(chunk),
    }));
  }

  resolveOverlayPosition(position = 'bottom-right', canvas = { width: 1080, height: 1920 }, size = { width: 280, height: 280 }, margin = 32) {
    switch (String(position || '').toLowerCase()) {
      case 'top-left':
        return { x: margin, y: margin };
      case 'top-right':
        return { x: canvas.width - size.width - margin, y: margin };
      case 'bottom-left':
        return { x: margin, y: canvas.height - size.height - margin };
      case 'center':
        return { x: Math.round((canvas.width - size.width) / 2), y: Math.round((canvas.height - size.height) / 2) };
      case 'bottom-right':
      default:
        return { x: canvas.width - size.width - margin, y: canvas.height - size.height - margin };
    }
  }
  buildBaseVideoGraph(template, canvas, videoInputCount) {
    const safeMargin = clampNumber(template.canvas?.safeMargin, 0, 200, 32);

    if (template.layout === 'grid') {
      const cellWidth = Math.floor(canvas.width / 2);
      const cellHeight = Math.floor(canvas.height / 2);
      const slots = [0, 1, 2, 3].map((slot) => Math.min(slot, videoInputCount - 1));
      const segments = slots.map((inputIndex, slot) =>
        `[${inputIndex}:v]scale=${cellWidth}:${cellHeight}:force_original_aspect_ratio=decrease,pad=${cellWidth}:${cellHeight}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${slot}]`
      );

      segments.push('[v0][v1]hstack=inputs=2[top]');
      segments.push('[v2][v3]hstack=inputs=2[bottom]');
      segments.push('[top][bottom]vstack=inputs=2[base]');

      return {
        filterParts: segments,
        outputLabel: 'base',
        layout: {
          type: 'grid-2x2',
          cells: [
            { input: slots[0], width: cellWidth, height: cellHeight, position: 'top-left' },
            { input: slots[1], width: cellWidth, height: cellHeight, position: 'top-right' },
            { input: slots[2], width: cellWidth, height: cellHeight, position: 'bottom-left' },
            { input: slots[3], width: cellWidth, height: cellHeight, position: 'bottom-right' },
          ],
        },
      };
    }

    if (template.layout === 'vertical-focus') {
      const reactionWidth = Math.round(canvas.width * clampNumber(template.overlay?.widthRatio, 0.1, 0.5, 0.24));
      const reactionHeight = Math.round(canvas.height * clampNumber(template.overlay?.heightRatio, 0.1, 0.5, 0.24));
      const blurStrength = clampNumber(template.background?.blur, 0, 60, 28);
      const reactionPosition = this.resolveOverlayPosition(
        template.overlay?.position || 'bottom-right',
        canvas,
        { width: reactionWidth, height: reactionHeight },
        safeMargin
      );

      const filterParts = [
        `[0:v]scale=${canvas.width}:${canvas.height}:force_original_aspect_ratio=increase,crop=${canvas.width}:${canvas.height},boxblur=${blurStrength}[bg]`,
        `[0:v]scale=${canvas.width}:${canvas.height}:force_original_aspect_ratio=decrease,pad=${canvas.width}:${canvas.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[fg]`,
        '[bg][fg]overlay=(W-w)/2:(H-h)/2[stage0]',
      ];

      if (videoInputCount > 1 && template.overlay?.enabled !== false) {
        filterParts.push(`[1:v]scale=${reactionWidth}:${reactionHeight}:force_original_aspect_ratio=decrease,setsar=1[sub]`);
        filterParts.push(`[stage0][sub]overlay=${reactionPosition.x}:${reactionPosition.y}[base]`);
      } else {
        filterParts.push('[stage0]copy[base]');
      }

      return {
        filterParts,
        outputLabel: 'base',
        layout: {
          type: 'vertical-focus',
          canvas,
          overlay: template.overlay?.enabled === false ? null : {
            width: reactionWidth,
            height: reactionHeight,
            position: template.overlay?.position || 'bottom-right',
          },
        },
      };
    }

    if (template.layout === 'pip') {
      const overlayWidth = Math.round(canvas.width * clampNumber(template.overlay?.widthRatio, 0.1, 0.5, 0.28));
      const overlayHeight = Math.round(canvas.height * clampNumber(template.overlay?.heightRatio, 0.1, 0.5, 0.28));
      const overlayPosition = this.resolveOverlayPosition(
        template.overlay?.position || 'bottom-right',
        canvas,
        { width: overlayWidth, height: overlayHeight },
        safeMargin
      );

      const filterParts = [
        `[0:v]scale=${canvas.width}:${canvas.height}:force_original_aspect_ratio=decrease,pad=${canvas.width}:${canvas.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[main]`,
      ];

      if (videoInputCount > 1) {
        filterParts.push(`[1:v]scale=${overlayWidth}:${overlayHeight}:force_original_aspect_ratio=decrease,setsar=1[sub]`);
        filterParts.push(`[main][sub]overlay=${overlayPosition.x}:${overlayPosition.y}[base]`);
      } else {
        filterParts.push('[main]copy[base]');
      }

      return {
        filterParts,
        outputLabel: 'base',
        layout: {
          type: 'pip',
          canvas,
          overlay: videoInputCount > 1 ? {
            width: overlayWidth,
            height: overlayHeight,
            position: template.overlay?.position || 'bottom-right',
          } : null,
        },
      };
    }

    const mainRatio = clampNumber(template.split?.mainRatio, 0.4, 0.9, 0.67);
    const mainWidth = Math.round(canvas.width * mainRatio);
    const subWidth = Math.max(1, canvas.width - mainWidth);
    const filterParts = [
      `[0:v]scale=${mainWidth}:${canvas.height}:force_original_aspect_ratio=decrease,pad=${mainWidth}:${canvas.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[main]`,
      `[${Math.min(1, videoInputCount - 1)}:v]scale=${subWidth}:${canvas.height}:force_original_aspect_ratio=decrease,pad=${subWidth}:${canvas.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[sub]`,
      '[main][sub]hstack=inputs=2[base]',
    ];

    return {
      filterParts,
      outputLabel: 'base',
      layout: {
        type: 'split',
        canvas,
        main: { width: mainWidth, height: canvas.height, position: 'left' },
        sub: { width: subWidth, height: canvas.height, position: 'right' },
      },
    };
  }

  buildVideoFilterGraph(job) {
    const { template, canvas, memeOverlayIndex, subtitleFilePath, videoInputs } = job;
    const graph = this.buildBaseVideoGraph(template, canvas, videoInputs.length);
    const filterParts = [...graph.filterParts];
    let currentLabel = graph.outputLabel;

    if (memeOverlayIndex != null) {
      const memeWidth = clampNumber(template.meme?.width, 80, canvas.width, 220);
      const memeHeight = clampNumber(template.meme?.height, 80, canvas.height, 220);
      const memePosition = this.resolveOverlayPosition(
        template.meme?.position || 'top-left',
        canvas,
        { width: memeWidth, height: memeHeight },
        clampNumber(template.canvas?.safeMargin, 0, 200, 32)
      );
      const startTime = clampNumber(template.meme?.startTime, 0, 600, 4);
      const endTime = clampNumber(template.meme?.endTime, startTime + 1, 600, 6);

      filterParts.push(`[${memeOverlayIndex}:v]scale=${memeWidth}:${memeHeight}:force_original_aspect_ratio=decrease,setsar=1[meme]`);
      filterParts.push(`[${currentLabel}][meme]overlay=${memePosition.x}:${memePosition.y}:enable='between(t,${startTime},${endTime})'[with_meme]`);
      currentLabel = 'with_meme';
    }

    if (subtitleFilePath) {
      const escapedPath = quoteFilterValue(subtitleFilePath);
      const marginBottom = clampNumber(template.canvas?.subtitleMarginBottom, 40, 400, 180);
      filterParts.push(
        `[${currentLabel}]subtitles='${escapedPath}':force_style='FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,MarginV=${marginBottom}'[final_v]`
      );
      currentLabel = 'final_v';
    }

    return {
      filterComplex: filterParts.join('; '),
      outputLabel: currentLabel,
      layout: graph.layout,
    };
  }

  buildAudioPlan(job) {
    const { audioSource, mediaInfo, backgroundAudioIndex, backgroundAudioVolume } = job;
    const mainHasAudio = mediaInfo.main?.hasAudio;
    const subHasAudio = mediaInfo.sub?.hasAudio;

    let filterComplex = '';
    let outputLabel = '';

    if (audioSource === 'none' && backgroundAudioIndex == null) {
      return { enabled: false };
    }

    if (audioSource === 'mix' && mainHasAudio && subHasAudio) {
      filterComplex = '[0:a][1:a]amix=inputs=2:duration=first:normalize=0[primary_a]';
      outputLabel = 'primary_a';
    } else if (audioSource === 'sub' && subHasAudio) {
      outputLabel = '1:a';
    } else if (mainHasAudio) {
      outputLabel = '0:a';
    } else if (subHasAudio) {
      outputLabel = '1:a';
    }

    if (backgroundAudioIndex != null) {
      const bgLabel = 'bgm_a';
      const volume = clampNumber(backgroundAudioVolume, 0, 2, 0.18);
      const parts = [];

      parts.push(`[${backgroundAudioIndex}:a]volume=${volume}[${bgLabel}]`);

      if (outputLabel && outputLabel !== 'primary_a') {
        parts.unshift(`[${outputLabel}]anull[primary_a]`);
        outputLabel = 'primary_a';
      }

      if (outputLabel === 'primary_a') {
        parts.push('[primary_a][bgm_a]amix=inputs=2:duration=first:normalize=0[final_a]');
      } else {
        parts.push('[bgm_a]anull[final_a]');
      }

      filterComplex = filterComplex
        ? `${filterComplex}; ${parts.join('; ')}`
        : parts.join('; ');
      outputLabel = 'final_a';
    }

    if (!outputLabel) {
      return { enabled: false };
    }

    return {
      enabled: true,
      filterComplex,
      outputLabel,
    };
  }

  buildRenderArgs(job) {
    const args = ['-y'];

    job.videoInputs.forEach((input) => {
      args.push('-ss', String(input.startTime));
      args.push('-t', String(input.duration));
      args.push('-i', input.path);
    });

    if (job.memeOverlayPath) {
      const isImage = IMAGE_EXTENSIONS.has(path.extname(job.memeOverlayPath).toLowerCase());
      if (isImage) {
        args.push('-loop', '1');
      }
      args.push('-i', job.memeOverlayPath);
    }

    if (job.backgroundAudioPath) {
      args.push('-stream_loop', '-1', '-i', job.backgroundAudioPath);
    }

    const videoGraph = this.buildVideoFilterGraph(job);
    const audioPlan = this.buildAudioPlan(job);
    const combinedFilter = [videoGraph.filterComplex, audioPlan.filterComplex]
      .filter(Boolean)
      .join('; ');

    args.push('-filter_complex', combinedFilter);
    args.push('-map', `[${videoGraph.outputLabel}]`);

    if (audioPlan.enabled) {
      args.push('-map', audioPlan.outputLabel.includes(':') ? audioPlan.outputLabel : `[${audioPlan.outputLabel}]`);
      args.push('-c:a', 'aac', '-b:a', '192k');
    } else {
      args.push('-an');
    }

    args.push(
      '-c:v', 'libx264',
      '-preset', job.qualityPreset.preset,
      '-crf', String(job.qualityPreset.crf),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      job.outputPath
    );

    return {
      args,
      layout: videoGraph.layout,
      audioEnabled: audioPlan.enabled,
    };
  }

  async createFactoryJob(config = {}) {
    const {
      mainVideoPath,
      subVideoPath,
      additionalVideoPaths = [],
      duration = 30,
      quality = 'high',
      aspectRatio = '9:16',
      audioSource = 'main',
      templateName = DEFAULT_TEMPLATE_NAME,
      templateOverrides = {},
      outputPath = '',
      outputFileName = '',
      backgroundAudioPath = config.audioPath || '',
      backgroundAudioVolume = config.audioVolume ?? 0.18,
      memeOverlayPath = '',
      memeOverlayWindow = null,
      subtitleMode = 'none',
      highlightDetection = {},
      subtitleFilePath = '',
      subtitleText = '',
      videoContext = '',
      affiliateKeywords = [],
      clipExtraction = {},
    } = config;

    if (!mainVideoPath || !fs.existsSync(mainVideoPath)) {
      throw new Error(`Main video not found: ${mainVideoPath}`);
    }

    if (!subVideoPath || !fs.existsSync(subVideoPath)) {
      throw new Error(`Sub video not found: ${subVideoPath}`);
    }

    const template = await this.loadTemplate(templateName, templateOverrides);
    if (memeOverlayWindow) {
      template.meme = {
        ...(template.meme || {}),
        ...memeOverlayWindow,
      };
    }

    const qualityPreset = this.resolveQualityPreset(quality, aspectRatio);
    const mainInfo = await this.getMediaInfo(mainVideoPath);
    const subInfo = await this.getMediaInfo(subVideoPath);
    const otherVideoPaths = ensureArray(additionalVideoPaths).filter((videoPath) => fs.existsSync(videoPath));
    const additionalMediaInfo = await Promise.all(otherVideoPaths.map((videoPath) => this.getMediaInfo(videoPath)));

    const resolvedDuration = clampNumber(
      duration,
      1,
      600,
      Math.max(1, Math.floor(Math.min(mainInfo.duration || duration, subInfo.duration || duration, duration)))
    );

    const highlightSource = String(highlightDetection?.source || 'sub').toLowerCase();
    const highlightEnabled = Boolean(highlightDetection?.enabled);
    let highlightResult = null;

    if (highlightEnabled) {
      const sourcePath = highlightSource === 'main' ? mainVideoPath : subVideoPath;
      highlightResult = await this.detectHighlights(sourcePath, {
        clipDuration: Math.min(resolvedDuration, Number(highlightDetection?.clipDuration) || Math.min(resolvedDuration, 6)),
        maxHighlights: highlightDetection?.maxHighlights || 3,
        thresholdPercentile: highlightDetection?.thresholdPercentile || 95,
        windowSeconds: highlightDetection?.windowSeconds || 1,
      });
    }

    const primaryHighlight = highlightResult?.highlights?.[0] || null;
    const mainStartTime = highlightSource === 'main' && primaryHighlight ? primaryHighlight.startTime : (Number(config.mainStartTime) || 0);
    const subStartTime = highlightSource === 'sub' && primaryHighlight ? primaryHighlight.startTime : (Number(config.subStartTime) || 0);

    const subtitleResult = await this.prepareSubtitleFile({
      subtitleFilePath,
      subtitleText,
      subtitleMode,
      videoContext,
      affiliateKeywords,
      platform: config.platform || 'youtube-shorts',
      subtitleStyle: config.subtitleStyle || 'engaging',
    }, resolvedDuration);

    if (!subtitleResult.success) {
      throw new Error(subtitleResult.error || 'Failed to prepare subtitles');
    }

    const mashupId = `mashup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const resolvedOutputPath = outputPath || path.join(
      this.outputDir,
      outputFileName || `${sanitizeFileToken(`${template.name}-${mashupId}`) || mashupId}.mp4`
    );
    const thumbPath = resolvedOutputPath.replace(/\.mp4$/i, '-thumb.png');

    const videoInputs = [
      {
        path: mainVideoPath,
        startTime: Math.max(0, mainStartTime),
        duration: Math.min(resolvedDuration, Math.max(1, mainInfo.duration || resolvedDuration)),
      },
      {
        path: subVideoPath,
        startTime: Math.max(0, subStartTime),
        duration: Math.min(resolvedDuration, Math.max(1, subInfo.duration || resolvedDuration)),
      },
      ...otherVideoPaths.map((videoPath, index) => ({
        path: videoPath,
        startTime: Number(config.additionalStartTimes?.[index]) || 0,
        duration: Math.min(resolvedDuration, Math.max(1, additionalMediaInfo[index]?.duration || resolvedDuration)),
      })),
    ];

    const memeOverlayIndex = memeOverlayPath && fs.existsSync(memeOverlayPath) ? videoInputs.length : null;
    const backgroundAudioIndex = backgroundAudioPath && fs.existsSync(backgroundAudioPath)
      ? videoInputs.length + (memeOverlayIndex != null ? 1 : 0)
      : null;

    return {
      mashupId,
      template,
      aspectRatio,
      qualityPreset,
      duration: resolvedDuration,
      audioSource,
      backgroundAudioPath: backgroundAudioPath && fs.existsSync(backgroundAudioPath) ? backgroundAudioPath : '',
      backgroundAudioVolume,
      memeOverlayPath: memeOverlayPath && fs.existsSync(memeOverlayPath) ? memeOverlayPath : '',
      memeOverlayIndex,
      backgroundAudioIndex,
      subtitleFilePath: subtitleResult.subtitleFilePath || '',
      outputPath: resolvedOutputPath,
      thumbPath,
      canvas: {
        width: qualityPreset.width,
        height: qualityPreset.height,
      },
      videoInputs,
      mediaInfo: {
        main: mainInfo,
        sub: subInfo,
        additional: additionalMediaInfo,
      },
      highlightDetection: highlightResult,
      subtitle: subtitleResult,
      clipExtraction,
      pipeline: {
        template: template.name,
        clipExtractionEnabled: Boolean(clipExtraction?.enabled),
        highlightDetectionEnabled: highlightEnabled,
        subtitleMode,
        hasBackgroundAudio: Boolean(backgroundAudioPath && fs.existsSync(backgroundAudioPath)),
        hasMemeOverlay: Boolean(memeOverlayPath && fs.existsSync(memeOverlayPath)),
        audioSource,
      },
    };
  }

  async renderFactoryJob(job) {
    const renderPlan = this.buildRenderArgs(job);
    await execFileAsync(this.ffmpegPath, renderPlan.args, {
      maxBuffer: 20 * 1024 * 1024,
    });

    if (!fs.existsSync(job.outputPath)) {
      throw new Error('Output video was not created');
    }

    await this.generateThumbnail(job.outputPath, job.thumbPath);
    const outputInfo = await this.getMediaInfo(job.outputPath);

    return {
      success: true,
      mashupId: job.mashupId,
      outputPath: job.outputPath,
      thumbPath: job.thumbPath,
      metadata: {
        mainVideo: {
          path: job.mediaInfo.main.path,
          dimensions: { width: job.mediaInfo.main.width, height: job.mediaInfo.main.height },
          duration: job.mediaInfo.main.duration,
        },
        subVideo: {
          path: job.mediaInfo.sub.path,
          dimensions: { width: job.mediaInfo.sub.width, height: job.mediaInfo.sub.height },
          duration: job.mediaInfo.sub.duration,
        },
        additionalVideos: job.mediaInfo.additional.map((item) => ({
          path: item.path,
          dimensions: { width: item.width, height: item.height },
          duration: item.duration,
        })),
        output: {
          path: job.outputPath,
          dimensions: { width: outputInfo.width, height: outputInfo.height },
          size: outputInfo.size,
          duration: job.duration,
          quality: job.qualityPreset.quality,
          aspectRatio: job.aspectRatio,
          audioSource: job.audioSource,
        },
        layout: renderPlan.layout,
        template: job.template,
        pipeline: {
          ...job.pipeline,
          clipCache: job.clipExtraction?.enabled ? 'available' : 'disabled',
          highlightMethod: job.highlightDetection?.method || 'disabled',
          subtitleSource: job.subtitle?.source || 'disabled',
        },
        highlights: job.highlightDetection?.highlights || [],
        subtitle: {
          path: job.subtitleFilePath || '',
          source: job.subtitle?.source || 'disabled',
          count: job.subtitle?.subtitleCount || 0,
        },
      },
    };
  }
  async generateMashup(mainVideoPath, subVideoPath, options = {}) {
    try {
      const job = await this.createFactoryJob({
        mainVideoPath,
        subVideoPath,
        ...options,
      });

      if (options.dryRun) {
        return {
          success: true,
          dryRun: true,
          mashupId: job.mashupId,
          outputPath: job.outputPath,
          thumbPath: job.thumbPath,
          metadata: {
            template: job.template,
            pipeline: job.pipeline,
            highlights: job.highlightDetection?.highlights || [],
            subtitle: job.subtitle,
            videoInputs: job.videoInputs,
          },
        };
      }

      return await this.renderFactoryJob(job);
    } catch (error) {
      console.error('Mashup generation failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async generateGridMashup(videoPaths = [], options = {}) {
    const [mainVideoPath, subVideoPath, ...additionalVideoPaths] = ensureArray(videoPaths);
    if (!mainVideoPath || !subVideoPath) {
      return {
        success: false,
        error: 'Grid mashup requires at least two video paths',
      };
    }

    return this.generateMashup(mainVideoPath, subVideoPath, {
      ...options,
      templateName: 'grid',
      additionalVideoPaths,
    });
  }

  async generateBatchMashups(config = {}) {
    const {
      mainVideoPath,
      subVideoPath = '',
      subVideoPaths = [],
      outputDir = this.outputDir,
      concurrency = 2,
      maxOutputs = 24,
      clipExtraction = {},
      highlightDetection = {},
      dryRun = false,
      ...sharedOptions
    } = config;

    if (!mainVideoPath || !fs.existsSync(mainVideoPath)) {
      return {
        success: false,
        error: `Main video not found: ${mainVideoPath}`,
      };
    }

    let candidateClips = ensureArray(subVideoPaths)
      .filter((videoPath) => fs.existsSync(videoPath))
      .map((videoPath, index) => ({
        index,
        clipPath: videoPath,
        source: 'provided',
      }));

    if (!candidateClips.length) {
      const clipSourcePath = clipExtraction?.sourceVideoPath || subVideoPath;
      if (!clipSourcePath || !fs.existsSync(clipSourcePath)) {
        return {
          success: false,
          error: 'Batch mashup requires either subVideoPaths[] or clipExtraction.sourceVideoPath/subVideoPath',
        };
      }

      const extracted = await this.extractClips(clipSourcePath, clipExtraction);
      candidateClips = extracted.clips.map((clip) => ({
        ...clip,
        clipPath: clip.clipPath,
        source: 'extracted',
      }));
    }

    if (highlightDetection?.enabled) {
      const scored = [];
      for (const clip of candidateClips) {
        const highlight = await this.detectHighlights(clip.clipPath, {
          maxHighlights: 1,
          clipDuration: Math.min(Number(sharedOptions.duration) || 30, Number(highlightDetection.clipDuration) || 6),
          thresholdPercentile: highlightDetection.thresholdPercentile || 95,
          windowSeconds: highlightDetection.windowSeconds || 1,
        });
        scored.push({
          ...clip,
          highlightScore: highlight.highlights?.[0]?.score || 0,
          highlight,
        });
      }

      candidateClips = scored.sort((a, b) => (b.highlightScore || 0) - (a.highlightScore || 0));
    }

    const limitedClips = candidateClips.slice(0, clampNumber(maxOutputs, 1, 500, 24));
    const outputRoot = path.isAbsolute(outputDir) ? outputDir : path.join(this.projectRoot, outputDir);
    if (!fs.existsSync(outputRoot)) {
      fs.mkdirSync(outputRoot, { recursive: true });
    }

    const tasks = limitedClips.map((clip, index) => {
      const baseName = sanitizeFileToken(path.parse(clip.clipPath).name) || `clip-${index + 1}`;
      return {
        index,
        clipPath: clip.clipPath,
        outputPath: path.join(outputRoot, `factory-${String(index + 1).padStart(3, '0')}-${baseName}.mp4`),
        highlight: clip.highlight || null,
      };
    });

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        totalPlanned: tasks.length,
        concurrency: clampNumber(concurrency, 1, 16, 2),
        items: tasks,
      };
    }

    const results = new Array(tasks.length);
    let cursor = 0;
    const workerCount = Math.min(tasks.length, clampNumber(concurrency, 1, 16, 2));

    const worker = async () => {
      while (cursor < tasks.length) {
        const currentIndex = cursor;
        cursor += 1;
        const task = tasks[currentIndex];

        results[currentIndex] = await this.generateMashup(mainVideoPath, task.clipPath, {
          ...sharedOptions,
          outputPath: task.outputPath,
          highlightDetection: sharedOptions.highlightDetection || highlightDetection,
        });
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return {
      success: results.some((item) => item?.success),
      totalRequested: tasks.length,
      successful: results.filter((item) => item?.success).length,
      failed: results.filter((item) => item && !item.success).length,
      results,
    };
  }

  async generateThumbnail(videoPath, outputThumbnailPath, timeOffset = '00:00:01') {
    try {
      await execFileAsync(this.ffmpegPath, [
        '-y',
        '-i',
        videoPath,
        '-ss',
        timeOffset,
        '-vframes',
        '1',
        '-vf',
        'scale=1280:720',
        outputThumbnailPath,
      ], {
        maxBuffer: 10 * 1024 * 1024,
      });
      return true;
    } catch {
      return false;
    }
  }

  cleanupTemp() {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

export default new VideoMashupGenerator();



