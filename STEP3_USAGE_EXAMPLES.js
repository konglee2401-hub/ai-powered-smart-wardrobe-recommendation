/**
 * USAGE EXAMPLES - Complete Session History & Prompt Engineering System
 * These examples show how to use each feature in practice
 */

// ============================================================================
// EXAMPLE 1: Initialize Session and Track Analysis
// ============================================================================

import { SessionHistory, generateSessionId, parseGrokConversationUrl } from '../utils/sessionHistory';
import SessionHistoryService from '../services/sessionHistoryService';

const example1_initializeSession = async () => {
  // Create new session
  const sessionId = generateSessionId();
  const session = new SessionHistory(
    sessionId,
    'change-clothes', // useCase
    'char-123',       // characterImageId
    'prod-456'        // productImageId
  );

  console.log('Session created:', session.sessionId);

  // Save to backend
  const response = await SessionHistoryService.createSession({
    sessionId: session.sessionId,
    userId: 'user-789',
    useCase: 'change-clothes',
    characterImageId: 'char-123',
    productImageId: 'prod-456',
    metadata: {
      browser: navigator.userAgent,
      timezone: new Date().getTimezoneOffset(),
      locale: navigator.language
    }
  });

  console.log('Session saved to backend:', response.sessionId);
  return session;
};

// ============================================================================
// EXAMPLE 2: Track Grok Analysis with Conversation URL
// ============================================================================

const example2_trackGrokAnalysis = async (session) => {
  // Simulated analysis result with Grok URL
  const analysisResult = {
    provider: 'grok',
    analysisData: {
      recommendedStyle: 'editorial',
      colors: ['warm tone', 'neutral'],
      lighting: 'soft-diffused',
      mood: 'confident'
    },
    grokConversationUrl: 'https://grok.com/c/eb1bfdbe-c184-4996-854d-a4a9c1576078?rid=2b08a219-8166-4f76-9b7e-113075438cfb',
    analysisTime: 2350 // milliseconds
  };

  // Parse and save Grok conversation
  const sessionId = session.sessionId;
  
  await SessionHistoryService.saveAnalysis(sessionId, {
    provider: analysisResult.provider,
    analysisData: analysisResult.analysisData,
    grokConversationUrl: analysisResult.grokConversationUrl,
    analysisTime: analysisResult.analysisTime
  });

  console.log('Analysis saved. Grok conversation URL:', analysisResult.grokConversationUrl);

  // Session now has grokConversation data
  const updatedSession = await SessionHistoryService.getSession(sessionId);
  console.log('Grok conversation ID:', updatedSession.analysisStage.grokConversation.conversationId);
  console.log('Can reuse this conversation for enhancement later!');
};

// ============================================================================
// EXAMPLE 3: Generate Prompt with Layering
// ============================================================================

import { PromptLayering } from '../utils/advancedPromptEngineering';

const example3_createLayeredPrompt = () => {
  const mainPrompt = `A woman wearing a black blazer, confident expression, formal attire, 
    sophisticated makeup, standing in modern office setting, 
    professional lighting with soft shadows, 
    editorial photography style, sharp focus`;

  const refinerPrompt = 'high quality, sharp, professional, detailed, museum lighting, architectural interior';

  const negativePrompt = 'blurry, low quality, distorted, casual, wrinkles, oversaturated, amateur';

  // Create layered prompt
  const layering = new PromptLayering(mainPrompt, refinerPrompt, negativePrompt);

  console.log('=== LAYERED PROMPT ===');
  console.log('\n1. MAIN:');
  console.log(layering.mainPrompt);
  console.log('\n2. REFINER:');
  console.log(layering.refinerPrompt);
  console.log('\n3. NEGATIVE:');
  console.log(layering.negativePrompt);

  // Get for different model types
  console.log('\n=== FOR DIFFERENT MODELS ===');
  
  // For SDXL (supports separate refiner)
  console.log('\nFor SDXL:');
  console.log(layering.forSDXLRefiner());

  // For models without refiner support
  console.log('\nFor other models (combined):');
  console.log(layering.combined());

  return layering;
};

