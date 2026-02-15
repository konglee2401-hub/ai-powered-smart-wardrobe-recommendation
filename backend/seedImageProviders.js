import { IMAGE_PROVIDERS } from './config/imageProviders.js';

// Seed script to verify image providers configuration
async function seedImageProviders() {
  try {
    console.log('🌱 Seeding Image Generation Providers...');
    console.log('=' . repeat(50));

    // Log available providers
    console.log(`\n📋 Available Image Providers (${IMAGE_PROVIDERS.length} total):`);
    console.log('=' . repeat(50));
    
    // Group providers by type
    const providersByType = {};
    IMAGE_PROVIDERS.forEach(provider => {
      if (!providersByType[provider.provider]) {
        providersByType[provider.provider] = [];
      }
      providersByType[provider.provider].push(provider);
    });

    Object.keys(providersByType).forEach(providerType => {
      const providers = providersByType[providerType];
      console.log(`\n🔍 ${providerType.toUpperCase()} (${providers.length} models):`);
      providers.forEach(p => {
        const status = p.available ? '✅' : '❌';
        const pricing = p.pricing ? `($${p.pricing})` : '(Free)';
        console.log(`   ${status} ${p.name} ${pricing}`);
      });
    });

    // Test providers
    console.log('\n🧪 Testing Providers Availability...');
    console.log('=' . repeat(50));

    const testPrompt = 'A person wearing modern clothing in a city setting';
    
    for (let i = 0; i < IMAGE_PROVIDERS.length; i++) {
      const provider = IMAGE_PROVIDERS[i];
      
      if (!provider.available) {
        console.log(`⏭️  Skipping ${provider.name} - Not available (API key not set)`);
        continue;
      }

      try {
        console.log(`\n🚀 Testing ${provider.name}...`);
        
        const startTime = Date.now();
        const result = await provider.generate(testPrompt, {
          width: 512,
          height: 512,
          quality: 'fast'
        });
        
        const duration = Date.now() - startTime;
        const imageType = result.url ? 'URL' : (result.path ? 'File' : 'Unknown');
        
        console.log(`✅ Success! (${duration}ms)`);
        console.log(`   Type: ${imageType}`);
        if (result.url) console.log(`   URL: ${result.url}`);
        if (result.path) console.log(`   Path: ${result.path}`);
        
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
    }

    console.log('\n✅ Image Providers Seeded Successfully!');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed script
seedImageProviders().catch(console.error);