#!/usr/bin/env node

import chalk from 'chalk';
import MultiFlowOrchestrator from './services/multiFlowOrchestrator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMultiFlow() {
  console.log(chalk.cyan('\n🧪 Testing Multi-Flow Automation\n'));

  const characterImage = path.join(__dirname, 'test-images', 'anh nhan vat.jpeg');
  const clothingImage = path.join(__dirname, 'test-images', 'ao phong.jpg');

  // Test flows (excluding ones that require login for quick test)
  const flowTypes = ['grok-grok'];

  const orchestrator = new MultiFlowOrchestrator();

  try {
    const results = await orchestrator.runMultipleFlows(
      flowTypes,
      characterImage,
      clothingImage,
      {
        imageCount: 2, // Generate 2 images per flow
        imageHostProvider: 'auto'
      }
    );

    console.log(chalk.green('\n✅ Test complete!'));
    console.log(chalk.cyan('\nResults:'));
    console.log(JSON.stringify(results.stats, null, 2));

  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error);
    process.exit(1);
  }
}

testMultiFlow();