// ============================================================================
// EXAMPLE 4: Generate A/B Testing Variations
// ============================================================================

import { PromptVariationGenerator } from '../utils/advancedPromptEngineering';

const example4_generateVariations = () => {
  const basePrompt = `A woman wearing a black blazer, confident expression, formal attire, 
    sophisticated makeup, standing in modern office setting, professional lighting`;

  const generator = new PromptVariationGenerator(basePrompt);

  // Generate 3 variations
  const variations = generator.generateAllVariations(3);

  console.log('=== A/B TESTING VARIATIONS ===\n');
  
  variations.forEach((variation, index) => {
    console.log(`VARIATION ${index + 1} (Method: ${variation.method})`);
    console.log(`Score: ${variation.score} | Length: ${variation.variation.length}`);
    console.log(`Text: ${variation.variation}`);
    console.log('---');
  });

  // Select best variation
  const bestByQuality = generator.selectBestVariation('quality');
  console.log('\nBest by quality:');
  console.log(bestByQuality);

  const shortestVariation = generator.selectBestVariation('shortest');
  console.log('\nShortest:');
  console.log(shortestVariation);

  return variations;
};

// ============================================================================
// EXAMPLE 5: Save Variations to Session
// ============================================================================

const example5_saveVariationsToSession = async (sessionId, variations) => {
  // Save variations to backend
  const response = await SessionHistoryService.savePromptVariations(sessionId, variations);

  console.log('Variations saved to session');
  console.log('Saved count:', response.promptStage.promptVariations.length);

  // Can now retrieve them later
  const session = await SessionHistoryService.getSession(sessionId);
  console.log('Retrieved variations:', session.promptStage.promptVariations);
};

// ============================================================================
// EXAMPLE 6: Enhance Prompt Using Grok Conversation
// ============================================================================

import { GrokConversationEnhancer } from '../utils/advancedPromptEngineering';

const example6_enhancePromptWithGrok = async (session) => {
  // Get stored Grok conversation
  const grokConversation = session.analysisStage?.grokConversation;
  
  if (!grokConversation) {
    console.error('No Grok conversation found. Was analysis performed with Grok?');
    return;
  }

  // Create enhancer
  const enhancer = new GrokConversationEnhancer(
    grokConversation.conversationId,
    grokConversation.requestId
  );

  // Build enhancement request
  const currentPrompt = `A woman wearing black blazer, confident, office setting, professional lighting, 
    editorial style, sharp focus`;

  const request = enhancer.buildEnhancementRequest(
    currentPrompt,
    'change-clothes',
    { maxLength: 250, style: 'creative' }
  );

  console.log('Enhancement request ready:');
  console.log(request.message);

  // In real usage, send to Grok API:
  // const enhanced = await grokAPI.continueConversation(
  //   grokConversation.conversationId,
  //   request.message
  // );

  // For demo, simulate response
  const enhanced = `A confident professional woman in elegant black blazer, 
    sophisticated presence in modern office, studio lighting perfection, 
    high-end editorial photography quality, razor-sharp focus`;

  console.log('\nEnhanced prompt:');
  console.log(enhanced);

  // Save enhancement
  await SessionHistoryService.savePromptEnhancement(session.sessionId, {
    enhancedPrompt: enhanced,
    enhancementMethod: 'grok_conversation',
    grokConversationUrl: grokConversation.fullUrl
  });

  console.log('\nEnhancement saved to session with Grok conversation link!');
};

// ============================================================================
// EXAMPLE 7: Track Optimization in Session
// ============================================================================

