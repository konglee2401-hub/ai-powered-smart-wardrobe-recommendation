#!/usr/bin/env node

/**
 * ChatGPT Debug Test Script
 * 
 * Purpose: Test ChatGPT behavior in different scenarios:
 * 1. With saved session (login expected)
 * 2. Without session (logout state)
 * 3. Debug HTML structure for response extraction
 * 
 * Usage:
 *   node scripts/test-chatgpt-debug.js --mode session
 *   node scripts/test-chatgpt-debug.js --mode no-session
 *   node scripts/test-chatgpt-debug.js --mode html-dump
 */

import ChatGPTService from '../services/browser/chatgptService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEBUG_OUTPUT_DIR = path.join(__dirname, '../debug-output/chatgpt-tests');
if (!fs.existsSync(DEBUG_OUTPUT_DIR)) {
  fs.mkdirSync(DEBUG_OUTPUT_DIR, { recursive: true });
}

/**
 * Test 1: With saved session (normal login flow expected)
 */
async function testWithSession() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: ChatGPT WITH SAVED SESSION');
  console.log('='.repeat(80));
  
  const service = new ChatGPTService({
    flowId: 'test-with-session',
    debug: true
  });
  
  try {
    await service.initialize();
    console.log('✅ Service initialized\n');
    
    // Navigate to ChatGPT
    await service.goto('https://chatgpt.com', { waitUntil: 'networkidle2' });
    console.log('✅ Navigated to ChatGPT\n');
    
    // Wait and check auth status
    await service.page.waitForTimeout(3000);
    
    const authStatus = await service.page.evaluate(() => {
      const hasUserMenu = !!document.querySelector('[data-testid="user-menu"]');
      const hasLoginBtn = !!document.querySelector('button:has-text("Sign in")');
      const title = document.title;
      const bodyClass = document.body.className;
      
      return {
        hasUserMenu,
        hasLoginBtn,
        isLikelyLoggedIn: hasUserMenu && !hasLoginBtn,
        pageTitle: title,
        bodyClass
      };
    });
    
    console.log('📊 Authentication Status:');
    console.log(`   - Has user menu: ${authStatus.hasUserMenu}`);
    console.log(`   - Has login button: ${authStatus.hasLoginBtn}`);
    console.log(`   - Likely logged in: ${authStatus.isLikelyLoggedIn}`);
    console.log(`   - Page title: ${authStatus.pageTitle}`);
    console.log(`   - Body class: ${authStatus.bodyClass}\n`);
    
    // Save session status
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionStatus = {
      timestamp,
      test: 'with-session',
      authStatus,
      sessionPath: service.sessionPath,
      profileDir: service.profileDir
    };
    
    fs.writeFileSync(
      path.join(DEBUG_OUTPUT_DIR, `test-with-session-${timestamp}.json`),
      JSON.stringify(sessionStatus, null, 2)
    );
    
    // Save HTML snapshot
    const html = await service.page.content();
    fs.writeFileSync(
      path.join(DEBUG_OUTPUT_DIR, `test-with-session-${timestamp}.html`),
      html
    );
    
    console.log(`📁 Saved debug files:`);
    console.log(`   - Status: ${path.join(DEBUG_OUTPUT_DIR, `test-with-session-${timestamp}.json`)}`);
    console.log(`   - HTML: ${path.join(DEBUG_OUTPUT_DIR, `test-with-session-${timestamp}.html`)}\n`);
    
    await service.close();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await service.close();
    throw error;
  }
}

/**
 * Test 2: Without saved session (logout/fresh state)
 */
