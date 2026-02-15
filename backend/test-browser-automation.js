#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import ZAIChatService from './services/browser/zaiChatService.js';
import GrokService from './services/browser/grokService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CLI CONFIGURATION
// ============================================

const program = new Command();

program
  .name('test-browser-automation')
  .description('Test browser automation for Z.AI Chat and Grok')
  .version('1.0.0')
  .option('-s, --service <name>', 'Service to test (zai, grok, both)', 'both')
  .option('-f, --file <path>', 'Image file path')
  .option('-p, --prompt <text>', 'Analysis prompt', 'Describe this image in detail, including colors, style, and any text or objects visible.')
  .option('--headless', 'Run in headless mode (no browser window)', false)
  .option('--slow', 'Slow down actions for debugging', false)
  .option('--screenshot', 'Take screenshots during process', false)
  .option('--wait-login', 'Wait for manual login (non-headless only)', false)
  .option('--timeout <seconds>', 'Timeout in seconds', '90')
  .parse(process.argv);

const options = program.opts();

// ============================================
// TEST CONFIGURATION
// ============================================

const TEST_IMAGES = [
  'anh nhan vat.jpeg',
  'ao phong.jpg'
];

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
    default:
      console.log(`[${timestamp}] ${message}`);
  }
}

function printHeader(title) {
  console.log('\n' + chalk.cyan('='.repeat(80)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('='.repeat(80)) + '\n');
}

// ============================================
// TEST FUNCTIONS
// ============================================

async function testZAIChat(imagePath, prompt) {
  printHeader('🤖 Testing Z.AI Chat Browser Automation');
  
  // Force non-headless if wait-login is enabled
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

    // Initialize
    await service.initialize();
    
    // Wait for manual login if requested
    if (options.waitLogin && !isHeadless) {
      await service.waitForManualLogin(60);
    }

    // Analyze image
    const result = await service.analyzeImage(imagePath, prompt);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display result
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
  
  log('⚠️  Grok requires X/Twitter authentication', 'warning');
  log('Running in non-headless mode for manual login...', 'info');
  
  const service = new GrokService({
    headless: false, // Force non-headless for Grok
    slowMo: options.slow ? 100 : 0
  });

  try {
    const startTime = Date.now();

    // Initialize
    await service.initialize();

    // Analyze image
    const result = await service.analyzeImage(imagePath, prompt);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display result
    console.log(chalk.green('\n✅ GROK ANALYSIS SUCCESSFUL\n'));
    console.log(chalk.bold('Response:'));
    console.log(chalk.gray('-'.repeat(80)));
    console.log(result);
    console.log(chalk.gray('-'.repeat(80)));
    console.log(chalk.blue(`\n⏱️  Total duration: ${duration}s\n`));

    return {
      service: 'Grok',
      status: 'success',
      duration,
      result
    };

  } catch (error) {
    log(`Grok failed: ${error.message}`, 'error');
    
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

async function runBrowserAutomationTest() {
  printHeader('🧪 BROWSER AUTOMATION TEST');

  // Display configuration
  console.log(chalk.bold('Test Configuration:'));
  console.log(`  Service: ${chalk.cyan(options.service)}`);
  console.log(`  Headless: ${options.headless ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log(`  Slow Motion: ${options.slow ? chalk.yellow('Yes') : chalk.gray('No')}`);
  console.log(`  Screenshot: ${options.screenshot ? chalk.green('Yes') : chalk.gray('No')}`);
  console.log(`  Prompt: ${chalk.gray(options.prompt.slice(0, 60))}...`);
  console.log('');

  // Find test image
  let testImagePath = null;

  if (options.file) {
    if (fs.existsSync(options.file)) {
      testImagePath = options.file;
      log(`Using custom image: ${options.file}`, 'info');
    } else {
      log(`Custom file not found: ${options.file}`, 'error');
      process.exit(1);
    }
  } else {
    const testImagesDir = path.join(__dirname, 'test-images');
    
    for (const imageName of TEST_IMAGES) {
      const imagePath = path.join(testImagesDir, imageName);
      if (fs.existsSync(imagePath)) {
        testImagePath = imagePath;
        break;
      }
    }

    if (!testImagePath) {
      log('No test images found', 'error');
      log(`Expected files in test-images/: ${TEST_IMAGES.join(', ')}`, 'error');
      process.exit(1);
    }

    log(`Using test image: ${path.basename(testImagePath)}`, 'success');
  }

  console.log('');

  // Run tests
  const results = [];

  if (options.service === 'zai' || options.service === 'both') {
    const zaiResult = await testZAIChat(testImagePath, options.prompt);
    results.push(zaiResult);
  }

  if (options.service === 'grok' || options.service === 'both') {
    const grokResult = await testGrok(testImagePath, options.prompt);
    results.push(grokResult);
  }

  // Print summary
  printHeader('📊 TEST SUMMARY');

  results.forEach((result, idx) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    const color = result.status === 'success' ? chalk.green : chalk.red;

    console.log(color(`${idx + 1}. ${icon} ${result.service}`));
    
    if (result.duration) {
      console.log(color(`   ⏱️  Duration: ${result.duration}s`));
    }
    
    if (result.error) {
      console.log(chalk.red(`   ❌ Error: ${result.error}`));
    }
    
    console.log('');
  });

  const successCount = results.filter(r => r.status === 'success').length;
  const failCount = results.filter(r => r.status === 'failed').length;

  console.log(chalk.bold(`Total: ${results.length} | ✅ Passed: ${successCount} | ❌ Failed: ${failCount}`));
  console.log('');

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
// RUN
// ============================================

runBrowserAutomationTest().catch(error => {
  console.error(chalk.red('\n❌ FATAL ERROR:'));
  console.error(chalk.red(error.stack || error.message));
  process.exit(1);
});