const example7_trackOptimization = async (session) => {
  // Simulate prompt optimization
  const originalPrompt = session.promptStage.initialPrompt;
  const optimizedPrompt = originalPrompt.replace(/\s+/g, ' ').substring(0, 200);

  // Update session with optimization
  session.trackOptimization(
    'length_reduction',
    originalPrompt.length,
    optimizedPrompt.length,
    {
      originalPrompt,
      optimizedPrompt,
      method: 'whitespace_removal_and_truncation'
    }
  );

  console.log('Optimization tracked:');
  console.log(`Original: ${originalPrompt.length} chars`);
  console.log(`Optimized: ${optimizedPrompt.length} chars`);
  console.log(`Reduction: ${originalPrompt.length - optimizedPrompt.length} chars (${
    Math.round(((originalPrompt.length - optimizedPrompt.length) / originalPrompt.length) * 100)
  }%)`);

  // Save updated session
  await SessionHistoryService.updateSession(session.sessionId, {
    promptStage: session.promptStage
  });
};

// ============================================================================
// EXAMPLE 8: Complete Session with Generation Results
// ============================================================================

const example8_completeSessionWithGeneration = async (sessionId) => {
  await SessionHistoryService.saveGenerationResults(sessionId, {
    provider: 'stable-diffusion',
    finalPrompt: `A confident professional woman in black blazer, sophisticated office setting...`,
    generatedImages: [
      {
        id: 'img-001',
        url: 'https://...image1.jpg',
        generatedAt: new Date().toISOString(),
        metadata: { seed: 12345, steps: 30 }
      },
      {
        id: 'img-002',
        url: 'https://...image2.jpg',
        generatedAt: new Date().toISOString(),
        metadata: { seed: 12346, steps: 30 }
      }
    ],
    settings: {
      guidance: 7.5,
      steps: 30,
      sampler: 'DPM++ 2M Karras'
    }
  });

  console.log('Generation results saved, session completed!');
};

// ============================================================================
// EXAMPLE 9: Get Session Statistics
// ============================================================================

const example9_getSessionStatistics = async (sessionId) => {
  const stats = await SessionHistoryService.getSessionStatistics(sessionId);

  console.log('=== SESSION STATISTICS ===\n');
  console.log(`Session ID: ${stats.statistics.sessionId}`);
  console.log(`Duration: ${stats.statistics.duration}s`);
  console.log(`Status: ${stats.statistics.status}`);
  console.log(`\nAnalysis:`);
  console.log(`  Provider: ${stats.statistics.analysis.provider}`);
  console.log(`  Time: ${stats.statistics.analysis.time}ms`);
  console.log(`  Grok Conversation: ${stats.statistics.analysis.hasGrokConversation ? '✓' : '✗'}`);
  console.log(`\nStyling:`);
  console.log(`  Options Selected: ${stats.statistics.style.optionsSelected}`);
  console.log(`  Reference Images: ${stats.statistics.style.referenceImages}`);
  console.log(`\nPrompts:`);
  console.log(`  Variations: ${stats.statistics.prompt.variations}`);
  console.log(`  Layered: ${stats.statistics.prompt.hasLayered ? '✓' : '✗'}`);
  console.log(`  Enhanced: ${stats.statistics.prompt.hasEnhanced ? '✓' : '✗'}`);
  console.log(`  Enhancement Method: ${stats.statistics.prompt.enhancementMethod}`);
  console.log(`  Optimizations: ${stats.statistics.prompt.optimizations}`);
  console.log(`  Character Reduction: ${stats.statistics.prompt.totalCharacterReduction}`);
  console.log(`\nGeneration:`);
  console.log(`  Provider: ${stats.statistics.generation.provider}`);
  console.log(`  Images: ${stats.statistics.generation.imageCount}`);
};

// ============================================================================
// EXAMPLE 10: Export Complete Session
// ============================================================================

