#!/usr/bin/env node

/**
 * Direct ChatGPT Text Extraction Debugging
 * Tests pure text generation without dependencies
 */

import ChatGPTService from './backend/services/browser/chatgptService.js';

async function test() {
  const chat = new ChatGPTService({ debug: true });

  try {
    console.log('🚀 Initializing ChatGPT...');
    await chat.initialize();
    
    console.log('\n📝 Testing text generation...');
    const prompt = 'What is 2+2? Answer only with the number.';
    const response = await chat.generateText(prompt);
    
    console.log('\n✅ Response received:');
    console.log('---');
    console.log(response);
    console.log('---');
    console.log(`Length: ${response.length} characters`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await chat.close();
    console.log('\n✅ Browser closed');
  }
}

test();
