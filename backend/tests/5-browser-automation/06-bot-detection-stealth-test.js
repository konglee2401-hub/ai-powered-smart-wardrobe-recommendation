import GoogleFlowService from './services/browser/googleFlowService.js';

/**
 * Quick Test: Stealth Measures Against Google Bot Detection
 */

async function testStealthMeasures() {
  console.log('\n' + '='.repeat(80));
  console.log('🔓 STEALTH MEASURES TEST');
  console.log('='.repeat(80));
  console.log('\n📊 Testing automation detection bypass...\n');
  
  const service = new GoogleFlowService({ headless: false });
  
  try {
    // Launch with stealth
    console.log('Step 1: Launching with stealth measures...');
    await service.launch({ 
      chromeProfile: 'Profile 2',
      skipSession: true
    });
    
    // Test what Google sees
    console.log('\nStep 2: Checking what Google detection APIs see...\n');
    
    const detectionResults = await service.page.evaluate(() => {
      return {
        isHeadless: navigator.webdriver === true,
        hasWebDriver: 'webdriver' in navigator,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        hasChrome: !!window.chrome,
        hasPlugins: navigator.plugins?.length > 0,
        languages: navigator.languages,
      };
    });
    
    console.log('📋 Bot Detection Check Results:');
    console.log(`   ✓ navigator.webdriver = ${detectionResults.isHeadless} (should be false)`);
    console.log(`   ✓ hasWebDriver in navigator = ${detectionResults.hasWebDriver} (should be false or hidden)`);
    console.log(`   ✓ userAgent = "${detectionResults.userAgent.substring(0, 60)}..."`);
    console.log(`   ✓ platform = ${detectionResults.platform}`);
    console.log(`   ✓ vendor = ${detectionResults.vendor}`);
    console.log(`   ✓ window.chrome exists = ${detectionResults.hasChrome}`);
    console.log(`   ✓ plugins available = ${detectionResults.hasPlugins}`);
    console.log(`   ✓ languages = ${JSON.stringify(detectionResults.languages)}`);
    
    // Now try to navigate to Google
    console.log('\nStep 3: Attempting to navigate to Lab Flow...');
    console.log('         (Watch the browser window for "not secure" message)\n');
    
    try {
      await service.page.goto('https://labs.google/fx/vi/tools/flow', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      const finalUrl = service.page.url();
      console.log(`✅ Navigation successful!`);
      console.log(`   Final URL: ${finalUrl.substring(0, 80)}...`);
      
      if (finalUrl.includes('accounts.google.com')) {
        console.log('\n⚠️  Redirected to Google Sign-In - stealth measures may not be fully effective');
      } else if (finalUrl.includes('labs.google')) {
        console.log('\n✅✅ SUCCESS! Stealth measures working - no redirect to sign-in!');
      }
      
    } catch (navError) {
      console.error(`⚠️  Navigation error: ${navError.message}`);
    }
    
    console.log('\n⏸️  Browser window stays open for inspection');
    console.log('   You can see if Google shows "not secure" warning');
    console.log('   Press Enter below to close browser when done\n');
    
    // Wait for user input (or timeout after 30 seconds)
    const timeout = setTimeout(() => {
      console.log('\n⏱️  Auto-closing after 30 seconds...');
      process.exit(0);
    }, 30000);
    
    // Try to read user input in Node (might not work in all environments)
    process.stdin.once('data', () => {
      clearTimeout(timeout);
      console.log('\nClosing...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
  }
}

testStealthMeasures().catch(console.error);
