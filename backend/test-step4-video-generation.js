/**
 * Test: Step 4 Video Generation
 * Generates 1 video from Deep Analysis results
 * Using Google Flow video generation
 * 
 * Test saves credits by only generating 1 segment video instead of full flow
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import GoogleFlowAutomationService from './services/googleFlowAutomationService.js';
import VietnamesePromptBuilder from './services/vietnamesePromptBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const STEP3_RESULTS_FILE = process.env.STEP3_RESULTS_FILE || path.join(__dirname, 'test-affiliate', 'step3-real-test-2026-03-06.json');
const CHARACTER_WEARING_IMAGE = path.join(__dirname, 'test-affiliate', 'Wearing.png');
const CHARACTER_HOLDING_IMAGE = path.join(__dirname, 'test-affiliate', 'Holding.png');
const PRODUCT_IMAGE = path.join(__dirname, 'test-affiliate', 'Product.jpeg');

const TEST_CONFIG = {
  segmentToGenerate: 0,  // Generate only first segment (Hook) - save credits!
  videoDuration: 20,
  voiceGender: 'female',
  voicePace: 'fast',
  productFocus: 'full-outfit'
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function loadStep3Results() {
  console.log('\n📖 LOADING STEP 3 RESULTS...');
  
  if (!fs.existsSync(STEP3_RESULTS_FILE)) {
    throw new Error(`Step 3 results not found: ${STEP3_RESULTS_FILE}`);
  }
  
  const results = JSON.parse(fs.readFileSync(STEP3_RESULTS_FILE, 'utf8'));
  console.log(`✅ Loaded ${results.videoScripts.length} segments from Step 3`);
  
  return results;
}

function selectSegment(results, segmentIndex) {
  console.log(`\n🎬 SELECTING SEGMENT FOR VIDEO GENERATION...`);
  
  if (segmentIndex >= results.videoScripts.length) {
    throw new Error(`Segment ${segmentIndex} not found. Only ${results.videoScripts.length} segments available.`);
  }
  
  const segment = results.videoScripts[segmentIndex];
  console.log(`   ✅ Selected segment ${segmentIndex + 1}/${results.videoScripts.length}: ${segment.segment}`);
  console.log(`      Duration: ${segment.duration}s`);
  console.log(`      Time range: ${segment.timeRange}`);
  console.log(`      Script: "${segment.script.substring(0, 60)}..."`);
  console.log(`      Start frame: ${segment.startFrame}`);
  console.log(`      Camera direction: ${segment.cameraDirection}`);
  
  return segment;
}

function getImagePathForSegment(segment) {
  console.log(`\n📸 SELECTING CHARACTER IMAGE FOR SEGMENT...`);
  
  const startFrame = segment.startFrame?.toLowerCase() || 'wearing';
  let imagePath;
  
  if (startFrame === 'holding') {
    imagePath = CHARACTER_HOLDING_IMAGE;
    console.log(`   ✅ Using HOLDING image (character demonstrating product)`);
  } else {
    imagePath = CHARACTER_WEARING_IMAGE;
    console.log(`   ✅ Using WEARING image (character in product)`);
  }
  
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Character image not found: ${imagePath}`);
  }
  
  return imagePath;
}

function buildVideoPrompt(segment, results) {
  console.log(`\n🎯 BUILDING VIDEO GENERATION PROMPT...`);
  
  // Build prompt for this specific segment
  let prompt = segment.script + '\n\n';
  
  // Add visual direction details
  prompt += `💫 VISUAL DIRECTION DETAILS:\n`;
  prompt += `- Camera: ${segment.cameraDirection}\n`;
  prompt += `- Pattern Pose: ${segment.characterPose}\n`;
  prompt += `- Character Movement: ${segment.characterMovement}\n`;
  prompt += `- Product Focus: ${segment.productFocus}\n`;
  prompt += `- Lip-Sync Timing: ${segment.lipSyncTiming}\n`;
  
  // Add voiceover context
  prompt += `\n🎙️ NARRATOR CONTEXT:\n`;
  prompt += `Character will be lip-syncing to Vietnamese narrator voiceover during this segment.\n`;
  
  // Add style guidelines
  prompt += `\n📐 STYLE:\n`;
  prompt += `- Format: 9:16 vertical (TikTok)\n`;
  prompt += `- Duration: ${segment.duration}s\n`;
  prompt += `- Style: Fashion product showcase, professional, engaging\n`;
  
  console.log(`   ✅ Prompt built (${prompt.length} characters)`);
  console.log(`   Preview: "${prompt.substring(0, 100)}..."`);
  
  return prompt;
}

async function generateVideo(segment, prompt, characterImagePath) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🎬 STEP 4: VIDEO GENERATION`);
  console.log(`${'═'.repeat(80)}`);
  
  const videoGen = new GoogleFlowAutomationService({
    type: 'video',
    projectId: '87b78b0e-8b5a-40fc-9142-cdeda1419be7',  // Google Flow project
    videoCount: 1,
    headless: false,
    outputDir: path.join(__dirname, 'test-affiliate'),
    model: 'Veo 3.1 - Fast',  // Fast model for testing
    timeouts: {
      pageLoad: 30000,
      generation: 180000  // 3 minutes for video generation
    }
  });

  console.log(`\n📊 GENERATION PARAMETERS:`);
  console.log(`   Segment: ${segment.segment} (${segment.timeRange})`);
  console.log(`   Duration: ${segment.duration}s`);
  console.log(`   Primary Image: ${path.basename(characterImagePath)}`);
  console.log(`   Secondary Image: ${path.basename(PRODUCT_IMAGE)}`);
  console.log(`   Prompt length: ${prompt.length} characters\n`);

  try {
    console.log(`⏳ Generating video (this may take 2-5 minutes)...`);
    console.log(`   Browser will open automatically...\n`);

    const result = await videoGen.generateVideo(
      prompt,
      characterImagePath,
      PRODUCT_IMAGE,
      { download: true }
    );

    if (!result.success) {
      throw new Error(`Video generation failed: ${result.error || 'unknown error'}`);
    }

    console.log(`\n✅ VIDEO GENERATION COMPLETE`);
    console.log(`   Path: ${result.path}`);
    
    // Save metadata
    const resultFile = path.join(__dirname, 'test-affiliate', `step4-video-${segment.segment.toLowerCase()}-${Date.now()}.json`);
    fs.writeFileSync(resultFile, JSON.stringify({
      segment: segment.segment,
      timeRange: segment.timeRange,
      duration: segment.duration,
      videoPath: result.path,
      success: true,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`   Metadata: ${resultFile}\n`);

    return result;

  } catch (error) {
    console.error(`\n❌ VIDEO GENERATION ERROR: ${error.message}`);
    throw error;
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🎥 STEP 4 VIDEO GENERATION TEST`);
  console.log(`${'═'.repeat(80)}`);

  console.log(`\n📋 TEST CONFIG:`);
  console.log(`   Video duration: ${TEST_CONFIG.videoDuration}s`);
  console.log(`   Voice: ${TEST_CONFIG.voiceGender} (${TEST_CONFIG.voicePace} pace)`);
  console.log(`   Product focus: ${TEST_CONFIG.productFocus}`);
  console.log(`   Segment to generate: ${TEST_CONFIG.segmentToGenerate} (save credits!)`);

  try {
    // Step 1: Load Step 3 results
    const step3Results = loadStep3Results();

    // Step 2: Select one segment
    const segment = selectSegment(step3Results, TEST_CONFIG.segmentToGenerate);

    // Step 3: Get proper character image for this segment
    const characterImage = getImagePathForSegment(segment);

    // Step 4: Build video prompt with visual directions
    const videoPrompt = buildVideoPrompt(segment, step3Results);

    // Step 5: Generate video
    const videoResult = await generateVideo(segment, videoPrompt, characterImage);

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ TEST COMPLETE - VIDEO GENERATED SUCCESSFULLY`);
    console.log(`${'═'.repeat(80)}\n`);

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
