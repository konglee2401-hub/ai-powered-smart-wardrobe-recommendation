#!/usr/bin/env node
/**
 * 1-Click Creator - Unified Flow Test
 * 
 * Matches frontend workflow exactly:
 * Step 0: Upload images
 * Step 1: Analyze with ChatGPT
 * Step 2: Apply AI Recommendations
 * Step 3: Build Detailed Prompt
 * Step 4: Generate Images (with local download)
 * Step 5: Generate Videos
 * 
 * Output: Images and videos saved locally for verification
 * Usage: node tests/4-workflows/03-oneclick-creator-unified-test.js
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE = 'http://localhost:5001/api/flows';
const API_BASE_V1 = 'http://localhost:5001/api/v1';
const TIMEOUT = 600000; // 10 minutes

// Test configuration matching OneClick Creator defaults
const TEST_CONFIG = {
  characterImage: 'test-images/anh-nhan-vat.jpeg',
  productImage: 'test-images/anh-san-pham.png',
  quantity: 2,
  useCase: 'change-clothes',
  productFocus: 'full-outfit',
  imageProvider: 'google-flow',
  videoProvider: 'google-flow',
  analysisProvider: 'chatgpt-browser',
  settings: {
    scene: 'studio',
    lighting: 'soft-diffused',
    mood: 'confident',
    style: 'minimalist',
    colorPalette: 'neutral',
    cameraAngle: 'eye-level',
    aspectRatio: '16:9'
  }
};

// Output directories
const OUTPUT_DIR = path.join(process.cwd(), 'test-results', 'oneclick-' + Date.now());
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images');
const VIDEOS_DIR = path.join(OUTPUT_DIR, 'videos');

// Create output directories
function ensureDirectories() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`\n${colors.magenta}🧪 ${msg}${colors.reset}`),
  step: (num, title, icon = '⚙️') => {
    console.log(`\n${colors.cyan}${'═'.repeat(80)}`);
    console.log(`STEP ${num}: ${title} ${icon}`);
    console.log(`${'═'.repeat(80)}${colors.reset}`);
  },
  section: (title) => {
    console.log(`\n${colors.magenta}${'━'.repeat(80)}`);
    console.log(`${colors.bold}${title}${colors.reset}`);
    console.log(`${'━'.repeat(80)}${colors.reset}`);
  },
  file: (action, filename, size) => {
    const sizeStr = size ? ` (${(size / 1024).toFixed(1)}KB)` : '';
    console.log(`${colors.green}💾 ${action}: ${filename}${sizeStr}${colors.reset}`);
  }
};

let testResults = {
  startTime: Date.now(),
  steps: {},
  images: [],
  videos: [],
  success: false,
  duration: 0,
  outputDir: OUTPUT_DIR
};

// Utility: Download file
async function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        fs.unlink(filePath, () => {});
        return downloadFile(response.headers.location, filePath)
          .then(resolve)
          .catch(reject);
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

// Workflow implementation
async function runWorkflow() {
  try {
    ensureDirectories();
    log.section('1-CLICK CREATOR - UNIFIED FLOW TEST');

    // ============================================================
    // STEP 0: VERIFY IMAGES
    // ============================================================
    log.step(0, 'Verify Input Images', '📸');
    
    const backendDir = path.join(__dirname, '../../');
    const characterPath = path.join(backendDir, TEST_CONFIG.characterImage);
    const productPath = path.join(backendDir, TEST_CONFIG.productImage);

    if (!fs.existsSync(characterPath) || !fs.existsSync(productPath)) {
      throw new Error('Test images not found');
    }

    const charStat = fs.statSync(characterPath);
    const prodStat = fs.statSync(productPath);
    
    log.success(`Character: ${TEST_CONFIG.characterImage} (${(charStat.size / 1024).toFixed(1)}KB)`);
    log.success(`Product: ${TEST_CONFIG.productImage} (${(prodStat.size / 1024).toFixed(1)}KB)`);

    // ============================================================
    // STEP 1: ANALYZE
    // ============================================================
    log.step(1, 'Analyze Images with ChatGPT', '🤖');
    testResults.steps.analyze = { startTime: Date.now() };

    const form = new FormData();
    form.append('characterImage', fs.createReadStream(characterPath));
    form.append('productImage', fs.createReadStream(productPath));
    form.append('useCase', TEST_CONFIG.useCase);
    form.append('productFocus', TEST_CONFIG.productFocus);
    form.append('analysisProvider', TEST_CONFIG.analysisProvider);

    Object.entries(TEST_CONFIG.settings).forEach(([key, value]) => {
      form.append(key, value);
    });

    log.info('Sending analysis request (ChatGPT browser automation)...');
    const analysisResponse = await axios.post(`${API_BASE}/analyze`, form, {
      headers: form.getHeaders(),
      timeout: TIMEOUT
    });

    if (!analysisResponse.data.success && !analysisResponse.data.data) {
      throw new Error('Analysis failed: Invalid response');
    }

    const analysisData = analysisResponse.data.data || analysisResponse.data;
    testResults.steps.analyze.duration = Date.now() - testResults.steps.analyze.startTime;
    testResults.steps.analyze.result = analysisData;

    log.success('Analysis complete');
    log.info(`Duration: ${(testResults.steps.analyze.duration / 1000).toFixed(2)}s`);
    log.info(`Output: ${JSON.stringify(analysisData).substring(0, 100)}...`);

    // ============================================================
    // STEP 2: APPLY RECOMMENDATIONS
    // ============================================================
    log.step(2, 'Apply AI Recommendations', '✨');
    testResults.steps.recommendations = { startTime: Date.now() };

    let recommendedOptions = {
      scene: TEST_CONFIG.settings.scene,
      lighting: TEST_CONFIG.settings.lighting,
      mood: TEST_CONFIG.settings.mood,
      style: TEST_CONFIG.settings.style,
      colorPalette: TEST_CONFIG.settings.colorPalette,
      cameraAngle: TEST_CONFIG.settings.cameraAngle
    };

    // Extract and apply AI recommendations from analysis
    if (analysisData?.recommendations) {
      const rec = analysisData.recommendations;
      if (rec.scene?.choice) recommendedOptions.scene = rec.scene.choice;
      if (rec.lighting?.choice) recommendedOptions.lighting = rec.lighting.choice;
      if (rec.mood?.choice) recommendedOptions.mood = rec.mood.choice;
      if (rec.style?.choice) recommendedOptions.style = rec.style.choice;
      if (rec.colorPalette?.choice) recommendedOptions.colorPalette = rec.colorPalette.choice;
      if (rec.cameraAngle?.choice) recommendedOptions.cameraAngle = rec.cameraAngle.choice;
      
      log.success('Applied ChatGPT recommendations');
    } else {
      log.info('No recommendations found, using defaults');
    }

    testResults.steps.recommendations.duration = Date.now() - testResults.steps.recommendations.startTime;
    testResults.steps.recommendations.result = recommendedOptions;
    
    log.info(`Final options: ${JSON.stringify(recommendedOptions)}`);

    // ============================================================
    // STEP 3: BUILD DETAILED PROMPT
    // ============================================================
    log.step(3, 'Build Image Generation Prompt', '🎨');
    testResults.steps.promptBuild = { startTime: Date.now() };

    const imagePrompt = `Professional fashion photo. Character wearing ${TEST_CONFIG.productFocus || 'full outfit'}. ` +
      `Scene: ${recommendedOptions.scene}. Lighting: ${recommendedOptions.lighting}. ` +
      `Mood: ${recommendedOptions.mood}. Style: ${recommendedOptions.style}. ` +
      `Colors: ${recommendedOptions.colorPalette}. Camera: ${recommendedOptions.cameraAngle}. ` +
      `Use case: ${TEST_CONFIG.useCase}. High quality, detailed, professional.`;

    testResults.steps.promptBuild.prompt = imagePrompt;
    testResults.steps.promptBuild.duration = Date.now() - testResults.steps.promptBuild.startTime;

    log.success('Prompt built');
    log.info(`Prompt length: ${imagePrompt.length} characters`);
    log.info(`Content: ${imagePrompt.substring(0, 120)}...`);

    // ============================================================
    // STEP 4: GENERATE IMAGES
    // ============================================================
    log.step(4, 'Generate Images with Google Flow', '🌐');
    testResults.steps.imageGeneration = { startTime: Date.now(), images: [] };

    log.info(`Generating ${TEST_CONFIG.quantity} image(s)...`);
    log.info('Calling: POST /api/flows/generate');

    const generateResponse = await axios.post(
      `${API_BASE}/generate`,
      {
        prompt: imagePrompt,
        imageCount: TEST_CONFIG.quantity,
        imageSize: '1024x1024',
        imageProvider: TEST_CONFIG.imageProvider
      },
      { timeout: TIMEOUT }
    );

    if (!generateResponse.data.success && !generateResponse.data.data) {
      throw new Error('Image generation failed: Invalid response');
    }

    const responseData = generateResponse.data.data || generateResponse.data;
    const generatedImages = responseData.generatedImages || [];

    log.success(`Generated ${generatedImages.length} image(s)`);

    // Download and save images
    for (let i = 0; i < generatedImages.length; i++) {
      const img = generatedImages[i];
      if (!img || !img.url) continue;

      const filename = `image-${i + 1}.png`;
      const filepath = path.join(IMAGES_DIR, filename);

      log.info(`Downloading image ${i + 1}/${generatedImages.length}...`);
      
      try {
        await downloadFile(img.url, filepath);
        const stat = fs.statSync(filepath);
        
        log.file('Downloaded', filename, stat.size);
        testResults.steps.imageGeneration.images.push({
          index: i + 1,
          url: img.url,
          path: filename,
          size: stat.size,
          provider: img.provider || 'Google Flow'
        });
      } catch (downloadError) {
        log.warn(`Failed to download image ${i + 1}: ${downloadError.message}`);
      }
    }

    testResults.steps.imageGeneration.duration = Date.now() - testResults.steps.imageGeneration.startTime;

    log.success(`Image generation complete`);
    log.info(`Duration: ${(testResults.steps.imageGeneration.duration / 1000).toFixed(2)}s`);
    log.info(`Saved to: ${IMAGES_DIR}`);

    // ============================================================
    // STEP 5: GENERATE VIDEOS
    // ============================================================
    log.step(5, 'Generate Videos with Google Flow', '🎬');
    testResults.steps.videoGeneration = { startTime: Date.now(), videos: [] };

    const videoPrompt = `Professional fashion video showcasing ${TEST_CONFIG.productFocus}. ` +
      `Scene: ${recommendedOptions.scene}. ` +
      `Lighting: ${recommendedOptions.lighting}. ` +
      `Mood: ${recommendedOptions.mood}. ` +
      `Style: ${recommendedOptions.style}. ` +
      `Duration: 30 seconds. High quality, cinematic fashion video.`;

    log.info(`Generating video with ${TEST_CONFIG.videoProvider}...`);
    log.info('Calling: POST /api/v1/browser-automation/generate-video');

    try {
      const videoResponse = await axios.post(
        `${API_BASE_V1}/browser-automation/generate-video`,
        {
          duration: 30,
          scenario: 'fashion',
          segments: [videoPrompt],
          videoProvider: TEST_CONFIG.videoProvider
        },
        { timeout: TIMEOUT, maxRedirects: 5 }
      );

      if (!videoResponse.data.success) {
        throw new Error(videoResponse.data.error || 'Video generation failed');
      }

      const videoData = videoResponse.data.data || videoResponse.data;
      const videoUrl = videoData.videoUrl || videoData.url;

      if (!videoUrl) {
        throw new Error('No video URL in response');
      }

      log.success('Video generated');
      log.info(`Video URL: ${videoUrl.substring(0, 80)}...`);

      // Try to download video
      const videoFilename = 'video-1.mp4';
      const videoFilepath = path.join(VIDEOS_DIR, videoFilename);

      log.info('Downloading video...');
      try {
        await downloadFile(videoUrl, videoFilepath);
        const stat = fs.statSync(videoFilepath);
        
        log.file('Downloaded', videoFilename, stat.size);
        testResults.steps.videoGeneration.videos.push({
          index: 1,
          url: videoUrl,
          path: videoFilename,
          size: stat.size,
          provider: TEST_CONFIG.videoProvider
        });
      } catch (downloadError) {
        log.warn(`Failed to download video: ${downloadError.message}`);
        // Still mark as generated even if download failed
        testResults.steps.videoGeneration.videos.push({
          index: 1,
          url: videoUrl,
          path: null,
          provider: TEST_CONFIG.videoProvider
        });
      }

    } catch (videoError) {
      log.warn(`Video generation failed: ${videoError.message}`);
    }

    testResults.steps.videoGeneration.duration = Date.now() - testResults.steps.videoGeneration.startTime;

    log.success('Video generation complete');
    log.info(`Duration: ${(testResults.steps.videoGeneration.duration / 1000).toFixed(2)}s`);
    log.info(`Saved to: ${VIDEOS_DIR}`);

    // ============================================================
    // SUMMARY
    // ============================================================
    testResults.duration = Date.now() - testResults.startTime;
    testResults.success = testResults.steps.imageGeneration.images.length > 0;

    log.section('TEST SUMMARY');

    console.log(`\n${colors.bold}Results:${colors.reset}`);
    console.log(`  Step 1 - Analysis:          ${colors.green}✓${colors.reset} (${(testResults.steps.analyze.duration / 1000).toFixed(2)}s)`);
    console.log(`  Step 2 - Recommendations:   ${colors.green}✓${colors.reset} (${(testResults.steps.recommendations.duration / 1000).toFixed(2)}s)`);
    console.log(`  Step 3 - Prompt Building:   ${colors.green}✓${colors.reset} (${(testResults.steps.promptBuild.duration / 1000).toFixed(2)}s)`);
    
    const imgStatus = testResults.steps.imageGeneration.images.length > 0 ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`  Step 4 - Image Generation:  ${imgStatus} (${(testResults.steps.imageGeneration.duration / 1000).toFixed(2)}s) - ${testResults.steps.imageGeneration.images.length} images`);
    
    const vidStatus = testResults.steps.videoGeneration.videos.length > 0 ? `${colors.green}✓${colors.reset}` : `${colors.yellow}⚠️ ${colors.reset}`;
    console.log(`  Step 5 - Video Generation:  ${vidStatus} (${(testResults.steps.videoGeneration.duration / 1000).toFixed(2)}s) - ${testResults.steps.videoGeneration.videos.length} videos`);

    console.log(`\n${colors.bold}Output Directory:${colors.reset}`);
    console.log(`  ${OUTPUT_DIR}`);

    if (testResults.steps.imageGeneration.images.length > 0) {
      console.log(`\n${colors.bold}Generated Images:${colors.reset}`);
      testResults.steps.imageGeneration.images.forEach(img => {
        const filepath = path.join(IMAGES_DIR, img.path);
        const exists = fs.existsSync(filepath);
        const status = exists ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
        console.log(`  ${status} ${img.path} (${(img.size / 1024).toFixed(1)}KB)`);
      });
    }

    if (testResults.steps.videoGeneration.videos.length > 0) {
      console.log(`\n${colors.bold}Generated Videos:${colors.reset}`);
      testResults.steps.videoGeneration.videos.forEach(vid => {
        if (vid.path) {
          const filepath = path.join(VIDEOS_DIR, vid.path);
          const exists = fs.existsSync(filepath);
          const status = exists ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
          console.log(`  ${status} ${vid.path} (${(vid.size / 1024).toFixed(1)}KB)`);
        } else {
          console.log(`  ${colors.yellow}⚠️ ${colors.reset} Video generated but download failed`);
        }
      });
    }

    console.log(`\n${colors.bold}Total Duration: ${colors.green}${(testResults.duration / 1000).toFixed(2)}s${colors.reset}`);

    if (testResults.success) {
      console.log(`\n${colors.green}${colors.bold}✅ TEST PASSED - Workflow completed successfully!${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}${colors.bold}⚠️ TEST COMPLETED WITH ISSUES - Check errors above${colors.reset}`);
    }

    // Save results to JSON
    const resultsFile = path.join(OUTPUT_DIR, 'test-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    log.info(`Test results saved to: ${resultsFile}`);

    process.exit(testResults.success ? 0 : 1);

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the workflow
runWorkflow();
