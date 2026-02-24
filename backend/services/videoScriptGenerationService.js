/**
 * Video Generation ChatGPT Browser Service
 * Uses Puppeteer + ChatGPT browser automation (NO API KEY REQUIRED)
 * Sends prompts directly to ChatGPT web interface and extracts responses
 */

import ChatGPTService from './browser/chatgptService.js';
import {
  generateVideoScriptPrompt,
  generateStyleVariationPrompt,
  generateMovementDetailPrompt,
  generateCameraGuidancePrompt,
  generateLightingSetupPrompt,
  generateTemplateLibraryPrompt
} from '../utils/videoPromptGenerators.js';

// Global ChatGPT service instance (lazy initialized)
let chatGPTService = null;

/**
 * Get or initialize ChatGPT service
 */
async function getChatGPTService() {
  if (!chatGPTService) {
    console.log('🚀 Initializing ChatGPT Browser Service...');
    chatGPTService = new ChatGPTService({
      headless: false, // Show browser for debugging
      debug: false // Set to true to save screenshots
    });
    await chatGPTService.initialize();
  }
  return chatGPTService;
}

/**
 * Generate video script using ChatGPT browser automation
 * Falls back to demo mode if browser automation unavailable
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Generated script data
 */
export async function generateVideoScriptWithChatGPT(config) {
  try {
    console.log('🎬 Starting video script generation via ChatGPT browser...');
    
    try {
      const service = await getChatGPTService();
      
      // Generate the prompt using utility function
      const prompt = generateVideoScriptPrompt(
        config.videoScenario || config.scenarioId || 'Fashion Flow',
        config.productType,
        config.productDetails || config.productDescription,
        config.targetAudience,
        config.videoStyle || config.style,
        config.totalDuration || config.duration || 20,
        config.segmentCount || config.segments || 3
      );

      console.log(`📝 Sending prompt to ChatGPT (${prompt.length} characters)...`);
      
      // Send prompt to ChatGPT via browser and wait for response
      const scriptContent = await service.sendPrompt(prompt, {
        maxWait: 90000,  // Reduced from 180000 (3 min) to 90000 (90 sec) - faster exit now possible
        stabilityThreshold: 100 // Threshold for detecting text changes (characters)
      });

      if (!scriptContent || scriptContent.length === 0) {
        throw new Error('ChatGPT returned empty response');
      }

      console.log(`✅ Received response (${scriptContent.length} characters)`);

      // Parse the script into structured segments
      const parsedScript = parseVideoScript(scriptContent, config.segmentCount || config.segments || 3);

      return {
        success: true,
        data: {
          scenarioId: config.scenarioId || config.videoScenario,
          style: config.style || config.videoStyle,
          duration: config.duration || config.totalDuration,
          productData: {
            name: config.productType,
            description: config.productDetails || config.productDescription,
            targetAudience: config.targetAudience
          },
          segments: parsedScript,
          rawContent: scriptContent,
          generatedAt: new Date().toISOString(),
          mode: 'chatgpt-live'
        }
      };
    } catch (browserError) {
      console.warn('⚠️  ChatGPT browser automation failed, using demo mode:', browserError.message);
      
      // Keep browser open for retry, but fall back to demo mode
      return generateVideoScriptDemo(config);
    } finally {
      // Close browser after request completes (whether success or error)
      try {
        if (chatGPTService) {
          console.log('🔒 Closing ChatGPT browser service...');
          await chatGPTService.close();
          chatGPTService = null; // Reset for next session
          console.log('✅ Browser closed successfully');
        }
      } catch (closeError) {
        console.warn('⚠️  Error closing browser:', closeError.message);
      }
    }
  } catch (error) {
    console.error('❌ ChatGPT Video Script Generation Error:', error.message);
    throw new Error(`Failed to generate video script: ${error.message}`);
  }
}

/**
 * Generate demo/fallback video script when browser automation is unavailable
 * Provides realistic sample data for testing
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} Demo script data
 */
