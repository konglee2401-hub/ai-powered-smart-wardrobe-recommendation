#!/usr/bin/env node

import chalk from 'chalk';
import GrokServiceV2 from './services/browser/grokServiceV2.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGrokGenerate() {
  console.log(chalk.cyan('\n🧪 Testing Grok Image Generation\n'));

  const service = new GrokServiceV2({ headless: false });

  try {
    await service.initialize();

    const prompt = 'A beautiful fashion model wearing a stylish red dress, professional photography, high quality';

    // Ensure output directory exists
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = await service.generateImage(prompt, {
      download: true,
      outputPath: path.join(outputDir, 'test-generated.png')
    });

    console.log(chalk.green('\n✅ Generation Result:\n'));
    console.log(`URL: ${result.url}`);
    console.log(`Saved: ${result.path}`);

  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
  } finally {
    await service.close();
  }
}

testGrokGenerate();
