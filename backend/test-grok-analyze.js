#!/usr/bin/env node

import chalk from 'chalk';
import GrokServiceV2 from './services/browser/grokServiceV2.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGrokAnalyze() {
  console.log(chalk.cyan('\n🧪 Testing Grok Image Analysis\n'));

  const service = new GrokServiceV2({ headless: false });

  try {
    await service.initialize();

    const imagePath = path.join(__dirname, 'test-images', 'anh nhan vat.jpeg');
    const prompt = 'Describe this character in detail, including clothing, pose, and style.';

    const result = await service.analyzeImage(imagePath, prompt);

    console.log(chalk.green('\n✅ Analysis Result:\n'));
    console.log(result);

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await service.close();
  }
}

testGrokAnalyze();
