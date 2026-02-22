#!/usr/bin/env node
/**
 * Test Scripts Migration Script
 * Reorganizes all test scripts into structured folders with clearer naming
 * 
 * Run: node migrate-tests.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const __dirname = import.meta.url.replace('file:///', '').split('/migrate-tests.js')[0];

// Mapping: source file -> destination folder & new name
const fileMappings = {
  // Analysis Providers Tests
  'test-gemini.js': ['1-analysis-providers', '01-gemini-api-test.js'],
  'test-gemini-direct.js': ['1-analysis-providers', '02-gemini-unified-analysis-test.js'],
  'test-fireworks.js': ['1-analysis-providers', '03-fireworks-vision-test.js'],
  'test-chatgpt.js': ['1-analysis-providers', '04-chatgpt-analysis-test.js'],
  'test-chatgpt-analysis-only.js': ['1-analysis-providers', '05-chatgpt-quality-analysis-test.js'],
  'test-openrouter.js': ['1-analysis-providers', '06-openrouter-provider-test.js'],
  'test-openrouter-api.js': ['1-analysis-providers', '07-openrouter-quick-test.js'],
  'test-zai.js': ['1-analysis-providers', '08-zai-service-test.js'],
  'test-huggingface.js': ['1-analysis-providers', '09-huggingface-provider-test.js'],
  'test-ai-providers.js': ['1-analysis-providers', '10-free-providers-test.js'],
  'test-all-providers.js': ['1-analysis-providers', '11-all-providers-test.js'],
  'test-analysis-models.js': ['1-analysis-providers', '12-analysis-models-comparison-test.js'],

  // Image Generation Tests
  'test-image-generation.js': ['2-image-generation', '01-basic-image-generation-test.js'],
  'test-image-gen-real.js': ['2-image-generation', '02-realworld-image-generation-test.js'],
  'test-image-gen-setup.js': ['2-image-generation', '03-image-setup-verification-test.js'],
  'test-image-providers.js': ['2-image-generation', '04-image-providers-config-test.js'],
  'test-image-upload.js': ['2-image-generation', '05-image-upload-test.js'],

  // Video Generation Tests
  'test-video-generation-api.js': ['3-video-generation', '01-video-gen-api-test.js'],
  'test-video-generation-api-v2.js': ['3-video-generation', '02-video-gen-api-v2-comprehensive-test.js'],
  'test-flow-video-generation.js': ['3-video-generation', '03-google-flow-video-gen-test.js'],

  // Workflow Tests
  'test-full-flow.js': ['4-workflows', '01-full-flow-basic-test.js'],
  'test-full-flow-v2.js': ['4-workflows', '02-full-flow-v2-advanced-test.js'],
  'test-one-click-full-flow.js': ['4-workflows', '03-oneclick-creator-fullflow-test.js'],
  'test-multi-flow.js': ['4-workflows', '04-multiflow-orchestrator-test.js'],
  'test-multi-image-simple.js': ['4-workflows', '05-multi-image-simple-test.js'],
  'test-upload-with-ai.js': ['4-workflows', '06-upload-analysis-integration-test.js'],

  // Browser Automation Tests
  'test-lab-flow-integration.js': ['5-browser-automation', '01-google-flow-integration-test.js'],
  'test-browser-services.js': ['5-browser-automation', '02-browser-services-comparison-test.js'],
  'test-session.js': ['5-browser-automation', '03-session-management-test.js'],
  'test-persistent-browser.js': ['5-browser-automation', '04-persistent-browser-session-test.js'],
  'test-profile2-auto-login.js': ['5-browser-automation', '05-chrome-profile-autoauth-test.js'],
  'test-stealth-measures.js': ['5-browser-automation', '06-bot-detection-stealth-test.js'],
  'test-manual-remote-debug.js': ['5-browser-automation', '07-remote-debug-chrome-test.js'],
  'test-remote-debug-chrome.js': ['5-browser-automation', '08-remote-chrome-debugging-test.js'],
  'test-step-by-step.js': ['5-browser-automation', '09-step-by-step-flow-test.js'],

  // Setup & Verification
  'setup-byteplus.js': ['6-setup-verification', 'setup-byteplus.js'],
  'setup-google-auth.js': ['6-setup-verification', 'setup-google-auth.js'],
  'setup-zai.js': ['6-setup-verification', 'setup-zai.js'],
  'verify-chatgpt.js': ['6-setup-verification', 'verify-chatgpt-integration.js'],
  'simple-grok-test.js': ['6-setup-verification', 'verify-grok-session.js'],
  'checkProviders.js': ['6-setup-verification', 'verify-providers-availability.js'],
  'browser-automation-test-suite.js': ['6-setup-verification', 'verify-browser-automation-suite.js'],
  'create-test-image.js': ['6-setup-verification', 'util-create-test-image.js'],
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function migrateTests() {
  log('\n' + '═'.repeat(70), 'cyan');
  log('TEST SCRIPTS MIGRATION', 'cyan');
  log('═'.repeat(70) + '\n', 'cyan');

  const backendDir = __dirname;
  const testsDir = path.join(backendDir, 'tests');

  let totalFiles = 0;
  let movedFiles = 0;
  let skippedFiles = 0;
  let errorFiles = 0;

  for (const [sourceFile, [destFolder, newName]] of Object.entries(fileMappings)) {
    totalFiles++;
    const sourcePath = path.join(backendDir, sourceFile);
    const destPath = path.join(testsDir, destFolder, newName);

    try {
      if (!fs.existsSync(sourcePath)) {
        log(`⏭️  SKIP: ${sourceFile} (not found)`, 'yellow');
        skippedFiles++;
        continue;
      }

      // Ensure destination folder exists
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      // Copy file
      fs.copyFileSync(sourcePath, destPath);
      
      // Remove original
      fs.unlinkSync(sourcePath);

      log(`✅ MOVED: ${sourceFile} → ${destFolder}/${newName}`, 'green');
      movedFiles++;
    } catch (error) {
      log(`❌ ERROR: ${sourceFile} - ${error.message}`, 'red');
      errorFiles++;
    }
  }

  // Summary
  log('\n' + '─'.repeat(70), 'cyan');
  log('MIGRATION SUMMARY', 'cyan');
  log('─'.repeat(70), 'cyan');
  log(`Total files to migrate: ${totalFiles}`, 'cyan');
  log(`✅ Successfully moved: ${movedFiles}`, 'green');
  log(`⏭️  Skipped (not found): ${skippedFiles}`, 'yellow');
  if (errorFiles > 0) {
    log(`❌ Errors: ${errorFiles}`, 'red');
  }
  log('─'.repeat(70) + '\n', 'cyan');

  if (movedFiles > 0) {
    log('✅ Migration complete! All test scripts organized.', 'green');
    log('\n📚 Quick Start:', 'cyan');
    log('  node tests/4-workflows/03-oneclick-creator-fullflow-test.js', 'yellow');
    log('  node tests/1-analysis-providers/05-chatgpt-quality-analysis-test.js', 'yellow');
    log('  node tests/6-setup-verification/verify-providers-availability.js', 'yellow');
    log('\n📖 Full documentation: see tests/README.md\n', 'cyan');
  }
}

migrateTests().catch(err => {
  log(`\n❌ Migration failed: ${err.message}`, 'red');
  process.exit(1);
});
