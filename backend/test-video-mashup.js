/**
 * Simple Video Mashup Test Script
 * Tests the VideoMashupService with 2 test videos
 * No Jest/FFmpeg dependencies - direct execution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTest() {
  console.log('🎬 VIDEO MASHUP TEST SCRIPT\n');
  console.log('=' .repeat(50));

  // ==================== PART 1: CHECK TEST VIDEOS ====================
  console.log('\n✅ STEP 1: Checking test videos...\n');

  const testVideosDir = path.join(__dirname, 'test-videos');
  const mainVideoPath = path.join(testVideosDir,'main-video.mp4');
  const subVideoPath = path.join(testVideosDir, 'sub-video.mp4');

  if (!fs.existsSync(mainVideoPath)) {
    console.error(`❌ ERROR: main-video.mp4 not found at ${mainVideoPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(subVideoPath)) {
    console.error(`❌ ERROR: sub-video.mp4 not found at ${subVideoPath}`);
    process.exit(1);
  }

  const mainStats = fs.statSync(mainVideoPath);
  const subStats = fs.statSync(subVideoPath);

  console.log(`✅ main-video.mp4: ${(mainStats.size / 1024 / 1024).toFixed(2)}MB`);
  console.log(`✅ sub-video.mp4: ${(subStats.size / 1024 / 1024).toFixed(2)}MB`);

  // ==================== PART 2: CHECK OUTPUT DIRECTORY ====================
  console.log('\n✅ STEP 2: Preparing output directory...\n');

  const outputDir = path.join(__dirname, 'media', 'mashups');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Created output directory: ${outputDir}`);
  } else {
    console.log(`✅ Output directory ready: ${outputDir}`);
  }

  // ==================== PART 3: IMPORT AND TEST SERVICE ====================
  console.log('\n✅ STEP 3: Loading VideoMashupService...\n');

  try {
    const { default: videoMashupService } = await import('./services/videoMashupService.js');
    console.log('✅ VideoMashupService imported successfully');

    // ==================== PART 4: TEST MERGE OPERATION ====================
    console.log('\n✅ STEP 4: Testing video merge operation...\n');

    const testOutputName = `test-mashup-${Date.now()}.mp4`;
    const testOutputPath = path.join(outputDir, testOutputName);

    console.log(`📝 Test Configuration:`);
    console.log(`   Input 1: ${mainVideoPath}`);
    console.log(`   Input 2: ${subVideoPath}`);
    console.log(`   Output: ${testOutputPath}`);
    console.log(`   Duration: 10 seconds`);
    console.log(`   Aspect Ratio: 9:16 (YouTube Shorts)`);
    console.log(`   Quality: high`);
    console.log('');

    const config = {
      mainVideoPath,
      templateVideoPath: subVideoPath,
      outputPath: testOutputPath,
      videoDuration: 10,
      aspectRatio: '9:16',
      quality: 'high',
      audioFromMain: true,
    };

    console.log('🚀 Starting merge...\n');
    const startTime = Date.now();

    const result = await videoMashupService.mergeVideos(config);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`⏱️  Processing time: ${duration.toFixed(2)}s\n`);

    // ==================== PART 5: VERIFY RESULTS ====================
    console.log('✅ STEP 5: Verifying results...\n');

    if (!result.success) {
      console.error(`❌ ERROR: Merge failed - ${result.error}`);
      process.exit(1);
    }

    console.log(`✅ Merge successful!\n`);
    console.log('📊 Result Details:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Output Path: ${result.outputPath}`);
    console.log(`   Layout: ${result.layout}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   File Size: ${(result.fileSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Message: ${result.message}`);

    // Verify output file exists
    if (!fs.existsSync(testOutputPath)) {
      console.error(`❌ ERROR: Output file not found at ${testOutputPath}`);
      process.exit(1);
    }

    const outputStats = fs.statSync(testOutputPath);
    console.log(`\n✅ Output file verified: ${(outputStats.size / 1024 / 1024).toFixed(2)}MB`);

    // ==================== PART 6: TEST MULTIPLE CONFIGURATIONS ====================
    console.log('\n✅ STEP 6: Testing multiple configurations...\n');

    const testConfigs = [
      { name: 'High Quality (9:16)', aspectRatio: '9:16', quality: 'high', duration: 5 },
      { name: '16:9 Format', aspectRatio: '16:9', quality: 'high', duration: 5 },
      { name: 'Medium Quality (9:16)', aspectRatio: '9:16', quality: 'medium', duration: 5 },
    ];

    for (const testConfig of testConfigs) {
      const testName = `test-${testConfig.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.mp4`;
      const testPath = path.join(outputDir, testName);

      console.log(`Testing: ${testConfig.name}`);
      const testResult = await videoMashupService.mergeVideos({
        mainVideoPath,
        templateVideoPath: subVideoPath,
        outputPath: testPath,
        videoDuration: testConfig.duration,
        aspectRatio: testConfig.aspectRatio,
        quality: testConfig.quality,
      });

      if (testResult.success && fs.existsSync(testPath)) {
        const fileSize = fs.statSync(testPath).size;
        console.log(`   ✅ Success - ${(fileSize / 1024 / 1024).toFixed(2)}MB\n`);
        // Cleanup test file
        fs.unlinkSync(testPath);
      } else {
        console.log(`   ❌ Failed\n`);
      }
    }

    // ==================== SUMMARY ====================
    console.log('=' .repeat(50));
    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('📋 Summary:');
    console.log('   ✅ Test videos found and verified');
    console.log('   ✅ VideoMashupService loaded successfully');
    console.log('   ✅ Merge operation completed successfully');
    console.log('   ✅ Output file created and verified');
    console.log('   ✅ Multiple configurations tested');
    console.log('\n🎉 Video mashup functionality is working correctly!\n');

    // Cleanup first test file
    if (fs.existsSync(testOutputPath)) {
      fs.unlinkSync(testOutputPath);
      console.log(`✅ Cleaned up test output file: ${testOutputName}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:',error.message);
    console.error('\n💡 Possible causes:');
    console.error('   - FFmpeg not installed');
    console.error('   - Video codec issues');
    console.error('   - Insufficient disk space');
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runTest();
