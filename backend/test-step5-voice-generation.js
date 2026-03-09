/**
 * Test: Step 5 Voice Generation (TTS)
 * Converts Vietnamese voiceover script from Step 3 to audio using Gemini TTS API
 * 
 * Uses voiceoverScript + voiceGender + voicePace from Step 3 results
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import TTSService from './services/ttsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURATION
// ============================================================

const STEP3_RESULTS_FILE = process.env.STEP3_RESULTS_FILE || path.join(__dirname, 'test-affiliate', 'step3-real-test-2026-03-06.json');
const OUTPUT_DIR = path.join(__dirname, 'test-affiliate');

// Vietnamese Gemini TTS Voice Mapping (lowercase names, per API requirements)
// Supported: achenar, achird, algenib, algieba, alnilam, aoede, autonoe, 
//            callirrhoe, charon, despina, enceladus, erinome, fenrir, gacrux, iapetus, kore, 
//            laomedeia, leda, orus, puck, pulcherrima, rasalgethi, sadachbia, sadaltager, 
//            schedar, sulafat, umbriel, vindemiatrix, zephyr, zubenelgenubi
const VIETNAMESE_VOICES = {
  female: {
    fast: 'fenrir',       // Female, excitable (suitable for fast-paced)
    normal: 'aoede',      // Female, breezy/neutral
    slow: 'enceladus'     // Female, breathy (slower pacing)
  },
  male: {
    fast: 'puck',         // Male, upbeat/excitable
    normal: 'kore',       // Male, firm
    slow: 'charon'        // Male, informative
  }
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
  console.log(`✅ Loaded Step 3 results`);
  const segments = results.visualSegments || results.videoScripts || [];
  const voiceoverText = typeof results.voiceoverScript === 'string'
    ? results.voiceoverScript
    : results.voiceoverScript?.content || '';
  console.log(`   Segments: ${segments.length || 0}`);
  console.log(`   Voiceover length: ${voiceoverText.length || 0} characters`);
  
  return results;
}

function selectVoice(voiceGender, voicePace) {
  console.log(`\n🎙️ SELECTING VOICE...`);
  
  // Normalize pace
  const normalizedPace = voicePace?.toLowerCase() === 'fast' ? 'fast' :
                         voicePace?.toLowerCase() === 'slow' ? 'slow' : 'normal';
  
  let gender = (voiceGender?.toLowerCase() || 'female');
  
  if (!VIETNAMESE_VOICES[gender]) {
    console.warn(`   ⚠️  Gender "${gender}" not found, using "female"`);
    gender = 'female';
  }
  
  const voiceName = VIETNAMESE_VOICES[gender][normalizedPace];
  
  console.log(`   Gender: ${gender}`);
  console.log(`   Pace: ${normalizedPace}`);
  console.log(`   Voice name: ${voiceName}`);
  
  if (!voiceName) {
    throw new Error(`Voice not found for gender="${gender}" pace="${normalizedPace}"`);
  }
  
  return { voiceName, language: 'VI' };
}

async function generateAudio(voiceoverScript, voiceConfig) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🎵 STEP 5: VOICE GENERATION (TTS)`);
  console.log(`${'═'.repeat(80)}`);
  
  console.log(`\n📊 AUDIO GENERATION PARAMETERS:`);
  console.log(`   Text length: ${voiceoverScript.length} characters`);
  console.log(`   Estimated duration: ${TTSService.estimateAudioDuration(voiceoverScript)}s`);
  console.log(`   Voice: ${voiceConfig.voiceName}`);
  console.log(`   Language: ${voiceConfig.language}`);
  
  try {
    console.log(`\n⏳ Generating audio from Vietnamese voiceover script...`);
    console.log(`   This may take 10-30 seconds...\n`);

    // Validate text length
    if (!TTSService.validateTextLength(voiceoverScript)) {
      throw new Error('Voiceover script exceeds maximum length for TTS');
    }

    // Generate audio
    const audioBuffer = await TTSService.generateAudio(
      voiceoverScript,
      voiceConfig.voiceName,
      voiceConfig.language,
      { temperature: 1.1 }
    );

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Generated audio is empty');
    }

    console.log(`✅ AUDIO GENERATED`);
    console.log(`   File size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   Format: MP3 (from Gemini TTS)\n`);

    return audioBuffer;

  } catch (error) {
    console.error(`\n❌ AUDIO GENERATION ERROR: ${error.message}`);
    throw error;
  }
}

function saveAudioFile(audioBuffer, voiceConfig) {
  console.log(`\n💾 SAVING AUDIO FILE...`);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `step5-voiceover-${voiceConfig.voiceName.toLowerCase()}-${timestamp}.mp3`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Save audio file
  fs.writeFileSync(filepath, audioBuffer);
  
  console.log(`   ✅ Audio file saved`);
  console.log(`   Path: ${filepath}`);
  console.log(`   Size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
  
  return filepath;
}

function saveMetadata(audioBuffer, voiceConfig, audioPath, voiceoverScript, results) {
  console.log(`\n📋 SAVING METADATA...`);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const metadataFile = path.join(OUTPUT_DIR, `step5-voiceover-metadata-${timestamp}.json`);
  
  const metadata = {
    audioFile: audioPath,
    audioSize: audioBuffer.length,
    voiceConfig: voiceConfig,
    scripture: {
      length: voiceoverScript.length,
      estimatedDuration: TTSService.estimateAudioDuration(voiceoverScript)
    },
    videoMetadata: {
      segments: (results.visualSegments || results.videoScripts || []).length || 0,
      videoDuration: `${(results.visualSegments || results.videoScripts || []).reduce((total, segment) => total + (segment.duration_seconds || segment.duration || 0), 0)}s`,
      hashtags: results.hashtags || [],
      hasVisualDirections: !!(results.visualSegments || results.videoScripts)
    },
    generatedAt: new Date().toISOString(),
    status: 'success'
  };
  
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
  
  console.log(`   ✅ Metadata saved`);
  console.log(`   Path: ${metadataFile}`);
  
  return metadataFile;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🎤 STEP 5: VIETNAMESE VOICEOVER GENERATION (TTS)`);
  console.log(`${'═'.repeat(80)}`);

  try {
    // Step 1: Load Step 3 results
    const step3Results = loadStep3Results();

    // Step 2: Extract voiceover and voice config
    const voiceoverData = typeof step3Results.voiceoverScript === 'string'
      ? { content: step3Results.voiceoverScript, gender: 'female', pace: 'fast' }
      : (step3Results.voiceoverScript || {});
    const voiceoverText = voiceoverData.content || '';
    
    if (!voiceoverText || voiceoverText.trim().length === 0) {
      throw new Error('Voiceover script not found in Step 3 results');
    }

    console.log(`\n📝 VOICEOVER SCRIPT PREVIEW:`);
    console.log(`   "${voiceoverText.substring(0, 100)}..."`);

    // Step 3: Select appropriate voice
    const voiceConfig = selectVoice(
      voiceoverData.gender || 'female',
      voiceoverData.pace || 'fast'
    );

    // Step 4: Generate audio
    const audioBuffer = await generateAudio(voiceoverText, voiceConfig);

    // Step 5: Save audio file
    const audioPath = saveAudioFile(audioBuffer, voiceConfig);

    // Step 6: Save metadata
    const metadataPath = saveMetadata(audioBuffer, voiceConfig, audioPath, voiceoverText, step3Results);

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ TEST COMPLETE - VOICEOVER AUDIO GENERATED SUCCESSFULLY`);
    console.log(`${'═'.repeat(80)}`);
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Audio file: ${path.basename(audioPath)}`);
    console.log(`   ✅ Metadata: ${path.basename(metadataPath)}`);
    console.log(`   ✅ Ready for video compositing (Step 6)\n`);

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
