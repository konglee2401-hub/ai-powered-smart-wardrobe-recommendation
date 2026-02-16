/**
 * Test Suite for Dynamic Prompt Templates - REVISED
 * Phase 2 Fixes: Comprehensive tests for all 10 use cases
 * Tests: replaceAll, priority-based detection, error handling
 */

import { 
  generateDynamicPrompt, 
  generateNegativePrompt, 
  getAllUseCases, 
  getUseCase,
  testAllUseCases,
  defaultInputs 
} from '../utils/promptTemplates';

// ============================================
// FIXTURES: Test data for all 10 use cases
// ============================================

const testCases = [
  {
    name: 'Casual Beach',
    inputs: { age: '20-30', gender: 'female', style: 'casual', colors: 'bright', material: 'cotton', setting: 'beach', mood: 'relaxed' },
    expectedKeywords: ['beach', 'cotton', 'golden hour', 'vibrant', 'summer'],
    expectedUseCase: 'casualBeach'
  },
  {
    name: 'Formal Business',
    inputs: { age: '30-40', gender: 'male', style: 'formal', colors: 'navy', material: 'wool', setting: 'office', mood: 'professional' },
    expectedKeywords: ['office', 'wool', 'professional', 'business suit', 'corporate'],
    expectedUseCase: 'formalBusiness'
  },
  {
    name: 'Elegant Evening',
    inputs: { age: '25-35', gender: 'female', style: 'elegant', colors: 'red and black', material: 'silk', setting: 'ballroom', mood: 'romantic' },
    expectedKeywords: ['ballroom', 'satin', 'dramatic', 'evening gown', 'glamorous'],
    expectedUseCase: 'elegantEvening'
  },
  {
    name: 'Casual Streetwear',
    inputs: { age: '18-25', gender: 'female', style: 'casual', colors: 'monochrome', material: 'denim', setting: 'urban', mood: 'trendy' },
    expectedKeywords: ['urban', 'denim', 'street style', 'graffiti', 'sneakers'],
    expectedUseCase: 'casualStreetwear'
  },
  {
    name: 'Sporty Athleisure',
    inputs: { age: '20-30', gender: 'female', style: 'sporty', colors: 'bright', material: 'technical', setting: 'gym', mood: 'energetic' },
    expectedKeywords: ['gym', 'athletic', 'sports shoes', 'fitness', 'dynamic'],
    expectedUseCase: 'sportyAthleisure'
  },
  {
    name: 'Vintage Retro',
    inputs: { age: '30-40', gender: 'female', style: 'vintage', colors: 'muted', material: 'wool', setting: 'vintage', mood: 'nostalgic' },
    expectedKeywords: ['vintage', 'wool', 'retro', 'film grain', '1950s'],
    expectedUseCase: 'vintageRetro'
  },
  {
    name: 'Luxury High Fashion',
    inputs: { age: '25-35', gender: 'female', style: 'luxury', colors: 'gold', material: 'silk', setting: 'studio', mood: 'exclusive' },
    expectedKeywords: ['luxury', 'cashmere', 'designer', 'jewelry', 'editorial'],
    expectedUseCase: 'luxuryHighFashion'
  },
  {
    name: 'Bohemian Hippie',
    inputs: { age: '20-30', gender: 'female', style: 'bohemian', colors: 'earth tones', material: 'linen', setting: 'nature', mood: 'peaceful' },
    expectedKeywords: ['bohemian', 'linen', 'flower crown', 'forest', 'barefoot'],
    expectedUseCase: 'bohemianHippie'
  },
  {
    name: 'Minimalist Modern',
    inputs: { age: '25-35', gender: 'female', style: 'minimalist', colors: 'monochrome', material: 'cotton', setting: 'studio', mood: 'clean' },
    expectedKeywords: ['minimalist', 'monochrome', 'white', 'geometric', 'negative space'],
    expectedUseCase: 'minimalistModern'
  },
  {
    name: 'Edgy Alternative',
    inputs: { age: '18-25', gender: 'female', style: 'edgy', colors: 'dark', material: 'leather', setting: 'urban', mood: 'rebellious' },
    expectedKeywords: ['edgy', 'leather', 'dark', 'grunge', 'metal accessories'],
    expectedUseCase: 'edgyAlternative'
  }
];

// ============================================
// TEST SUITE
// ============================================

