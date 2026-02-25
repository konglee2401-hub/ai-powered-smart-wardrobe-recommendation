/**
 * Affiliate Video TikTok Integration for OneClickCreatorPage.jsx
 * 
 * This file contains the integration logic for the new "affiliate-video-tiktok" use case.
 * It handles:
 * - Parallel image generation (wearing + holding)
 * - Deep ChatGPT analysis
 * - Video generation
 * - Voiceover generation
 * - Hashtag suggestions
 * 
 * INSTRUCTIONS:
 * Add these constants, functions and hooks to OneClickCreatorPage.jsx
 */

// ============================================================
// CONSTANTS TO ADD
// ============================================================

// Add to WORKFLOW_STEPS constant - Make it conditional based on use case
export const WORKFLOW_STEPS_DEFAULT = [
  { id: 'analyze', name: 'Analyze', icon: Sparkles },
  { id: 'apply-recommendations', name: 'Apply Recommendations', icon: Wand2 },
  { id: 'generate-image', name: 'Generate Image', icon: ImageIcon },
  { id: 'generate-videos', name: 'Generate Videos', icon: Video },
];

export const WORKFLOW_STEPS_AFFILIATE_TIKTOK = [
  { id: 'analyze', name: 'Analyze', icon: Sparkles },
  { id: 'apply-recommendations', name: 'Apply Recommendations', icon: Wand2 },
  { id: 'generate-images-parallel', name: 'Generate 2 Images (Parallel)', icon: ImageIcon },
  { id: 'deep-analysis', name: 'Deep Analysis', icon: Sparkles },
  { id: 'generate-video', name: 'Generate Video', icon: Video },
  { id: 'generate-voiceover', name: 'Generate Voiceover', icon: Volume2 },
  { id: 'finalize', name: 'Finalize Package', icon: CheckCircle },
];

// Add video duration options for TikTok
export const TIKTOK_DURATIONS = [
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 20, label: '20 seconds (recommended)' },
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '60 seconds' },
];

// Add voice options for TTS
export const VOICE_OPTIONS = [
  { id: 'female-fast', label: 'Female (Fast)', gender: 'female', pace: 'fast' },
  { id: 'female-normal', label: 'Female (Normal)', gender: 'female', pace: 'normal' },
  { id: 'female-slow', label: 'Female (Slow)', gender: 'female', pace: 'slow' },
  { id: 'male-fast', label: 'Male (Fast)', gender: 'male', pace: 'fast' },
  { id: 'male-normal', label: 'Male (Normal)', gender: 'male', pace: 'normal' },
  { id: 'male-slow', label: 'Male (Slow)', gender: 'male', pace: 'slow' },
];

// ============================================================
// STATE VARIABLES TO ADD (inside component)
// ============================================================

// Add these state hooks:
const [videoDuration, setVideoDuration] = useState(20); // TikTok video duration
const [voiceOption, setVoiceOption] = useState('female-fast');
const [deepAnalysisResult, setDeepAnalysisResult] = useState(null);
const [generatedVideo, setGeneratedVideo] = useState(null);
const [generatedVoiceover, setGeneratedVoiceover] = useState(null);
const [suggestedHashtags, setSuggestedHashtags] = useState([]);
const [parallelGenerationProgress, setParallelGenerationProgress] = useState({
  wearing: 0,
  holding: 0
});

// ============================================================
// HELPER FUNCTION: Get workflow steps based on use case
// ============================================================

function getWorkflowSteps(useCase) {
  if (useCase === 'affiliate-video-tiktok') {
    return WORKFLOW_STEPS_AFFILIATE_TIKTOK;
  }
  return WORKFLOW_STEPS_DEFAULT;
}

// ============================================================
// STEP 3 SPECIAL: Parallel Image Generation for Affiliate TikTok
// ============================================================

