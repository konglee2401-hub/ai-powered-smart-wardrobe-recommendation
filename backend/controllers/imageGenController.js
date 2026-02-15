import axios from 'axios';
import Replicate from 'replicate';
import { IMAGE_PROVIDERS } from '../config/imageProviders.js';

// ==================== GET PROVIDERS ====================

export const getProviders = async (req, res) => {
  try {
    const providers = IMAGE_PROVIDERS.map(p => ({
      id: p.id,
      name: p.name,
      provider: p.provider,
      model: p.model,
      free: p.free,
      available: p.available,
      quality: p.quality || 'medium',
      speed: p.speed || 'medium',
      pricing: p.pricing,
      group: p.provider
    }));

    const availableProviders = providers.filter(p => p.available);

    // Find recommended provider (prefer OpenRouter if available, then free providers)
    const recommended = availableProviders.find(p => p.provider === 'openrouter')?.id || 
                       availableProviders.find(p => p.free)?.id || 
                       availableProviders[0]?.id || 
                       'pollinations';

    res.json({
      success: true,
      data: {
        providers,
        available: availableProviders.length,
        recommended
      }
    });

  } catch (error) {
    console.error('❌ Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get providers',
      error: error.message
    });
  }
};

// Helper function to try multiple providers as fallback
const tryGenerateWithFallbacks = async (prompt, options, availableProviders, startIndex = 0) => {
  // Try from startIndex onwards
  for (let i = startIndex; i < availableProviders.length; i++) {
    const fallbackProvider = availableProviders[i];
    
    try {
      console.log(`   🔄 Trying fallback: ${fallbackProvider.name} (Priority ${fallbackProvider.priority})...`);
      
      const result = await fallbackProvider.generate(prompt, options);
      const imageUrl = result.url || result.path;
      
      return {
        success: true,
        url: imageUrl,
        provider: fallbackProvider.name,
        model: fallbackProvider.id
      };
    } catch (fallbackError) {
      console.error(`   ❌ Fallback ${fallbackProvider.name} failed:`, fallbackError.message);
      continue;
    }
  }
  
  // All fallbacks failed, use Pollinations as ultimate fallback
  console.log(`   ⚠️  All providers failed, using Pollinations (ultimate fallback)`);
  const pollProvider = IMAGE_PROVIDERS.find(p => p.id === 'pollinations');
  const result = await pollProvider.generate(prompt, options);
  
  return {
    success: true,
    url: result.url || result.path,
    provider: `${pollProvider.name} (Ultimate Fallback)`,
    model: pollProvider.id
  };
};

// ==================== GENERATE IMAGES (API) ====================

