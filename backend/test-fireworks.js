import dotenv from 'dotenv';
dotenv.config();

import * as fireworksService from './services/fireworksVisionService.js';

async function testFireworks() {
  console.log('🧪 Testing Fireworks Integration\n');

  // Test 1: Check availability
  console.log('Test 1: Check availability');
  const isAvailable = fireworksService.isFireworksVisionAvailable();
  console.log(`Result: ${isAvailable ? '✅ Available' : '❌ Not available'}\n`);

  if (!isAvailable) {
    console.log('❌ Cannot proceed without API key');
    process.exit(1);
  }

  // Test 2: Get available models
  console.log('Test 2: Get available models');
  const models = fireworksService.getFireworksVisionModels();
  console.log(`Found ${models.length} vision models\n`);

  console.log('✅ ALL TESTS PASSED');
}

testFireworks().catch(console.error);
