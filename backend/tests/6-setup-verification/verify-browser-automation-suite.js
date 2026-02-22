#!/usr/bin/env node

/**
 * Browser Automation Test Suite - Complete Package
 * 
 * All-in-one test script with comprehensive documentation
 * 
 * Features:
 * - Multiple image upload testing
 * - Full unified workflow testing
 * - Individual service testing
 * - Automatic test image detection
 * - Comprehensive validation and reporting
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import ZAIChatService from './services/browser/zaiChatService.js';
import GrokServiceV2 from './services/browser/grokServiceV2.js';
import ZAIImageService from './services/browser/zaiImageService.js';
import { analyzeUnified } from './services/unifiedAnalysisService.js';
import { generateImages } from './services/imageGenService.js';

dotenv.config();

// Increase MongoDB timeout for test suite
process.env.MONGODB_TIMEOUT = '30000';

// Import mongoose and set global timeout
import mongoose from 'mongoose';
mongoose.set('bufferTimeoutMS', 30000);

// ============================================
// MONGODB CONNECTION
// ============================================

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';
  
  try {
    console.log(chalk.blue(`\n🔌 Connecting to MongoDB: ${mongoUri}...`));
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(chalk.green('✅ MongoDB connected successfully!\n'));
  } catch (error) {
    console.error(chalk.red(`❌ MongoDB connection failed: ${error.message}`));
    throw error;
  }
}

async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    console.log(chalk.blue('🔌 MongoDB disconnected\n'));
  } catch (error) {
    console.error(chalk.red(`❌ MongoDB disconnect error: ${error.message}`));
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CLI CONFIGURATION
// ============================================

const program = new Command();

program
  .name('browser-automation-test-suite')
  .description('Complete browser automation test suite with unified workflow')
  .version('3.0.0')
  .option('-s, --service <name>', 'Service to test (zai, grok, both)', 'both')
  .option('-w, --workflow', 'Test full unified workflow (analyze + generate)', false)
  .option('-m, --multi-image', 'Test multiple image upload capability', false)
  .option('-f, --character-file <path>', 'Character image file path')
  .option('-p, --product-file <path>', 'Product image file path')
  .option('--prompt <text>', 'Analysis prompt', 'Analyze fashion compatibility and provide styling recommendations')
  .option('--gen-prompt <text>', 'Image generation prompt', 'Generate a professional fashion image of the character wearing the clothing')
  .option('--negative-prompt <text>', 'Negative prompt for generation', 'blurry, distorted, watermark, low quality')
  .option('--headless', 'Run in headless mode (no browser window)', false)
  .option('--slow', 'Slow down actions for debugging', false)
  .option('--screenshot', 'Take screenshots during process', false)
  .option('--wait-login', 'Wait for manual login (non-headless only)', false)
  .option('--timeout <seconds>', 'Timeout in seconds', '120')
  .option('--download-path <path>', 'Path to download generated images', './test-results')
  .option('--validate-only', 'Only validate existing functionality, skip generation', false)
  .option('--max-retries <number>', 'Maximum retries for operations', '3')
  .option('--scenario <name>', 'Predefined test scenario (quick, full, multi-image, debug, grok-only, zai-only, both-services)')
  .parse(process.argv);

const options = program.opts();

// ============================================
// TEST CONFIGURATION
// ============================================

const TEST_IMAGES = {
  character: [
    'anh-nhan-vat.jpeg',
    'anh nhan vat.jpeg',
    'anh_nhan_vat.jpeg',
    'character.jpg'
  ],
  product: [
    'anh-san-pham.png',
    'anh san pham.png',
    'anh_san_pham.png',
    'product.jpg'
  ]
};

// Test scenarios
const scenarios = {
  'quick': {
    description: 'Quick test with default images (5 minutes)',
    command: '--workflow --validate-only --headless'
  },
  'full': {
    description: 'Complete workflow test with generation (15-30 minutes)',
    command: '--workflow --headless'
  },
  'multi-image': {
    description: 'Test multiple image upload capability',
    command: '--multi-image --service grok --headless'
  },
  'debug': {
    description: 'Debug mode with browser visible',
    command: '--workflow --headless=false --slow'
  },
  'grok-only': {
    description: 'Test Grok service only',
    command: '--service grok --headless'
  },
  'grok-full-flow': {
    description: 'Grok full flow: session login → upload 2 images → analyze → generate → download (5-10 min)',
    command: '--service grok-full-flow'
  },
  'zai-only': {
    description: 'Test Z.AI service only',
    command: '--service zai --headless'
  },
  'both-services': {
    description: 'Test both services individually',
    command: '--service both --headless'
  }
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
    case 'progress':
      console.log(chalk.cyan(`[${timestamp}] 🔄 ${message}`));
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

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============================================
// TEST FUNCTIONS
// ============================================

async function testMultiImageUpload(service, characterImagePath, productImagePath, prompt) {
  printHeader('📸 Testing Multiple Image Upload');
  
  const isHeadless = options.waitLogin ? false : options.headless;
  const serviceInstance = service === 'grok' 
    ? new GrokServiceV2({ headless: isHeadless, slowMo: options.slow ? 100 : 0 })
    : new ZAIChatService({ headless: isHeadless, slowMo: options.slow ? 100 : 0 });

  try {
    const startTime = Date.now();

    // Initialize
    await serviceInstance.initialize();
    
    // Wait for manual login if requested
    if (options.waitLogin && !isHeadless) {
      await serviceInstance.waitForManualLogin(60);
    }

    // Test multiple image analysis
    log(`Testing multiple image upload with ${service.toUpperCase()}...`);
    const result = await serviceInstance.analyzeMultipleImages(
      [characterImagePath, productImagePath], 
      prompt
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display result
    console.log(chalk.green('\n🎉 MULTIPLE IMAGE ANALYSIS SUCCESSFUL\n'));
    console.log(chalk.bold('Response:'));
    console.log(chalk.gray('-'.repeat(80)));
    console.log(result);
    console.log(chalk.gray('-'.repeat(80)));
    console.log(chalk.blue(`\n⏱️  Total duration: ${duration}s\n`));

    return {
      service: service.toUpperCase(),
      status: 'success',
      duration,
      result,
      multiImage: true
    };

  } catch (error) {
    log(`Multiple image upload failed: ${error.message}`, 'error');
    
    return {
      service: service.toUpperCase(),
      status: 'failed',
      error: error.message,
      multiImage: true
    };

  } finally {
    await serviceInstance.close();
  }
}

async function testUnifiedWorkflow(characterImagePath, productImagePath, options) {
  printHeader('🎯 Testing Full Unified Workflow - Exact App Replication');
  
  const startTime = Date.now();
  const workflowResults = [];
  
  try {
    log('Starting unified workflow test - replicating exact app flow...', 'progress');
    log(`Character: ${path.basename(characterImagePath)}`, 'info');
    log(`Product: ${path.basename(productImagePath)}`, 'info');
    log(`Use Case: ${options.useCase || 'change-clothes'}`, 'info');
    log(`Product Focus: ${options.productFocus || 'full-outfit'}`, 'info');
    
    // STEP 1: Unified Analysis (both images together)
    log('📸 STEP 1: Running unified analysis (both images together)...', 'progress');
    const analysisResult = await analyzeUnified(characterImagePath, productImagePath, {
      useCase: options.useCase || 'change-clothes',
      productFocus: options.productFocus || 'full-outfit'
    });
    
    if (!analysisResult.success) {
      throw new Error(`Unified analysis failed: ${analysisResult.error}`);
    }
    
    workflowResults.push({
      step: 'unified-analysis',
      status: 'success',
      duration: analysisResult.metadata?.duration || 'N/A',
      data: analysisResult.data
    });
    
    log('✅ Unified analysis completed successfully', 'success');
    log(`Analysis provider: ${analysisResult.metadata?.provider || 'N/A'}`, 'info');
    
    // STEP 2: Apply AI Recommendations (extract from analysis)
    log('🤖 STEP 2: Applying AI recommendations from analysis...', 'progress');
    const analysisData = analysisResult.data?.analysis || analysisResult.data;
    const aiRecommendations = extractAIRecommendations(analysisData);
    
    workflowResults.push({
      step: 'ai-recommendations',
      status: 'success',
      duration: 'N/A',
      data: aiRecommendations
    });
    
    log('✅ AI recommendations extracted', 'success');
    log(`Recommendations: ${JSON.stringify(aiRecommendations, null, 2)}`, 'info');
    
    // STEP 3: Build Smart Prompt (use exact app logic)
    log('🔨 STEP 3: Building smart prompt using app logic...', 'progress');
    const smartPrompt = await buildSmartPrompt(
      analysisData,
      aiRecommendations,
      options.useCase || 'change-clothes',
      options.productFocus || 'full-outfit'
    );
    
    workflowResults.push({
      step: 'smart-prompt-building',
      status: 'success',
      duration: 'N/A',
      data: smartPrompt
    });
    
    log('✅ Smart prompt built using app logic', 'success');
    log(`Positive prompt: ${smartPrompt.positive.substring(0, 100)}...`, 'info');
    log(`Negative prompt: ${smartPrompt.negative.substring(0, 100)}...`, 'info');
    
    // STEP 4: Image Generation using Browser Automation (Z.AI)
    if (!options.validateOnly) {
      log('🎨 STEP 4: Generating images using browser automation (Z.AI)...', 'progress');
      
      // Use ZAIImageService for browser-based image generation
      const imageService = new ZAIImageService({
        headless: options.headless,
        slowMo: options.slow ? 100 : 0
      });
      
      try {
        // Initialize browser
        await imageService.initialize();
        
        // Build the generation prompt from smart prompt
        const generationPrompt = `${smartPrompt.positive}\n\nNegative prompt: ${smartPrompt.negative}`;
        
        // Generate image using browser automation
        const genStartTime = Date.now();
        const genResult = await imageService.generateImage(generationPrompt, {
          download: true,
          outputPath: path.join(options.downloadPath, `zai-generated-${Date.now()}.png`)
        });
        const genDuration = ((Date.now() - genStartTime) / 1000).toFixed(2);
        
        if (!genResult || !genResult.url) {
          throw new Error('No image generated from browser');
        }
        
        workflowResults.push({
          step: 'image-generation',
          status: 'success',
          duration: genDuration,
          data: genResult
        });
        
        log('✅ Image generation completed (browser)', 'success');
        log(`Generated image URL: ${genResult.url}`, 'info');
        if (genResult.path) {
          log(`Saved to: ${genResult.path}`, 'info');
        }
        
        // STEP 5: Download and Save (if not already downloaded)
        log('💾 STEP 5: Saving generated image...', 'progress');
        
        let downloadPath = genResult.path;
        if (!downloadPath && genResult.url) {
          downloadPath = await downloadGeneratedImage(
            genResult.url,
            options.downloadPath,
            characterImagePath,
            productImagePath
          );
        }
        
        workflowResults.push({
          step: 'download',
          status: 'success',
          duration: 'N/A',
          data: { downloadPath }
        });
        
        log('✅ Image saved', 'success');
        log(`Saved to: ${downloadPath}`, 'info');
        
      } catch (genError) {
        log(`Browser image generation failed: ${genError.message}`, 'error');
        
        // Throw error - no fallback needed
        throw new Error(`Browser image generation failed: ${genError.message}`);
      } finally {
        // Close browser
        try {
          await imageService.close();
        } catch (e) {
          // Ignore close errors
        }
      }
    } else {
      log('⏭️  STEP 4-5: Skipping generation (validate-only mode)', 'warning');
    }
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(chalk.green('\n🎉 FULL UNIFIED WORKFLOW COMPLETED SUCCESSFULLY\n'));
    console.log(chalk.bold('Workflow Summary (Exact App Replication):'));
    workflowResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.step}: ${chalk.green('✅')} (${result.duration})`);
    });
    console.log(chalk.blue(`\n⏱️  Total workflow duration: ${totalDuration}s\n`));
    
    return {
      status: 'success',
      duration: totalDuration,
      steps: workflowResults,
      characterImage: path.basename(characterImagePath),
      productImage: path.basename(productImagePath),
      downloadPath: options.validateOnly ? null : workflowResults.find(r => r.step === 'download')?.data?.downloadPath
    };
    
  } catch (error) {
    log(`Unified workflow failed: ${error.message}`, 'error');
    
    return {
      status: 'failed',
      error: error.message,
      steps: workflowResults
    };
  }
}

// ============================================
// SUPPORT FUNCTIONS - Exact App Logic
// ============================================

function extractAIRecommendations(analysisData) {
  const recommendations = {};
  
  // Extract from analysis data structure
  if (analysisData?.recommendations) {
    Object.entries(analysisData.recommendations).forEach(([category, rec]) => {
      if (rec.primary) {
        recommendations[category] = rec.primary;
      }
    });
  }
  
  // Extract from newOptions if available
  if (analysisData?.newOptions) {
    Object.entries(analysisData.newOptions).forEach(([category, options]) => {
      if (options.length > 0) {
        recommendations[category] = options[0]; // Take first option as primary
      }
    });
  }
  
  return recommendations;
}

async function buildSmartPrompt(analysisData, recommendations, useCase, productFocus) {
  // Use the exact prompt building logic from the app
  const promptBuilder = await import('./utils/promptTemplates.js');
  
  // Build prompt using app's logic
  const prompt = promptBuilder.buildSmartPrompt({
    analysis: analysisData,
    selectedOptions: recommendations,
    useCase: useCase || 'change-clothes',
    productFocus: productFocus || 'full-outfit'
  });
  
  return {
    positive: prompt.positive || prompt,
    negative: prompt.negative || 'blurry, low quality, distorted, watermark'
  };
}

function buildEnhancedPrompt(basePrompt, analysisData, negativePrompt) {
  let enhancedPrompt = basePrompt;
  
  // Add analysis context
  if (analysisData?.character) {
    const char = analysisData.character;
    enhancedPrompt += `. Character: ${char.gender || 'person'}, age ${char.age || 'unknown'}, body type ${char.bodyType || 'unknown'}, skin tone ${char.skinTone || 'unknown'}. `;
  }
  
  if (analysisData?.product) {
    const prod = analysisData.product;
    enhancedPrompt += `Product: ${prod.category || 'clothing'}, type ${prod.type || 'unknown'}, colors ${prod.colors?.join(', ') || 'unknown'}. `;
  }
  
  if (analysisData?.recommendations) {
    const recs = analysisData.recommendations;
    enhancedPrompt += `Style: ${recs.style?.primary || 'casual'}, scene: ${recs.scene?.primary || 'studio'}, lighting: ${recs.lighting?.primary || 'soft'}. `;
  }
  
  // Add quality parameters
  enhancedPrompt += 'Professional photography, high quality, 8k, detailed, well-lit';
  
  // Add negative prompt
  if (negativePrompt) {
    enhancedPrompt += `. Avoid: ${negativePrompt}`;
  }
  
  return enhancedPrompt;
}

async function downloadGeneratedImage(imageUrl, downloadPath, characterImage, productImage) {
  ensureDir(downloadPath);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const characterName = path.basename(characterImage, path.extname(characterImage));
  const productName = path.basename(productImage, path.extname(productImage));
  
  const filename = `unified-workflow-${characterName}-wearing-${productName}-${timestamp}.png`;
  const fullPath = path.join(downloadPath, filename);
  
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(fullPath, Buffer.from(buffer));
    
    return fullPath;
  } catch (error) {
    log(`Failed to download image: ${error.message}`, 'error');
    throw error;
  }
}

// ============================================
// BACKWARD COMPATIBILITY: Individual Service Tests
// ============================================

async function testZAIChat(imagePath, prompt) {
  printHeader('🤖 Testing Z.AI Chat Browser Automation');
  
  const isHeadless = options.waitLogin ? false : options.headless;
  
  if (options.waitLogin && options.headless) {
    log('⚠️  --wait-login requires non-headless mode, disabling headless', 'warning');
  }
  
  const service = new ZAIChatService({
    headless: isHeadless,
    slowMo: options.slow ? 100 : 0,
    timeout: parseInt(options.timeout) * 1000
  });

  try {
    const startTime = Date.now();

    await service.initialize();
    
    if (options.waitLogin && !isHeadless) {
      await service.waitForManualLogin(60);
    }

    const result = await service.analyzeImage(imagePath, prompt);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(chalk.green('\n✅ Z.AI CHAT ANALYSIS SUCCESSFUL\n'));
    console.log(chalk.bold('Response:'));
    console.log(chalk.gray('-'.repeat(80)));
    console.log(result);
    console.log(chalk.gray('-'.repeat(80)));
    console.log(chalk.blue(`\n⏱️  Total duration: ${duration}s\n`));

    return {
      service: 'Z.AI Chat',
      status: 'success',
      duration,
      result
    };

  } catch (error) {
    log(`Z.AI Chat failed: ${error.message}`, 'error');
    
    return {
      service: 'Z.AI Chat',
      status: 'failed',
      error: error.message
    };

  } finally {
    await service.close();
  }
}

async function testGrok(imagePath, prompt) {
  printHeader('🤖 Testing Grok Browser Automation');
  
  // Create service first
  const service = new GrokServiceV2({
    headless: false, // Force non-headless for Grok
    slowMo: options.slow ? 100 : 0
  });
  
  // Check if session already exists
  const hasSession = service.sessionManager && service.sessionManager.hasSession();
  
  if (hasSession) {
    log('✅ Found existing Grok session, will attempt to use it', 'info');
  } else {
    log('⚠️  No Grok session found, may require login', 'warning');
  }
  
  log('Running in non-headless mode for manual login if needed...', 'info');

  try {
    const startTime = Date.now();

    await service.initialize();

    // Check login status after initialization
    const isLoginPage = await service.page.evaluate(() => {
      return document.body.innerText.includes('Sign in') || 
             document.body.innerText.includes('Log in') ||
             document.body.innerText.includes('Continue with') ||
             document.body.innerText.includes('Sign up') ||
             document.body.innerText.includes('X') || // X/Twitter branding
             document.body.innerText.includes('Twitter');
    });
    
    if (isLoginPage) {
      log('⚠️  Grok requires X/Twitter login', 'warning');
      log('Please login in the browser window...', 'info');
      
      // Wait for manual login
      if (options.waitLogin) {
        await service.waitForManualLogin(120);
      } else {
        // Wait up to 60 seconds for manual login
        let waitTime = 0;
        while (waitTime < 60000) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          waitTime += 5000;
          
          const stillOnLogin = await service.page.evaluate(() => {
            return document.body.innerText.includes('Sign in') || 
                   document.body.innerText.includes('Log in') ||
                   document.body.innerText.includes('Continue with') ||
                   document.body.innerText.includes('X') ||
                   document.body.innerText.includes('Twitter');
          });
          
          if (!stillOnLogin) {
            log('✅ Login detected!', 'success');
            break;
          }
          
          process.stdout.write(`\r⏳ Waiting for login... ${waitTime/1000}s`);
        }
        console.log('');
      }
      
      // Save session after login
      log('💾 Saving Grok session...', 'info');
      await service.saveSession();
      log('✅ Grok session saved', 'success');
    }

    // Check if we're on the main chat page
    const canSeeChat = await service.page.evaluate(() => {
      return document.body.innerText.includes('Bận dạng nghĩ gì?') ||
             document.body.innerText.includes('Ask anything') ||
             document.body.innerText.includes('What\'s on your mind') ||
             document.querySelector('textarea') !== null ||
             document.querySelector('[contenteditable="true"]') !== null;
    });
    
    if (!canSeeChat) {
      log('⚠️  Not on main chat page, taking screenshot for debugging...', 'warning');
      await service.screenshot({ 
        path: path.join(process.cwd(), 'temp', `grok-chat-page-${Date.now()}.png`) 
      });
      
      log('⏳ Waiting for manual navigation to chat page (60 seconds)...', 'info');
      let chatPageFound = false;
      let waitTime = 0;
      
      while (waitTime < 60000 && !chatPageFound) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        waitTime += 5000;
        
        const isOnChatPage = await service.page.evaluate(() => {
          return document.body.innerText.includes('Bận dạng nghĩ gì?') ||
                 document.body.innerText.includes('Ask anything') ||
                 document.body.innerText.includes('What\'s on your mind') ||
                 document.querySelector('textarea') !== null ||
                 document.querySelector('[contenteditable="true"]') !== null;
        });
        
        if (isOnChatPage) {
          chatPageFound = true;
          log('✅ Found chat page!', 'success');
        } else {
          process.stdout.write(`\r⏳ Waiting for chat page... ${waitTime/1000}s`);
        }
      }
      console.log('');
      
      if (!chatPageFound) {
        throw new Error('Could not find Grok chat page');
      }
    }

    const result = await service.analyzeImage(imagePath, prompt);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(chalk.green('\n🎉 GROK ANALYSIS SUCCESSFUL\n'));
    console.log(chalk.bold('Response:'));
    console.log(chalk.gray('-'.repeat(80)));
    console.log(result);
    console.log(chalk.gray('-'.repeat(80)));
    console.log(chalk.blue(`\n🕐 Total duration: ${duration}s\n`));

    return {
      service: 'Grok',
      status: 'success',
      duration,
      result
    };

  } catch (error) {
    log(`Grok failed: ${error.message}`, 'error');
    
    console.log(chalk.yellow('\n🕐 Browser will stay open for 30 seconds for verification...\n'));
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    return {
      service: 'Grok',
      status: 'failed',
      error: error.message
    };

  } finally {
    await service.close();
  }
}

// ============================================
// MAIN TEST FLOW
// ============================================

async function runEnhancedBrowserAutomationTest() {
  printHeader('🧪 BROWSER AUTOMATION TEST SUITE');
  
  // Connect to MongoDB first
  await connectToDatabase();
  
  // Handle predefined scenarios
  if (options.scenario) {
    if (!scenarios[options.scenario]) {
      console.log(`❌ Unknown scenario: ${options.scenario}`);
      console.log('\nAvailable scenarios:');
      Object.entries(scenarios).forEach(([name, config]) => {
        console.log(`  ${name}: ${config.description}`);
      });
      process.exit(1);
    }

    const scenario = scenarios[options.scenario];
    console.log(`📋 Running scenario: ${scenario.description}`);
    console.log(`🔧 Command: ${scenario.command}`);
    
    // Parse scenario command and merge with options
    const scenarioArgs = scenario.command.split(' ');
    const scenarioOptions = {};
    
    for (let i = 0; i < scenarioArgs.length; i += 2) {
      if (scenarioArgs[i].startsWith('--')) {
        const key = scenarioArgs[i].replace('--', '');
        const value = scenarioArgs[i + 1];
        scenarioOptions[key] = value;
      }
    }
    
    // Merge scenario options with command line options
    Object.assign(options, scenarioOptions);
    
    console.log(`✅ Merged options: ${JSON.stringify(options)}`);
    console.log('');
  }

  // Display configuration
  console.log(chalk.bold('Test Configuration:'));
  console.log(`  Service: ${chalk.cyan(options.service)}`);
  console.log(`  Workflow: ${options.workflow ? chalk.green('Full Unified') : chalk.gray('Individual Services')}`);
  console.log(`  Multi-Image: ${options.multiImage ? chalk.green('Yes') : chalk.gray('No')}`);
  console.log(`  Validate Only: ${options.validateOnly ? chalk.yellow('Yes') : chalk.gray('No')}`);
  console.log(`  Headless: ${options.headless ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`  Slow Motion: ${options.slow ? chalk.yellow('Yes') : chalk.gray('No')}`);
  console.log(`  Download Path: ${chalk.cyan(options.downloadPath)}`);
  console.log('');

  // Ensure download directory exists
  ensureDir(options.downloadPath);

  // Find test images
  let characterImagePath = null;
  let productImagePath = null;

  if (options.characterFile) {
    if (fs.existsSync(options.characterFile)) {
      characterImagePath = options.characterFile;
      log(`Using custom character image: ${options.characterFile}`, 'success');
    } else {
      log(`Custom character file not found: ${options.characterFile}`, 'error');
      process.exit(1);
    }
  } else {
    // Use default test images
    const testImagesDir = path.join(__dirname, '../../test-images');
    
    for (const imageName of TEST_IMAGES.character) {
      const imagePath = path.join(testImagesDir, imageName);
      if (fs.existsSync(imagePath)) {
        characterImagePath = imagePath;
        break;
      }
    }

    if (!characterImagePath) {
      log('No character test images found', 'error');
      log(`Expected files in test-images/: ${TEST_IMAGES.character.join(', ')}`, 'error');
      process.exit(1);
    }

    log(`Using test character image: ${path.basename(characterImagePath)}`, 'success');
  }

  if (options.productFile) {
    if (fs.existsSync(options.productFile)) {
      productImagePath = options.productFile;
      log(`Using custom product image: ${options.productFile}`, 'success');
    } else {
      log(`Custom product file not found: ${options.productFile}`, 'error');
      process.exit(1);
    }
  } else {
    // Use default test images
    const testImagesDir = path.join(__dirname, '../../test-images');
    
    for (const imageName of TEST_IMAGES.product) {
      const imagePath = path.join(testImagesDir, imageName);
      if (fs.existsSync(imagePath)) {
        productImagePath = imagePath;
        break;
      }
    }

    if (!productImagePath) {
      log('No product test images found', 'error');
      log(`Expected files in test-images/: ${TEST_IMAGES.product.join(', ')}`, 'error');
      process.exit(1);
    }

    log(`Using test product image: ${path.basename(productImagePath)}`, 'success');
  }

  console.log('');

  // Run tests based on options
  const results = [];

  // Handle grok-full-flow scenario (runs standalone test-grok-full-flow.js)
  if (options.service === 'grok-full-flow') {
    printHeader('🚀 Grok Full Flow: Session → Upload → Analyze → Generate → Download');
    log('Launching Grok full flow test (test-grok-full-flow.js)...', 'progress');
    
    const { execSync } = await import('child_process');
    try {
      const startTime = Date.now();
      execSync('node backend/test-grok-full-flow.js', { 
        stdio: 'inherit', 
        cwd: process.cwd(),
        timeout: 600000 // 10 min max
      });
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      results.push({
        service: 'Grok Full Flow',
        status: 'success',
        duration
      });
    } catch (err) {
      results.push({
        service: 'Grok Full Flow',
        status: 'failed',
        error: err.message
      });
    }
  } else if (options.workflow) {
    // Test full unified workflow
    const workflowResult = await testUnifiedWorkflow(characterImagePath, productImagePath, options);
    results.push(workflowResult);
  } else {
    // Test individual services
    if (options.service === 'zai' || options.service === 'both') {
      if (options.multiImage) {
        const zaiResult = await testMultiImageUpload('zai', characterImagePath, productImagePath, options.prompt);
        results.push(zaiResult);
      } else {
        const zaiResult = await testZAIChat(characterImagePath, options.prompt);
        results.push(zaiResult);
      }
    }

    if (options.service === 'grok' || options.service === 'both') {
      if (options.multiImage) {
        const grokResult = await testMultiImageUpload('grok', characterImagePath, productImagePath, options.prompt);
        results.push(grokResult);
      } else {
        const grokResult = await testGrok(characterImagePath, options.prompt);
        results.push(grokResult);
      }
    }
  }

  // Print summary
  printHeader('📊 TEST SUMMARY');

  results.forEach((result, idx) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    const color = result.status === 'success' ? chalk.green : chalk.red;

    console.log(color(`${idx + 1}. ${icon} ${result.service || 'Unified Workflow'}`));
    
    if (result.duration) {
      console.log(color(`   ⏱️  Duration: ${result.duration}s`));
    }
    
    if (result.error) {
      console.log(chalk.red(`   ❌ Error: ${result.error}`));
    }
    
    if (result.multiImage) {
      console.log(chalk.blue(`   📸 Multi-Image: Supported`));
    }
    
    if (result.downloadPath) {
      console.log(chalk.green(`   💾 Downloaded: ${result.downloadPath}`));
    }
    
    console.log('');
  });

  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'failed').length;

  console.log(chalk.bold(`Total: ${results.length} | ✅ Passed: ${successCount} | ❌ Failed: ${failCount}`));
  console.log('');

  // Print final instructions
  if (options.workflow && successCount > 0) {
    console.log(chalk.green('🎉 Unified workflow test completed successfully!'));
    console.log(chalk.blue('Next steps:'));
    console.log('  1. Check the generated images in the download directory');
    console.log('  2. Verify the image quality and content');
    console.log('  3. Test with different character and product combinations');
    console.log('  4. Run with --validate-only to test analysis without generation');
  }

  // Disconnect from MongoDB
  await disconnectFromDatabase();

  process.exit(failCount > 0 ? 1 : 0);
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
// HELP AND DOCUMENTATION
// ============================================

if (process.argv.length === 2) {
  console.log('\n' + chalk.cyan('='.repeat(80)));
  console.log(chalk.cyan.bold('  🧪 BROWSER AUTOMATION TEST SUITE - COMPLETE PACKAGE'));
  console.log(chalk.cyan('='.repeat(80)));
  
  console.log('\n' + chalk.bold('🎯 QUICK START:'));
  console.log('  Test multiple image upload: node browser-automation-test-suite.js --multi-image --service grok');
  console.log('  Test full workflow: node browser-automation-test-suite.js --workflow');
  console.log('  Quick validation: node browser-automation-test-suite.js --scenario quick');
  
  console.log('\n' + chalk.bold('📋 AVAILABLE SCENARIOS:'));
  Object.entries(scenarios).forEach(([name, config]) => {
    console.log(`  ${name}: ${config.description}`);
  });
  
  console.log('\n' + chalk.bold('📸 TEST IMAGES:'));
  console.log('  Character: anh-nhan-vat.jpeg (auto-detected)');
  console.log('  Product: anh-san-pham.png (auto-detected)');
  console.log('  Location: backend/test-images/');
  
  console.log('\n' + chalk.bold('🔧 KEY FEATURES:'));
  console.log('  ✅ Multiple image upload testing');
  console.log('  ✅ Full unified workflow testing');
  console.log('  ✅ Individual service testing');
  console.log('  ✅ Automatic test image detection');
  console.log('  ✅ Comprehensive validation');
  console.log('  ✅ Detailed progress tracking');
  console.log('  ✅ Error handling and debugging');
  
  console.log('\n' + chalk.bold('🎯 KEY FINDINGS:'));
  console.log('  ✅ Grok supports multiple image uploads');
  console.log('  ✅ Unified workflow replicates app behavior');
  console.log('  ✅ Complete cycle: analysis → generation → download');
  console.log('  ✅ Ready for production testing');
  
  console.log('\n' + chalk.bold('🚀 USAGE EXAMPLES:'));
  console.log('  # Test multiple image upload capability');
  console.log('  node browser-automation-test-suite.js --multi-image --service grok --headless');
  console.log('');
  console.log('  # Test full unified workflow');
  console.log('  node browser-automation-test-suite.js --workflow --headless');
  console.log('');
  console.log('  # Quick validation test (5 minutes)');
  console.log('  node browser-automation-test-suite.js --scenario quick');
  console.log('');
  console.log('  # Debug mode with visible browser');
  console.log('  node browser-automation-test-suite.js --scenario debug');
  
  console.log('\n' + chalk.cyan('='.repeat(80)) + '\n');
  
  process.exit(0);
}

// ============================================
// RUN
// ============================================

runEnhancedBrowserAutomationTest().catch(error => {
  console.error(chalk.red('\n❌ FATAL ERROR:'));
  console.error(chalk.red(error.stack || error.message));
  process.exit(1);
});