/**
 * Test Suite for Prompt Routes
 * Test /api/prompts/generate-prompt endpoint
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const testPromptAPI = async () => {
  console.log('🧪 Testing Prompt API...\n');

  try {
    // Test 1: Valid draft
    console.log('Test 1: Valid draft');
    const response1 = await axios.post(`${API_URL}/prompts/generate-prompt`, {
      draft: 'Professional fashion photography of 20-30 year old, female, casual and confident, slim, fair skin tone, wearing full-outfit',
      userInputs: { age: '20-30', gender: 'female', style: 'casual', colors: 'bright', material: 'cotton', setting: 'beach', mood: 'relaxed' }
    });
    console.log('✅ Response:', response1.data);
    console.log('');

    // Test 2: Short draft (should fail)
    console.log('Test 2: Short draft (should fail)');
    try {
      await axios.post(`${API_URL}/prompts/generate-prompt`, {
        draft: 'Short'
      });
    } catch (error) {
      console.log('✅ Expected error:', error.response.data);
    }
    console.log('');

    // Test 3: Missing draft (should fail)
    console.log('Test 3: Missing draft (should fail)');
    try {
      await axios.post(`${API_URL}/prompts/generate-prompt`, {});
    } catch (error) {
      console.log('✅ Expected error:', error.response.data);
    }
    console.log('');

    // Test 4: Generate prompt with all use cases
    console.log('Test 4: Test all use cases');
    const useCases = [
      { name: 'Casual Beach', inputs: { age: '20-30', gender: 'female', style: 'casual', setting: 'beach', colors: 'bright', material: 'cotton', mood: 'relaxed' }},
      { name: 'Formal Business', inputs: { age: '30-40', gender: 'male', style: 'formal', setting: 'office', colors: 'navy', material: 'wool', mood: 'professional' }},
      { name: 'Elegant Evening', inputs: { age: '25-35', gender: 'female', style: 'elegant', setting: 'ballroom', colors: 'red', material: 'silk', mood: 'romantic' }}
    ];

    for (const useCase of useCases) {
      const draft = `Professional fashion photography of ${useCase.inputs.age} year old, ${useCase.inputs.gender}, ${useCase.inputs.style}, ${useCase.inputs.setting} setting`;
      const response = await axios.post(`${API_URL}/prompts/generate-prompt`, {
        draft,
        userInputs: useCase.inputs
      });
      console.log(`✅ ${useCase.name}:`, response.data.status);
    }
    console.log('');

    console.log('✨ All API tests completed');
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

// Export
module.exports = { testPromptAPI };

// Run if executed directly
if (require.main === module) {
  testPromptAPI();
}
