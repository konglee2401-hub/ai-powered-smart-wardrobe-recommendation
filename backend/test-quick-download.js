#!/usr/bin/env node

/**
 * Quick Test: Download first image from Google Flow project
 */

import GoogleFlowAutomationService from './services/googleFlowAutomationService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testQuickDownload() {
  console.log('\n' + '='.repeat(80));
  console.log('  TEST: Quick Download Test');
  console.log('='.repeat(80) + '\n');

  const service = new GoogleFlowAutomationService({
    type: 'image',
    projectId: 'c9d5fea9-63e5-4d21-ac72-6830091fdbc0',
    headless: false,
    outputDir: path.join(__dirname, './temp/download-test')
  });

  try {
    // Initialize
    console.log('🚀 Initializing service...');
    await service.init();
    console.log('✅ Initialized\n');

    // Navigate
    console.log('🔗 Navigating to Google Flow...');
    await service.navigateToFlow();
    console.log('✅ Navigated\n');

    // Wait for page to load
    console.log('⏳ Waiting for page ready...');
    await service.waitForPageReady();
    console.log('✅ Page ready\n');

    // Get first href
    console.log('🔍 Getting first image href...');
    const firstHref = await service.page.evaluate(() => {
      const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
      if (links.length === 0) return null;
      return links[0].getAttribute('href');
    });

    if (!firstHref) {
      console.log('❌ No images found on page\n');
      await service.close();
      process.exit(1);
    }

    console.log(`✅ Found first image: ${firstHref?.substring(0, 80)}...\n`);

    // Download it
    console.log('⬇️  Downloading first image...\n');
    const downloadedFile = await service.downloadItemViaContextMenu(firstHref);

    if (downloadedFile) {
      console.log(`\n✅ TEST PASSED`);
      console.log(`📁 Downloaded to: ${downloadedFile}\n`);
    } else {
      console.log(`\n❌ TEST FAILED: Download returned null\n`);
      process.exit(1);
    }

    await service.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    await service.close();
    process.exit(1);
  }
}

testQuickDownload();
