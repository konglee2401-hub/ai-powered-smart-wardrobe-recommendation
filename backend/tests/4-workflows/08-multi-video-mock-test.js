/**
 * Multi-Video Generation - Mock Test
 * Tests the complete E2E workflow using mock prompts instead of Claude API
 * Use this to verify the system works without real Claude API dependency
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:5000/api/v1/browser-automation';
const SESSION_ID = `test-multi-video-${Date.now()}`;
const TEST_IMAGES_DIR = path.join(__dirname, '..', '..', 'test-images');
const RESULTS_DIR = path.join(__dirname, '..', '..', 'test-results', SESSION_ID);

// ==================== UTILITIES ====================

class Logger {
  static header(title) {
    console.log('\n' + '='.repeat(80));
    console.log(`🎬 ${title}`);
    console.log('='.repeat(80));
  }

  static section(title) {
    console.log(`\n📝 ${title}`);
    console.log('─'.repeat(80));
  }

  static step(num, msg) {
    console.log(`[Step ${num}] ${msg}...`);
  }

  static success(msg) {
    console.log(`✅ ${msg}`);
  }

  static error(msg) {
    console.log(`❌ ${msg}`);
  }

  static info(msg) {
    console.log(`ℹ️  ${msg}`);
  }
}

function loadImageAsBase64(filename) {
  const imagePath = path.join(TEST_IMAGES_DIR, filename);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found: ${filename} at ${imagePath}`);
  }
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

function getMockPrompts(useCase, videoCount) {
  const prompts = {
    'change-clothes': [
      'A fashionable person starting with business casual outfit, confident pose, modern minimalist interior with natural window lighting, professional presentation',
      'The same person transformed in casual weekend wear, relaxed posture, same interior setting, showing style versatility and comfort'
    ],
    'product-showcase': [
      'Close-up of the premium casual outfit highlighting fabric texture and stitching details, professional product photography with soft lighting',
      'Full-body model wearing the outfit, showing the complete casual look from multiple angles, contemporary fashion photography style',
      'Lifestyle shot of the outfit in context, showing comfort and practicality in real-world setting, warm natural lighting'
    ],
    'styling-guide': [
      'Complete styled outfit with accessories on a model, showing the full look composition with coordinated pieces and proper proportions',
      'Close-up detail shot of the top/upper portion of the outfit, highlighting fabric quality, color coordination, and accessory pairing',
      'Styled shot of the bottom portion with footwear, showing how the bottom balances with the top and completing the overall aesthetic'
    ],
    'product-intro': [
      'Hero shot of the product with soft professional lighting, showcasing the best angles and color palette of the casual outfit',
      'Model wearing the outfit in a confident, relatable pose showing how it fits and moves naturally on the body'
    ],
    'style-transform': [
      'Before shot showing the person in basic casual wear, neutral expression, room temperature lighting',
      'After shot showing the same person transformed in the new premium casual outfit, confident expression, professional product lighting'
    ]
  };

  return (prompts[useCase] || prompts['change-clothes']).slice(0, videoCount);
}

async function testUseCase(useCase, testName) {
  const startTime = Date.now();
  const useCaseConfig = {
    'change-clothes': { videos: 2, duration: 20, frameChaining: true },
    'product-showcase': { videos: 3, duration: 30, frameChaining: false },
    'styling-guide': { videos: 3, duration: 30, frameChaining: true },
    'product-intro': { videos: 2, duration: 20, frameChaining: false },
    'style-transform': { videos: 2, duration: 20, frameChaining: true }
  };

  const config = useCaseConfig[useCase] || useCaseConfig['change-clothes'];

  console.log(`\n📝 Test: ${testName}`);
  console.log('─'.repeat(80));
  Logger.info(`${config.videos}-video workflow, ${config.duration}s duration, frame chaining: ${config.frameChaining}`);

  try {
    Logger.step(1, 'Loading test images');
    const refImage = loadImageAsBase64('anh-nhan-vat.jpeg');
    const prodImage = loadImageAsBase64('anh-san-pham.png');
    Logger.success('Images loaded');

    Logger.step(2, 'Preparing analysis data');
    const mockAnalysis = {
      character: {
        bodyType: 'Slim Athletic',
        height: 'Tall (5\'10"+)',
        skinTone: 'Medium',
        confidence: 0.88
      },
      product: {
        category: 'Casual Outfit',
        colors: ['Navy Blue', 'White'],
        material: 'Cotton Linen Blend',
        style: 'Contemporary Casual',
        fit: 'Relaxed Comfortable'
      },
      recommendations: {
        scene: 'Modern Minimalist Interior',
        lighting: 'Natural Window Light',
        mood: 'Confident & Approachable',
        style: 'Modern Casual',
        colorPalette: 'Neutral Tones',
        cameraAngle: 'Full Body at Eye Level'
      }
    };
    Logger.success('Analysis data ready');

    Logger.step(3, 'Calling API: generateMultiVideoSequence()');

    // For mock test, we'll just validate the endpoint is reachable
    // The actual video generation might fail due to provider constraints,
    // but the important part is the workflow handles it correctly
    const response = await axios.post(
      `${BASE_URL}/generate-multi-video-sequence`,
      {
        sessionId: `${SESSION_ID}-${useCase}`,
        useCase: useCase,
        refImage: refImage,
        analysis: mockAnalysis,
        duration: config.duration,
        quality: 'high',
        aspectRatio: '9:16',
        videoProvider: 'google-flow'
      },
      { timeout: 600000 }
    );

    if (response.data.success) {
      const duration = Date.now() - startTime;
      Logger.success(`Generated ${response.data.data.videoCount} videos`);
      Logger.info(`Total duration: ${response.data.data.totalDuration}s`);
      Logger.info(`Frame chaining: ${response.data.data.frameChaining ? '✓ Enabled' : '✗ Disabled'}`);
      Logger.info(`Session: ${response.data.data.sessionId}`);
      return {
        name: testName,
        status: 'passed',
        duration: duration,
        data: response.data.data
      };
    } else {
      Logger.error(`API returned error: ${response.data.error}`);
      return {
        name: testName,
        status: 'failed',
        duration: Date.now() - startTime,
        error: response.data.error
      };
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    Logger.error(`${error.response?.data?.error || error.message}`);
    
    return {
      name: testName,
      status: 'failed',
      duration: duration,
      error: error.response?.data?.error || error.message
    };
  }
}

// ==================== MAIN TEST RUNNER ====================

async function runTests() {
  Logger.header('MULTI-VIDEO GENERATION - MOCK TEST SUITE');

  console.log(`\nℹ️  API Endpoint: ${BASE_URL}`);
  console.log(`ℹ️  Test Session: ${SESSION_ID}`);
  console.log(`ℹ️  Results Directory: ${RESULTS_DIR}`);

  Logger.section('Running Test Cases');

  const testCases = [
    { useCase: 'change-clothes', name: 'Change Clothes (2 videos + frame chaining)' },
    { useCase: 'product-showcase', name: 'Product Showcase (3 videos, no chaining)' },
    { useCase: 'styling-guide', name: 'Styling Guide (3 videos + frame chaining)' },
    { useCase: 'product-intro', name: 'Product Introduction (2 videos, no chaining)' },
    { useCase: 'style-transform', name: 'Style Transformation (2 videos + frame chaining)' }
  ];

  const results = [];

  for (const testCase of testCases) {
    const result = await testUseCase(testCase.useCase, testCase.name);
    results.push(result);

    // Delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Save results
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  fs.writeFileSync(
    path.join(RESULTS_DIR, 'test-results.json'),
    JSON.stringify({
      sessionId: SESSION_ID,
      startTime: new Date().toISOString(),
      tests: results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        successRate: `${(results.filter(r => r.status === 'passed').length / results.length * 100).toFixed(2)}%`
      }
    }, null, 2)
  );

  // Print summary
  Logger.header('TEST SUMMARY');
  console.log(`\nℹ️  Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${results.filter(r => r.status === 'passed').length}`);
  console.log(`❌ Failed: ${results.filter(r => r.status === 'failed').length}`);
  console.log(`📊 Success Rate: ${(results.filter(r => r.status === 'passed').length / results.length * 100).toFixed(2)}%\n`);

  // Print timing details
  console.log('⏱️  Timing Details:');
  results.forEach(r => {
    const icon = r.status === 'passed' ? '✅' : '❌';
    console.log(`  ${icon} ${r.name}: ${(r.duration / 1000).toFixed(2)}s`);
  });

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\n📊 Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  console.log(`\n✅ Test results saved to: ${path.join(RESULTS_DIR, 'test-results.json')}`);

  // Exit with appropriate code
  const hasFails = results.some(r => r.status === 'failed');
  process.exit(hasFails ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  Logger.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
