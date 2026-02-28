#!/usr/bin/env node

/**
 * Test script for 2/3 + 1/3 mashup service using local test videos.
 * - main video occupies 2/3 screen (left)
 * - sub video occupies 1/3 screen (right)
 * - audio is taken from main video only
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import videoMashupGenerator from '../services/videoMashupGenerator.js';

const execAsync = promisify(execCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getAudioStreamInfo(videoPath) {
  const cmd = `ffprobe -v error -select_streams a:0 -show_entries stream=index,codec_name,channels -of json "${videoPath}"`;
  const { stdout } = await execAsync(cmd);
  const parsed = JSON.parse(stdout || '{}');
  return parsed.streams?.[0] || null;
}

async function run() {
  const mainVideoPath = path.resolve(__dirname, '../test-videos/main-video.mp4');
  const subVideoPath = path.resolve(__dirname, '../test-videos/sub-video.mp4');

  if (!fs.existsSync(mainVideoPath) || !fs.existsSync(subVideoPath)) {
    throw new Error(`Missing test videos. Expected:\n- ${mainVideoPath}\n- ${subVideoPath}`);
  }

  console.log('🎯 Running mashup test with test-videos...');
  const result = await videoMashupGenerator.generateMashup(mainVideoPath, subVideoPath, {
    duration: 10,
    quality: 'medium',
    aspectRatio: '9:16',
    audioSource: 'main'
  });

  if (!result.success) {
    throw new Error(`Mashup generation failed: ${result.error}`);
  }

  const { outputPath, metadata } = result;
  const audioInfo = await getAudioStreamInfo(outputPath);

  if (!audioInfo) {
    throw new Error('Output video has no audio stream (expected main audio).');
  }

  const width = metadata?.output?.dimensions?.width;
  const height = metadata?.output?.dimensions?.height;
  const mainWidth = metadata?.layout?.main?.width;
  const subWidth = metadata?.layout?.sub?.width;

  if (!(width > 0 && height > 0 && mainWidth > subWidth)) {
    throw new Error(`Unexpected layout dimensions: output=${width}x${height}, main=${mainWidth}, sub=${subWidth}`);
  }

  console.log('✅ Mashup generated successfully');
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📐 Layout: main=${mainWidth}px (2/3), sub=${subWidth}px (1/3), output=${width}x${height}`);
  console.log(`🔊 Audio stream: codec=${audioInfo.codec_name}, channels=${audioInfo.channels}, source=main`);
}

run().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