describe('Prompt Templates - Phase 2 Fixed', () => {
  
  // Test base case generation
  describe('Base Template Generation', () => {
    test('should generate base prompt with valid inputs', () => {
      const prompt = generateDynamicPrompt(defaultInputs);
      
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(100);
      expect(prompt).toContain('elegant');
      expect(prompt).toContain('female');
    });

    test('should throw error with invalid inputs', () => {
      expect(() => generateDynamicPrompt(null)).toThrow();
      expect(() => generateDynamicPrompt({})).toThrow();
      expect(() => generateDynamicPrompt(undefined)).toThrow();
    });
  });

  // Test all 10 use cases
  describe('Use Case Generation', () => {
    testCases.forEach(({ name, inputs, expectedKeywords, expectedUseCase }) => {
      test(`should generate ${name} use case`, () => {
        const prompt = generateDynamicPrompt(inputs);
        const detectedUseCase = getUseCase(inputs);
        
        expect(prompt).toBeDefined();
        expect(prompt.length).toBeGreaterThan(100);
        
        // Check expected use case is detected
        expect(detectedUseCase).toBe(expectedUseCase);
        
        // Check prompt contains expected keywords
        expectedKeywords.forEach(keyword => {
          expect(prompt.toLowerCase()).toContain(keyword.toLowerCase());
        });
      });
    });
  });

  // Test priority-based detection
  describe('Use Case Detection - Priority Based', () => {
    test('should detect specific combination (formal + male + office) over style', () => {
      const inputs = { 
        age: '30-40', 
        gender: 'male', 
        style: 'formal', 
        setting: 'office', 
        colors: 'navy', 
        material: 'wool',
        mood: 'professional' 
      };
      expect(getUseCase(inputs)).toBe('formalBusiness');
    });

    test('should detect casual + beach over casual alone', () => {
      const inputs = { 
        age: '20-30', 
        gender: 'female', 
        style: 'casual', 
        setting: 'beach', 
        colors: 'bright', 
        material: 'cotton',
        mood: 'playful' 
      };
      expect(getUseCase(inputs)).toBe('casualBeach');
    });

    test('should fallback to style-based when no specific match', () => {
      const inputs = { 
        age: '25-35', 
        gender: 'female', 
        style: 'luxury', 
        setting: 'unknown', 
        colors: 'gold', 
        material: 'silk',
        mood: 'exclusive' 
      };
      expect(getUseCase(inputs)).toBe('luxuryHighFashion');
    });

    test('should return null for unrecognized inputs', () => {
      const inputs = { 
        age: '20-30', 
        gender: 'female', 
        style: 'unknown', 
        setting: 'studio', 
        colors: 'blue', 
        material: 'cotton',
        mood: 'neutral' 
      };
      expect(getUseCase(inputs)).toBeNull();
    });
  });

  // Test replaceAll functionality (Issue 1 fix)
  describe('Template String Replacement - replaceAll', () => {
    test('should replace all occurrences of silk blend in elegantEvening', () => {
      const inputs = {
        age: '25-35',
        gender: 'female',
        style: 'elegant',
        colors: 'red and black',
        material: 'silk blend',
        setting: 'studio',
        mood: 'romantic'
      };
      
      const prompt = generateDynamicPrompt(inputs);
      
      // Should NOT contain 'silk blend' (replaced with 'silk or satin')
      expect(prompt).not.toContain('silk blend');
      // Should contain the replacement
      expect(prompt).toContain('satin');
    });

    test('should replace all occurrences of studio in casualBeach', () => {
      const inputs = {
        age: '20-30',
        gender: 'female',
        style: 'casual',
        colors: 'bright',
        material: 'cotton',
        setting: 'beach',
        mood: 'playful'
      };
      
      const prompt = generateDynamicPrompt(inputs);
      
      // Should NOT contain 'studio' (replaced with beach setting)
      expect(prompt).not.toContain('studio');
      // Should contain beach
      expect(prompt).toContain('beach');
    });

    test('should replace all occurrences of elegant in multiple places', () => {
      const inputs = {
        age: '25-35',
        gender: 'female',
        style: 'elegant',
        colors: 'white and black',
        material: 'silk blend',
        setting: 'studio',
        mood: 'elegant'
      };
      
      const prompt = generateDynamicPrompt(inputs);
      
      // Count occurrences - should be 0 since 'elegant' gets replaced everywhere
      const elegantCount = (prompt.match(/elegant/g) || []).length;
      expect(elegantCount).toBe(0);
    });
  });

  // Test age-based adjustments
  describe('Age-Based Adjustments', () => {
    test('should add youthful appearance for age < 20', () => {
      const inputs = {
        age: '15-18',
        gender: 'female',
        style: 'casual',
        colors: 'vibrant',
        material: 'cotton',
        setting: 'beach',
        mood: 'playful'
      };

      const prompt = generateDynamicPrompt(inputs);
      expect(prompt).toContain('youthful');
    });

    test('should add mature appearance for age >= 40', () => {
      const inputs = {
        age: '40-50',
        gender: 'female',
        style: 'elegant',
        colors: 'classic',
        material: 'silk',
        setting: 'studio',
        mood: 'sophisticated'
      };

      const prompt = generateDynamicPrompt(inputs);
      expect(prompt).toContain('mature');
    });
  });

  // Test material-based adjustments
  describe('Material-Based Adjustments', () => {
    test('should add leather-specific adjustments', () => {
      const inputs = {
        age: '20-30',
        gender: 'female',
        style: 'edgy',
        colors: 'black',
        material: 'leather',
        setting: 'urban',
        mood: 'serious'
      };

      const prompt = generateDynamicPrompt(inputs);
      expect(prompt).toContain('edgy');
      expect(prompt).toContain('leather');
    });

    test('should add warm cozy feeling for wool', () => {
      const inputs = {
        age: '30-40',
        gender: 'female',
        style: 'vintage',
        colors: 'earth tones',
        material: 'wool',
        setting: 'studio',
        mood: 'cozy'
      };

      const prompt = generateDynamicPrompt(inputs);
      expect(prompt).toContain('warm');
      expect(prompt).toContain('cozy');
    });
  });

  // Test mood-based adjustments
  describe('Mood-Based Adjustments', () => {
    test('should add playful energy for mood: playful', () => {
      const inputs = {
        age: '20-30',
        gender: 'female',
        style: 'casual',
        colors: 'bright',
        material: 'cotton',
        setting: 'beach',
        mood: 'playful'
      };

      const prompt = generateDynamicPrompt(inputs);
      expect(prompt).toContain('playful');
      expect(prompt).toContain('smile');
    });

    test('should add serious expression for mood: serious', () => {
      const inputs = {
        age: '30-40',
        gender: 'male',
        style: 'formal',
        colors: 'navy',
        material: 'wool',
        setting: 'office',
        mood: 'serious'
      };

      const prompt = generateDynamicPrompt(inputs);
      expect(prompt).toContain('serious');
      expect(prompt).toContain('intense');
    });
  });

  // Test negative prompt generation
  describe('Negative Prompt Generation', () => {
    test('should generate negative prompt with default values', () => {
      const negativePrompt = generateNegativePrompt();
      
      expect(negativePrompt).toBeDefined();
      expect(negativePrompt.length).toBeGreaterThan(50);
      expect(negativePrompt).toContain('blurry');
      expect(negativePrompt).toContain('low quality');
    });

    test('should generate negative prompt with custom inputs', () => {
      const inputs = { style: 'luxury', colors: 'gold' };
      const negativePrompt = generateNegativePrompt(inputs);
      
      expect(negativePrompt).toBeDefined();
      expect(negativePrompt).toContain('blurry');
    });
  });

  // Test getAllUseCases
  describe('Utility Functions', () => {
    test('should return all 10 use cases', () => {
      const useCases = getAllUseCases();
      expect(useCases.length).toBe(10);
      expect(useCases).toContain('casualBeach');
      expect(useCases).toContain('formalBusiness');
      expect(useCases).toContain('elegantEvening');
      expect(useCases).toContain('casualStreetwear');
      expect(useCases).toContain('sportyAthleisure');
      expect(useCases).toContain('vintageRetro');
      expect(useCases).toContain('luxuryHighFashion');
      expect(useCases).toContain('bohemianHippie');
      expect(useCases).toContain('minimalistModern');
      expect(useCases).toContain('edgyAlternative');
    });

    test('should return default inputs', () => {
      expect(defaultInputs).toEqual({
        age: '20-30',
        gender: 'female',
        style: 'elegant',
        colors: 'white and black',
        material: 'silk blend',
        setting: 'studio',
        mood: 'elegant'
      });
    });
  });
});

