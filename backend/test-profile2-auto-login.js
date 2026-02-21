import GoogleFlowService from './services/browser/googleFlowService.js';

/**
 * Test: Chrome Profile 2 Auto-Login without Session Loading
 * 
 * Goal: Check if Profile 2 (modluffy90@gmail.com) auto-logins without 
 * needing to load saved cookies/session
 */

async function testProfile2AutoLogin() {
  console.log('🔍 TEST: Profile 2 Auto-Login (No Session Loading)\n');
  console.log('='.repeat(80));
  
  const service = new GoogleFlowService({ headless: false });
  
  try {
    console.log('🚀 Launching browser with Profile 2...');
    console.log('   📁 Profile: modluffy90@gmail.com\n');
    
    // Launch with Profile 2 but SKIP session loading
    await service.launch({ 
      chromeProfile: 'Profile 2',
      skipSession: true 
    });
    
    console.log('📍 Navigating to Lab Flow...');
    await service.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('⏳ Waiting 5 seconds for page to stabilize...');
    await service.page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = service.page.url();
    console.log(`\n📋 Current URL: ${currentUrl}\n`);
    
    // Check what's on the page
    const pageInfo = await service.page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        isGoogleSignIn: window.location.hostname.includes('accounts.google.com'),
        isLabsGoogle: window.location.hostname.includes('labs.google'),
        breadcrumbs: document.body.innerText.substring(0, 300),
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({
          text: b.textContent.substring(0, 50),
          visible: b.offsetParent !== null
        }))
      };
    });
    
    console.log('📊 Page Information:');
    console.log(`   Title: ${pageInfo.title}`);
    console.log(`   Host: ${pageInfo.url.split('/')[2]}`);
    console.log(`   Is Google SignIn: ${pageInfo.isGoogleSignIn}`);
    console.log(`   Is Labs Google: ${pageInfo.isLabsGoogle}`);
    
    if (pageInfo.isGoogleSignIn) {
      console.log('\n❌ PROBLEM: Redirected to Google Sign-In!');
      console.log('   This means Profile 2 cookies are not valid');
      console.log('   Solution: Need to get fresh login\n');
    } else if (pageInfo.isLabsGoogle) {
      console.log('\n✅ GOOD: Still on labs.google domain');
      
      // Check for "Tạo bằng Flow" button
      const createFlowBtn = pageInfo.buttons.find(b => 
        b.text.includes('Tạo') || b.text.includes('Create')
      );
      
      if (createFlowBtn) {
        console.log('✅ Found "Tạo bằng Flow" button\n');
        
        // Try clicking it
        console.log('🖱️  Clicking "Tạo bằng Flow" button...');
        await service.page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            if (text.includes('tạo bằng flow') || text.includes('create with flow')) {
              btn.click();
              return;
            }
          }
        });
        
        console.log('⏳ Waiting 5 seconds for editor to load...');
        await service.page.waitForTimeout(5000);
        
        const editorUrl = service.page.url();
        console.log(`\n📋 After click - URL: ${editorUrl}\n`);
        
        // Check for textarea
        const hasTextarea = await service.page.evaluate(() => {
          const ta = document.querySelector('textarea');
          return ta !== null && ta.offsetParent !== null;
        });
        
        if (hasTextarea) {
          console.log('✅✅✅ SUCCESS! Found textarea in editor!');
          console.log('   Profile 2 auto-login works!\n');
          return true;
        } else {
          console.log('⚠️  No textarea found in editor');
          
          // Show what buttons are available
          const buttons = await service.page.evaluate(() => {
            return Array.from(document.querySelectorAll('button')).map(b => ({
              text: b.textContent.substring(0, 100),
              visible: b.offsetParent !== null
            }));
          });
          
          console.log('\n📌 Available Buttons:');
          buttons.forEach((btn, i) => {
            if (btn.visible) {
              console.log(`   ${i}. ${btn.text}`);
            }
          });
        }
      }
    }
    
    console.log('\n⏸️  Browser stays open for inspection');
    console.log('   You can manually interact with the page');
    console.log('   Press Ctrl+C to close when done\n');
    
    // Keep browser open for inspection
    await new Promise(() => {});
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
  } finally {
    try {
      await service.close();
    } catch (e) {}
  }
}

testProfile2AutoLogin().catch(console.error);