async function handleStep3ParallelImageGeneration(sessionId, analysisData, recommendedOptions) {
  const addLog = (msg) => console.log(`[${sessionId}] ${msg}`);
  
  try {
    addLog('🎨 Step 3: Starting parallel image generation...');
    updateSessionStep(sessionId, 'generate-images-parallel', true, null);

    // Generate both images in parallel
    const [wearingResult, holdingResult] = await Promise.all([
      // Image 1: Character wearing product
      generateImageForUseCase(
        sessionId,
        analysisData,
        recommendedOptions,
        'change-clothes',
        (progress) => setParallelGenerationProgress(p => ({ ...p, wearing: progress }))
      ),
      // Image 2: Character holding product
      generateImageForUseCase(
        sessionId,
        analysisData,
        recommendedOptions,
        'character-holding-product',
        (progress) => setParallelGenerationProgress(p => ({ ...p, holding: progress }))
      )
    ]);

    if (!wearingResult.success || !holdingResult.success) {
      throw new Error('One or both image generations failed');
    }

    addLog('✓ Both images generated successfully');
    updateSessionStep(sessionId, 'generate-images-parallel', false, null, true);

    return {
      wearing: wearingResult.image,
      holding: holdingResult.image,
      analysisData
    };
  } catch (error) {
    addLog(`✗ Error: ${error.message}`);
    updateSessionStep(sessionId, 'generate-images-parallel', false, error.message);
    throw error;
  }
}

// ============================================================
// STEP 4 SPECIAL: Deep ChatGPT Analysis
// ============================================================

async function handleStep4DeepAnalysis(sessionId, images, analysisData) {
  const addLog = (msg) => console.log(`[${sessionId}] ${msg}`);
  
  try {
    addLog('🤖 Step 4: Performing deep ChatGPT analysis...');
    updateSessionStep(sessionId, 'deep-analysis', true, null);

    const response = await api.post('/api/ai/affiliate-video-tiktok/deep-analysis', {
      wearingImage: images.wearing,
      holdingImage: images.holding,
      productAnalysis: analysisData.product,
      characterAnalysis: analysisData.character,
      videoDuration,
      voiceGender: voiceOption.split('-')[0],
      voicePace: voiceOption.split('-')[1]
    });

    if (!response.success) {
      throw new Error(response.error || 'Deep analysis failed');
    }

    const analysis = response.data;
    setDeepAnalysisResult(analysis);
    setSuggestedHashtags(analysis.hashtags || []);

    addLog('✓ Deep analysis complete');
    addLog(`   Video Segments: ${analysis.videoScripts?.length || 0}`);
    addLog(`   Hashtags: ${analysis.hashtags?.length || 0}`);

    updateSessionStep(sessionId, 'deep-analysis', false, null, true);

    return analysis;
  } catch (error) {
    addLog(`✗ Error: ${error.message}`);
    updateSessionStep(sessionId, 'deep-analysis', false, error.message);
    throw error;
  }
}

// ============================================================
// STEP 5 SPECIAL: Video Generation
// ============================================================

async function handleStep5VideoGeneration(sessionId, images, deepAnalysis) {
  const addLog = (msg) => console.log(`[${sessionId}] ${msg}`);
  
  try {
    addLog('🎥 Step 5: Generating video...');
    updateSessionStep(sessionId, 'generate-video', true, null);

    const response = await api.post('/api/ai/affiliate-video-tiktok/generate-video', {
      wearingImageUrl: typeof images.wearing === 'string' ? images.wearing : images.wearing.url,
      holdingImageUrl: typeof images.holding === 'string' ? images.holding : images.holding.url,
      videoScripts: deepAnalysis.videoScripts,
      videoDuration,
      aspectRatio: '9:16',
      videoProvider: 'google-flow'
    });

    if (!response.success) {
      throw new Error(response.error || 'Video generation failed');
    }

    setGeneratedVideo(response.data.video);
    addLog('✓ Video generated');
    addLog(`   Duration: ${response.data.duration}`);
    updateSessionStep(sessionId, 'generate-video', false, null, true);

    return response.data.video;
  } catch (error) {
    addLog(`✗ Error: ${error.message}`);
    updateSessionStep(sessionId, 'generate-video', false, error.message);
    throw error;
  }
}

// ============================================================
// STEP 6 SPECIAL: Voiceover Generation
// ============================================================

