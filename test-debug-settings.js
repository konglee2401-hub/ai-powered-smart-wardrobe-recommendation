/**
 * Test script to debug settings buttons
 * Usage: node test-debug-settings.js
 */

const GoogleFlowAutomationService = require('./backend/services/googleFlowAutomationService');

async function testDebugSettings() {
  console.log('🚀 Starting Settings Buttons Debug Test\n');

  const service = new GoogleFlowAutomationService({
    headless: false,  // Show browser
    timeout: 60000
  });

  try {
    // Initialize
    await service.initialize();
    console.log('✓ Browser initialized\n');

    // Navigate to Google Flow
    console.log('📍 Navigating to Google Flow...');
    await service.page.goto('https://lab.google.com/flows', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    console.log('✓ Page loaded\n');

    // Wait for page to settle
    await service.page.waitForTimeout(3000);

    // Run debug inspection
    console.log('🔍 Running settings buttons debug inspection...\n');
    await service.debugSettingsButtons();

    console.log('\n✅ Test completed. Check console output above for details.\n');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);

  } finally {
    console.log('🛑 Closing browser...');
    await service.close();
  }
}

testDebugSettings();
