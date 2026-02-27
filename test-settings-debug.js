/**
 * Test script to debug Google Flow settings menu
 * Checks if menu button exists and tries to click it
 */

import GoogleFlowAutomationService from './backend/services/googleFlowAutomationService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testSettingsDebug() {
  console.log('🧪 TESTING GOOGLE FLOW SETTINGS MENU DEBUG\n');

  const service = new GoogleFlowAutomationService({
    type: 'image',
    projectId: '58d791d4-37c9-47a8-ae3b-816733bc3ec0',
    imageCount: 1,
    headless: false  // Show browser so we can see what's happening
  });

  try {
    // Initialize and navigate
    console.log('📱 Initializing service...');
    await service.init();

    console.log('🌐 Navigating to Google Flow...');
    await service.navigateToFlow();

    console.log('⚙️  Calling configureSettings to see debug output...\n');
    await service.configureSettings();

    console.log('\n✅ Debug logging complete!');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    console.log('\n🔄 Closing browser...');
    if (service.browser) {
      await service.browser.close();
    }
  }
}

testSettingsDebug().catch(console.error);
