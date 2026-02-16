/**
 * Prompt Templates Library
 * Dynamic templates for all fashion photography use cases
 * Linked with PromptBuilder to generate prompts based on user inputs
 */

// Base template - Core structure for all prompts
const baseTemplate = (inputs) => {
  return `Professional fashion photography of ${inputs.age} year old, ${inputs.gender}, ${inputs.style} and confident, slim, fair skin tone, wearing full-outfit, ${inputs.style}-editorial, ${inputs.colors} colors, ${inputs.material} material, tailored fit, in ${inputs.setting} setting, with soft-diffused lighting, ${inputs.mood} mood, ${inputs.style}-editorial photography style, neutral color palette, three-quarter camera angle, professional fashion photography, 8K resolution, sharp focus, photorealistic, high detail, studio quality`;
};

// Use case specific customizations - Each function customizes template for a use case
const customizations = {
  // Use Case 1: Casual Beach (style: casual, setting: beach, colors: bright)
  casualBeach: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('silk blend', 'cotton or linen');
    customized = customized.replaceAll('studio', 'beach with ocean background');
    customized = customized.replaceAll('soft-diffused lighting', 'natural golden hour lighting');
    customized = customized.replaceAll('neutral color palette', 'vibrant and warm color palette');
    customized = customized.replaceAll('elegant', 'relaxed and carefree');
    customized += ', summer vibes, sandy beach, waves in background, natural makeup, beach accessories';
    return customized;
  },

  // Use Case 2: Formal Business (style: formal, gender: male, setting: office)
  formalBusiness: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('female', 'male');
    customized = customized.replaceAll('slim, fair skin tone', 'well-built, professional appearance');
    customized = customized.replaceAll('silk blend', 'wool or high-quality cotton');
    customized = customized.replaceAll('studio', 'modern office or boardroom');
    customized = customized.replaceAll('elegant', 'professional and authoritative');
    customized = customized.replaceAll('soft-diffused lighting', 'professional studio lighting');
    customized = customized.replaceAll('neutral color palette', 'corporate neutral palette (navy, gray, white)');
    customized += ', business suit, tie, professional accessories, sharp focus on face and outfit, corporate photography';
    return customized;
  },

  // Use Case 3: Elegant Evening (style: elegant, mood: romantic, colors: red/black, setting: ballroom)
  elegantEvening: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('silk blend', 'silk or satin');
    customized = customized.replaceAll('studio', 'elegant ballroom or upscale venue');
    customized = customized.replaceAll('soft-diffused lighting', 'dramatic warm lighting with shadows');
    customized = customized.replaceAll('neutral color palette', 'rich warm color palette (reds, golds, blacks)');
    customized = customized.replaceAll('elegant', 'glamorous and sophisticated');
    customized += ', evening gown or tuxedo, luxury accessories, dramatic makeup, champagne glass, upscale ambiance';
    return customized;
  },

  // Use Case 4: Casual Streetwear (style: casual, setting: urban, colors: monochrome)
  casualStreetwear: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('silk blend', 'cotton, denim, or polyester blend');
    customized = customized.replaceAll('studio', 'urban street or modern city background');
    customized = customized.replaceAll('soft-diffused lighting', 'natural daylight with urban shadows');
    customized = customized.replaceAll('neutral color palette', 'monochrome or contrasting urban palette');
    customized = customized.replaceAll('elegant', 'trendy and urban');
    customized += ', sneakers, casual accessories, street style, graffiti or modern architecture background, candid pose';
    return customized;
  },

  // Use Case 5: Sporty Athleisure (style: sporty, setting: gym/outdoor, colors: bright)
  sportyAthleisure: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('silk blend', 'technical fabric or athletic wear');
    customized = customized.replaceAll('studio', 'gym, outdoor park, or athletic facility');
    customized = customized.replaceAll('soft-diffused lighting', 'bright natural or gym lighting');
    customized = customized.replaceAll('neutral color palette', 'bright and energetic color palette');
    customized = customized.replaceAll('elegant', 'athletic and energetic');
    customized += ', sports shoes, fitness accessories, active pose, sweat details, healthy glow, dynamic movement';
    return customized;
  },

  // Use Case 6: Vintage/Retro (style: vintage, colors: muted, material: wool)
  vintageRetro: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('silk blend', 'wool, tweed, or vintage fabric');
    customized = customized.replaceAll('studio', 'vintage studio or retro-themed location');
    customized = customized.replaceAll('soft-diffused lighting', 'warm vintage lighting with film grain effect');
    customized = customized.replaceAll('neutral color palette', 'muted vintage color palette (sepia, pastels)');
    customized = customized.replaceAll('elegant', 'vintage and nostalgic');
    customized += ', vintage accessories, classic hairstyle, retro makeup, film photography style, 1950s or 1970s aesthetic';
    return customized;
  },

  // Use Case 7: Luxury/High Fashion (style: luxury, colors: premium, material: silk)
  luxuryHighFashion: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('silk blend', 'pure silk, cashmere, or designer fabric');
    customized = customized.replaceAll('studio', 'luxury studio or high-end boutique');
    customized = customized.replaceAll('soft-diffused lighting', 'professional luxury studio lighting');
    customized = customized.replaceAll('neutral color palette', 'premium color palette with gold or silver accents');
    customized = customized.replaceAll('elegant', 'luxurious and exclusive');
    customized += ', luxury designer pieces, high-end jewelry, flawless makeup, exclusive accessories, editorial fashion magazine quality';
    return customized;
  },

  // Use Case 8: Bohemian/Hippie (style: bohemian, setting: nature, colors: earth tones)
  bohemianHippie: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('silk blend', 'cotton, linen, or natural fibers');
    customized = customized.replaceAll('studio', 'natural outdoor setting with nature elements');
    customized = customized.replaceAll('soft-diffused lighting', 'natural soft golden hour lighting');
    customized = customized.replaceAll('neutral color palette', 'earth tone and natural color palette');
    customized = customized.replaceAll('elegant', 'free-spirited and bohemian');
    customized += ', bohemian accessories, flower crown, natural makeup, barefoot or sandals, forest or garden background, peaceful mood';
    return customized;
  },

  // Use Case 9: Minimalist/Modern (style: minimalist, colors: monochrome, setting: studio)
  minimalistModern: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('silk blend', 'clean minimalist fabric');
    customized = customized.replaceAll('studio', 'clean white or gray studio');
    customized = customized.replaceAll('soft-diffused lighting', 'clean minimalist lighting');
    customized = customized.replaceAll('neutral color palette', 'pure monochrome palette (black, white, gray)');
    customized = customized.replaceAll('elegant', 'minimalist and modern');
    customized += ', minimal accessories, clean lines, geometric shapes, white background, negative space, contemporary art photography';
    return customized;
  },

  // Use Case 10: Edgy/Alternative (style: edgy, material: leather, colors: dark)
  edgyAlternative: (template, inputs) => {
    let customized = template;
    customized = customized.replaceAll('silk blend', 'leather or alternative materials');
    customized = customized.replaceAll('studio', 'dark moody studio or urban setting');
    customized = customized.replaceAll('soft-diffused lighting', 'dramatic dark lighting with strong shadows');
    customized = customized.replaceAll('neutral color palette', 'dark and moody color palette (blacks, deep purples, silvers)');
    customized = customized.replaceAll('elegant', 'edgy and alternative');
    customized += ', leather jacket, metal accessories, bold makeup, alternative style, grunge aesthetic, rebellious mood';
    return customized;
  }
};