async function handleStep6VoiceoverGeneration(sessionId, deepAnalysis) {
  const addLog = (msg) => console.log(`[${sessionId}] ${msg}`);
  
  try {
    addLog('🎤 Step 6: Generating voiceover...');
    updateSessionStep(sessionId, 'generate-voiceover', true, null);

    const [voiceGender, voicePace] = voiceOption.split('-');

    const response = await api.post('/api/ai/affiliate-video-tiktok/generate-voiceover', {
      voiceoverScript: deepAnalysis.voiceoverScript,
      voiceGender,
      voicePace,
      videoDuration
    });

    if (!response.success) {
      throw new Error(response.error || 'Voiceover generation failed');
    }

    setGeneratedVoiceover(response.data.audio);
    addLog('✓ Voiceover generated');
    addLog(`   Duration: ${response.data.duration}s`);
    updateSessionStep(sessionId, 'generate-voiceover', false, null, true);

    return response.data.audio;
  } catch (error) {
    addLog(`✗ Error: ${error.message}`);
    updateSessionStep(sessionId, 'generate-voiceover', false, error.message);
    throw error;
  }
}

// ============================================================
// STEP 7: Finalize Package
// ============================================================

async function handleStep7Finalize(sessionId, images, video, voiceover, deepAnalysis) {
  const addLog = (msg) => console.log(`[${sessionId}] ${msg}`);
  
  try {
    addLog('✨ Step 7: Finalizing package...');
    updateSessionStep(sessionId, 'finalize', true, null);

    const response = await api.post('/api/ai/affiliate-video-tiktok/finalize', {
      videoUrl: video.url,
      voiceoverUrl: voiceover.url,
      wearingImageUrl: typeof images.wearing === 'string' ? images.wearing : images.wearing.url,
      holdingImageUrl: typeof images.holding === 'string' ? images.holding : images.holding.url,
      hashtags: suggestedHashtags,
      videoDuration,
      productInfo: deepAnalysis.productInfo
    });

    if (!response.success) {
      throw new Error(response.error || 'Finalization failed');
    }

    addLog('✓ Package complete!');
    addLog(`   Package ID: ${response.data.packageId}`);
    addLog(`   Ready for: TikTok, Instagram Reels, YouTube Shorts`);
    updateSessionStep(sessionId, 'finalize', false, null, true);

    return response.data;
  } catch (error) {
    addLog(`✗ Error: ${error.message}`);
    updateSessionStep(sessionId, 'finalize', false, error.message);
    throw error;
  }
}

// ============================================================
// HELPER: Generate image for specific use case
// ============================================================

async function generateImageForUseCase(sessionId, analysisData, options, useCase, onProgress) {
  try {
    // Build prompt
    const promptResponse = await api.post('/api/ai/build-prompt-unified', {
      analysis: analysisData,
      selectedOptions: options,
      useCase,
      productFocus: 'full-outfit'
    });

    if (!promptResponse.success) {
      throw new Error(`Prompt building failed for ${useCase}`);
    }

    // Generate image
    const imageResponse = await api.post('/api/ai/generate-unified', {
      prompt: promptResponse.data.prompt,
      negativePrompt: promptResponse.data.negativePrompt,
      imageCount: 1,
      imageSize: '1024x1024',
      aspectRatio: '9:16',
      useCase
    });

    if (!imageResponse.success) {
      throw new Error(`Image generation failed for ${useCase}`);
    }

    return {
      success: true,
      image: imageResponse.data.generatedImages[0]
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================
// INSTRUCTIONS FOR INTEGRATION INTO OneClickCreatorPage
// ============================================================

/*
CHANGES TO MAKE IN OneClickCreatorPage.jsx:

1. Add imports:
   import { Volume2 } from 'lucide-react';

2. Replace WORKFLOW_STEPS definition with:
   const WORKFLOW_STEPS = getWorkflowSteps(useCase);

3. After render state variables, add:
   const [videoDuration, setVideoDuration] = useState(20);
   const [voiceOption, setVoiceOption] = useState('female-fast');
   const [deepAnalysisResult, setDeepAnalysisResult] = useState(null);
   const [generatedVideo, setGeneratedVideo] = useState(null);
   const [generatedVoiceover, setGeneratedVoiceover] = useState(null);
   const [suggestedHashtags, setSuggestedHashtags] = useState([]);

4. In the session workflow execution, add special handling:
   if (useCase === 'affiliate-video-tiktok') {
     // Handle parallel and deep analysis steps
   } else {
     // Existing logic
   }

5. Add new UI section in SessionRow for:
   - TikTok duration selector
   - Voice options selector
   - Hashtags display
   - Final package preview

6. Update session reset to clear TikTok-specific state
*/
