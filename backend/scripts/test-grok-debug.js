#!/usr/bin/env node

/**
 * Debug Grok Session & Cloudflare
 * 
 * Checks if Grok has valid saved session and can load it properly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GrokServiceV2 from '../services/browser/grokServiceV2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_FILE_V1 = path.join(__dirname, '../.sessions/grok-session-complete.json');
const SESSION_FILE_V2 = path.join(__dirname, '../.sessions/grok-session-backup.json');
const SESSION_FILE_DATA = path.join(__dirname, '../data/sessions/grok-session.json');

async function checkSessionFile(filepath, name) {
  console.log(`\n📂 Checking: ${name}`);
  console.log(`   Path: ${filepath}`);
  
  if (!fs.existsSync(filepath)) {
    console.log(`   ❌ File does not exist`);
    return false;
  }

  try {
    const sessionData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    console.log(`   ✅ File exists`);
    console.log(`      - Cookies: ${sessionData.cookies?.length || 0}`);
    console.log(`      - LocalStorage: ${Object.keys(sessionData.localStorage || {}).length}`);
    
    // Check expiration
    if (sessionData.expiresAt) {
      const expiresAt = new Date(sessionData.expiresAt);
      const isValid = new Date() < expiresAt;
      console.log(`      - Valid: ${isValid ? '✅ Yes' : '❌ Expired'}`);
      if (!isValid) {
        console.log(`        Expired at: ${expiresAt.toLocaleString()}`);
      }
    }

    // Show auth-related cookies
    const authCookies = sessionData.cookies?.filter(c => 
      c.name.includes('cf') || c.name.includes('sso') || c.name.includes('auth')
    );
    if (authCookies?.length > 0) {
      console.log(`      - Auth cookies: ${authCookies.map(c => c.name).join(', ')}`);
    }

    return true;
  } catch (e) {
    console.log(`   ❌ Error reading: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('🔍 Debugging Grok Session & Cloudflare\n');

  console.log('📋 Step 1: Check Session Files');
  const hasV1 = await checkSessionFile(SESSION_FILE_V1, 'V1: .sessions/grok-session-complete.json');
  const hasV2 = await checkSessionFile(SESSION_FILE_V2, 'V2: .sessions/grok-session-backup.json');
  const hasData = await checkSessionFile(SESSION_FILE_DATA, 'Data: data/sessions/grok-session.json');

  if (!hasV1 && !hasV2 && !hasData) {
    console.log('\n❌ No Grok session file found anywhere!');
    console.log('\n💡 Solution:');
    console.log('   1. Run: node scripts/grok-session-capture.js --mode capture');
    console.log('   2. Login manually to Grok when browser opens');
    console.log('   3. Press ENTER in terminal when done');
    console.log('   4. Then test again');
    process.exit(1);
  }

  console.log('\n📋 Step 2: Test GrokServiceV2 initialization');
  const service = new GrokServiceV2();

  try {
    console.log('\n🚀 Starting initialization...\n');
    
    // Check current navigation URL
    console.log(`📍 Project URL: ${service.navigationUrl}`);
    
    // Initialize
    await service.initialize();
    
    console.log('\n✅ GrokServiceV2 initialized\n');

    console.log('📋 Step 3: Check authentication status');
    const finalCheckResult = await service.page.evaluate(() => {
      const pageText = document.body.innerText;
      return {
        hasImages: pageText.toLowerCase().includes('image') || pageText.toLowerCase().includes('generate'),
        hasVideo: pageText.toLowerCase().includes('video'),
        hasInput: !!document.querySelector('[contenteditable="true"]') || !!document.querySelector('textarea'),
        hasChallengeElements: !!(
          document.querySelector('[id*="challenge"]') ||
          document.querySelector('[class*="cloudflare"]') ||
          document.querySelector('input[type="checkbox"]')
        ),
        url: window.location.href,
        title: document.title,
        readyState: document.readyState
      };
    });

    console.log(`\n✅ Final Check Results:`);
    console.log(`   URL: ${finalCheckResult.url}`);
    console.log(`   Title: ${finalCheckResult.title}`);
    console.log(`   Input ready: ${finalCheckResult.hasInput ? '✅ Yes' : '❌ No'}`);
    console.log(`   Cloudflare elements: ${finalCheckResult.hasChallengeElements ? '⚠️ Still present' : '✅ Cleared'}`);
    console.log(`   Images feature: ${finalCheckResult.hasImages ? '✅ Yes' : '❌ No'}`);
    console.log(`   Video feature: ${finalCheckResult.hasVideo ? '✅ Yes' : '❌ No'}`);

    if (finalCheckResult.hasInput && !finalCheckResult.hasChallengeElements) {
      console.log('\n✅ GrokServiceV2 READY FOR AUTOMATION!');
      console.log('   - Session loaded successfully');
      console.log('   - No Cloudflare challenges');
      console.log('   - Chat input ready');
    } else if (finalCheckResult.hasChallengeElements) {
      console.log('\n⚠️  Cloudflare challenge still detected!');
      console.log('   This may require:');
      console.log('   1. Waiting longer for automatic verification');
      console.log('   2. Updating the session (run grok-session-capture.js --mode capture)');
      console.log('   3. Manual browser verification');
    } else {
      console.log('\n⚠️  Chat input not ready yet, but continuing...');
    }

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('\nDebugging tips:');
    console.error('1. Check if session file needs refresh:');
    console.error('   node scripts/grok-session-capture.js --mode info');
    console.error('2. Update session if expired:');
    console.error('   node scripts/grok-session-capture.js --mode refresh');
    console.error('3. If still failing, capture fresh session:');
    console.error('   node scripts/grok-session-capture.js --mode capture');
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    console.log('\n🔧 Closing browser...');
    if (service.browser) {
      await service.close();
    }
    console.log('✅ Done\n');
  }
}

main().catch(console.error);