// ============================================
// RUNNER FUNCTION (for browser console)
// ============================================

const runTests = () => {
  console.log('🧪 Running Dynamic Prompt Templates Tests - Phase 2 Fixed...\n');
  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase) => {
    try {
      const prompt = generateDynamicPrompt(testCase.inputs);
      const useCase = getUseCase(testCase.inputs);
      
      // Check if prompt contains expected keywords
      const hasKeywords = testCase.expectedKeywords.every(keyword => 
        prompt.toLowerCase().includes(keyword.toLowerCase())
      );

      // Check use case detection
      const hasUseCase = useCase === testCase.expectedUseCase;

      if (hasKeywords && hasUseCase) {
        console.log(`✅ ${testCase.name} - PASSED`);
        console.log(`   Use Case: ${useCase || 'Base'}`);
        console.log(`   Prompt length: ${prompt.length} chars\n`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name} - FAILED`);
        if (!hasUseCase) console.log(`   Use Case Mismatch: expected ${testCase.expectedUseCase}, got ${useCase}`);
        if (!hasKeywords) console.log(`   Missing keywords: ${testCase.expectedKeywords.filter(k => !prompt.toLowerCase().includes(k.toLowerCase())).join(', ')}\n`);
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

// Export for use
export { runTests, testCases };

// Auto-run if imported directly in browser
if (typeof window !== 'undefined') {
  window.runPromptTests = runTests;
}

// Export default for testing frameworks
export default {
  runTests,
  testCases
};
