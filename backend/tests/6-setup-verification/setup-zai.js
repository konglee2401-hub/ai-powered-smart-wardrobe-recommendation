import * as zaiService from './services/zaiService.js';
import dotenv from 'dotenv';
import readline from 'readline';
import fs from 'fs';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupZAI() {
  console.log(zaiService.getZAISessionInstructions());
  
  const currentSession = process.env.ZAI_SESSION;
  
  if (currentSession) {
    console.log('\n✅ Current Z.AI session found in .env');
    console.log(`   Session: ${currentSession.substring(0, 30)}...`);
    
    // Test current session
    console.log('\n🧪 Testing current session...');
    
    const isAvailable = await zaiService.isZAIAvailable();
    
    if (isAvailable) {
      console.log('✅ Current session is VALID and working!');
      
      rl.question('\nDo you want to update it? (y/N): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          promptForNewSession();
        } else {
          console.log('\n✅ Setup complete! Z.AI is ready to use.');
          rl.close();
        }
      });
    } else {
      console.log('❌ Current session is INVALID or EXPIRED!');
      console.log('   Please update your session cookie.\n');
      promptForNewSession();
    }
  } else {
    console.log('\n⚠️  No Z.AI session found in .env');
    promptForNewSession();
  }
}

function promptForNewSession() {
  rl.question('\nPaste your Z.AI session cookie here: ', async (session) => {
    if (!session || session.trim().length < 50) {
      console.log('❌ Invalid session cookie. Please try again.');
      rl.close();
      return;
    }
    
    // Update .env file
    const envPath = '.env';
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      console.log('⚠️  .env file not found, creating new one...');
    }
    
    // Update or add ZAI_SESSION
    if (envContent.includes('ZAI_SESSION=')) {
      envContent = envContent.replace(
        /ZAI_SESSION=.*/,
        `ZAI_SESSION=${session.trim()}`
      );
    } else {
      envContent += `\n\n# Z.AI Image Generation\nZAI_SESSION=${session.trim()}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('\n✅ Session saved to .env');
    console.log('🔄 Please restart your backend server for changes to take effect.');
    
    rl.close();
  });
}

setupZAI().catch(console.error);
