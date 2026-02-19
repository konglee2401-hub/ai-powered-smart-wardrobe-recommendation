#!/usr/bin/env node

import GrokService from './services/browser/grokService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('\n🔍 GROK DEBUG - Checking page content\n');

  const service = new GrokService({
    headless: false
  });

  try {
    // Initialize
    await service.initialize();
    
    console.log('⏳ Waiting 5 seconds, then checking page content...\n');
    await service.page.waitForTimeout(5000);

    // Get page info
    const pageTitle = await service.page.title();
    const pageUrl = service.page.url();
    const pageText = await service.page.evaluate(() => document.body.innerText.substring(0, 1000));
    
    console.log('📄 PAGE INFO:');
    console.log(`   Title: ${pageTitle}`);
    console.log(`   URL: ${pageUrl}`);
    console.log(`   Text (first 1000 chars):\n${pageText}\n`);

    // Check for upload input
    console.log('🔍 Checking for upload inputs...');
    const uploadSelectors = [
      'input[type="file"]',
      'input[accept*="image"]',
      '[data-testid="file-upload"]',
      '[aria-label*="upload"]',
      '[aria-label*="attach"]',
      'button[aria-label*="image"]'
    ];

    for (const selector of uploadSelectors) {
      const found = await service.page.$(selector);
      console.log(`   ${selector}: ${found ? '✅ FOUND' : '❌ not found'}`);
    }

    // Check for Cloudflare
    console.log('\n🔍 Checking for Cloudflare...');
    const cloudflareCheck = await service.page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const hasCloudflare = text.includes('cloudflare') || 
                          text.includes('verify you are human') ||
                          text.includes('challenge');
      const iframeCheck = document.querySelector('iframe[src*="challenges.cloudflare.com"]') !== null;
      return {
        textDetected: hasCloudflare,
        iframeDetected: iframeCheck,
        pageText: text.substring(0, 500)
      };
    });

    console.log(`   Text detection: ${cloudflareCheck.textDetected ? '❌ Cloudflare detected' : '✅ No Cloudflare text'}`);
    console.log(`   Iframe detection: ${cloudflareCheck.iframeDetected ? '❌ Cloudflare iframe found' : '✅ No Cloudflare iframe'}`);
    
    if (cloudflareCheck.textDetected) {
      console.log(`   Page text: ${cloudflareCheck.pageText}`);
    }

    // Check for login indicators
    console.log('\n🔍 Checking for login/auth...');
    const authCheck = await service.page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        hasSignIn: text.includes('sign in') || text.includes('log in'),
        hasGrokUI: text.includes('grok') || text.includes('send a message'),
        allText: text.substring(0, 1000)
      };
    });

    console.log(`   Sign in detected: ${authCheck.hasSignIn ? '⚠️  Yes' : '✅ No (Logged in)'}`);
    console.log(`   Grok UI detected: ${authCheck.hasGrokUI ? '✅ Yes' : '❌ No'}`);

    console.log('\n✅ Debug complete - Check browser window for manual verification');
    await service.page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await service.close();
  }
}

main();
