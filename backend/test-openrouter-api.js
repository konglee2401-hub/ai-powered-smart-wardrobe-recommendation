#!/usr/bin/env node

/**
 * Quick test to verify OpenRouter API connection
 */

import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

async function testAPI() {
  console.log(chalk.cyan('\n🔍 Testing OpenRouter API Connection\n'));

  const apiKey = process.env.OPENROUTER_API_KEY_1;

  if (!apiKey) {
    console.error(chalk.red('❌ OPENROUTER_API_KEY_1 not found'));
    process.exit(1);
  }

  console.log(chalk.green('✅ API key found'));
  console.log(chalk.gray(`Key: ${apiKey.substring(0, 20)}...`));
  console.log('');

  // Test with simple text prompt (no image)
  const payload = {
    model: 'meta-llama/llama-3.2-3b-instruct:free',
    messages: [
      {
        role: 'user',
        content: 'Say "Hello from OpenRouter!"'
      }
    ]
  };

  try {
    console.log(chalk.blue('Sending test request...'));
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://smart-wardrobe.app',
          'X-Title': 'Smart Wardrobe AI'
        },
        timeout: 30000
      }
    );

    console.log(chalk.green('\n✅ API connection successful!'));
    console.log(chalk.cyan('\nResponse:'));
    console.log(response.data.choices[0].message.content);
    console.log('');
    console.log(chalk.gray('Model used:'), response.data.model);
    console.log(chalk.gray('Tokens:'), response.data.usage);

  } catch (error) {
    console.error(chalk.red('\n❌ API test failed'));
    
    if (error.response) {
      console.error(chalk.red('Status:'), error.response.status);
      console.error(chalk.red('Data:'), JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(chalk.red('Error:'), error.message);
    }
    
    process.exit(1);
  }
}

testAPI();
