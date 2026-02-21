import GoogleFlowService from './services/browser/googleFlowService.js';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

/**
 * Persistent Browser Method
 * 
 * Opens browser with Profile 2, keeps it open for manual login,
 * then captures credentials when user is ready
 */

async function persistentBrowserMethod() {
  console.log('\n' + '='.repeat(80));
  console.log('🌐 PERSISTENT BROWSER METHOD - Manual Login + Auto Capture');
  console.log('='.repeat(80));
  
  const service = new GoogleFlowService({ headless: false });
  
  try {
    console.log('\n📖 INSTRUCTIONS:');
    console.log('1. Browser will open with Profile 2 (modluffy90@gmail.com)');
    console.log('2. Complete Google login if prompted');
    console.log('3. Once logged in and on Flow editor, type "ready" below and press Enter');
    console.log('4. Credentials will be captured automatically\n');
    
    // Launch browser with Profile 2, NO session loading
    console.log('🚀 Launching browser with your Profile 2...\n');
    await service.launch({ 
      chromeProfile: 'Profile 2',
      skipSession: true,
      headless: false 
    });
    
    // Navigate to Lab Flow
    console.log('📍 Opening Lab Flow...');
    await service.goto('https://labs.google/fx/vi/tools/flow', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log('✅ Lab Flow opened\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Browser Window: Interact with Google Flow');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Prompt user
    const promptUser = () => {
      return new Promise((resolve) => {
        rl.question(
          '📋 When ready to capture (after login + seeing editor), type "ready" and press Enter:\n> ',
          async (answer) => {
            rl.close();
            
            if (answer.toLowerCase() === 'ready') {
              console.log('\n✅ Capturing credentials...\n');
              
              // Wait a moment for page to stabilize
              await service.page.waitForTimeout(2000);
              
              // Save session (which captures all cookies)
              const saved = await service.saveSession();
              
              if (saved) {
                console.log('✅✅✅ CREDENTIALS CAPTURED AND SAVED!\n');
                console.log('📁 Session saved to: .sessions/google-flow-session.json');
                console.log('   Ready for next test run without re-login!\n');
                resolve(true);
              } else {
                console.log('⚠️  Could not save session');
                resolve(false);
              }
            } else {
              console.log('❌ Response not "ready". Please try again.');
              resolve(false);
            }
          }
        );
      });
    };
    
    await promptUser();
    
    // Close browser
    console.log('\n🚀 Test completed! Browser can now close.');
    console.log('Next test will use saved credentials automatically.\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    try {
      await service.close();
    } catch (e) {}
  }
}

persistentBrowserMethod().catch(console.error);