function generateVideoScriptDemo(config) {
  console.log('🎭 Generating demo video script (ChatGPT automation unavailable)');
  
  const segmentCount = config.segmentCount || config.segments || 3;
  const duration = config.duration || config.totalDuration || 20;
  const perSegmentDuration = Math.round((duration / segmentCount) * 10) / 10;
  
  // Create demo segments based on scenario
  const demoSegments = [];
  for (let i = 1; i <= segmentCount; i++) {
    const startSec = (i - 1) * perSegmentDuration;
    const endSec = i * perSegmentDuration;
    const formatTime = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
    
    demoSegments.push({
      number: i,
      name: `Segment ${i}`,
      duration: perSegmentDuration,
      timeCode: `${formatTime(startSec)}-${formatTime(endSec)}`,
      script: `[Segment ${i} Script for ${config.productType}]\nThis segment showcases the product's key features and benefits. The talent demonstrates the item in a natural, engaging way that connects with the target audience.`,
      movements: `Movement ${i}: Natural flow with product emphasis. The talent moves smoothly to highlight different aspects of the ${config.productType}.`,
      cameraWork: `Camera setup for segment ${i}: ${i === 1 ? 'Wide establishing shot' : i === segmentCount ? 'Close-up for detail emphasis' : 'Medium shot with tracking'} at eye level. Focus on product and talent's expression.`,
      lighting: `Key light positioned to the ${i % 2 === 0 ? 'left' : 'right'} front at 45°. Fill light from opposite side. Hair light from back to create separation.`,
      musicDescription: `${i === 1 ? 'Upbeat, engaging' : i === segmentCount ? 'Energetic finale' : 'Smooth transition'} music that matches the energy and pacing of this segment.`
    });
  }
  
  const rawContent = demoSegments
    .map(seg => `**${seg.name}** (${seg.timeCode})\n\n${seg.script}\n\nMovements: ${seg.movements}\n\nCamera: ${seg.cameraWork}\n\nLighting: ${seg.lighting}\n\nMusic: ${seg.musicDescription}`)
    .join('\n\n---\n\n');
  
  return {
    success: true,
    data: {
      scenarioId: config.scenarioId || config.videoScenario,
      style: config.style || config.videoStyle,
      duration: config.duration || config.totalDuration,
      productData: {
        name: config.productType,
        description: config.productDetails || config.productDescription,
        targetAudience: config.targetAudience
      },
      segments: demoSegments,
      rawContent,
      generatedAt: new Date().toISOString(),
      mode: 'demo',
      warning: 'This is demo data. ChatGPT browser automation is not available. To enable live ChatGPT generation, install Puppeteer: npm install puppeteer'
    }
  };
}

/**
 * Generate style variations using ChatGPT
 * @param {Object} config - Configuration object
 * @param {number} variationCount - Number of variations (default: 5)
 * @returns {Promise<Object>} Multiple script variations
 */
