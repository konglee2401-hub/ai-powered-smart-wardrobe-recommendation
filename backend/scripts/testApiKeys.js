/**
 * Test API Keys for All Providers
 * Validates that all configured API keys are working
 */

import dotenv from 'dotenv';
import { getKeyManager } from '../utils/keyManager.js';
import { IMAGE_PROVIDERS } from '../config/imageProviders.js';

dotenv.config();

/**
 * Print services summary
 */
function printServicesSummary() {
  console.log('\n📊 API KEY SERVICES STATUS');
  console.log('='.repeat(50));
  
  const services = [
    'openrouter', 'google', 'nvidia', 'fireworks', 
    'together', 'fal', 'segmind', 'deepinfra', 
    'huggingface', 'replicate'
  ];
  
  services.forEach(service => {
    try {
      const keyManager = getKeyManager(service);
      const stats = keyManager.getStats();
      
      if (stats.totalKeys > 0) {
        const status = stats.availableKeys > 0 ? '✅' : '❌';
        console.log(`  ${status} ${service.toUpperCase().padEnd(15)} ${stats.totalKeys} key(s) (${stats.availableKeys} available)`);
      } else {
        console.log(`   ${service.toUpperCase().padEnd(15)} Not configured`);
      }
    } catch (e) {
      console.log(`   ${service.toUpperCase().padEnd(15)} Not configured`);
    }
  });
  
  console.log('='.repeat(50));
}

/**
 * Test a single provider
 */
async function testProvider(provider) {
  console.log(`\n🧪 Testing: ${provider.name}`);
  console.log(`   ID: ${provider.id}`);
  console.log(`   Priority: ${provider.priority}`);
  console.log(`   Pricing: ${provider.pricing || '🆓 FREE'}`);
  
  if (!provider.available) {
    console.log(`   ⚠️  SKIP: No API key configured (${provider.keyEnv})`);
    return {
      provider: provider.name,
      status: 'skipped',
      reason: 'No API key'
    };
  }
  
  try {
    const testPrompt = 'A simple red circle on white background';
    console.log(`   📝 Test prompt: "${testPrompt}"`);
    console.log(`   ⏳ Generating...`);
    
    const startTime = Date.now();
    const result = await provider.generate(testPrompt, {
      width: 512,
      height: 512
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`   ✅ SUCCESS in ${duration}s`);
    console.log(`   📊 Result:`, {
      hasUrl: !!result.url,
      hasPath: !!result.path,
      provider: result.provider,
      model: result.model
    });
    
    return {
      provider: provider.name,
      status: 'success',
      duration: `${duration}s`,
      result: {
        hasUrl: !!result.url,
        hasPath: !!result.path,
        provider: result.provider,
        model: result.model
      }
    };
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    return {
      provider: provider.name,
      status: 'failed',
      error: error.message
    };
  }
}

/**
 * Test all providers
 */
async function testAllProviders() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING ALL IMAGE GENERATION PROVIDERS');
  console.log('='.repeat(80));
  
  // Print key summary
  printServicesSummary();
  
  // Filter available providers
  const availableProviders = IMAGE_PROVIDERS
    .filter(p => p.available)
    .sort((a, b) => a.priority - b.priority);
  
  console.log(`\n📊 Testing ${availableProviders.length} available providers...\n`);
  
  const results = [];
  
  for (const provider of availableProviders) {
    const result = await testProvider(provider);
    results.push(result);
    
    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length
  };
  
  console.log(`\nTotal: ${summary.total}`);
  console.log(`✅ Success: ${summary.success}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`⚠️  Skipped: ${summary.skipped}`);
  
  if (summary.success > 0) {
    console.log('\n✅ Successful Providers:');
    results
      .filter(r => r.status === 'success')
      .forEach(r => {
        console.log(`   - ${r.provider} (${r.duration})`);
      });
  }
  
  if (summary.failed > 0) {
    console.log('\n❌ Failed Providers:');
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`   - ${r.provider}: ${r.error}`);
      });
  }
  
  if (summary.skipped > 0) {
    console.log('\n⚠️  Skipped Providers (No API Key):');
    results
      .filter(r => r.status === 'skipped')
      .forEach(r => {
        console.log(`   - ${r.provider}: ${r.reason}`);
      });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (summary.success === 0) {
    console.log('⚠️  WARNING: No providers are working!');
    console.log('Please configure at least one API key in .env file');
  } else if (summary.success < 3) {
    console.log('⚠️  WARNING: Only a few providers are working');
    console.log('Consider adding more API keys for better reliability');
  } else {
    console.log('✅ GREAT! Multiple providers are working');
  }
  
  console.log('='.repeat(80) + '\n');
}

/**
 * Test specific provider by ID
 */
async function testSpecificProvider(providerId) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 TESTING SPECIFIC PROVIDER: ${providerId}`);
  console.log('='.repeat(80));
  
  const provider = IMAGE_PROVIDERS.find(p => p.id === providerId);
  
  if (!provider) {
    console.log(`\n❌ Provider not found: ${providerId}`);
    console.log('\nAvailable providers:');
    IMAGE_PROVIDERS.forEach(p => {
      console.log(`   - ${p.id} (${p.name})`);
    });
    return;
  }
  
  const result = await testProvider(provider);
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULT');
  console.log('='.repeat(80));
  console.log(JSON.stringify(result, null, 2));
  console.log('='.repeat(80) + '\n');
}

// Main execution
const args = process.argv.slice(2);

if (args.length > 0) {
  // Test specific provider
  testSpecificProvider(args[0])
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
} else {
  // Test all providers
  testAllProviders()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}