async function testWithoutSession() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: ChatGPT WITHOUT SAVED SESSION (FRESH STATE)');
  console.log('='.repeat(80));
  
  // Use temp profile without saved session
  const testProfileDir = path.join(DEBUG_OUTPUT_DIR, 'temp-profile');
  if (fs.existsSync(testProfileDir)) {
    fs.rmSync(testProfileDir, { recursive: true });
  }
  fs.mkdirSync(testProfileDir, { recursive: true });
  
  const service = new ChatGPTService({
    flowId: 'test-no-session',
    debug: true,
    userDataDir: testProfileDir  // Use temp profile, ignore default session
  });
  
  try {
    await service.initialize();
    console.log('✅ Service initialized (with fresh profile)\n');
    
    // Navigate to ChatGPT
    await service.goto('https://chatgpt.com', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Navigated to ChatGPT\n');
    
    // Wait and check auth status
    await service.page.waitForTimeout(3000);
    
    const authStatus = await service.page.evaluate(() => {
      const hasUserMenu = !!document.querySelector('[data-testid="user-menu"]');
      const hasLoginBtn = !!document.querySelector('button:has-text("Sign in")');
      const hasSignUpBtn = !!document.querySelector('button:has-text("Sign up")');
      const hasLoginModal = !!document.querySelector('[role="dialog"]');
      const title = document.title;
      
      return {
        hasUserMenu,
        hasLoginBtn,
        hasSignUpBtn,
        hasLoginModal,
        isLikelyLoggedOut: (hasLoginBtn || hasSignUpBtn || hasLoginModal) && !hasUserMenu,
        pageTitle: title
      };
    });
    
    console.log('📊 Authentication Status:');
    console.log(`   - Has user menu: ${authStatus.hasUserMenu}`);
    console.log(`   - Has login button: ${authStatus.hasLoginBtn}`);
    console.log(`   - Has sign up button: ${authStatus.hasSignUpBtn}`);
    console.log(`   - Has login modal: ${authStatus.hasLoginModal}`);
    console.log(`   - Likely logged out: ${authStatus.isLikelyLoggedOut}`);
    console.log(`   - Page title: ${authStatus.pageTitle}\n`);
    
    // Check for input interface
    const inputStatus = await service.page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      const contentEditable = document.querySelector('[contenteditable="true"]');
      const fileInput = document.querySelector('input[type="file"]');
      
      return {
        hasTextarea: !!textarea,
        hasContentEditable: !!contentEditable,
        hasFileInput: !!fileInput
      };
    });
    
    console.log('📊 Chat Interface Status:');
    console.log(`   - Has textarea: ${inputStatus.hasTextarea}`);
    console.log(`   - Has contentEditable: ${inputStatus.hasContentEditable}`);
    console.log(`   - Has file input: ${inputStatus.hasFileInput}\n`);
    
    // Save session status
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionStatus = {
      timestamp,
      test: 'no-session',
      authStatus,
      inputStatus
    };
    
    fs.writeFileSync(
      path.join(DEBUG_OUTPUT_DIR, `test-no-session-${timestamp}.json`),
      JSON.stringify(sessionStatus, null, 2)
    );
    
    // Save HTML snapshot
    const html = await service.page.content();
    fs.writeFileSync(
      path.join(DEBUG_OUTPUT_DIR, `test-no-session-${timestamp}.html`),
      html
    );
    
    console.log(`📁 Saved debug files:`);
    console.log(`   - Status: ${path.join(DEBUG_OUTPUT_DIR, `test-no-session-${timestamp}.json`)}`);
    console.log(`   - HTML: ${path.join(DEBUG_OUTPUT_DIR, `test-no-session-${timestamp}.html`)}\n`);
    
    await service.close();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await service.close();
    throw error;
  }
}

/**
 * Test 3: Debug response extraction HTML structures
 */
async function testResponseExtraction() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: RESPONSE HTML STRUCTURE COMPARISON');
  console.log('='.repeat(80));
  
  const report = {
    timestamp: new Date().toISOString(),
    test: 'response-extraction',
    htmlSelectors: {
      articles: {
        selector: 'article[data-turn="assistant"]',
        description: 'Article tags with data-turn="assistant"'
      },
      articleRoles: {
        selector: '[role="article"]',
        description: 'Elements with role=article'
      },
      pTags: {
        selector: 'article[data-turn="assistant"] p',
        description: 'P tags inside assistant articles'
      },
      divDataMessage: {
        selector: '[data-message-author-role="assistant"]',
        description: 'Elements with data-message-author-role="assistant"'
      }
    },
    methodologies: [
      {
        name: 'METHOD 0: Multi-P tag with BR handling (CURRENT)',
        description: 'Combines all P tags from assistant message, converts BR to newlines',
        bestFor: 'Complex formatted responses with multiple paragraphs'
      },
      {
        name: 'METHOD 1: Article innerText',
        description: 'Uses innerText from article[data-turn="assistant"]',
        bestFor: 'Simple text responses'
      },
      {
        name: 'METHOD 3: JSON blocks',
        description: 'Looks for code blocks containing JSON',
        bestFor: 'Structured JSON responses (like affiliate analysis)'
      }
    ],
    recommendation: 'Test all methods and compare output to find which works best for current ChatGPT HTML structure'
  };
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(DEBUG_OUTPUT_DIR, `response-extraction-methods-${timestamp}.json`),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📊 Response Extraction Methods:');
  report.methodologies.forEach((m, i) => {
    console.log(`\n   ${i}. ${m.name}`);
    console.log(`      Description: ${m.description}`);
    console.log(`      Best for: ${m.bestFor}`);
  });
  
  console.log(`\n📁 Report saved to: ${path.join(DEBUG_OUTPUT_DIR, `response-extraction-methods-${timestamp}.json`)}\n`);
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--mode') 
    ? args[args.indexOf('--mode') + 1] 
    : 'all';
  
  console.log('\n🧪 ChatGPT Debug Test Suite');
  console.log(`📁 Output directory: ${DEBUG_OUTPUT_DIR}`);
  
  try {
    if (mode === 'session' || mode === 'all') {
      await testWithSession();
    }
    
    if (mode === 'no-session' || mode === 'all') {
      await testWithoutSession();
    }
    
    if (mode === 'html-dump' || mode === 'all') {
      await testResponseExtraction();
    }
    
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

main();
