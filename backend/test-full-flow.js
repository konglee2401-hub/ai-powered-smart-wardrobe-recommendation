#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import services
import { uploadImageToCloud, deleteUploadedImage } from './services/imageUploadService.js';
import { analyzeWithFallback } from './controllers/aiController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CLI CONFIGURATION
// ============================================

const program = new Command();

program
  .name('test-full-flow')
  .description(`Comprehensive test for Smart Wardrobe AI system

Examples:
  $ npm run test:flow                          # Run full test (auto mode)
  $ npm run test:flow -- --analysis claude    # Test with Claude
  $ npm run test:flow -- --analysis groq      # Test with Groq (FREE)
  $ npm run test:flow:fast                     # Quick test (skip gen)
  $ npm run test:flow -- --file ./my.jpg      # Custom image
  $ npm run test:flow -- --verbose            # Debug mode

Analysis Models:
  auto, claude, gpt4, gemini, zai, nvidia, mistral, groq
  
Image Gen Models:
  auto, dalle3, dalle2, stability
  
Video Gen Models:
  auto, runway, pika

For more info: See docs/TESTING_GUIDE.md`)
  .version('1.0.0')
  .option('-a, --analysis <model>', 'Analysis model (auto, claude, gpt4, gemini, zai, nvidia, mistral, groq)', 'auto')
  .option('-i, --image-gen <model>', 'Image generation model (auto, dalle3, dalle2, stability)', 'auto')
  .option('-v, --video-gen <model>', 'Video generation model (auto, runway, pika)', 'auto')
  .option('-f, --file <path>', 'Custom image file path')
  .option('--skip-upload', 'Skip image upload test')
  .option('--skip-analysis', 'Skip AI analysis test')
  .option('--skip-image-gen', 'Skip image generation test')
  .option('--skip-video-gen', 'Skip video generation test')
  .option('--no-cleanup', 'Skip cleanup after tests')
  .option('--verbose', 'Show detailed logs')
  .parse(process.argv);

const options = program.opts();

// ============================================
// TEST CONFIGURATION
// ============================================

const TEST_IMAGES = [
  'anh-nhan-vat.jpeg',
  'ao phong.jpg'
];

const ANALYSIS_MODELS = {
  auto: null,
  
  // Anthropic (Premium)
  claude: 'claude-3-5-sonnet-20241022',
  'claude-opus': 'claude-3-opus-20240229',
  'claude-haiku': 'claude-3-haiku-20240307',
  
  // OpenAI (Premium)
  gpt4: 'gpt-4o',
  'gpt4-vision': 'gpt-4-vision-preview',
  'gpt4-mini': 'gpt-4o-mini',
  
  // Google (FREE tier available)
  gemini: 'gemini-2.0-flash-exp',
  'gemini-pro': 'gemini-2.5-pro',
  'gemini-flash': 'gemini-2.5-flash',
  
  // Z.AI (FREE)
  zai: 'glm-4v-flash',
  'zai-4v': 'glm-4v',
  'zai-plus': 'glm-4v-plus',
  
  // NVIDIA (FREE)
  nvidia: 'meta/llama-3.2-11b-vision-instruct',
  'nvidia-90b': 'meta/llama-3.2-90b-vision-instruct',
  'nvidia-phi': 'microsoft/phi-3.5-vision-instruct',
  
  // Mistral (Paid)
  mistral: 'pixtral-12b-2409',
  'mistral-large': 'pixtral-large-latest'
  
  // Groq - DEPRECATED (Dec 2024)
  // groq: 'llama-3.2-11b-vision-preview',
  // 'groq-90b': 'llama-3.2-90b-vision-preview'
};

const IMAGE_GEN_MODELS = {
  auto: null,
  dalle3: 'dall-e-3',
  dalle2: 'dall-e-2',
  stability: 'stable-diffusion-xl'
};

