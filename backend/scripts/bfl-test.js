#!/usr/bin/env node
/**
 * BFL Playground Automation Test Script
 * 
 * Tests the BFL Playground automation capabilities:
 * - Session loading
 * - Prompt input
 * - Image generation
 * - Download
 * 
 * Usage:
 *   node scripts/bfl-test.js
 *   node scripts/bfl-test.js --prompt "A beautiful sunset"
 *   node scripts/bfl-test.js --image ./test-image.jpg
 */

import BFLPlaygroundService from '../services/browser/bflPlaygroundService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line args
const args = process.argv.slice(2);

const promptIndex = args.indexOf('--prompt');
const promptArg = promptIndex >= 0 ? args.slice(promptIndex + 1).join(' ') : null;

const imageIndex = args.indexOf('--image');
const imageArg = imageIndex >= 0 ? args[imageIndex + 1] : null;

const headlessIndex = args.indexOf('--headless');
const headless = headlessIndex >= 0 ? args[headlessIndex + 1] !== 'false' : false;

// Default test prompt
const DEFAULT_PROMPT = 'A beautiful woman wearing a red summer dress, standing in a flower garden, golden hour lighting, photorealistic, high detail';

/**
 * Main test function
 */
async function main() {
  console.log('\n🧪 BFL PLAYGROUND AUTOMATION TEST');
  console.log('='.repeat(70));
  console.log('');
  
  // Check for session
  const sessionPath = path.join(__dirname, '../sessions/bfl-session.json');
  if (!fs.existsSync(sessionPath)) {
    console.log('❌ No saved session found!');
    console.log('');
    console.log('Please login first:');
    console.log('   node scripts/bfl-login.js');
    console.log('');
    process.exit(1);
  }
  
  // Display session info
  const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  console.log('📦 Session Info:');
  console.log(`   Saved: ${session.metadata?.savedAt}`);
  console.log(`   URL: ${session.url}`);
  console.log(`   Cookies: ${session.cookies?.length}`);
  console.log('');
  
  // Test parameters
  const testPrompt = promptArg || DEFAULT_PROMPT;
  const testImage = imageArg ? path.resolve(imageArg) : null;
  
  console.log('🎯 Test Parameters:');
  console.log(`   Prompt: ${testPrompt.substring(0, 80)}...`);
  if (testImage) {
    console.log(`   Reference Image: ${testImage}`);
  }
  console.log(`   Headless: ${headless}`);
  console.log('');
  
  // Create service
  const service = new BFLPlaygroundService({
    headless,
    timeout: 120000
  });
  
  try {
    // Initialize
    console.log('🚀 Initializing service...');
    const { isLoggedIn } = await service.initialize();
    
    if (!isLoggedIn) {
      console.log('❌ Not logged in!');
      console.log('   Run: node scripts/bfl-login.js');
      await service.close();
      process.exit(1);
    }
    
    console.log('✅ Logged in successfully');
    console.log('');
    
    // Generate image
    console.log('🎨 Generating image...');
    const result = await service.generateImage(testPrompt, {
      referenceImage: testImage,
      download: true,
      maxWait: 180000
    });
    
    console.log('');
    console.log('✅ GENERATION SUCCESSFUL!');
    console.log('='.repeat(70));
    console.log(`📁 Saved to: ${result.path}`);
    console.log(`🔗 URL: ${result.url?.substring(0, 80)}...`);
    console.log(`🎯 Provider: ${result.provider}`);
    console.log(`🤖 Model: ${result.model}`);
    console.log('');
    
    // Verify file exists
    if (result.path && fs.existsSync(result.path)) {
      const stats = fs.statSync(result.path);
      console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED!');
    console.error('='.repeat(70));
    console.error(`Error: ${error.message}`);
    console.error('');
    
    // Common troubleshooting tips
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure you are logged in: node scripts/bfl-login.js');
    console.log('   2. Check if BFL credits are available');
    console.log('   3. Try with --headless false for debugging');
    console.log('   4. Check temp/ folder for error screenshots');
    console.log('');
    
    process.exit(1);
    
  } finally {
    await service.close();
  }
}

main().catch(console.error);
