#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GoogleFlowAutomationService from '../services/googleFlowAutomationService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const testImagesDir = path.join(backendRoot, 'test-images');
const outputDir = path.join(backendRoot, 'temp', 'test-google-flow-step2');

function getTwoTestImages() {
  if (!fs.existsSync(testImagesDir)) {
    throw new Error(`Test images folder not found: ${testImagesDir}`);
  }

  const files = fs.readdirSync(testImagesDir)
    .filter(name => /\.(png|jpe?g|webp)$/i.test(name))
    .map(name => path.join(testImagesDir, name));

  if (files.length < 2) {
    throw new Error(`Need at least 2 images in ${testImagesDir}, found ${files.length}`);
  }

  return [files[0], files[1]];
}

async function run() {
  const [characterImage, productImage] = getTwoTestImages();
  const cliPrompt = process.argv.slice(2).join(' ').trim();

  const prompt1 = cliPrompt || 'Studio fashion test, keep person identity unchanged, apply outfit from reference image, photorealistic, high detail.';
  const prompt2 = `${prompt1} Full body shot, clean background.`;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('\n' + '='.repeat(72));
  console.log('TEST: GOOGLE FLOW STEP-2 RETRY FLOW (2 IMAGES + 2 PROMPTS)');
  console.log('='.repeat(72));
  console.log(`Character image: ${characterImage}`);
  console.log(`Product image:   ${productImage}`);
  console.log(`Output dir:      ${outputDir}`);
  console.log(`Prompt #1:       ${prompt1.substring(0, 100)}...`);
  console.log(`Prompt #2:       ${prompt2.substring(0, 100)}...\n`);

  const service = new GoogleFlowAutomationService({
    type: 'image',
    headless: false,
    outputDir,
    debugMode: false,
    imageCount: 1,
    timeouts: {
      generation: 180000
    }
  });

  const result = await service.generateMultiple(characterImage, productImage, [prompt1, prompt2], { outputDir });

  console.log('\n' + '-'.repeat(72));
  console.log('RESULT SUMMARY');
  console.log('-'.repeat(72));
  console.log(`Success: ${result?.success}`);
  console.log(`Generated: ${result?.totalGenerated || 0}/${result?.totalRequested || 0}`);

  (result?.results || []).forEach((item, idx) => {
    console.log(`\n[${idx + 1}] success=${item.success}`);
    if (item.downloadedFile) console.log(`    file: ${item.downloadedFile}`);
    if (item.error) console.log(`    error: ${item.error}`);
  });

  if (!result?.success) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('\n❌ Test script failed:', error.message);
  process.exit(1);
});
