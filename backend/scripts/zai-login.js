#!/usr/bin/env node

/**
 * Z.AI Login Helper Script
 * 
 * This script opens Z.AI in a browser, lets you login manually,
 * and saves the session for future automated use.
 * 
 * Usage:
 *   npm run login:zai
 *   node scripts/zai-login.js
 */

import ZAIChatService from '../services/browser/zaiChatService.js';
import chalk from 'chalk';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function printHeader(title) {
  console.log('\n' + chalk.cyan('='.repeat(80)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan('='.repeat(80)) + '\n');
}

async function main() {
  printHeader('🔐 Z.AI SESSION LOGIN HELPER');
  
  console.log(chalk.bold('This script will:'));
  console.log('  1. Open Z.AI in a browser window');
  console.log('  2. Wait for you to login manually');
  console.log('  3. Save your session for automated use\n');
  
  console.log(chalk.bold('Instructions:'));
  console.log('  • Login with your Google account when the browser opens');
  console.log('  • Complete any 2FA if required');
  console.log('  • Wait until you see the Z.AI chat interface');
  console.log('  • Come back here and press Enter to save session\n');
  
  const proceed = await question(chalk.yellow('Press Enter to start (or "q" to quit): '));
  
  if (proceed.toLowerCase() === 'q') {
    console.log(chalk.gray('Cancelled.'));
    rl.close();
    process.exit(0);
  }
  
  // Create service instance
  const zaiService = new ZAIChatService({
    headless: false, // Show browser for manual login
    slowMo: 100
  });
  
  try {
    // Launch browser
    console.log(chalk.blue('\n🚀 Launching browser...'));
    await zaiService.launch();
    
    // Navigate to Z.AI
    console.log(chalk.blue('🌐 Navigating to Z.AI...'));
    await zaiService.goto('https://chat.z.ai');
    
    // Wait for page to load
    await zaiService.page.waitForTimeout(3000);
    
    // Check if already logged in
    const sessionInfo = zaiService.getSessionInfo();
    if (sessionInfo && sessionInfo.exists) {
      console.log(chalk.yellow('\n⚠️  Existing session found:'));
      console.log(`  Created: ${sessionInfo.created}`);
      console.log(`  Size: ${sessionInfo.size}`);
      
      const overwrite = await question(chalk.yellow('\nOverwrite existing session? (y/N): '));
      if (overwrite.toLowerCase() !== 'y') {
        console.log(chalk.gray('Using existing session.'));
        await zaiService.close();
        rl.close();
        process.exit(0);
      }
    }
    
    console.log(chalk.green('\n✅ Browser opened!'));
    console.log(chalk.bold('\n📋 Please complete these steps in the browser:'));
    console.log('  1. Click "Sign in with Google" or similar');
    console.log('  2. Login with your Google account');
    console.log('  3. Complete any verification if needed');
    console.log('  4. Wait for the Z.AI chat interface to load');
    console.log('  5. Come back here when done\n');
    
    // Wait for user to complete login
    await question(chalk.green('Press Enter when you have successfully logged in...'));
    
    // Verify login
    console.log(chalk.blue('\n🔍 Verifying login status...'));
    const isLoggedIn = await zaiService.checkIfLoggedIn();
    
    if (isLoggedIn) {
      console.log(chalk.green('✅ Login verified!'));
      
      // Save session
      console.log(chalk.blue('💾 Saving session...'));
      const saved = await zaiService.saveSession();
      
      if (saved) {
        console.log(chalk.green('\n✅ SESSION SAVED SUCCESSFULLY!'));
        console.log(chalk.bold('\nYou can now use:'));
        console.log('  • npm run test:browser:zai');
        console.log('  • npm run test:flow -- --analysis zai-browser');
        console.log('\nSession will be automatically loaded in future runs.\n');
      } else {
        console.log(chalk.red('❌ Failed to save session'));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  Could not verify login status'));
      console.log('The session may still be saved. Try running a test to verify.\n');
      
      // Try to save anyway
      const saved = await zaiService.saveSession();
      if (saved) {
        console.log(chalk.green('✅ Session saved (unverified)'));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    console.error(chalk.gray(error.stack));
  } finally {
    // Close browser
    console.log(chalk.blue('\n🔒 Closing browser...'));
    await zaiService.close();
    rl.close();
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ UNHANDLED ERROR:'));
  console.error(chalk.red(error.stack || error.message));
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️  Interrupted by user'));
  rl.close();
  process.exit(130);
});

// Run
main().catch(error => {
  console.error(chalk.red('\n❌ FATAL ERROR:'));
  console.error(chalk.red(error.stack || error.message));
  process.exit(1);
});
