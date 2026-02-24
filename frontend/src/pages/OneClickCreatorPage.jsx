/**
 * 1-Click Creator Page
 * Full step-by-step workflow: Upload → Auto-Analyze → Apply Recommendations → Generate Images → Generate Videos
 * With per-session management and real-time progress tracking
 */

import React, { useState, useRef } from 'react';
import {
  Upload, Sparkles, Rocket, Loader2, ChevronDown, ChevronUp,
  Play, Video, X, Settings, Image as ImageIcon,
  AlertCircle, CheckCircle, Clock, FileText, Target, Wand2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import promptTemplateService from '../services/promptTemplateService';
import VideoPromptEnhancedWithChatGPT from '../components/VideoPromptEnhancedWithChatGPT';
import { 
  calculateVideoCount, 
  VIDEO_PROVIDER_LIMITS, 
  getMaxDurationForProvider,
  VIDEO_SCENARIOS,
  VIDEO_DURATIONS,
  getScenarioByValue
} from '../constants/videoGeneration';

// Constants - Use cases and focus options from ImageGenerationPage
const USE_CASES = [
  { value: 'change-clothes', label: 'Change Clothes', description: 'Mặc sản phẩm lên người mẫu' },
  { value: 'ecommerce-product', label: 'E-commerce', description: 'Ảnh sản phẩm thương mại' },
  { value: 'social-media', label: 'Social Media', description: 'Bài đăng mạng xã hội' },
  { value: 'fashion-editorial', label: 'Editorial', description: 'Bài báo thời trang chuyên nghiệp' },
];

const FOCUS_OPTIONS = [
  { value: 'full-outfit', label: 'Full Outfit', description: 'Toàn bộ trang phục' },
  { value: 'top', label: 'Top', description: 'Áo' },
  { value: 'bottom', label: 'Bottom', description: 'Quần/váy' },
  { value: 'shoes', label: 'Shoes', description: 'Giày' },
];

const IMAGE_PROVIDERS = [
  { id: 'grok', label: 'Grok', icon: '🤖' },
  { id: 'google-flow', label: 'Google Flow', icon: '🌐' },
];

const VIDEO_PROVIDERS = [
  { id: 'grok', label: 'Grok', icon: '🤖' },
  { id: 'google-flow', label: 'Google Flow', icon: '🌐' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
];

// 📊 Image Generation Configuration
const DESIRED_OUTPUT_COUNT = 2;  // Number of images to generate per session

// Workflow steps
const WORKFLOW_STEPS = [
  { id: 'analyze', name: 'Analyze', icon: Sparkles },
  { id: 'apply-recommendations', name: 'Apply Recommendations', icon: Wand2 },
  { id: 'generate-image', name: 'Generate Image', icon: ImageIcon },
  { id: 'generate-videos', name: 'Generate Videos', icon: Video },
];

// ============================================================
// HELPER FUNCTIONS FOR TEMPLATE-BASED PROMPT GENERATION
// ============================================================

/**
 * Map OneClick use cases to template scenarios
 */
const mapUseCaseToTemplateUseCase = (useCase) => {
  const mapping = {
    'change-clothes': 'outfit-change',
    'ecommerce-product': 'product-showcase',
    'social-media': 'fashion-model',
    'fashion-editorial': 'product-photography'
  };
  return mapping[useCase] || 'outfit-change';
};

/**
 * Generate image prompt using templates
 * Falls back to hardcoded prompt if templates not available
 */
async function generateImagePromptFromTemplate(useCase, productFocus, recommendedOptions, sessionId, addLog) {
  try {
    addLog(sessionId, 'Loading image template...');
    
    const templateUseCase = mapUseCaseToTemplateUseCase(useCase);
    const templates = await promptTemplateService.getTemplatesByUseCase(templateUseCase);
    
    if (!templates.data || templates.data.length === 0) {
      throw new Error('No templates found');
    }

    const template = templates.data[0]; // Use first template
    addLog(sessionId, `Using template: ${template.name}`);

    // Build field values from recommendations
    const fieldValues = {
      productFocus: productFocus || 'full outfit',
      scene: recommendedOptions.scene || 'studio',
      lighting: recommendedOptions.lighting || 'soft-diffused',
      mood: recommendedOptions.mood || 'confident',
      style: recommendedOptions.style || 'minimalist',
      colorPalette: recommendedOptions.colorPalette || 'neutral',
      cameraAngle: recommendedOptions.cameraAngle || 'eye-level',
      useCase: useCase,
    };

    const result = await promptTemplateService.renderTemplate(template._id || template.id, fieldValues);
    const prompt = result.data.renderedPrompt || result.data;
    
    addLog(sessionId, '✓ Image prompt generated from template');
    return prompt;
  } catch (templateError) {
    console.warn('Template-based generation failed, using fallback:', templateError);
    // Fallback to hardcoded prompt
    const imagePrompt = `Professional fashion photo. Character wearing ${productFocus || 'full outfit'}. ` +
      `Scene: ${recommendedOptions.scene}. Lighting: ${recommendedOptions.lighting}. ` +
      `Mood: ${recommendedOptions.mood}. Style: ${recommendedOptions.style}. ` +
      `Colors: ${recommendedOptions.colorPalette}. Camera: ${recommendedOptions.cameraAngle}. ` +
      `Use case: ${useCase}. High quality, detailed, professional.`;
    return imagePrompt;
  }
}

/**
 * Generate video prompt using templates
 * Falls back to hardcoded prompt if templates not available
 */
async function generateVideoPromptFromTemplate(useCase, productFocus, recommendedOptions, videoDuration, sessionId, addLog) {
  try {
    addLog(sessionId, 'Loading video template...');
    
    const templateUseCase = mapUseCaseToTemplateUseCase(useCase);
    const templates = await promptTemplateService.getTemplatesByUseCase('video-generation');
    
    if (!templates.data || templates.data.length === 0) {
      throw new Error('No templates found');
    }

    const template = templates.data[0]; // Use first template
    addLog(sessionId, `Using template: ${template.name}`);

    // Build field values from recommendations
    const fieldValues = {
      productFocus: productFocus || 'full outfit',
      duration: videoDuration,
      style: recommendedOptions.style || 'minimalist',
      mood: recommendedOptions.mood || 'confident',
      cameraAngle: recommendedOptions.cameraAngle || 'eye-level',
      scenario: 'Fashion shoot',
    };

    const result = await promptTemplateService.renderTemplate(template._id || template.id, fieldValues);
    const prompt = result.data.renderedPrompt || result.data;
    
    addLog(sessionId, '✓ Video prompt generated from template');
    return prompt;
  } catch (templateError) {
    console.warn('Template-based generation failed, using fallback:', templateError);
    // Fallback to hardcoded prompt
    const videoPrompt = `Professional fashion video. Model wearing ${productFocus}. ` +
      `Duration: ${videoDuration}s. Scenario: Fashion shoot. ` +
      `Style: ${recommendedOptions.style}. Mood: ${recommendedOptions.mood}. ` +
      `Camera: ${recommendedOptions.cameraAngle}. High quality professional video.`;
    return videoPrompt;
  }
}

// Session component
function SessionRow({ session, isGenerating, onCancel }) {
  const [expandedLogs, setExpandedLogs] = useState(false);
  
  const getStepStatus = (stepId) => {
    const step = session.steps?.find(s => s.id === stepId);
    if (!step) return 'pending';
    if (step.error) return 'error';
    if (step.completed) return 'completed';
    if (step.inProgress) return 'inProgress';
    return 'pending';
  };

  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'inProgress':
        return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-200">
          Session #{session.id}{session.completed && ' ✓'}
          {session.error && ' ✗'}
        </h4>
        {session.error && (
          <span className="text-xs bg-red-600/20 text-red-300 px-2 py-1 rounded">
            {session.error}
          </span>
        )}
      </div>

      {/* Steps Progress */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {WORKFLOW_STEPS.map(step => {
          const status = getStepStatus(step.id);
          const stepData = session.steps?.find(s => s.id === step.id);
          return (
            <div key={step.id} className="text-center">
              <div className="flex justify-center mb-1">
                {getStepIcon(status)}
              </div>
              <p className="text-xs text-gray-400 truncate">{step.name}</p>
            </div>
          );
        })}
      </div>

      {/* Image Preview */}
      {session.image && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Generated Image</p>
          <img src={session.image} alt="Generated" className="w-full h-32 object-cover rounded" />
        </div>
      )}

      {/* Videos Preview */}
      {session.videos?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">
            Generated Videos ({session.videos.filter(v => v).length}/{session.videosCount})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {session.videos.map((video, idx) => (
              <div key={idx} className="relative bg-black rounded aspect-video flex items-center justify-center">
                {video ? (
                  <video src={video} controls className="w-full h-full rounded" />
                ) : (
                  <div className="text-gray-500 text-xs text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1" />
                    Pending...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="border-t border-gray-700 pt-3">
        <button
          onClick={() => setExpandedLogs(!expandedLogs)}
          className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          <span>Logs ({session.logs?.length || 0})</span>
          {expandedLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {expandedLogs && (
          <div className="mt-2 max-h-40 overflow-y-auto bg-gray-900/50 rounded p-2 space-y-1">
            {session.logs?.length > 0 ? (
              session.logs.map((log, idx) => (
                <div key={idx} className="text-xs text-gray-500 font-mono">
                  [{log.timestamp}] {log.message}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-600 italic">No logs yet...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OneClickCreatorPage() {
  const navigate = useNavigate();

  // Upload states
  const [characterImage, setCharacterImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const fileInputRef = useRef(null);

  // Settings
  const [useCase, setUseCase] = useState('change-clothes');
  const [productFocus, setProductFocus] = useState('full-outfit');
  const [imageProvider, setImageProvider] = useState('google-flow');
  const [videoProvider, setVideoProvider] = useState('google-flow');  // Aligned with image provider
  const [videoScenario, setVideoScenario] = useState('product-intro');  // Default scenario
  const [videoDuration, setVideoDuration] = useState(20);  // Default 20 seconds
  const [quantity, setQuantity] = useState(DESIRED_OUTPUT_COUNT);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isHeadless, setIsHeadless] = useState(true);

  // Workflow state
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessions, setSessions] = useState([]);

  // Add log to session
  const addLog = (sessionId, message) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          logs: [...(s.logs || []), {
            timestamp: new Date().toLocaleTimeString(),
            message
          }]
        };
      }
      return s;
    }));
  };

  // Update session step
  const updateSessionStep = (sessionId, stepId, updates) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          steps: (s.steps || []).map(step => {
            if (step.id === stepId) {
              return { ...step, ...updates };
            }
            return step;
          })
        };
      }
      return s;
    }));
  };

  // Initialize session
  const initSession = (id) => {
    // Calculate video count based on provider and total duration (120s = 2 minutes)
    const maxDuration = getMaxDurationForProvider(videoProvider);
    const videosCount = calculateVideoCount(videoProvider, 120);
    
    return {
      id,
      steps: WORKFLOW_STEPS.map(s => ({ id: s.id, completed: false, error: null, inProgress: false })),
      logs: [],
      image: null,
      videos: [],
      videosCount,
      completed: false,
      error: null
    };
  };

  // Main generation flow
  const handleOneClickGeneration = async () => {
    if (!characterImage || !productImage) {
      alert('Please upload both images first');
      return;
    }

    setIsGenerating(true);
    setSessions([]);

    // Convert images to base64
    const charBase64 = characterImage.split(',')[1];
    const prodBase64 = productImage.split(',')[1];

    // Create sessions for each quantity
    const newSessions = Array.from({ length: quantity }).map((_, idx) => initSession(idx + 1));
    setSessions(newSessions);

    // Process each session sequentially
    for (let s of newSessions) {
      const sessionId = s.id;
      console.log(`\n🔄 Starting Session #${sessionId}`);

      try {
        // ======== STEP 1: ANALYZE ========
        console.log(`📊 [S${sessionId}] Step 1: Analyze`);
        updateSessionStep(sessionId, 'analyze', { inProgress: true });
        addLog(sessionId, 'Starting analysis...');

        let analysisResult = null;
        try {
          const analysisResponse = await browserAutomationAPI.analyzeBrowserOnly(
            charBase64,
            prodBase64,
            {
              provider: 'chatgpt-browser',
              scene: 'studio',
              lighting: 'soft-diffused',
              mood: 'confident',
              style: 'minimalist',
              colorPalette: 'neutral',
              cameraAngle: 'eye-level',
              aspectRatio,
            }
          );

          if (analysisResponse.success || analysisResponse.data) {
            analysisResult = analysisResponse.data || analysisResponse;
            addLog(sessionId, '✓ Analysis complete');
            updateSessionStep(sessionId, 'analyze', { completed: true, inProgress: false });
          } else {
            throw new Error('Analysis failed: Invalid response');
          }
        } catch (analyzeError) {
          console.error(`❌ Analysis error [S${sessionId}]:`, analyzeError);
          addLog(sessionId, `❌ Analysis failed: ${analyzeError.message}`);
          updateSessionStep(sessionId, 'analyze', { error: analyzeError.message, inProgress: false });
          throw analyzeError;
        }

        // ======== STEP 2: APPLY RECOMMENDATIONS ========
        console.log(`✨ [S${sessionId}] Step 2: Apply Recommendations`);
        updateSessionStep(sessionId, 'apply-recommendations', { inProgress: true });
        addLog(sessionId, 'Applying AI recommendations...');

        let recommendedOptions = {
          scene: 'studio',
          lighting: 'soft-diffused',
          mood: 'confident',
          style: 'minimalist',
          colorPalette: 'neutral',
          cameraAngle: 'eye-level',
        };

        try {
          // Extract recommendations from analysis if available
          if (analysisResult?.recommendations) {
            const rec = analysisResult.recommendations;
            if (rec.scene?.choice) recommendedOptions.scene = rec.scene.choice;
            if (rec.lighting?.choice) recommendedOptions.lighting = rec.lighting.choice;
            if (rec.mood?.choice) recommendedOptions.mood = rec.mood.choice;
            if (rec.style?.choice) recommendedOptions.style = rec.style.choice;
            if (rec.colorPalette?.choice) recommendedOptions.colorPalette = rec.colorPalette.choice;
            if (rec.cameraAngle?.choice) recommendedOptions.cameraAngle = rec.cameraAngle.choice;
            addLog(sessionId, `✓ Applied recommendations: ${JSON.stringify(recommendedOptions).substring(0, 80)}...`);
          }
          updateSessionStep(sessionId, 'apply-recommendations', { completed: true, inProgress: false });
        } catch (recError) {
          console.error(`⚠️ Recommendation error [S${sessionId}]:`, recError);
          addLog(sessionId, `⚠️ Using default options`);
          updateSessionStep(sessionId, 'apply-recommendations', { completed: true, inProgress: false });
        }

        // ======== STEP 3: GENERATE IMAGE ========
        console.log(`🎨 [S${sessionId}] Step 3: Generate Image`);
        updateSessionStep(sessionId, 'generate-image', { inProgress: true });
        addLog(sessionId, 'Building image prompt...');

        let generatedImage = null;
        try {
          // Generate image prompt using templates (with fallback)
          const imagePrompt = await generateImagePromptFromTemplate(
            useCase,
            productFocus,
            recommendedOptions,
            sessionId,
            addLog
          );

          addLog(sessionId, 'Calling image generation...');

          const imageResponse = await browserAutomationAPI.generateBrowserOnly(
            imagePrompt,
            {
              generationProvider: imageProvider,
              imageGenProvider: imageProvider,
              characterImageBase64: charBase64,
              productImageBase64: prodBase64,
              aspectRatio,
              imageCount: DESIRED_OUTPUT_COUNT,
              grokConversationId: analysisResult?.grokConversationId,
              characterDescription: analysisResult?.characterDescription,
            }
          );

          if (imageResponse.success || imageResponse.images?.length > 0) {
            generatedImage = imageResponse.images?.[0] || imageResponse.image;
            if (generatedImage) {
              setSessions(prev => prev.map(sess => {
                if (sess.id === sessionId) {
                  return { ...sess, image: generatedImage };
                }
                return sess;
              }));
              addLog(sessionId, '✓ Image generated successfully');
              updateSessionStep(sessionId, 'generate-image', { completed: true, inProgress: false });
            } else {
              throw new Error('No image URL in response');
            }
          } else {
            throw new Error('Image generation failed');
          }
        } catch (imageError) {
          console.error(`❌ Image generation error [S${sessionId}]:`, imageError);
          addLog(sessionId, `❌ Image generation failed: ${imageError.message}`);
          updateSessionStep(sessionId, 'generate-image', { error: imageError.message, inProgress: false });
          throw imageError;
        }

        // ======== STEP 4: GENERATE VIDEOS ========
        console.log(`🎬 [S${sessionId}] Step 4: Generate Videos`);
        updateSessionStep(sessionId, 'generate-videos', { inProgress: true });

        // Get video settings from state
        const scenario = getScenarioByValue(videoScenario);
        const maxPerVideo = VIDEO_PROVIDER_LIMITS[videoProvider]?.maxDurationPerVideo || 10;
        const videosCount = calculateVideoCount(videoProvider, videoDuration);
        const videos = [];

        addLog(sessionId, `📹 Video settings: ${videoDuration}s total, ${videosCount} × ${maxPerVideo}s clips`);
        addLog(sessionId, `Scenario: ${scenario?.label || 'Unknown'} (${scenario?.description || ''})`);

        for (let v = 0; v < videosCount; v++) {
          try {
            addLog(sessionId, `Generating video ${v + 1}/${videosCount}...`);

            // Use scenario's script template for video prompts
            let videoPrompt = '';
            
            if (scenario && scenario.scriptTemplate && scenario.scriptTemplate[v]) {
              // Use template from scenario
              videoPrompt = scenario.scriptTemplate[v];
              addLog(sessionId, `Using scenario template: "${videoPrompt}"`);
            } else {
              // Fallback: Generate prompt using template service
              videoPrompt = await generateVideoPromptFromTemplate(
                useCase,
                productFocus,
                recommendedOptions,
                videoDuration,
                sessionId,
                addLog
              );
            }

            // Generate video with proper settings
            const videoResponse = await browserAutomationAPI.generateVideoWithProvider({
              videoProvider,
              prompt: videoPrompt,
              duration: videoDuration,
              quality: 'high',
              aspectRatio,
              characterImageBase64: charBase64,
              productImageBase64: prodBase64,
            });

            const videoUrl = videoResponse?.videoUrl || videoResponse?.url;
            if (videoUrl) {
              videos.push(videoUrl);
              setSessions(prev => prev.map(sess => {
                if (sess.id === sessionId) {
                  return { ...sess, videos: [...videos] };
                }
                return sess;
              }));
              addLog(sessionId, `✓ Video ${v + 1}/${videosCount} generated`);
            } else {
              throw new Error('No video URL in response');
            }
          } catch (videoError) {
            console.error(`⚠️ Video ${v + 1} error [S${sessionId}]:`, videoError);
            addLog(sessionId, `⚠️ Video ${v + 1}: ${videoError.message}`);
            videos.push(null);
          }
        }

        // Mark session as complete
        updateSessionStep(sessionId, 'generate-videos', { completed: true, inProgress: false });
        setSessions(prev => prev.map(sess => {
          if (sess.id === sessionId) {
            return { ...sess, completed: true };
          }
          return sess;
        }));
        addLog(sessionId, '✅ Session completed!');

      } catch (error) {
        console.error(`💥 Session #${sessionId} failed:`, error);
        setSessions(prev => prev.map(sess => {
          if (sess.id === sessionId) {
            return { ...sess, error: error.message, completed: false };
          }
          return sess;
        }));
      }
    }

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold">1-Click Creator</h1>
              <p className="text-sm text-gray-400">Step-by-step: Analyze → Recommend → Generate</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/generate')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT SIDEBAR - Settings */}
          <div className="col-span-3 space-y-4">
            {/* Use Case */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Use Case
              </h3>
              <select
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3 py-2 rounded bg-gray-700 text-gray-200 text-sm border border-gray-600 focus:border-amber-500 outline-none disabled:opacity-50"
              >
                {USE_CASES.map(uc => (
                  <option key={uc.value} value={uc.value}>{uc.label}</option>
                ))}
              </select>
            </div>

            {/* Product Focus */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Product Focus
              </h3>
              <select
                value={productFocus}
                onChange={(e) => setProductFocus(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3 py-2 rounded bg-gray-700 text-gray-200 text-sm border border-gray-600 focus:border-amber-500 outline-none disabled:opacity-50"
              >
                {FOCUS_OPTIONS.map(fo => (
                  <option key={fo.value} value={fo.value}>{fo.label}</option>
                ))}
              </select>
            </div>

            {/* Analysis Provider Info */}
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Analysis (Auto)
              </h3>
              <p className="text-xs text-blue-200">
                🤖 Always uses <span className="font-bold">Grok.com</span> for image analysis
              </p>
            </div>

            {/* Image Provider */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Image Provider
              </h3>
              <div className="space-y-2">
                {IMAGE_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setImageProvider(p.id)}
                    disabled={isGenerating}
                    className={`w-full p-2 rounded text-sm transition-all disabled:opacity-50 ${
                      imageProvider === p.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Provider */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <Video className="w-4 h-4" />
                Video Provider
              </h3>
              <div className="space-y-2">
                {VIDEO_PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setVideoProvider(p.id)}
                    disabled={isGenerating}
                    className={`w-full p-2 rounded text-sm transition-all disabled:opacity-50 ${
                      videoProvider === p.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">Quantity (Sessions)</h3>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map(q => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    disabled={isGenerating}
                    className={`p-2 rounded text-sm font-semibold transition-all disabled:opacity-50 ${
                      quantity === q
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">Aspect Ratio</h3>
              <div className="space-y-2">
                {ASPECT_RATIOS.map(ar => (
                  <button
                    key={ar.id}
                    onClick={() => setAspectRatio(ar.id)}
                    disabled={isGenerating}
                    className={`w-full p-2 rounded text-sm transition-all disabled:opacity-50 ${
                      aspectRatio === ar.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Settings Info (Collapsed by default) */}
            <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                Video Generation (Auto)
              </h3>
              <p className="text-xs text-purple-200 mb-2">
                {videoDuration}s video with scenario: <span className="font-bold">{VIDEO_SCENARIOS.find(s => s.value === videoScenario)?.label}</span>
              </p>
              <p className="text-xs text-purple-200">
                {calculateVideoCount(videoProvider, videoDuration)} clips via <span className="font-bold">{VIDEO_PROVIDERS.find(p => p.id === videoProvider)?.label}</span>
              </p>
            </div>
          </div>

          {/* CENTER - Main Content */}
          <div className="col-span-9 space-y-4">
            {/* Upload Section */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Images (Step 1/2)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Character Image */}
                <div
                  onClick={() => !isGenerating && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500 transition-colors disabled:opacity-50"
                >
                  {characterImage ? (
                    <img src={characterImage} alt="Character" className="w-full h-40 object-cover rounded" />
                  ) : (
                    <div className="py-8">
                      <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400">Character Image</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isGenerating}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => setCharacterImage(evt.target?.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                {/* Product Image */}
                <div
                  onClick={() => {
                    if (isGenerating) return;
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => setProductImage(evt.target?.result);
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500 transition-colors disabled:opacity-50"
                >
                  {productImage ? (
                    <img src={productImage} alt="Product" className="w-full h-40 object-cover rounded" />
                  ) : (
                    <div className="py-8">
                      <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400">Product Image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sessions Display */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Generation Sessions ({sessions.length})
              </h3>
              
              {sessions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Sessions will appear here after you start</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {sessions.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      isGenerating={isGenerating}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={handleOneClickGeneration}
              disabled={!characterImage || !productImage || isGenerating}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating... ({sessions.filter(s => s.completed).length}/{quantity})
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  1-Click Generation (Step 2/2)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