export const generateImages = async (req, res) => {
  try {
    const {
      prompt,
      negativePrompt = '',
      count = 1,
      selectedModel = 'auto'
    } = req.body;

    console.log('🎨 Generating images...');
    console.log(`   Model: ${selectedModel}`);
    console.log(`   Count: ${count}`);
    console.log(`   Prompt length: ${prompt.length} chars`);
    console.log(`   Negative prompt length: ${negativePrompt.length} chars`);
    if (negativePrompt) {
      console.log(`   🚫 Negative: ${negativePrompt.substring(0, 50)}...`);
    }


    // Get character and product images
    const characterImage = req.files?.characterImage?.[0];
    const productImage = req.files?.productImage?.[0];

    if (!characterImage || !productImage) {
      return res.status(400).json({
        success: false,
        message: 'Both character and product images are required'
      });
    }

    // Convert images to base64
    const characterBase64 = characterImage.buffer.toString('base64');
    const productBase64 = productImage.buffer.toString('base64');

    // Determine which provider to use
    let provider;

    if (selectedModel === 'auto') {
      console.log('\n🔍 AUTO MODE: Selecting best available provider...');
      
      // CRITICAL FIX: Exclude problematic providers (pollinations, huggingface)
      const availableProviders = IMAGE_PROVIDERS
        .filter(p => {
          // Exclude pollinations (fallback only) and huggingface (unstable)
          const isExcluded = p.id === 'pollinations' || p.id === 'huggingface-flux';
          const isAvailable = p.available && !isExcluded;
          
          if (!isAvailable && p.requiresKey) {
            console.log(`   ⏭️  Skipping ${p.name}: No API key (${p.keyEnv})`);
          }
          return isAvailable;
        })
        .sort((a, b) => a.priority - b.priority);  // Sort by priority (0 = highest)
      
      console.log(`\n📊 Available providers: ${availableProviders.length}`);
      availableProviders.slice(0, 5).forEach(p => {
        console.log(`   ${p.priority}. ${p.name} (${p.provider}) - ${p.pricing || '🆓 FREE'}`);
      });
      
      if (availableProviders.length === 0) {
        // Use Pollinations as ultimate fallback
        provider = IMAGE_PROVIDERS.find(p => p.id === 'pollinations');
        console.log('\n⚠️  NO PROVIDERS AVAILABLE - Using Pollinations fallback');
      } else {
        // Select highest priority (lowest number)
        provider = availableProviders[0];
        console.log(`\n✅ SELECTED: ${provider.name}`);
        console.log(`   📊 Priority: ${provider.priority} (0 = highest)`);
        console.log(`   🏢 Provider: ${provider.provider}`);
        console.log(`   💰 Pricing: ${provider.pricing || '🆓 FREE'}`);
        console.log(`   🔑 Requires key: ${provider.requiresKey ? 'Yes' : 'No'}`);
        console.log(`   📦 Fallback options: ${availableProviders.length - 1} providers`);
      }
    } else {
      // Use specified provider
      provider = IMAGE_PROVIDERS.find(p => p.id === selectedModel);
      
      if (!provider) {
        return res.status(400).json({
          error: `Unknown provider: ${selectedModel}`,
          availableProviders: IMAGE_PROVIDERS.map(p => ({
            id: p.id,
            name: p.name,
            available: p.available
          }))
        });
      }
      
      if (!provider.available) {
        return res.status(400).json({
          error: `Provider ${selectedModel} not available - missing API key (${provider.keyEnv})`,
          suggestion: 'Use "auto" to try other available providers'
        });
      }
      
      console.log(`\n✅ Using specified provider: ${provider.name}`);
      console.log(`   📊 Priority: ${provider.priority}`);
      console.log(`   🏢 Provider: ${provider.provider}`);
    }

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: 'Selected model not found'
      });
    }

    console.log(`✓ Using provider: ${provider.name}`);

    const images = [];
    const startTime = Date.now();

    // Get fallback providers list (excluding already tried)
    const getFallbackProviders = () => IMAGE_PROVIDERS
      .filter(p => p.available && p.id !== 'pollinations' && p.id !== 'huggingface-flux')
      .sort((a, b) => a.priority - b.priority);

    // Generate images based on provider
    for (let i = 0; i < count; i++) {
      try {
        console.log(`   Generating image ${i + 1}/${count} with ${provider.name}...`);
        
        const result = await provider.generate(prompt, { 
          width: 1024, 
          height: 1365,
          negativePrompt
        });

        const imageUrl = result.url || result.path;
        const imageData = {
          url: imageUrl,
          provider: provider.name,
          model: provider.id,
          width: 1024,
          height: 1365,
          seed: Math.floor(Math.random() * 1000000),
          generationTime: ((Date.now() - startTime) / 1000).toFixed(2)
        };

        images.push(imageData);
        console.log(`✅ Generated image ${i + 1}/${count}`);

      } catch (error) {
        console.error(`❌ Failed to generate image ${i + 1}:`, error.message);
        
        // Try fallback providers if primary fails
        const availableProviders = getFallbackProviders();
        
        // Find index of current provider
        const currentIndex = availableProviders.findIndex(p => p.id === provider.id);
        
        const fallbackResult = await tryGenerateWithFallbacks(
          prompt, 
          { width: 1024, height: 1365 },
          availableProviders,
          currentIndex + 1 // Skip current provider and try next ones
        );
        
        images.push({
          url: fallbackResult.url,
          provider: fallbackResult.provider,
          model: fallbackResult.model,
          width: 1024,
          height: 1365,
          seed: Math.floor(Math.random() * 1000000),
          generationTime: ((Date.now() - startTime) / 1000).toFixed(2)
        });
        
        console.log(`✅ Generated fallback image ${i + 1}/${count}`);
      }
    }

    if (images.length === 0) {
      throw new Error('Failed to generate any images');
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Generated ${images.length} images in ${totalTime}s`);

    res.json({
      success: true,
      data: {
        images,
        count: images.length,
        totalTime: parseFloat(totalTime),
        provider: provider.name
      }
    });

  } catch (error) {
    console.error('❌ Image generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate images',
      error: error.message
    });
  }
};

// ==================== BROWSER AUTOMATION ====================

export const browserGenerateImages = async (req, res) => {
  try {
    const {
      prompt,
      provider = 'google-labs',
      count = 1
    } = req.body;

    console.log('🌐 Browser automation generation...');
    console.log(`   Provider: ${provider}`);

    // TODO: Implement browser automation
    // This requires Puppeteer or Playwright

    res.status(501).json({
      success: false,
      message: 'Browser automation not implemented yet',
      error: 'Feature coming soon. Please use API method instead.'
    });

  } catch (error) {
    console.error('❌ Browser generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate images via browser',
      error: error.message
    });
  }
};
