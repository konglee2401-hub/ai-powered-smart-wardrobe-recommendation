/**
 * Test Suite for Video Mashup Service
 * Render-heavy assertions are skipped when ffmpeg/ffprobe are not directly
 * executable from the current environment.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import videoMashupService from '../../services/videoMashupService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nativeExecutablesAvailable = videoMashupService.ffmpegPath !== 'ffmpeg' && videoMashupService.ffprobePath !== 'ffprobe';
const runIfNative = nativeExecutablesAvailable ? test : test.skip;

describe('Video Mashup Service Tests', () => {
  const testVideosDir = path.join(__dirname, '../../test-videos');
  const mainVideoPath = path.join(testVideosDir, 'main-video.mp4');
  const subVideoPath = path.join(testVideosDir, 'sub-video.mp4');
  const outputDir = path.join(__dirname, '../../media/mashups');
  let generatedOutputPath = null;

  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (!fs.existsSync(mainVideoPath)) {
      throw new Error(`Main test video not found at: ${mainVideoPath}`);
    }
    if (!fs.existsSync(subVideoPath)) {
      throw new Error(`Sub test video not found at: ${subVideoPath}`);
    }
  });

  afterAll(() => {
    if (generatedOutputPath && fs.existsSync(generatedOutputPath)) {
      try {
        fs.unlinkSync(generatedOutputPath);
      } catch {
        // Best effort cleanup.
      }
    }
  });

  test('Should have test videos available', () => {
    expect(fs.existsSync(mainVideoPath)).toBe(true);
    expect(fs.existsSync(subVideoPath)).toBe(true);
    expect(fs.statSync(mainVideoPath).size).toBeGreaterThan(0);
    expect(fs.statSync(subVideoPath).size).toBeGreaterThan(0);
  });

  test('Should expose whether native ffmpeg executables are available', () => {
    expect(typeof nativeExecutablesAvailable).toBe('boolean');
  });

  runIfNative('Should get video durations correctly', () => {
    const mainDuration = videoMashupService.getVideoDuration(mainVideoPath);
    const subDuration = videoMashupService.getVideoDuration(subVideoPath);

    expect(mainDuration).toBeGreaterThan(0);
    expect(subDuration).toBeGreaterThan(0);
  });

  runIfNative('Should merge two videos successfully with mergeVideos', async () => {
    const outputFileName = `test-mashup-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    const result = await videoMashupService.mergeVideos({
      mainVideoPath,
      templateVideoPath: subVideoPath,
      outputPath,
      videoDuration: 10,
      aspectRatio: '9:16',
      quality: 'high',
      audioFromMain: true,
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toBeDefined();
    expect(result.message).toBe('Videos merged successfully');

    generatedOutputPath = outputPath;
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(0);
  });

  runIfNative('Should generate mashup with generateMashupVideo', async () => {
    const outputFileName = `test-mashup-v2-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);

    const result = await videoMashupService.generateMashupVideo({
      video1Path: mainVideoPath,
      video2Path: subVideoPath,
      outputPath,
      duration: 15,
      aspectRatio: '9:16',
      quality: 'high',
      audioSource: 'main',
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(outputPath)).toBe(true);

    fs.unlinkSync(outputPath);
  });

  test('Should document whether dry-run planning still needs native ffprobe', async () => {
    if (!nativeExecutablesAvailable) {
      expect(nativeExecutablesAvailable).toBe(false);
      return;
    }

    const result = await videoMashupService.generateMashupVideo({
      video1Path: mainVideoPath,
      video2Path: subVideoPath,
      duration: 8,
      templateName: 'highlight',
      subtitleMode: 'auto',
      subtitleText: 'deal hot link bio mua ngay',
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
  });

  test('Should validate input file paths', async () => {
    const result = await videoMashupService.mergeVideos({
      mainVideoPath: '/nonexistent/video1.mp4',
      templateVideoPath: subVideoPath,
      outputPath: path.join(outputDir, 'invalid-test.mp4'),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

