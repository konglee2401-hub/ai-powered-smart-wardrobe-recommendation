/**
 * Multi-Segment Video Generation Test
 * Tests the new video generation flow with segment calculation and file handling
 */

import { runVideoGeneration } from '../../../backend/services/googleFlowAutomationService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test configuration
const TEST_CASES = [
  {
    name: 'Single segment video (5s → 1 segment)',
    options: {
      duration: 5,
      quality: 'high',
      aspectRatio: '16:9',
      prompt: 'A fashion model wearing stylish red dress, standing in modern minimalist studio, bright white lighting, professional photography, 4k quality',
      outputDir: path.join(__dirname, '../../downloads/test-single-segment')
    }
  },
  {
    name: 'Multi-segment video (20s → 3 segments)',
    options: {
      duration: 20,
      quality: 'high',
      aspectRatio: '16:9',
      prompt: 'A professional fashion model showcasing trendy clothing in a luxury boutique, soft golden lighting, 4k quality',
      outputDir: path.join(__dirname, '../../downloads/test-multi-segment')
    }
  },
  {
    name: 'Extended video (30s → 4 segments)',
    options: {
      duration: 30,
      quality: 'high',
      aspectRatio: '16:9',
      prompt: 'Complete fashion show segment with model walking, turning, and posing, professional studio lighting, high quality production',
      outputDir: path.join(__dirname, '../../downloads/test-extended')
    }
  }
];

// Helper: Calculate expected segments
function calculateExpectedSegments(duration) {
  const SECONDS_PER_VIDEO = 8;
  return Math.ceil(duration / SECONDS_PER_VIDEO);
}

// Helper: Verify output directory
function verifyOutputDirectory(outputDir) {
  if (!fs.existsSync(outputDir)) {
    console.error(`❌ Output directory not created: ${outputDir}`);
    return false;
  }

  const files = fs.readdirSync(outputDir);
  const videoFiles = files.filter(f => f.endsWith('.mp4') || f.endsWith('.webm'));
  
  if (videoFiles.length === 0) {
    console.error(`❌ No video files found in ${outputDir}`);
    return true;  // Directory exists but no videos
  }

  // Verify segment naming pattern: segment-N-video.mp4
  const segmentFiles = videoFiles.filter(f => /segment-\d+-video\.(mp4|webm)/.test(f));
  
  console.log(`   📁 Output directory: ${outputDir}`);
  console.log(`   📹 Video files found: ${videoFiles.length}`);
  console.log(`   📊 Segments with correct naming: ${segmentFiles.length}`);
  
  if (segmentFiles.length > 0) {
    console.log(`   Files: ${segmentFiles.join(', ')}`);
  }

  return { videoFiles, segmentFiles };
}

// Main test
async function runTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('🎬 MULTI-SEGMENT VIDEO GENERATION TEST SUITE');
  console.log('═'.repeat(80));
  console.log('\n📋 Test Configuration:');
  console.log(`   - Seconds per video segment: 8s (hard limit)`);
  console.log(`   - Segment calculation: ceil(duration / 8)`);
  console.log(`   - Expected segments for 20s: ${calculateExpectedSegments(20)}`);
  console.log(`   - Expected segments for 30s: ${calculateExpectedSegments(30)}`);
  console.log('\n');

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    const expectedSegments = calculateExpectedSegments(testCase.options.duration);

    console.log(`\n${'▶'.repeat(40)}`);
    console.log(`📝 Test ${i + 1}: ${testCase.name}`);
    console.log(`${'▶'.repeat(40)}`);
    console.log(`   Duration: ${testCase.options.duration}s`);
    console.log(`   Expected segments: ${expectedSegments}`);
    console.log(`   Prompt: "${testCase.options.prompt.substring(0, 50)}..."`);

    try {
      // Note: This test uses runVideoGeneration which requires browser automation
      // In actual testing, you would either:
      // 1. Mock the browser automation
      // 2. Use a headless browser with saved session
      // 3. Run manually with display: false removed

      console.log('\n   ⏳ Starting video generation...');
      console.log('   (Note: This requires active browser automation)\n');

      const result = await runVideoGeneration(testCase.options);

      if (result.success) {
        console.log(`\n   ✅ Generation successful`);
        console.log(`      Duration: ${result.duration}s`);
        console.log(`      Quality: ${result.quality}`);
        console.log(`      Video path: ${result.videoPath || 'N/A'}`);

        // Verify output
        const verification = verifyOutputDirectory(testCase.options.outputDir);
        if (verification && verification.segmentFiles) {
          console.log(`   \n   ✅ Output verification passed`);
          if (verification.segmentFiles.length === expectedSegments) {
            console.log(`   ✅ Segment count matches expected (${expectedSegments})`);
          } else {
            console.warn(`   ⚠️ Segment count mismatch: expected ${expectedSegments}, got ${verification.segmentFiles.length}`);
          }
        }
      } else {
        console.error(`   ❌ Generation failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`   ❌ Test error: ${error.message}`);
      console.error(error.stack);
    }

    console.log('');
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ TEST SUITE COMPLETE');
  console.log('═'.repeat(80));
  console.log('\n📝 Summary:');
  console.log('   - Segment calculation: Math.ceil(duration / 8)');
  console.log('   - Each segment generates one 8-second video');
  console.log('   - Files named: segment-1-video.mp4, segment-2-video.mp4, etc.');
  console.log('   - Total videos generated: sum of all segments');
  console.log('\n');
}

// Run tests
console.log('⏳ Initializing test suite...');
console.log('⚠️  NOTE: This test requires browser automation.');
console.log('   Make sure you have Google Labs Flow session saved.\n');

runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
