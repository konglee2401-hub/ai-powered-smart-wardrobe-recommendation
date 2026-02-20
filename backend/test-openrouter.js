#!/usr/bin/env node

import chalk from 'chalk';
import { analyzeWithOpenRouter } from './services/openRouterService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testOpenRouter() {
  console.log(chalk.cyan('\n🧪 Testing OpenRouter Integration\n'));

  // Check API key
  if (!process.env.OPENROUTER_API_KEY_1) {
    console.error(chalk.red('❌ OPENROUTER_API_KEY_1 not found in .env'));
    console.log(chalk.yellow('\n💡 Please add to .env:'));
    console.log(chalk.gray('OPENROUTER_API_KEY_1=sk-or-v1-...'));
    console.log(chalk.gray('\nGet your key from: https://openrouter.ai/keys'));
    process.exit(1);
  }

  console.log(chalk.green('✅ API key found\n'));

  const imagePath = path.join(__dirname, 'test-images', 'anh-nhan-vat.jpeg');
  
  if (!fs.existsSync(imagePath)) {
    console.error(chalk.red(`❌ Test image not found: ${imagePath}`));
    process.exit(1);
  }

  const prompt = 'Describe this person in detail, including their clothing, pose, and style.';

  // Test with different models
  const modelsToTest = [
    'qwen/qwen-2-vl-72b-instruct',
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.2-11b-vision-instruct:free'
  ];

  for (const model of modelsToTest) {
    console.log(chalk.blue(`\nTesting with ${model}...`));
    console.log('-'.repeat(80));
    
    try {
      const result = await analyzeWithOpenRouter(imagePath, prompt, { model });

      console.log(chalk.green('\n✅ Analysis successful!'));
      console.log(chalk.cyan('\nResult preview:'));
      console.log(chalk.gray(result.substring(0, 300) + '...'));
      console.log(chalk.gray(`\nFull length: ${result.length} characters`));
      
      // Success - stop testing other models
      break;

    } catch (error) {
      console.error(chalk.red(`\n❌ Failed with ${model}:`), error.message);
      console.log(chalk.yellow('Trying next model...\n'));
    }
  }
}

testOpenRouter().catch(error => {
  console.error(chalk.red('\n❌ Test failed:'), error);
  process.exit(1);
});