// Function to detect use case from inputs with priority-based logic
const detectUseCase = (inputs) => {
  const { style, setting, colors, material, mood, gender, age } = inputs;

  // Priority 1: Specific combinations (most specific)
  if (style === 'formal' && gender === 'male' && setting === 'office') return 'formalBusiness';
  if (style === 'casual' && setting === 'beach') return 'casualBeach';
  if (style === 'casual' && setting === 'urban') return 'casualStreetwear';
  if (style === 'elegant' && mood === 'romantic' && colors?.includes('red')) return 'elegantEvening';
  if (style === 'sporty' && setting === 'gym') return 'sportyAthleisure';
  
  // Priority 2: Style-based (medium specificity)
  if (style === 'vintage') return 'vintageRetro';
  if (style === 'luxury' || style === 'premium') return 'luxuryHighFashion';
  if (style === 'bohemian' && setting === 'nature') return 'bohemianHippie';
  if (style === 'minimalist') return 'minimalistModern';
  
  // Priority 3: Material-based (less specific)
  if (style === 'edgy' && material === 'leather') return 'edgyAlternative';
  
  // Priority 4: Fallback to style-based detection
  if (style === 'casual') return 'casualStreetwear';
  if (style === 'elegant') return 'elegantEvening';
  if (style === 'formal') return 'formalBusiness';
  if (style === 'edgy') return 'edgyAlternative';

  // Default: return null (use base template)
  return null;
};

// Main export function: Generate dynamic prompt
export const generateDynamicPrompt = (inputs) => {
  // Step 1: Generate base template
  let prompt = baseTemplate(inputs);

  // Step 2: Detect use case
  const useCase = detectUseCase(inputs);

  // Step 3: Apply customization if available
  if (useCase && customizations[useCase]) {
    prompt = customizations[useCase](prompt, inputs);
  }

  // Step 4: Age-based adjustments (global)
  const ageMin = parseInt(inputs.age?.split('-')[0]) || 20;
  if (ageMin < 20) {
    prompt += ', youthful and fresh appearance';
  } else if (ageMin >= 40) {
    prompt += ', mature and sophisticated appearance';
  }

  // Step 5: Material-based adjustments (global)
  if (inputs.material === 'leather') {
    prompt = prompt.replaceAll('elegant', 'edgy and bold');
  }
  if (inputs.material === 'wool') {
    prompt += ', warm and cozy feeling';
  }

  // Step 6: Mood-based adjustments (global)
  if (inputs.mood === 'playful') {
    prompt += ', fun and playful energy, bright smile, dynamic pose';
  }
  if (inputs.mood === 'serious') {
    prompt += ', serious and intense expression, powerful stance';
  }

  return prompt;
};

