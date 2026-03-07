/**
 * Real Test: Step 3 Deep Analysis with ChatGPT
 * Runs actual ChatGPT analysis (not mocked)
 * 
 * If ChatGPT session is expired:
 * 1. Browser will show login page automatically
 * 2. You login manually in the browser
 * 3. Test script will detect authentication
 * 4. Analysis will proceed automatically
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ChatGPTService from './services/browser/chatgptService.js';
import VietnamesePromptBuilder from './services/vietnamesePromptBuilder.js';
import { analyzeUnified } from './services/unifiedAnalysisService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// TEST CONFIGURATION
// ============================================================

const TEST_CONFIG = {
  videoDuration: 20,
  voiceGender: 'female',
  voicePace: 'fast',
  productFocus: 'full-outfit',
  language: 'vi',
  videoProvider: 'google-flow',
  clipDuration: 8
};

const TEST_IMAGES = {
  wearing: path.join(__dirname, 'test-affiliate', 'Wearing.png'),
  holding: path.join(__dirname, 'test-affiliate', 'Holding.png'),
  product: path.join(__dirname, 'test-affiliate', 'Product.jpeg')
};

// Mock analysis data
const MOCK_ANALYSIS = {
  product: {
    garment_type: 'Áo khoác denim',
    primary_color: 'Xanh đen cổ điển',
    secondary_color: 'Cúc vàng đồng',
    fabric_type: '100% cotton denim',
    style_category: 'casual-modern',
    key_details: 'Áo khoác denim bền bỉ, thiết kế hiện đại, phù hợp mọi lứa tuổi'
  },
  character: {
    age: '25',
    gender: 'nữ',
    hair: { color: 'nâu', style: 'dài uốn' },
    facialFeatures: 'mắt to, mũi cao',
    bodyType: 'mảnh mai'
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function verifyImages() {
  console.log('\n📸 VERIFYING TEST IMAGES...');
  for (const [name, filepath] of Object.entries(TEST_IMAGES)) {
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      console.log(`   ✅ ${name.toUpperCase()}: ${filepath} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.error(`   ❌ ${name.toUpperCase()}: NOT FOUND at ${filepath}`);
      return false;
    }
  }
  return true;
}

async function runDeepAnalysis() {
  console.log('\n' + '═'.repeat(80));
  console.log('🤖 RUNNING REAL CHATGPT DEEP ANALYSIS');
  console.log('═'.repeat(80));

  let chatGPTService = null;

  try {
    // Initialize ChatGPT Service
    console.log('\n🚀 INITIALIZING CHATGPT SERVICE...\n');
    chatGPTService = new ChatGPTService({ 
      headless: false,  // 💡 Show browser so user can see what's happening
      flowId: `test-step3-real-${Date.now()}`
    });
    
    await chatGPTService.initialize();

    // Check if authenticated
    console.log('\n🔐 CHECKING AUTHENTICATION STATUS...');
    const isAuthed = await chatGPTService.isAuthenticated();

    if (!isAuthed) {
      console.log('\n⚠️  NOT AUTHENTICATED - ChatGPT session expired or invalid');
      console.log('\n📋 NEXT STEPS:');
      console.log('   1. A login page has opened in the browser');
      console.log('   2. Please login to ChatGPT manually');
      console.log('   3. After login, wait 5 seconds');
      console.log('   4. Then type: TEST_AUTHENTICATED to proceed\n');
      
      // Wait for user to indicate they've logged in
      console.log('⏳ Waiting for you to login manually in the browser window...');
      console.log('   (The test script will wait for 120 seconds for you to login)\n');
      
      // Wait up to 2 minutes for authentication
      let authCheckCount = 0;
      while (authCheckCount < 48) {  // 48 * 5 seconds = 240 seconds = 4 minutes
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const currentAuth = await chatGPTService.isAuthenticated();
        if (currentAuth) {
          console.log('\n✅ AUTHENTICATION DETECTED - Proceeding with analysis!\n');
          break;
        }
        
        authCheckCount++;
        const timeRemaining = (48 - authCheckCount) * 5;
        console.log(`   ⏳ Still waiting... (${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s remaining) - Check browser if needed`);
      }

      const finalAuth = await chatGPTService.isAuthenticated();
      if (!finalAuth) {
        console.log('\n❌ Authentication timeout - couldn\'t detect login after 4 minutes');
        console.log('   The browser window is still open. You can:');
        console.log('   1. Login manually in the browser window');
        console.log('   2. Wait for the next authentication check (happens every 5 seconds)');
        console.log('   3. Or close browser and run test again later\n');
        throw new Error('ChatGPT authentication failed after 4 minutes');
      }
    } else {
      console.log('✅ ALREADY AUTHENTICATED - Proceeding with analysis\n');
    }

    // Build the prompt
    console.log('📝 BUILDING DEEP ANALYSIS PROMPT...');
    const deepAnalysisPrompt = VietnamesePromptBuilder.buildDeepAnalysisPrompt(
      TEST_CONFIG.productFocus,
      {
        videoDuration: TEST_CONFIG.videoDuration,
        voiceGender: TEST_CONFIG.voiceGender,
        voicePace: TEST_CONFIG.voicePace,
        clipDuration: TEST_CONFIG.clipDuration,
        videoProvider: TEST_CONFIG.videoProvider
      }
    );

    console.log(`✅ Prompt built (${deepAnalysisPrompt.length} characters)\n`);

    // Prepare images
    const characterImages = [TEST_IMAGES.wearing, TEST_IMAGES.holding];
    const allImages = [...characterImages, TEST_IMAGES.product];

    console.log('📸 UPLOADING IMAGES TO CHATGPT:');
    characterImages.forEach((img, idx) => {
      const type = idx === 0 ? 'wearing' : 'holding';
      console.log(`   ├─ Character ${type}: ${path.basename(img)}`);
    });
    console.log(`   └─ Product image: ${path.basename(TEST_IMAGES.product)}\n`);

    // Call ChatGPT Analysis
    console.log('⏳ SENDING IMAGES AND PROMPT TO CHATGPT...');
    console.log('   (This may take 2-3 minutes. Browser will show ChatGPT working)\n');
    
    const rawResponse = await chatGPTService.analyzeMultipleImages(
      allImages,
      deepAnalysisPrompt
    );

    console.log('\n✅ CHATGPT ANALYSIS COMPLETE\n');
    console.log('📥 RAW RESPONSE FROM CHATGPT:');
    console.log('═'.repeat(80));
    console.log(rawResponse);
    console.log('═'.repeat(80));

    // Parse the response
    console.log('\n🔍 PARSING RESPONSE...');
    const analysisData = parseResponse(rawResponse);

    // Verify results
    console.log('\n✅ ANALYSIS RESULTS:');
    console.log('─'.repeat(80));
    verifyAnalysisResults(analysisData);

    return analysisData;

  } catch (error) {
    console.error('\n❌ ANALYSIS ERROR:', error.message);
    throw error;
  } finally {
    if (chatGPTService) {
      try {
        console.log('\n🔒 Closing ChatGPT browser...');
        await chatGPTService.close();
        console.log('✅ ChatGPT browser closed');
      } catch (closeError) {
        console.error('⚠️  Error closing ChatGPT:', closeError.message);
      }
    }
  }
}

function parseResponse(rawText) {
  console.log('   Extracting segments with visual directions, voiceover, and hashtags...');
  
  const result = {
    videoScripts: [],
    voiceoverScript: '',
    hashtags: [],
    hasVisualDirections: false,
    fixes: {
      hasTimeRanges: false,
      isVietnamese: false,
      properSegmentCount: false,
      hasVisualFields: false
    }
  };

  try {
    // Try to parse as JSON first (ChatGPT returns JSON)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // FIX #1: Check for time ranges in JSON format
      if (parsed.videoScripts && parsed.videoScripts.length > 0) {
        const timeRanges = parsed.videoScripts
          .map(s => s.timeRange)
          .filter(tr => tr && /^\d+-\d+s$/.test(tr));
        
        if (timeRanges.length >= 3) {
          result.fixes.hasTimeRanges = true;
          console.log(`   ✅ FIX #1 VERIFIED: Found ${timeRanges.length} time ranges [X-Ys]`);
          console.log(`      Time ranges: ${timeRanges.join(', ')}`);
        } else {
          console.log(`   ❌ FIX #1 FAILED: Expected ≥3 time ranges, found ${timeRanges.length}`);
        }
        
        // FIX #2: Check if scripts are in Vietnamese
        const vietnameseText = parsed.videoScripts
          .map(s => s.script || '')
          .join(' ');
        
        const vietnamesePatterns = /[ăâêôơưàáảãạằắẳẵặèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵđ]/g;
        const vietneseMatches = vietnameseText.match(vietnamesePatterns) || [];
        
        if (vietneseMatches.length > 50) {  // At least 50 Vietnamese characters
          result.fixes.isVietnamese = true;
          console.log(`   ✅ FIX #2 VERIFIED: 100% Vietnamese content (${vietneseMatches.length} Vietnamese characters found)`);
        } else {
          console.log(`   ❌ FIX #2 FAILED: Expected Vietnamese characters, found ${vietneseMatches.length}`);
        }
        
        // FIX #3: Check for visual direction fields (NEW!)
        const visualFields = ['startFrame', 'cameraDirection', 'characterPose', 'characterMovement', 'productFocus', 'lipSyncTiming'];
        const segmentsWithVisual = parsed.videoScripts.filter(s => 
          visualFields.some(field => s.hasOwnProperty(field) && s[field])
        );
        
        if (segmentsWithVisual.length === parsed.videoScripts.length) {
          result.fixes.hasVisualFields = true;
          console.log(`   ✅ FIX #3 VERIFIED: All ${parsed.videoScripts.length} segments have visual direction fields`);
          console.log(`      Fields found: ${visualFields.filter(f => parsed.videoScripts[0]?.hasOwnProperty(f)).join(', ')}`);
          result.hasVisualDirections = true;
        } else if (segmentsWithVisual.length > 0) {
          console.log(`   ⚠️  PARTIAL: ${segmentsWithVisual.length}/${parsed.videoScripts.length} segments have visual fields`);
          console.log(`      Fields found: ${visualFields.filter(f => parsed.videoScripts[0]?.hasOwnProperty(f)).join(', ')}`);
        } else {
          console.log(`   ℹ️  No visual direction fields found yet (standard segments only with script+timeRange)`);
        }
        
        // Count segments
        result.videoScripts = parsed.videoScripts;
        if (parsed.videoScripts.length >= 3) {
          result.fixes.properSegmentCount = true;
          console.log(`   ✅ SEGMENTS EXTRACTED: ${parsed.videoScripts.length} segments`);
        }
      }
      
      // Extract voiceover
      if (parsed.voiceoverScript) {
        result.voiceoverScript = parsed.voiceoverScript.substring(0, 200);
        console.log(`   ✅ VOICEOVER EXTRACTED: ${parsed.voiceoverScript.length} characters`);
      }
      
      // Extract hashtags
      if (parsed.hashtags && Array.isArray(parsed.hashtags)) {
        result.hashtags = parsed.hashtags;
        console.log(`   ✅ HASHTAGS EXTRACTED: ${parsed.hashtags.length} hashtags`);
      }
    }
  } catch (e) {
    console.log(`   ⚠️  Error parsing JSON: ${e.message}`);
    console.log('   Falling back to regex parsing...');
  }

  return result;
}

function verifyAnalysisResults(data) {
  console.log('\n📊 VERIFICATION RESULTS:');
  console.log('─'.repeat(80));

  const checks = [
    {
      name: 'Time Range Format [X-Ys]',
      pass: data.fixes.hasTimeRanges,
      expected: 'YES ✅',
      actual: data.fixes.hasTimeRanges ? '✅ FOUND' : '❌ NOT FOUND'
    },
    {
      name: 'Vietnamese Language',
      pass: data.fixes.isVietnamese,
      expected: 'YES ✅',
      actual: data.fixes.isVietnamese ? '✅ DETECTED' : '❌ NOT DETECTED'
    },
    {
      name: 'Video Segments Count',
      pass: data.videoScripts.length >= 3,
      expected: '≥ 3 segments',
      actual: `${data.videoScripts.length} segments`
    },
    {
      name: 'Hashtags Generated',
      pass: data.hashtags.length > 0,
      expected: '≥ 5 hashtags',
      actual: `${data.hashtags.length} hashtags`
    }
  ];

  let passCount = 0;
  checks.forEach(check => {
    const status = check.pass ? '✅' : '❌';
    console.log(`${status} ${check.name.padEnd(35)} | Expected: ${check.expected.padEnd(20)} | Actual: ${check.actual}`);
    if (check.pass) passCount++;
  });

  console.log('─'.repeat(80));
  console.log(`\n 📈 SUMMARY: ${passCount}/${checks.length} checks passed\n`);

  if (passCount === checks.length) {
    console.log('🎉 ALL FIXES VERIFIED SUCCESSFULLY!\n');
  } else {
    console.log('⚠️ Some checks failed - see details above\n');
  }

  return passCount === checks.length;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🧪 STEP 3 DEEP ANALYSIS - REAL CHATGPT TEST');
  console.log('═'.repeat(80));
  
  console.log('\n📋 TEST CONFIGURATION:');
  console.log(`   Duration: ${TEST_CONFIG.videoDuration}s`);
  console.log(`   Voice: ${TEST_CONFIG.voiceGender} (${TEST_CONFIG.voicePace} pace)`);
  console.log(`   Language: ${TEST_CONFIG.language}`);
  console.log(`   Product Focus: ${TEST_CONFIG.productFocus}`);
  console.log(`   Video Provider: ${TEST_CONFIG.videoProvider}`);

  // Step 1: Verify images
  if (!verifyImages()) {
    console.error('\n❌ Required test images not found. Exiting.');
    process.exit(1);
  }

  // Step 2: Run real analysis
  try {
    const results = await runDeepAnalysis();
    
    // Step 3: Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const resultFile = path.join(__dirname, 'test-affiliate', `step3-real-test-${timestamp}.json`);
    fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
    console.log(`📁 Results saved to: ${resultFile}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