const example10_exportSession = async (sessionId) => {
  const sessionData = await SessionHistoryService.exportSession(sessionId);

  // Save as JSON file
  const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session-${sessionId}.json`;
  a.click();

  console.log('Session exported as JSON');

  // You can now rest, analyze, or reuse this data
  console.log('Export includes:');
  console.log('- All analysis data');
  console.log('- Style selections');
  console.log('- Prompt variations');
  console.log('- Generated images');
  console.log('- Grok conversation links');
  console.log('- Complete timing data');
};

// ============================================================================
// EXAMPLE 11: Reuse Analysis from Past Session
// ============================================================================

const example11_reuseAnalysisFromPastSession = async (pastSessionId) => {
  // Retrieve old session
  const pastSession = await SessionHistoryService.getSession(pastSessionId);

  // Extract Grok conversation
  const grokConversation = pastSession.analysisStage.grokConversation;
  const analysisData = pastSession.analysisStage.analysisData;

  console.log('Reusing analysis from past session:');
  console.log('Grok Conversation:', grokConversation.conversationId);
  console.log('Analysis:', analysisData);

  // Create new session with same analysis
  const newSession = new SessionHistory(
    generateSessionId(),
    'change-clothes',
    'new-char-123',
    'new-prod-456'
  );

  // Copy analysis stage from old session
  newSession.updateAnalysisStage({
    status: 'analyzed',
    provider: pastSession.analysisStage.provider,
    grokConversation: grokConversation,
    analysisData: analysisData,
    analysisTime: pastSession.analysisStage.analysisTime
  });

  return newSession;
};

// ============================================================================
// EXAMPLE 12: Complete Workflow (All Steps Together)
// ============================================================================

const example12_completeWorkflow = async () => {
  console.log('🚀 STARTING COMPLETE WORKFLOW\n');

  // 1. Initialize session
  console.log('Step 1: Initialize session');
  const session = await example1_initializeSession();

  // 2. Perform analysis with Grok
  console.log('\nStep 2: Track Grok analysis');
  await example2_trackGrokAnalysis(session);

  // 3. Generate layered prompt
  console.log('\nStep 3: Create layered prompt');
  const layering = example3_createLayeredPrompt();

  // 4. Generate variations
  console.log('\nStep 4: Generate A/B testing variations');
  const variations = example4_generateVariations();

  // 5. Save variations
  console.log('\nStep 5: Save variations to session');
  await example5_saveVariationsToSession(session.sessionId, variations);

  // 6. Enhance with Grok
  console.log('\nStep 6: Enhance prompt using Grok conversation');
  // await example6_enhancePromptWithGrok(session); // Commented: requires real Grok API

  // 7. Track optimization
  console.log('\nStep 7: Track optimizations');
  // await example7_trackOptimization(session); // Would track optimizations

  // 8. Complete with generation
  console.log('\nStep 8: Complete session with generation');
  await example8_completeSessionWithGeneration(session.sessionId);

  // 9. View statistics
  console.log('\nStep 9: View session statistics');
  await example9_getSessionStatistics(session.sessionId);

  // 10. Export session
  console.log('\nStep 10: Export complete session');
  // await example10_exportSession(session.sessionId); // Would download JSON

  console.log('\n✅ WORKFLOW COMPLETE');
};

// ============================================================================
// HOW TO RUN THESE EXAMPLES
// ============================================================================

/*
In browser console or test file:

// Run individual examples:
await example1_initializeSession();
await example2_trackGrokAnalysis(session);
example3_createLayeredPrompt();
example4_generateVariations();
await example5_saveVariationsToSession(sessionId, variations);
await example9_getSessionStatistics(sessionId);

// Run complete workflow:
await example12_completeWorkflow();

// Check individual outputs:
console.log(sessionHistory);
console.log(sessionHistory.promptStage);
console.log(sessionHistory.analysisStage.grokConversation);
*/

// ============================================================================
// EXPORT FOR USE
// ============================================================================

export {
  example1_initializeSession,
  example2_trackGrokAnalysis,
  example3_createLayeredPrompt,
  example4_generateVariations,
  example5_saveVariationsToSession,
  example6_enhancePromptWithGrok,
  example7_trackOptimization,
  example8_completeSessionWithGeneration,
  example9_getSessionStatistics,
  example10_exportSession,
  example11_reuseAnalysisFromPastSession,
  example12_completeWorkflow
};