// Generate negative prompt based on inputs
export const generateNegativePrompt = (inputs = {}) => {
  return `blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, signature, out of frame, poorly drawn face, mutation, mutated, extra limbs, extra legs, extra arms, disfigured, kitsch, oversaturated, grain, grainy, noisy, unfocused, dark, dull, unprofessional, amateur, stock photo, placeholder`;
};

// Export all functions for testing and reuse
export const getAllUseCases = () => Object.keys(customizations);
export const getUseCase = (inputs) => detectUseCase(inputs);

// Default inputs for testing
export const defaultInputs = {
  age: '20-30',
  gender: 'female',
  style: 'elegant',
  colors: 'white and black',
  material: 'silk blend',
  setting: 'studio',
  mood: 'elegant'
};

// Test function to run all use cases
export const testAllUseCases = () => {
  console.log('🧪 Running Dynamic Prompt Templates Tests...\n');
  
  const testCases = [
    { name: 'Casual Beach', inputs: { age: '20-30', gender: 'female', style: 'casual', colors: 'bright', material: 'cotton', setting: 'beach', mood: 'relaxed' }, expectedKeywords: ['beach', 'cotton', 'golden hour', 'vibrant', 'summer'] },
    { name: 'Formal Business', inputs: { age: '30-40', gender: 'male', style: 'formal', colors: 'navy', material: 'wool', setting: 'office', mood: 'professional' }, expectedKeywords: ['office', 'wool', 'professional', 'business suit', 'corporate'] },
    { name: 'Elegant Evening', inputs: { age: '25-35', gender: 'female', style: 'elegant', colors: 'red and black', material: 'silk', setting: 'ballroom', mood: 'romantic' }, expectedKeywords: ['ballroom', 'satin', 'dramatic', 'evening gown', 'glamorous'] },
    { name: 'Casual Streetwear', inputs: { age: '18-25', gender: 'female', style: 'casual', colors: 'monochrome', material: 'denim', setting: 'urban', mood: 'trendy' }, expectedKeywords: ['urban', 'denim', 'street style', 'graffiti', 'sneakers'] },
    { name: 'Sporty Athleisure', inputs: { age: '20-30', gender: 'female', style: 'sporty', colors: 'bright', material: 'technical', setting: 'gym', mood: 'energetic' }, expectedKeywords: ['gym', 'athletic', 'sports shoes', 'fitness', 'dynamic'] },
    { name: 'Vintage Retro', inputs: { age: '30-40', gender: 'female', style: 'vintage', colors: 'muted', material: 'wool', setting: 'vintage', mood: 'nostalgic' }, expectedKeywords: ['vintage', 'wool', 'retro', 'film grain', '1950s'] },
    { name: 'Luxury High Fashion', inputs: { age: '25-35', gender: 'female', style: 'luxury', colors: 'gold', material: 'silk', setting: 'studio', mood: 'exclusive' }, expectedKeywords: ['luxury', 'cashmere', 'designer', 'jewelry', 'editorial'] },
    { name: 'Bohemian Hippie', inputs: { age: '20-30', gender: 'female', style: 'bohemian', colors: 'earth tones', material: 'linen', setting: 'nature', mood: 'peaceful' }, expectedKeywords: ['bohemian', 'linen', 'flower crown', 'forest', 'barefoot'] },
    { name: 'Minimalist Modern', inputs: { age: '25-35', gender: 'female', style: 'minimalist', colors: 'monochrome', material: 'cotton', setting: 'studio', mood: 'clean' }, expectedKeywords: ['minimalist', 'monochrome', 'white', 'geometric', 'negative space'] },
    { name: 'Edgy Alternative', inputs: { age: '18-25', gender: 'female', style: 'edgy', colors: 'dark', material: 'leather', setting: 'urban', mood: 'rebellious' }, expectedKeywords: ['edgy', 'leather', 'dark', 'grunge', 'metal accessories'] }
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase) => {
    try {
      const prompt = generateDynamicPrompt(testCase.inputs);
      const detectedUseCase = getUseCase(testCase.inputs);
      
      // Check if prompt contains expected keywords
      const hasKeywords = testCase.expectedKeywords.every(keyword => 
        prompt.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasKeywords) {
        console.log(`✅ ${testCase.name} - PASSED`);
        console.log(`   Use Case: ${detectedUseCase || 'Base'}`);
        console.log(`   Prompt length: ${prompt.length} chars\n`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name} - FAILED`);
        console.log(`   Missing keywords: ${testCase.expectedKeywords.filter(k => !prompt.toLowerCase().includes(k.toLowerCase())).join(', ')}\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} - ERROR: ${error.message}\n`);
      failed++;
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
  console.log(`✨ All Use Cases: ${getAllUseCases().join(', ')}`);
  
  return { passed, failed, total: testCases.length };
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.promptTemplates = {
    generateDynamicPrompt,
    generateNegativePrompt,
    getAllUseCases,
    getUseCase,
    testAllUseCases,
    defaultInputs
  };
}