export async function generateVideoScriptVariations(config, variationCount = 5) {
  try {
    console.log(`🎨 Generating ${variationCount} script variations...`);
    
    const service = await getChatGPTService();
    
    // Generate prompt for multiple variations
    const prompt = generateStyleVariationPrompt(
      config.productType,
      variationCount
    );

    console.log(`📝 Sending variations prompt to ChatGPT...`);
    
    const response = await service.sendPrompt(prompt, {
      maxWait: 90000,  // Optimized to 90s (was 300s) - new fast exit logic
      stabilityThreshold: 100
    });

    if (!response || response.length === 0) {
      throw new Error('ChatGPT returned empty response');
    }

    console.log(`✅ Received variations (${response.length} characters)`);

    // Parse variations (simplified - return as single content with structure)
    const variations = parseVariations(response, variationCount);

    return {
      success: true,
      data: {
        originalConfig: config,
        variations,
        count: variations.length,
        rawContent: response,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Script Variation Generation Error:', error.message);
    throw new Error(`Failed to generate script variations: ${error.message}`);
  }
}

/**
 * Generate detailed movement breakdown
 * @param {Object} config - Movement configuration
 * @returns {Promise<Object>} Frame-by-frame movement guide
 */
export async function generateMovementDetail(config) {
  try {
    console.log('🎭 Generating movement detail breakdown...');
    
    const service = await getChatGPTService();
    
    const prompt = generateMovementDetailPrompt(
      config.movement,
      config.duration || 8,
      config.productType,
      config.productArea || 'the product'
    );

    console.log(`📝 Sending movement prompt to ChatGPT...`);
    
    const response = await service.sendPrompt(prompt, {
      maxWait: 90000,  // Optimized to 90s (was 120s) - new fast exit logic
      stabilityThreshold: 80
    });

    if (!response || response.length === 0) {
      throw new Error('ChatGPT returned empty response');
    }

    console.log(`✅ Received movement details (${response.length} characters)`);

    return {
      success: true,
      data: {
        movement: config.movement,
        productType: config.productType,
        productArea: config.productArea,
        details: response,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Movement Detail Generation Error:', error.message);
    throw new Error(`Failed to generate movement details: ${error.message}`);
  }
}

/**
 * Generate camera movement guidance
 * @param {Object} config - Camera configuration
 * @returns {Promise<Object>} Detailed camera specifications
 */
export async function generateCameraMovementGuide(config) {
  try {
    console.log('📹 Generating camera guidance...');
    
    const service = await getChatGPTService();
    
    const prompt = generateCameraGuidancePrompt(
      config.scenario || config.scenarioId,
      config.segmentCount || config.segments || 3,
      config.aspectRatio || '9:16',
      config.primaryFocus || config.productType
    );

    console.log(`📝 Sending camera prompt to ChatGPT...`);
    
    const response = await service.sendPrompt(prompt, {
      maxWait: 90000,  // Optimized to 90s (was 180s) - new fast exit logic
      stabilityThreshold: 100
    });

    if (!response || response.length === 0) {
      throw new Error('ChatGPT returned empty response');
    }

    console.log(`✅ Received camera guidance (${response.length} characters)`);

    return {
      success: true,
      data: {
        scenario: config.scenario || config.scenarioId,
        segments: config.segmentCount || config.segments,
        aspectRatio: config.aspectRatio,
        guidance: response,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Camera Guidance Generation Error:', error.message);
    throw new Error(`Failed to generate camera guidance: ${error.message}`);
  }
}

/**
 * Generate lighting specifications
 * @param {Object} config - Lighting configuration
 * @returns {Promise<Object>} Detailed lighting setup
 */
export async function generateLightingGuide(config) {
  try {
    console.log('💡 Generating lighting specifications...');
    
    const service = await getChatGPTService();
    
    const prompt = generateLightingSetupPrompt(
      config.scenario || config.scenarioId,
      config.style || config.lightingStyle,
      config.primaryProduct || config.productType,
      config.skinTone || 'medium'
    );

    console.log(`📝 Sending lighting prompt to ChatGPT...`);
    
    const response = await service.sendPrompt(prompt, {
      maxWait: 90000,  // Optimized to 90s (was 150s) - new fast exit logic
      stabilityThreshold: 100
    });

    if (!response || response.length === 0) {
      throw new Error('ChatGPT returned empty response');
    }

    console.log(`✅ Received lighting guide (${response.length} characters)`);

    return {
      success: true,
      data: {
        scenario: config.scenario || config.scenarioId,
        style: config.style,
        product: config.primaryProduct || config.productType,
        skinTone: config.skinTone,
        setup: response,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Lighting Guide Generation Error:', error.message);
    throw new Error(`Failed to generate lighting guide: ${error.message}`);
  }
}

/**
 * Generate music and audio recommendations
 * @param {Object} config - Audio configuration
 * @returns {Promise<Object>} Music and sound design recommendations
 */
export async function generateMusicGuide(config) {
  try {
    console.log('🎵 Generating music and audio guide...');
    
    const service = await getChatGPTService();
    
    // Custom prompt for music/audio
    const musicPrompt = `You are a professional music and audio designer for video production. 

For the following video project:
- Scenario: ${config.scenario || config.scenarioId}
- Product: ${config.primaryProduct || config.productType}
- Duration: ${config.duration || 20} seconds
- Video Style: ${config.style || 'professional'}
- Number of Segments: ${config.segmentCount || 3}
- Target Audience: ${config.targetAudience || 'general'}

Please provide detailed music and audio recommendations including:

1. **Overall Music Approach**
   - Genre recommendations (electronic, orchestral, indie, etc.)
   - Mood and emotional tone
   - Energy level progression throughout the video

2. **Segment-by-Segment Music**
   - BPM recommendations for each segment
   - Specific music style or artist suggestions
   - Transition music between segments

3. **Sound Effects**
   - Ambient sounds
   - Product-specific sounds
   - Foley effects needed
   - Transition sound effects

4. **Voice-over** (if applicable)
   - Tone and pacing suggestions
   - Script suggestions for voice-over
   - When to use voice-over vs background

5. **Audio Mixing**
   - Music volume levels
   - Sound effects volume levels
   - Fade in/fade out timings
   - Ducking recommendations

Provide practical, specific recommendations that can be implemented with readily available music and sound libraries.`;

    console.log(`📝 Sending music prompt to ChatGPT...`);
    
    const response = await service.sendPrompt(musicPrompt, {
      maxWait: 90000,  // Optimized to 90s (was 150s) - new fast exit logic
      stabilityThreshold: 100
    });

    if (!response || response.length === 0) {
      throw new Error('ChatGPT returned empty response');
    }

    console.log(`✅ Received music guide (${response.length} characters)`);

    return {
      success: true,
      data: {
        scenario: config.scenario || config.scenarioId,
        product: config.primaryProduct || config.productType,
        guide: response,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Music Guide Generation Error:', error.message);
    throw new Error(`Failed to generate music guide: ${error.message}`);
  }
}

/**
 * Generate template library (20-30 video templates)
 * @param {number} count - Number of templates (default: 30)
 * @returns {Promise<Object>} Template library
 */
export async function generateTemplateLibrary(count = 30) {
  try {
    console.log(`📚 Generating ${count} video templates...`);
    
    const service = await getChatGPTService();
    
    const prompt = generateTemplateLibraryPrompt(Math.min(count, 50));

    console.log(`📝 Sending template library prompt to ChatGPT...`);
    
    const response = await service.sendPrompt(prompt, {
      maxWait: 120000, // Optimized to 120s (was 300s) - new fast exit logic for large library
      stabilityThreshold: 150
    });

    if (!response || response.length === 0) {
      throw new Error('ChatGPT returned empty response');
    }

    console.log(`✅ Received template library (${response.length} characters)`);

    return {
      success: true,
      data: {
        templateCount: count,
        templates: response,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Template Library Generation Error:', error.message);
    throw new Error(`Failed to generate template library: ${error.message}`);
  }
}

/**
 * Close ChatGPT service (cleanup)
 */
export async function closeChatGPTService() {
  if (chatGPTService) {
    try {
      await chatGPTService.close();
      chatGPTService = null;
      console.log('✅ ChatGPT service closed');
    } catch (error) {
      console.error('Error closing ChatGPT service:', error.message);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse ChatGPT response into structured segments
 */
function parseVideoScript(scriptContent, segmentCount) {
  const segments = [];
  
  // 💫 NEW: Extract only content between markers, ignore suggestions
  let cleanContent = scriptContent;
  
  // Try to extract content between ===START_SCRIPT=== and ===END_SCRIPT===
  const markerMatch = scriptContent.match(/===START_SCRIPT===([\s\S]*?)===END_SCRIPT===/);
  if (markerMatch) {
    cleanContent = markerMatch[1].trim();
    console.log('✅ Extracted script between markers (suggestions removed)');
  } else {
    // Fallback: remove common ChatGPT suggestion patterns
    const suggestionPatterns = [
      /would you like.*?\?/gi,
      /if you'd like.*?:/gi,
      /let me know.*?:/gi,
      /feel free to.*?:/gi,
      /i can also.*?:/gi,
      /additional variations.*?:/gi,
      /here are some suggestions.*?:/gi,
      /here are \d+ unique.*?:/gi
    ];
    
    // Find the earliest suggestion pattern
    let earliestIndex = cleanContent.length;
    for (const pattern of suggestionPatterns) {
      const match = cleanContent.match(pattern);
      if (match) {
        const matchIndex = cleanContent.indexOf(match[0]);
        if (matchIndex < earliestIndex) {
          earliestIndex = matchIndex;
        }
      }
    }
    
    // Cut off at earliest suggestion
    if (earliestIndex < cleanContent.length) {
      cleanContent = cleanContent.substring(0, earliestIndex).trim();
      console.log('✅ Removed ChatGPT suggestions (fallback pattern matching)');
    }
  }
  
  // Split into segments - look for "Segment X:" pattern with flexible formatting
  // Matches: "Segment 1:", "**Segment 1:**", "# Segment 1", etc.
  const segmentRegex = /\*{0,2}\s*segment\s+(\d+)\s*\*{0,2}\s*[:—]?/gi;
  const matches = [...cleanContent.matchAll(segmentRegex)];
  
  if (matches.length === 0) {
    console.log('⚠️  No segments found with standard pattern, trying alternative patterns...');
    
    // Try alternative pattern: split by "Duration:" or numbers at line start
    const altRegex = /^#?\s*Segment\s+(\d+)|^\d+\.\s+Segment/gmi;
    const altMatches = [...cleanContent.matchAll(altRegex)];
    
    if (altMatches.length === 0) {
      console.log('⚠️  No alternative patterns found, using fallback');
      return createDefaultSegments(segmentCount, cleanContent);
    }
  }

  // Use whichever found segments
  const finalMatches = matches.length > 0 ? matches : [...cleanContent.matchAll(/^#?\s*Segment\s+(\d+)|^\d+\.\s+Segment/gmi)];

  if (finalMatches.length === 0) {
    // If still no segments found, split by double newlines or return single segment
    return createDefaultSegments(segmentCount, cleanContent);
  }

  // Extract each segment
  for (let i = 0; i < finalMatches.length; i++) {
    const startIndex = finalMatches[i].index;
    const endIndex = i + 1 < finalMatches.length ? finalMatches[i + 1].index : cleanContent.length;
    const segmentContent = cleanContent.substring(startIndex, endIndex).trim();
    
    const segmentNum = parseInt(finalMatches[i][1]);
    
    // Extract segment details
    const lines = segmentContent.split('\n');
    const titleLine = lines[0] || `Segment ${segmentNum}`;
    
    // 💫 NEW: Check if segment content looks incomplete
    const isIncomplete = segmentContent.length < 50 || 
                        segmentContent.endsWith('i') || // Common cut-off pattern
                        segmentContent.endsWith('the') ||
                        segmentContent.endsWith('a') ||
                        segmentContent.endsWith('and');
    
    if (isIncomplete && i === finalMatches.length - 1) {
      // Last segment is incomplete - might be response cut-off
      console.warn(`⚠️  Last segment (${segmentNum}) appears incomplete - response may have been cut off`);
      console.warn(`    Content ends with: "${segmentContent.substring(Math.max(0, segmentContent.length - 20))}"`);
    }
    
    segments.push({
      number: segmentNum,
      name: extractSegmentTitle(titleLine),
      duration: extractDuration(segmentContent),
      timeCode: formatTimeCode(segmentNum, segmentCount),
      script: segmentContent,
      movements: extractMovements(segmentContent),
      cameraWork: extractCameraWork(segmentContent),
      lighting: extractLighting(segmentContent),
      musicDescription: extractMusic(segmentContent)
    });
  }
  
  // 💫 NEW: Log segment extraction summary
  console.log(`\n✅ Segment Extraction Summary:`);
  console.log(`   - Found ${finalMatches.length} segment(s) from response`);
  console.log(`   - Required ${segmentCount} segment(s)`);
  console.log(`   - rawContent length: ${scriptContent.length} characters`);
  
  // Sort by segment number
  segments.sort((a, b) => a.number - b.number);
  
  // Fill in missing segments with defaults
  const missingSegments = [];
  while (segments.length < segmentCount) {
    const num = segments.length + 1;
    missingSegments.push(num);
    segments.push({
      number: num,
      name: `Segment ${num}`,
      duration: Math.round(30 / segmentCount),
      timeCode: formatTimeCode(num, segmentCount),
      script: `[Information for Segment ${num}]`,
      movements: [],
      cameraWork: 'Static or dynamic camera',
      lighting: 'Professional lighting setup',
      musicDescription: 'Background music'
    });
  }
  
  if (missingSegments.length > 0) {
    console.warn(`⚠️  Segments ${missingSegments.join(', ')} are MISSING or INCOMPLETE`);
    console.warn(`   Using placeholder text for missing segments`);
    console.warn(`   Suggest: Regenerate with more explicit segment requirements`);
  }
  
  return segments.slice(0, segmentCount);
}

/**
 * Extract segment title from first line
 */
function extractSegmentTitle(line) {
  // Remove "Segment X:" prefix and clean up
  return line
    .replace(/segment\s+\d+[:\s]+/i, '')
    .replace(/#+\s+/, '')
    .trim()
    .substring(0, 100);
}

/**
 * Extract duration (in seconds) from segment content
 */
function extractDuration(content) {
  const durationMatch = content.match(/duration[:\s]+(\d+)\s*(?:seconds?|s)?/i);
  if (durationMatch) return parseInt(durationMatch[1]);
  
  const timeMatch = content.match(/(\d+):(\d+)\s*-\s*(\d+):(\d+)/);
  if (timeMatch) {
    const startSecs = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    const endSecs = parseInt(timeMatch[3]) * 60 + parseInt(timeMatch[4]);
    return endSecs - startSecs;
  }
  
  return 7; // Default 7 seconds per segment for 20-second videos
}

/**
 * Format time code (MM:SS format)
 */
function formatTimeCode(segmentNum, totalSegments) {
  const segDuration = Math.round(120 / totalSegments); // Assume 2-minute max
  const startSec = (segmentNum - 1) * segDuration;
  const endSec = segmentNum * segDuration;
  
  return `${Math.floor(startSec / 60)}:${String(startSec % 60).padStart(2, '0')}-${Math.floor(endSec / 60)}:${String(endSec % 60).padStart(2, '0')}`;
}

/**
 * Extract movement descriptions from segment
 */
function extractMovements(content) {
  const patterns = [
    /movements?[:\s]+([^]*?)(?=camera|lighting|music|$)/i,
    /character\s+movement[:\s]+([^]*?)(?=camera|lighting|music|$)/i,
    /action[:\s]+([^]*?)(?=camera|lighting|music|$)/i
  ];
  
  let movementText = '';
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      movementText = match[1];
      break;
    }
  }
  
  if (!movementText) return ['Natural movement'];
  
  return movementText
    .split(/\n|-•/)
    .map(line => line.trim())
    .filter(line => line && line.length >= 3)
    .slice(0, 8);
}

/**
 * Extract camera work from segment
 */
function extractCameraWork(content) {
  const cameraMatch = content.match(/camera[:\s]+([^]*?)(?=lighting|movements|music|$)/i);
  if (cameraMatch) {
    return cameraMatch[1].trim().split('\n')[0];
  }
  return 'Static tripod shot';
}

/**
 * Extract lighting from segment
 */
function extractLighting(content) {
  const lightMatch = content.match(/lighting[:\s]+([^]*?)(?=camera|movements|music|$)/i);
  if (lightMatch) {
    return lightMatch[1].trim().split('\n')[0];
  }
  return 'Natural studio lighting';
}

/**
 * Extract music from segment
 */
function extractMusic(content) {
  const musicMatch = content.match(/(?:music|audio)[:\s]+([^]*?)(?=camera|movements|lighting|$)/i);
  if (musicMatch) {
    return musicMatch[1].trim().split('\n')[0];
  }
  return 'Background music';
}

/**
 * Create default segments when parsing fails
 */
function createDefaultSegments(count, fullContent = '') {
  const segments = [];
  const contentPerSegment = Math.floor(fullContent.length / Math.max(1, count));
  
  for (let i = 1; i <= count; i++) {
    const start = (i - 1) * contentPerSegment;
    const end = i === count ? fullContent.length : i * contentPerSegment;
    const segmentContent = fullContent.substring(start, end).trim();
    
    segments.push({
      number: i,
      name: `Segment ${i}`,
      duration: Math.round(30 / count),
      timeCode: formatTimeCode(i, count),
      script: segmentContent || `Segment ${i} content`,
      movements: [],
      cameraWork: 'Camera movement',
      lighting: 'Professional lighting',
      musicDescription: 'Background music'
    });
  }
  return segments;
}

/**
 * Parse variations response (simplified)
 */
function parseVariations(content, count) {
  const variations = [];
  
  // Try to split by numbered patterns or double newlines
  const parts = content.split(/\*\*\s*(?:variation|scenario|template)\s+\*?\*?\d+/i);
  
  for (let i = 0; i < Math.min(parts.length - 1, count); i++) {
    variations.push({
      index: i + 1,
      content: parts[i + 1]?.trim() || ''
    });
  }
  
  // If not enough variations, create them from segments
  while (variations.length < count) {
    variations.push({
      index: variations.length + 1,
      content: `Variation ${variations.length + 1}`
    });
  }
  
  return variations.slice(0, count);
}

export default {
  generateVideoScriptWithChatGPT,
  generateVideoScriptVariations,
  generateMovementDetail,
  generateCameraMovementGuide,
  generateLightingGuide,
  generateMusicGuide,
  generateTemplateLibrary,
  closeChatGPTService
};
