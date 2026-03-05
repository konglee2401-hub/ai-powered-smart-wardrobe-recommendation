import * as byteplusService from './services/byteplusService.js';
import dotenv from 'dotenv';
import readline from 'readline';
import fs from 'fs';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupByteplus() {
  console.log(byteplusService.getByteplusSetupInstructions());
  
  const current = {
    csrf: process.env.BYTEPLUS_CSRF_TOKEN,
    cookies: process.env.BYTEPLUS_COOKIES,
    accountId: process.env.BYTEPLUS_ACCOUNT_ID
  };
  
  if (current.csrf && current.cookies && current.accountId) {
    console.log('\n✅ Current BytePlus credentials found in .env');
    console.log(`   CSRF Token: ${current.csrf.substring(0, 20)}...`);
    console.log(`   Account ID: ${current.accountId}`);
    
    const isAvailable = await byteplusService.isByteplusAvailable();
    
    if (isAvailable) {
      console.log('✅ Credentials configured!');
    } else {
      console.log('⚠️  Credentials found but may be invalid');
    }
    
    rl.question('\nDo you want to update credentials? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        promptForCredentials();
      } else {
        console.log('\n✅ Setup complete!');
        rl.close();
      }
    });
  } else {
    console.log('\n⚠️  No BytePlus credentials found in .env');
    promptForCredentials();
  }
}

function promptForCredentials() {
  console.log('\n📝 Enter your BytePlus credentials:');
  
  rl.question('\nCSRF Token: ', (csrf) => {
    rl.question('Cookies (entire string): ', (cookies) => {
      rl.question('Account ID: ', (accountId) => {
        
        if (!csrf || !cookies || !accountId) {
          console.log('❌ All fields are required!');
          rl.close();
          return;
        }
        
        // Update .env
        const envPath = '.env';
        let envContent = '';
        
        try {
          envContent = fs.readFileSync(envPath, 'utf8');
        } catch (error) {
          console.log('⚠️  .env file not found, creating new one...');
        }
        
        // Update or add credentials
        const updates = {
          'BYTEPLUS_CSRF_TOKEN': csrf.trim(),
          'BYTEPLUS_COOKIES': cookies.trim(),
          'BYTEPLUS_ACCOUNT_ID': accountId.trim()
        };
        
        Object.entries(updates).forEach(([key, value]) => {
          if (envContent.includes(`${key}=`)) {
            envContent = envContent.replace(
              new RegExp(`${key}=.*`),
              `${key}=${value}`
            );
          } else {
            envContent += `\n${key}=${value}\n`;
          }
        });
        
        fs.writeFileSync(envPath, envContent);
        
        console.log('\n✅ Credentials saved to .env');
        console.log('🔄 Please restart your backend server');
        
        rl.close();
      });
    });
  });
}

setupByteplus().catch(console.error);