const VIDEO_GEN_MODELS = {
  auto: null,
  runway: 'runway-gen2',
  pika: 'pika-1.0'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  
  switch (type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✅ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`[${timestamp}] ❌ ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`[${timestamp}] ⚠️  ${message}`));
      break;
    case 'info':
      console.log(chalk.blue(`[${timestamp}] ℹ️  ${message}`));
      break;
    case 'debug':
      if (options.verbose) {
        console.log(chalk.gray(`[${timestamp}] 🔍 ${message}`));
      }
      break;
    default:
      console.log(`[${timestamp}] ${message}`);
  }
}

function printHeader(title) {
  console.log('\n' + chalk.cyan('='.repeat(80)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('='.repeat(80)) + '\n');
}

function printSummary(results) {
  console.log('\n' + chalk.magenta('='.repeat(80)));
  console.log(chalk.magenta.bold('  📊 TEST SUMMARY'));
  console.log(chalk.magenta('='.repeat(80)) + '\n');

  const total = results.length;
  const passed = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log(chalk.bold(`Total Tests: ${total}`));
  console.log(chalk.green(`✅ Passed: ${passed}`));
  console.log(chalk.red(`❌ Failed: ${failed}`));
  console.log(chalk.yellow(`⏭️  Skipped: ${skipped}`));
  
  const activeTests = total - skipped;
  if (activeTests > 0) {
    console.log(chalk.blue(`📈 Success Rate: ${((passed / activeTests) * 100).toFixed(1)}%`));
  } else {
    console.log(chalk.blue(`📈 Success Rate: N/A (all tests skipped)`));
  }
  
  console.log('\n' + chalk.bold('Detailed Results:') + '\n');
  
  results.forEach((result, idx) => {
    let icon = '✅';
    let color = chalk.green;
    
    if (result.status === 'failed') {
      icon = '❌';
      color = chalk.red;
    } else if (result.status === 'skipped') {
      icon = '⏭️';
      color = chalk.yellow;
    }
    
    console.log(color(`${idx + 1}. ${icon} ${result.test}`));
    
    if (result.duration) {
      console.log(color(`   ⏱️  Duration: ${result.duration}s`));
    }
    
    if (result.details) {
      console.log(color(`   📝 ${result.details}`));
    }
    
    if (result.error) {
      console.log(chalk.red(`   ❌ Error: ${result.error}`));
    }
    
    console.log('');
  });
  
  console.log(chalk.magenta('='.repeat(80)) + '\n');
}

// ============================================
// TEST FUNCTIONS
// ============================================

async function testImageUpload(imagePath) {
  const spinner = ora('Uploading image to cloud...').start();
  
  try {
    const startTime = Date.now();
    
    const uploadResult = await uploadImageToCloud(imagePath, {
      name: 'full-flow-test',
      folder: 'test'
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    spinner.succeed(`Image uploaded to ${uploadResult.provider}`);
    
    log(`URL: ${uploadResult.url}`, 'debug');
    log(`Size: ${uploadResult.size ? (uploadResult.size / 1024).toFixed(2) + ' KB' : 'N/A'}`, 'debug');
    log(`Dimensions: ${uploadResult.width}x${uploadResult.height}`, 'debug');
    
    return {
      status: 'success',
      test: 'Image Upload',
      duration,
      details: `Uploaded to ${uploadResult.provider}`,
      data: uploadResult
    };
    
  } catch (error) {
    spinner.fail('Image upload failed');
    log(error.message, 'error');
    
    return {
      status: 'failed',
      test: 'Image Upload',
      error: error.message
    };
  }
}

async function testAIAnalysis(imagePath, uploadResult, analysisModel) {
  const modelName = analysisModel || 'auto (fallback system)';
  const spinner = ora(`Analyzing image with ${modelName}...`).start();
  
  try {
    const startTime = Date.now();
    
    // Prepare options
    const analyzeOptions = {
      imageUrl: uploadResult?.url
    };
    
    if (analysisModel) {
      analyzeOptions.preferredModel = analysisModel;
    }
    
    // Run analysis
    const result = await analyzeWithFallback(
      imagePath,
      'character', // Default to character analysis
      analyzeOptions
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    spinner.succeed(`AI analysis completed`);
    
    // Handle different result types
    let resultText = '';
    let resultLength = 0;
    
    if (typeof result === 'string') {
      resultText = result;
      resultLength = result.length;
    } else if (result && typeof result === 'object') {
      // Result is an object (from analyzeWithFallback)
      if (result.result) {
        resultText = result.result;
        resultLength = result.result.length;
      } else if (result.analysis) {
        resultText = result.analysis;
        resultLength = result.analysis.length;
      } else if (result.content) {
        resultText = result.content;
        resultLength = result.content.length;
      } else {
        resultText = JSON.stringify(result);
        resultLength = resultText.length;
      }
    } else {
      resultText = String(result || '');
      resultLength = resultText.length;
    }
    
    log(`Response length: ${resultLength} characters`, 'debug');
    log(`Preview: ${resultText.slice(0, 150)}...`, 'debug');
    
    return {
      status: 'success',
      test: `AI Analysis (${modelName})`,
      duration,
      details: `Response: ${resultLength} chars`,
      data: resultText
    };
    
  } catch (error) {
    spinner.fail('AI analysis failed');
    log(error.message, 'error');
    
    return {
      status: 'failed',
      test: `AI Analysis (${modelName})`,
      error: error.message
    };
  }
}

async function testImageGeneration(prompt, imageGenModel) {
  const modelName = imageGenModel || 'auto';
  const spinner = ora(`Generating image with ${modelName}...`).start();
  
  try {
    // TODO: Implement when image generation service is ready
    spinner.info('Image generation not yet implemented');
    
    return {
      status: 'skipped',
      test: `Image Generation (${modelName})`,
      details: 'Feature not yet implemented'
    };
    
  } catch (error) {
    spinner.fail('Image generation failed');
    log(error.message, 'error');
    
    return {
      status: 'failed',
      test: `Image Generation (${modelName})`,
      error: error.message
    };
  }
}

async function testVideoGeneration(prompt, videoGenModel) {
  const modelName = videoGenModel || 'auto';
  const spinner = ora(`Generating video with ${modelName}...`).start();
  
  try {
    // TODO: Implement when video generation service is ready
    spinner.info('Video generation not yet implemented');
    
    return {
      status: 'skipped',
      test: `Video Generation (${modelName})`,
      details: 'Feature not yet implemented'
    };
    
  } catch (error) {
    spinner.fail('Video generation failed');
    log(error.message, 'error');
    
    return {
      status: 'failed',
      test: `Video Generation (${modelName})`,
      error: error.message
    };
  }
}

async function cleanupUploadedImages(uploadResults) {
  if (!options.cleanup || uploadResults.length === 0) {
    return {
      status: 'skipped',
      test: 'Cleanup',
      details: 'Cleanup disabled or no images to clean'
    };
  }
  
  const spinner = ora(`Cleaning up ${uploadResults.length} uploaded image(s)...`).start();
  
  try {
    for (const uploadResult of uploadResults) {
      await deleteUploadedImage(uploadResult);
    }
    
    spinner.succeed('Cleanup completed');
    
    return {
      status: 'success',
      test: 'Cleanup',
      details: `Deleted ${uploadResults.length} image(s)`
    };
    
  } catch (error) {
    spinner.fail('Cleanup failed');
    log(error.message, 'warning');
    
    return {
      status: 'failed',
      test: 'Cleanup',
      error: error.message
    };
  }
}

// ============================================
// MAIN TEST FLOW
// ============================================

async function runFullFlowTest() {
  printHeader('🧪 SMART WARDROBE - FULL FLOW TEST');
  
  // Display configuration
  console.log(chalk.bold('Test Configuration:'));
  console.log(`  Analysis Model: ${chalk.cyan(options.analysis)}`);
  console.log(`  Image Gen Model: ${chalk.cyan(options.imageGen)}`);
  console.log(`  Video Gen Model: ${chalk.cyan(options.videoGen)}`);
  console.log(`  Skip Upload: ${options.skipUpload ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`  Skip Analysis: ${options.skipAnalysis ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`  Skip Image Gen: ${options.skipImageGen ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`  Skip Video Gen: ${options.skipVideoGen ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`  Cleanup: ${options.cleanup ? chalk.green('Yes') : chalk.yellow('No')}`);
  console.log(`  Verbose: ${options.verbose ? chalk.green('Yes') : chalk.gray('No')}`);
  console.log('');
  
  // Find test images
  let testImagePaths = [];
  
  if (options.file) {
    // Use custom file
    if (fs.existsSync(options.file)) {
      testImagePaths.push(options.file);
      log(`Using custom image: ${options.file}`, 'info');
    } else {
      log(`Custom file not found: ${options.file}`, 'error');
      process.exit(1);
    }
  } else {
    // Use default test images
    const testImagesDir = path.join(__dirname, 'test-images');
    
    for (const imageName of TEST_IMAGES) {
      const imagePath = path.join(testImagesDir, imageName);
      if (fs.existsSync(imagePath)) {
        testImagePaths.push(imagePath);
      }
    }
    
    if (testImagePaths.length === 0) {
      log('No test images found in test-images folder', 'error');
      log(`Expected files: ${TEST_IMAGES.join(', ')}`, 'error');
      process.exit(1);
    }
    
    log(`Found ${testImagePaths.length} test image(s)`, 'success');
    testImagePaths.forEach(p => log(`  - ${path.basename(p)}`, 'debug'));
  }
  
  console.log('');
  
  // Run tests
  const results = [];
  const uploadedImages = [];
  
  for (let i = 0; i < testImagePaths.length; i++) {
    const imagePath = testImagePaths[i];
    const imageName = path.basename(imagePath);
    
    printHeader(`📸 Testing Image ${i + 1}/${testImagePaths.length}: ${imageName}`);
    
    let uploadResult = null;
    
    // Test 1: Image Upload
    if (!options.skipUpload) {
      const uploadTestResult = await testImageUpload(imagePath);
      results.push(uploadTestResult);
      
      if (uploadTestResult.status === 'success') {
        uploadResult = uploadTestResult.data;
        uploadedImages.push(uploadResult);
      }
      
      console.log('');
    } else {
      results.push({
        status: 'skipped',
        test: 'Image Upload',
        details: 'Skipped by user'
      });
    }
    
    // Test 2: AI Analysis
    if (!options.skipAnalysis) {
      const analysisModel = ANALYSIS_MODELS[options.analysis];
      const analysisTestResult = await testAIAnalysis(imagePath, uploadResult, analysisModel);
      results.push(analysisTestResult);
      console.log('');
    } else {
      results.push({
        status: 'skipped',
        test: 'AI Analysis',
        details: 'Skipped by user'
      });
    }
    
    // Test 3: Image Generation (only for first image)
    if (i === 0 && !options.skipImageGen) {
      const imageGenModel = IMAGE_GEN_MODELS[options.imageGen];
      const imageGenTestResult = await testImageGeneration('A beautiful wardrobe design', imageGenModel);
      results.push(imageGenTestResult);
      console.log('');
    }
    
    // Test 4: Video Generation (only for first image)
    if (i === 0 && !options.skipVideoGen) {
      const videoGenModel = VIDEO_GEN_MODELS[options.videoGen];
      const videoGenTestResult = await testVideoGeneration('Fashion showcase video', videoGenModel);
      results.push(videoGenTestResult);
      console.log('');
    }
  }
  
  // Cleanup
  const cleanupResult = await cleanupUploadedImages(uploadedImages);
  results.push(cleanupResult);
  
  // Print summary
  printSummary(results);
  
  // Exit code
  const failedCount = results.filter(r => r.status === 'failed').length;
  process.exit(failedCount > 0 ? 1 : 0);
}

// ============================================
// ERROR HANDLING
// ============================================

process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ UNHANDLED ERROR:'));
  console.error(chalk.red(error.stack || error.message));
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️  Test interrupted by user'));
  process.exit(130);
});

// ============================================
// RUN
// ============================================

runFullFlowTest().catch(error => {
  console.error(chalk.red('\n❌ FATAL ERROR:'));
  console.error(chalk.red(error.stack || error.message));
  process.exit(1);
});
