#!/usr/bin/env node

import ZAIChatService from './services/browser/zaiChatService.js';
import GrokServiceV2 from './services/browser/grokServiceV2.js';
import chalk from 'chalk';

console.log(chalk.cyan('='.repeat(80)));
console.log(chalk.cyan.bold('  🍪 SESSION MANAGEMENT TEST - Z.AI & GROK'));
console.log(chalk.cyan('='.repeat(80)) + '\n');

async function testSessionManagement() {
  console.log('🧪 Testing session management for Z.AI and Grok...\n');
  
  // Initialize variables to store test results
  let zaiHasSession = false;
  let zaiIsLoggedIn = false;
  let grokHasSession = false;
  let grokIsLoggedIn = false;
  
  // Test Z.AI Session
  console.log(chalk.blue('📋 Z.AI SESSION TEST'));
  console.log('-'.repeat(40));
  
  const zaiService = new ZAIChatService({
    headless: true,
    timeout: 60000
  });

  try {
    // Test 1: Check if Z.AI session exists
    console.log('1️⃣ Checking for existing Z.AI session...');
    zaiHasSession = zaiService.sessionManager.hasSession();
    console.log(`   Session exists: ${zaiHasSession ? chalk.green('Yes') : chalk.red('No')}`);
    
    if (zaiHasSession) {
      const sessionInfo = zaiService.sessionManager.getSessionInfo();
      console.log(`   Cookie count: ${sessionInfo.cookieCount}`);
      console.log(`   Last modified: ${sessionInfo.modified.toLocaleString()}`);
    }

    // Test 2: Launch Z.AI browser (this will load session if exists)
    console.log('\n2️⃣ Launching Z.AI browser...');
    await zaiService.launch();
    console.log('   ✅ Browser launched');
    
    // Test 3: Navigate to Z.AI
    console.log('\n3️⃣ Navigating to Z.AI...');
    await zaiService.goto('https://chat.z.ai');
    await zaiService.page.waitForTimeout(3000);
    console.log('   ✅ Page loaded');
    
    // Test 4: Check Z.AI login status
    console.log('\n4️⃣ Checking Z.AI login status...');
    zaiIsLoggedIn = await zaiService.checkIfLoggedIn();
    console.log(`   Logged in: ${zaiIsLoggedIn ? chalk.green('Yes') : chalk.red('No')}`);
    
    if (zaiIsLoggedIn) {
      console.log('   🎉 Z.AI session is working! You are logged in.');
    } else {
      console.log('   ⚠️  Z.AI not logged in. You need to login manually and save session.');
    }
    
    // Test 5: Try to save Z.AI session (if logged in)
    if (zaiIsLoggedIn) {
      console.log('\n5️⃣ Testing Z.AI session save...');
      const saveSuccess = await zaiService.saveSession();
      console.log(`   Save success: ${saveSuccess ? chalk.green('Yes') : chalk.red('No')}`);
    }
    
    await zaiService.close();
    console.log('   🔒 Z.AI browser closed\n');

  } catch (error) {
    console.error(chalk.red('❌ Z.AI Test failed:'), error.message);
    try {
      await zaiService.close();
    } catch (e) {
      // Ignore close errors
    }
  }

  // Test Grok Session
  console.log(chalk.magenta('📋 GROK SESSION TEST'));
  console.log('-'.repeat(40));
  
  const grokService = new GrokService({
    headless: false,  // Run non-headless to see Cloudflare verify
    timeout: 120000
  });

  try {
    // Test 1: Check if Grok session exists
    console.log('1️⃣ Checking for existing Grok session...');
    grokHasSession = grokService.sessionManager.hasSession();
    console.log(`   Session exists: ${grokHasSession ? chalk.green('Yes') : chalk.red('No')}`);
    
    if (grokHasSession) {
      const sessionInfo = grokService.sessionManager.getSessionInfo();
      console.log(`   Cookie count: ${sessionInfo.cookieCount}`);
      console.log(`   Last modified: ${sessionInfo.modified.toLocaleString()}`);
    }

    // Test 2: Launch Grok browser (this will load session if exists)
    console.log('\n2️⃣ Launching Grok browser...');
    await grokService.launch();
    console.log('   ✅ Browser launched');
    
    // Test 3: Navigate to Grok
    console.log('\n3️⃣ Navigating to Grok...');
    await grokService.goto('https://grok.com');
    await grokService.page.waitForTimeout(3000);
    console.log('   ✅ Page loaded');
    
    // Test 4: Check Grok login status
    console.log('\n4️⃣ Checking Grok login status...');
    const isLoginPage = await grokService.page.evaluate(() => {
      return document.body.innerText.includes('Sign in') || 
             document.body.innerText.includes('Log in') ||
             document.body.innerText.includes('Continue with') ||
             document.body.innerText.includes('Sign up');
    });
    
    grokIsLoggedIn = !isLoginPage;
    console.log(`   Logged in: ${grokIsLoggedIn ? chalk.green('Yes') : chalk.red('No')}`);
    
    if (grokIsLoggedIn) {
      console.log('   🎉 Grok session is working! You are logged in.');
    } else {
      console.log('   ⚠️  Grok not logged in. You need to login manually and save session.');
    }
    
    // Test 5: Try to save Grok session (if logged in)
    if (grokIsLoggedIn) {
      console.log('\n5️⃣ Testing Grok session save...');
      const saveSuccess = await grokService.saveSession();
      console.log(`   Save success: ${saveSuccess ? chalk.green('Yes') : chalk.red('No')}`);
    }
    
    await grokService.close();
    console.log('   🔒 Grok browser closed\n');

  } catch (error) {
    console.error(chalk.red('❌ Grok Test failed:'), error.message);
    try {
      await grokService.close();
    } catch (e) {
      // Ignore close errors
    }
  }

  console.log('\n' + chalk.green('✅ Session test completed successfully!'));
  console.log('\n📋 Summary:');
  console.log(`   - Z.AI session exists: ${zaiHasSession ? 'Yes' : 'No'}`);
  console.log(`   - Z.AI logged in: ${zaiIsLoggedIn ? 'Yes' : 'No'}`);
  console.log(`   - Grok session exists: ${grokHasSession ? 'Yes' : 'No'}`);
  console.log(`   - Grok logged in: ${grokIsLoggedIn ? 'Yes' : 'No'}`);
  console.log(`   - Viewport: 1920x1080 (Full HD)`);
  console.log(`   - Z.AI session file: ${zaiService.sessionManager.sessionPath}`);
  console.log(`   - Grok session file: ${grokService.sessionManager.sessionPath}`);
  
  console.log('\n💡 To save sessions:');
  console.log('   Z.AI:');
  console.log('     1. Run: node -e "import ZAIChatService from \'./services/browser/zaiChatService.js\'; const s = new ZAIChatService({headless: false}); await s.launch(); await s.goto(\'https://chat.z.ai\'); console.log(\'Login manually\'); await new Promise(r => setTimeout(r, 60000)); await s.saveSession(); await s.close();"');
  console.log('   Grok:');
  console.log('     1. Run: node -e "import GrokServiceV2 from \'./services/browser/grokServiceV2.js\'; const s = new GrokServiceV2({headless: false}); await s.launch(); await s.initialize(); console.log(\'Login manually\'); await new Promise(r => setTimeout(r, 120000)); await s.saveSession(); await s.close();"');
}

// Run the test
testSessionManagement().catch(error => {
  console.error(chalk.red('❌ Fatal error:'), error.message);
  process.exit(1);
});
