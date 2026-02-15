// Simple test to verify image providers configuration
import { IMAGE_PROVIDERS } from './config/imageProviders.js';

async function testProviders() {
  try {
    console.log('🧪 Testing Image Providers Configuration');
    console.log('=' . repeat(60));
    
    console.log(`\n📋 Total providers: ${IMAGE_PROVIDERS.length}`);
    
    // Check basic properties
    const validProviders = IMAGE_PROVIDERS.filter(p => 
      p.id && p.name && p.provider && typeof p.generate === 'function'
    );
    
    console.log(`✅ Valid providers: ${validProviders.length}`);
    
    if (validProviders.length < IMAGE_PROVIDERS.length) {
      const invalidProviders = IMAGE_PROVIDERS.filter(p => !validProviders.includes(p));
      console.log(`❌ Invalid providers: ${invalidProviders.length}`);
      invalidProviders.forEach(p => {
        console.log(`   - ${p.name || 'Unknown'}: Missing properties`);
      });
    }
    
    // Check availability
    const availableProviders = IMAGE_PROVIDERS.filter(p => p.available);
    console.log(`\n🌐 Available providers: ${availableProviders.length}`);
    availableProviders.forEach(p => {
      const type = p.pricing ? `Paid (${p.pricing})` : 'Free';
      console.log(`   ✅ ${p.name} (${type})`);
    });
    
    // Check unavailable providers
    const unavailableProviders = IMAGE_PROVIDERS.filter(p => !p.available);
    if (unavailableProviders.length > 0) {
      console.log(`\n🚫 Unavailable providers: ${unavailableProviders.length}`);
      unavailableProviders.forEach(p => {
        console.log(`   ❌ ${p.name} - API key not configured`);
      });
    }
    
    // Check provider types
    const providerTypes = {};
    IMAGE_PROVIDERS.forEach(p => {
      providerTypes[p.provider] = (providerTypes[p.provider] || 0) + 1;
    });
    
    console.log(`\n🏷️ Provider types:`);
    Object.entries(providerTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} models`);
    });
    
    // Check pricing
    const freeProviders = IMAGE_PROVIDERS.filter(p => p.free);
    const paidProviders = IMAGE_PROVIDERS.filter(p => p.pricing);
    
    console.log(`\n💰 Pricing breakdown:`);
    console.log(`   Free: ${freeProviders.length}`);
    console.log(`   Paid: ${paidProviders.length}`);
    
    // Check priority
    const sortedByPriority = [...IMAGE_PROVIDERS].sort((a, b) => a.priority - b.priority);
    console.log(`\n📊 Top 5 providers by priority:`);
    sortedByPriority.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (Priority: ${p.priority})`);
    });
    
    console.log(`\n✅ All providers checked successfully!`);
    console.log(`🎯 Recommendation: Use ${sortedByPriority[0]?.name} for best results`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProviders();