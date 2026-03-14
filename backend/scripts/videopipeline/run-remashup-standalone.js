#!/usr/bin/env node

/**
 * Standalone Remashup Runner
 * 
 * Usage:
 *   node scripts/videopipeline/run-remashup-standalone.js [queueId]
 * 
 * Example:
 *   node scripts/videopipeline/run-remashup-standalone.js queue-1773136604489-hln0nfehk
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import videoPipelineService from '../../services/videoPipelineService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/affiliate-ai';

const queueId = process.argv[2];

if (!queueId) {
  console.error('❌ Usage: node scripts/videopipeline/run-remashup-standalone.js <queueId>');
  console.error('Example: node scripts/videopipeline/run-remashup-standalone.js queue-1773136604489-hln0nfehk');
  process.exit(1);
}

console.log(`\n${'='.repeat(80)}`);
console.log(`🎬 STANDALONE REMASHUP RUNNER`);
console.log(`   Queue ID: ${queueId}`);
console.log(`${'='.repeat(80)}\n`);

async function runRemashup() {
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected\n');

    // Get singleton VideoPipelineService instance
    
    // Get payload from command line or use defaults
    const payload = {
      startImmediately: true,
      subtitleMode: 'auto',
      capcutAutoCaption: true, // 🎬 Enable CapCut for AI captions
      watermarkEnabled: false,
      voiceoverEnabled: false,
      // Add any custom config here from args if needed
    };

    console.log(`📋 Starting remashup with payload:`, payload);
    console.log(`${'='.repeat(80)}\n`);

    // Run remashup with empty context (no user auth)
    const result = await videoPipelineService.remashupJob(queueId, payload, {});

    console.log(`\n${'='.repeat(80)}`);
    if (result.success) {
      console.log(`✅ REMASHUP COMPLETED SUCCESSFULLY`);
      console.log(`   Queue ID: ${result.queueId}`);
      console.log(`   Message: ${result.message}`);
    } else {
      console.error(`❌ REMASHUP FAILED`);
      console.error(`   Error: ${result.error}`);
    }
    console.log(`${'='.repeat(80)}\n`);

    // Keep connection open for logs to finish
    await new Promise(resolve => setTimeout(resolve, 2000));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`\n${'='.repeat(80)}`);
    console.error(`❌ FATAL ERROR`);
    console.error(`   ${error.message}`);
    console.error(`${'='.repeat(80)}\n`);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  }
}

runRemashup();

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
