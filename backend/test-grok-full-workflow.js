#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import GrokServiceV2 from './services/browser/grokServiceV2.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CLI CONFIGURATION
// ============================================

const program = new Command();

program
  .name('test-grok-full-workflow')
  .description('Test Grok full automation workflow')
  .version('1.0.0')
  .option('-c, --character <path>', 'Character/person image path')
  .option('-l, --clothing <path>', 'Clothing image path')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('--video', 'Also generate video', false)
  .option('--headless', 'Run in headless mode', false)
  .option('--slow', 'Slow down for debugging', false)
  .parse(process.argv);

const options = program.opts();

// ============================================
// MAIN WORKFLOW
// ============================================

async function runGrokFullWorkflow() {
  console.log('\n' + chalk.cyan('='.repeat(80)));
  console.log(chalk.cyan.bold('  🎯 GROK FULL AUTOMATION WORKFLOW'));
  console.log(chalk.cyan('='.repeat(80)) + '\n');

  // Find images
  let characterImage = options.character;
  let clothingImage = options.clothing;

  if (!characterImage || !clothingImage) {
    const testImagesDir = path.join(__dirname, 'test-images');
    
    if (!characterImage) {
      characterImage = path.join(testImagesDir, 'anh nhan vat.jpeg');
    }
    
    if (!clothingImage) {
      clothingImage = path.join(testImagesDir, 'ao phong.jpg');
    }
  }

  // Verify images exist
  if (!fs.existsSync(characterImage)) {
    console.log(chalk.red(`❌ Character image not found: ${characterImage}`));
    process.exit(1);
  }

  if (!fs.existsSync(clothingImage)) {
    console.log(chalk.red(`❌ Clothing image not found: ${clothingImage}`));
    process.exit(1);
  }

  console.log(chalk.bold('Configuration:'));
  console.log(`  Character: ${chalk.cyan(path.basename(characterImage))}`);
  console.log(`  Clothing: ${chalk.cyan(path.basename(clothingImage))}`);
  console.log(`  Output: ${chalk.cyan(options.output)}`);
  console.log(`  Generate Video: ${options.video ? chalk.green('Yes') : chalk.gray('No')}`);
  console.log(`  Headless: ${options.headless ? chalk.yellow('Yes') : chalk.green('No')}`);
  console.log('');

  // Create output directory
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true });
  }

  // Initialize Grok
  const service = new GrokServiceV2({
    headless: options.headless,
    slowMo: options.slow ? 100 : 0
  });

  try {
    const startTime = Date.now();

    // Initialize
    console.log(chalk.blue('🚀 Initializing Grok...\n'));
    await service.initialize();

    // Run full workflow
    const result = await service.fullWorkflow(
      characterImage,
      clothingImage,
      {
        generateVideo: options.video,
        outputPath: path.join(options.output, `generated-${Date.now()}.png`),
        videoOutputPath: options.video ? path.join(options.output, `generated-${Date.now()}.mp4`) : null
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display results
    console.log('\n' + chalk.green('='.repeat(80)));
    console.log(chalk.green.bold('  ✅ WORKFLOW COMPLETE'));
    console.log(chalk.green('='.repeat(80)) + '\n');

    console.log(chalk.bold('Results:'));
    console.log('');
    
    console.log(chalk.cyan('📊 Analysis:'));
    console.log(chalk.gray(result.analysis.slice(0, 500) + '...'));
    console.log('');
    
    console.log(chalk.cyan('🎨 Generated Image:'));
    console.log(chalk.gray(`  URL: ${result.generatedImage.url}`));
    if (result.generatedImage.path) {
      console.log(chalk.green(`  Saved: ${result.generatedImage.path}`));
    }
    console.log('');
    
    if (result.generatedVideo) {
      console.log(chalk.cyan('🎬 Generated Video:'));
      console.log(chalk.gray(`  URL: ${result.generatedVideo.url}`));
      if (result.generatedVideo.path) {
        console.log(chalk.green(`  Saved: ${result.generatedVideo.path}`));
      }
      console.log('');
    }
    
    console.log(chalk.blue(`⏱️  Total duration: ${duration}s`));
    console.log('');

    // Keep browser open for verification
    if (!options.headless) {
      console.log(chalk.gray('Keeping browser open for 10 seconds...'));
      await service.page.waitForTimeout(10000);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Workflow failed:'), error.message);
    process.exit(1);
  } finally {
    await service.close();
  }
}

// ============================================
// RUN
// ============================================

runGrokFullWorkflow().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
