#!/usr/bin/env node

/**
 * ChatGPT Session Setup Helper
 * 
 * Interactive setup guide for ChatGPT session management.
 * Makes it easy for first-time users to configure ChatGPT authentication.
 */

import { ChatGPTSessionManager } from './chatgpt-auto-login.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

function clearScreen() {
  console.clear();
}

function showHeader() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       ChatGPT Session Setup Helper                         ║');
  console.log('║   Automated Authentication & Session Management            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

function showMenu() {
  console.log('\n📋 What would you like to do?\n');
  console.log('  1️⃣  Create new ChatGPT session (first-time setup)');
  console.log('  2️⃣  Validate existing session');
  console.log('  3️⃣  Refresh/renew session');
  console.log('  4️⃣  View setup instructions');
  console.log('  5️⃣  Exit\n');
}

async function showInstructions() {
  clearScreen();
  showHeader();
  
  console.log('📚 SETUP INSTRUCTIONS\n');
  
  console.log('Prerequisites:');
  console.log('  • ChatGPT account (https://chatgpt.com)');
  console.log('  • Valid email and password');
  console.log('  • Chrome browser installed on this system\n');
  
  console.log('What happens during setup:');
  console.log('  1. Browser opens and navigates to ChatGPT');
  console.log('  2. You will be prompted to enter your email and password');
  console.log('  3. Script performs login automatically');
  console.log('  4. Session data is captured and saved locally');
  console.log('  5. Browser stays open for you to verify success\n');
  
  console.log('After setup:');
  console.log('  • ChatGPTService automatically loads saved session');
  console.log('  • No more login prompts needed');
  console.log('  • Faster initialization and better reliability\n');
  
  console.log('⚠️  Important notes:');
  console.log('  • Session file is stored in: backend/data/chatgpt-session.json');
  console.log('  • Keep this file secure (contains auth tokens)');
  console.log('  • Do NOT commit this file to Git');
  console.log('  • Sessions expire - refresh periodically\n');
  
  await prompt('Press Enter to return to menu...');
}

async function createNewSession() {
  clearScreen();
  showHeader();
  
  console.log('🔐 Creating New ChatGPT Session\n');
  console.log('You\'ll need to manually authenticate in the browser window.\n');
  console.log('Important security note:');
  console.log('  • Google/OpenAI may show "browser may not be secure" warning');
  console.log('  • This is normal for automation - proceed with authentication');
  console.log('  • Your credentials are only used for this session setup');
  console.log('  • Session will be saved securely locally\n');

  const manager = new ChatGPTSessionManager();
  
  try {
    console.log('⏳ Starting ChatGPT session creation...');
    console.log('📍 Browser will open - please login when prompted\n');
    
    const success = await manager.login();
    
    if (success) {
      console.log('\n✅ Session created successfully!');
      console.log('📁 Session saved to: backend/data/chatgpt-session.json');
      console.log('\n💡 You can now use ChatGPT in your affiliate flows!');
      console.log('   The session will be automatically loaded when needed.\n');
    } else {
      console.log('\n❌ Session creation failed');
      console.log('Please try again or check the console for errors.\n');
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
  }
  
  await prompt('Press Enter to return to menu...');
  await manager.close();
}

async function validateSession() {
  clearScreen();
  showHeader();
  
  console.log('🔍 Validating ChatGPT Session\n');
  console.log('⏳ Checking if your saved session is still valid...\n');
  
  const manager = new ChatGPTSessionManager();
  
  try {
    const isValid = await manager.validateSession();
    
    if (isValid) {
      console.log('\n✅ Session validation passed!');
      console.log('Your ChatGPT session is working correctly.\n');
    } else {
      console.log('\n⚠️  Session validation failed');
      console.log('Your session may be expired or invalid.');
      console.log('You should refresh it using option 3.\n');
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
  }
  
  await prompt('Press Enter to return to menu...');
}

async function refreshSession() {
  clearScreen();
  showHeader();
  
  console.log('🔄 Refreshing ChatGPT Session\n');
  console.log('You\'ll need to manually authenticate in the browser window.\n');
  console.log('Important security note:');
  console.log('  • Google/OpenAI may show "browser may not be secure" warning');
  console.log('  • This is normal for automation - proceed with authentication');
  console.log('  • Your old session will be replaced with a fresh one\n');

  const manager = new ChatGPTSessionManager();
  
  try {
    console.log('⏳ Refreshing ChatGPT session...');
    console.log('📍 Browser will open - please login when prompted\n');
    
    const success = await manager.login();
    
    if (success) {
      console.log('\n✅ Session refreshed successfully!');
      console.log('📁 New session saved to: backend/data/chatgpt-session.json\n');
    } else {
      console.log('\n❌ Session refresh failed');
      console.log('Please try again or check the console for errors.\n');
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
  }
  
  await prompt('Press Enter to return to menu...');
  await manager.close();
}

async function main() {
  clearScreen();
  showHeader();
  
  let running = true;
  
  while (running) {
    clearScreen();
    showHeader();
    showMenu();
    
    const choice = await prompt('Select option (1-5): ');
    
    switch (choice.trim()) {
      case '1':
        await createNewSession();
        break;
      case '2':
        await validateSession();
        break;
      case '3':
        await refreshSession();
        break;
      case '4':
        await showInstructions();
        break;
      case '5':
        running = false;
        console.log('\n👋 Goodbye!\n');
        break;
      default:
        console.log('\n❌ Invalid option. Please select 1-5.');
        await prompt('Press Enter to try again...');
    }
  }
  
  rl.close();
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
