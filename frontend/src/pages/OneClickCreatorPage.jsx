/**
 * 1-Click Creator Page
 * Full step-by-step workflow: Upload → Auto-Analyze → Apply Recommendations → Generate Images → Generate Videos
 * With per-session management and real-time progress tracking
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload, Sparkles, Rocket, Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Play, Video, X, Settings, Image as ImageIcon,
  AlertCircle, CheckCircle, Clock, FileText, Target, Wand2, Volume2, Mic, Package, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, unifiedFlowAPI, browserAutomationAPI, promptsAPI, aiOptionsAPI } from '../services/api';
import promptTemplateService from '../services/promptTemplateService';
import { buildLanguageAwarePrompt } from '../services/languageAwarePromptService.js';
import GalleryPicker from '../components/GalleryPicker';
import CharacterSelectorModal from '../components/CharacterSelectorModal';
import SessionLogModal from '../components/SessionLogModal';
import AffiliateSessionWorkspace, { SessionStatusPill, getAffiliateSessionRunningStatus, getAffiliateSessionStepStatus } from '../components/AffiliateSessionWorkspace';
import VideoPromptEnhancedWithChatGPT from '../components/VideoPromptEnhancedWithChatGPT';
import ScenePickerModal from '../components/ScenePickerModal';
import PageHeaderBar from '../components/PageHeaderBar';
import { 
  calculateVideoCount, 
  VIDEO_PROVIDER_LIMITS, 
  getMaxDurationForProvider,
  VIDEO_SCENARIOS,
  VIDEO_DURATIONS,
  getScenarioByValue
} from '../constants/videoGeneration';
import { GOOGLE_VOICES } from '../constants/voiceOverOptions';
import { VIDEO_SCRIPT_TEMPLATES } from '../constants/videoScriptTemplates';

/**
 * Map voice gender and pace to actual Gemini TTS voice name
 * @param {string} gender - 'male' or 'female'
 * @param {string} pace - 'slow', 'normal', or 'fast'
 * @returns {string} Lowercase voice name for API (e.g., 'puck', 'aoede')
 */
function getVoiceNameFromGenderPace(gender, pace) {
  const voiceMap = {
    female: {
      slow: 'enceladus',    // Breathy, soft - slower pacing
      normal: 'aoede',      // Breezy - neutral pace
      fast: 'fenrir',       // Excitable - fast-paced
    },
    male: {
      slow: 'charon',       // Informative - slower/authoritative
      normal: 'kore',       // Firm - balanced pace
      fast: 'puck',         // Upbeat - energetic/fast
    }
  };
  
  return voiceMap[gender]?.[pace] || 'aoede'; // Fallback to aoede
}

// Constants - Use cases and focus options from ImageGenerationPage
// Note: Labels will be set dynamically using translations in the component
const USE_CASES = [
  { value: 'change-clothes', labelKey: 'oneClickCreator.scenarios.changeClothes', description: 'Mặc sản phẩm lên người mẫu' },
  { value: 'character-holding-product', labelKey: 'oneClickCreator.scenarios.characterHoldingProduct', description: 'Nhân vật cầm sản phẩm trên tay' },
  { value: 'affiliate-video-tiktok', labelKey: 'oneClickCreator.scenarios.affiliateVideoTikTok', description: 'Video Affiliate cho TikTok 9:16 (2 ảnh + Voiceover + Hashtag)' },
  { value: 'ecommerce-product', labelKey: 'oneClickCreator.scenarios.ecommerceProduct', description: 'Ảnh sản phẩm thương mại' },
  { value: 'social-media', labelKey: 'oneClickCreator.scenarios.socialMedia', description: 'Bài đăng mạng xã hội' },
  { value: 'fashion-editorial', labelKey: 'oneClickCreator.scenarios.fashionEditorial', description: 'Bài báo thời trang chuyên nghiệp' },
];

const FOCUS_OPTIONS = [
  { value: 'full-outfit', labelKey: 'oneClickCreator.focusOptions.fullOutfit', description: 'Toàn bộ trang phục' },
  { value: 'top', labelKey: 'oneClickCreator.focusOptions.top', description: 'Áo' },
  { value: 'bottom', labelKey: 'oneClickCreator.focusOptions.bottom', description: 'Quần/váy' },
  { value: 'shoes', labelKey: 'oneClickCreator.focusOptions.shoes', description: 'Giày' },
];

const IMAGE_PROVIDERS = [
  { id: 'grok', label: 'Grok' },
  { id: 'google-flow', label: 'Google Flow' },
  { id: 'bfl', label: 'BFL FLUX' },
];

const VIDEO_PROVIDERS = [
  { id: 'grok', label: 'Grok' },
  { id: 'google-flow', label: 'Google Flow' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
];

// 📊 Image Generation Configuration
const DESIRED_OUTPUT_COUNT = 1;  // 💫 Default: Generate 1 session per click (user can increase in UI)
const DEFAULT_SCENE_VALUE = 'linhphap-tryon-room';

function ProviderIcon({ providerId }) {
  const glyphClass = 'h-[18px] w-[18px]';

  if (providerId === 'google-flow') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={glyphClass}>
          <path d="M5 12c0-3.5 2.4-6 6-6 1.8 0 3.3.6 4.5 1.8" />
          <path d="M19 12c0 3.5-2.4 6-6 6-1.8 0-3.3-.6-4.5-1.8" />
          <path d="M14.5 5.5h2.8v2.8" />
          <path d="M9.5 18.5H6.7v-2.8" />
        </svg>
      </span>
    );
  }

  if (providerId === 'bfl') {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={glyphClass}>
          <path d="M12 3.5 5 7.5v8.8l7 4 7-4V7.5l-7-4Z" />
          <path d="m8.5 9.2 3.5 2 3.5-2" />
          <path d="M12 11.2v5.6" />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={glyphClass}>
        <path d="M7 5h6l4 4v10H7z" />
        <path d="M13 5v4h4" />
        <path d="M9.25 15.5c.9-1.7 1.95-2.55 3.15-2.55 1.27 0 2.38.85 3.35 2.55" />
        <circle cx="10.2" cy="10.2" r="1" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}


// Workflow steps - will be set dynamically in component using translations
let WORKFLOW_STEPS = [
  { id: 'analyze', name: 'Analyze', icon: Sparkles },
  { id: 'apply-recommendations', name: 'Apply Recommendations', icon: Wand2 },
  { id: 'generate-image', name: 'Generate Image', icon: ImageIcon },
  { id: 'generate-videos', name: 'Generate Videos', icon: Video },
];

// TikTok Affiliate Specific Constants
const TIKTOK_DURATIONS = [10, 15, 20, 30, 45, 60];
const VOICE_OPTIONS = [
  { labelKey: 'oneClickCreator.voiceOptions.femaleSlow', value: 'female-slow' },
  { labelKey: 'oneClickCreator.voiceOptions.femaleNormal', value: 'female-normal' },
  { labelKey: 'oneClickCreator.voiceOptions.femaleFast', value: 'female-fast' },
  { labelKey: 'oneClickCreator.voiceOptions.maleSlow', value: 'male-slow' },
  { labelKey: 'oneClickCreator.voiceOptions.maleNormal', value: 'male-normal' },
  { labelKey: 'oneClickCreator.voiceOptions.maleFast', value: 'male-fast' },
];

let WORKFLOW_STEPS_AFFILIATE_TIKTOK = [
  { id: 'analyze', name: 'Analyze', icon: Sparkles },
  { id: 'apply-recommendations', name: 'Apply Recommendations', icon: Wand2 },
  { id: 'tiktok-options', name: 'Select Settings', icon: Volume2 },
  { id: 'generate-images-parallel', name: 'Generate 2 Images', icon: ImageIcon },
  { id: 'deep-analysis', name: 'Deep Analysis', icon: Wand2 },
  { id: 'generate-video', name: 'Generate Video', icon: Video },
  { id: 'generate-voiceover', name: 'Generate Voiceover', icon: Mic },
  { id: 'finalize', name: 'Finalize Package', icon: Package },
];

// ============================================================
// HELPER FUNCTIONS FOR TEMPLATE-BASED PROMPT GENERATION
// ============================================================

// ============================================================
// HELPER: Filter categories based on product focus
// ============================================================
/**
 * Get visible categories based on product focus
 * Reused from ImageGenerationPage for consistency
 */
const getVisibleCategories = (focus = 'full-outfit') => {
  const baseCategories = ['scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle', 'shotType', 'bodyPose'];
  
  if (focus === 'full-outfit') {
    return [...baseCategories, 'tops', 'bottoms', 'shoes', 'outerwear', 'accessories'];
  } else if (focus === 'top') {
    return [...baseCategories, 'tops', 'accessories'];
  } else if (focus === 'bottom') {
    return [...baseCategories, 'bottoms', 'shoes'];
  } else if (focus === 'shoes') {
    return [...baseCategories, 'shoes'];
  } else if (focus === 'accessories') {
    return [...baseCategories, 'accessories'];
  } else {
    return baseCategories;
  }
};

/**
 * Map OneClick use cases to template scenarios
 */
const mapUseCaseToTemplateUseCase = (useCase) => {
  const mapping = {
    'change-clothes': 'outfit-change',
    'character-holding-product': 'product-showcase',
    'ecommerce-product': 'product-showcase',
    'social-media': 'fashion-model',
    'fashion-editorial': 'product-photography'
  };
  return mapping[useCase] || 'outfit-change';
};

/**
 * Generate image prompt using language-aware service
 * Supports Vietnamese and English based on current UI language
 * Falls back to template service if language-aware fails
 */
async function generateImagePromptFromTemplate(useCase, productFocus, recommendedOptions, language, sessionId, addLog) {
  try {
    addLog(sessionId, `📝 Building prompt in ${language === 'vi' ? 'Vietnamese' : 'English'}...`);
    
    // Try language-aware prompt builder first
    const analysis = {
      character: {},
      product: {
        type: productFocus || 'full outfit',
        category: 'clothing'
      }
    };

    const selectedOptions = {
      scene: recommendedOptions.sceneLockedPrompt || recommendedOptions.scene || 'linhphap-tryon-room',
      lighting: recommendedOptions.lighting || 'soft-diffused',
      mood: recommendedOptions.mood || 'confident',
      style: recommendedOptions.style || 'minimalist',
      colorPalette: recommendedOptions.colorPalette || 'neutral',
      cameraAngle: recommendedOptions.cameraAngle || 'eye-level',
    };

    try {
      const response = await buildLanguageAwarePrompt({
        analysis,
        selectedOptions,
        language: language || 'en',
        useCase: useCase || 'change-clothes'
      });

      if (response?.success || response?.positive) {
        const prompt = response.positive || response.data?.positive || '';
        addLog(sessionId, `✓ Image prompt generated (${language}, ${prompt.length} chars)`);
        // 💫 NEW: Return entire response to include sceneReferenceImage
        if (response.sceneReferenceImage) {
          addLog(sessionId, `✓ Scene reference image included`);
        }
        return {
          positive: prompt,
          negative: response.negative || '',
          sceneReferenceImage: response.sceneReferenceImage || null
        };
      }
    } catch (langError) {
      console.warn('Language-aware prompt builder failed, trying template service:', langError);
      addLog(sessionId, '⚠️  Language-aware builder failed, using template service...');
    }

    // Fallback to template service
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
      scene: recommendedOptions.sceneLockedPrompt || recommendedOptions.scene || 'linhphap-tryon-room',
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
    // 💫 NEW: Return object structure for consistency
    return {
      positive: prompt,
      negative: '',
      sceneReferenceImage: null
    };
  } catch (templateError) {
    console.warn('Template-based generation failed, using fallback:', templateError);
    // Fallback to hardcoded prompt
    const imagePrompt = `Professional fashion photo. Character wearing ${productFocus || 'full outfit'}. ` +
      `Scene: ${recommendedOptions.sceneLockedPrompt || recommendedOptions.scene}. Lighting: ${recommendedOptions.lighting}. ` +
      `Mood: ${recommendedOptions.mood}. Style: ${recommendedOptions.style}. ` +
      `Colors: ${recommendedOptions.colorPalette}. Camera: ${recommendedOptions.cameraAngle}. ` +
      `Use case: ${useCase}. High quality, detailed, professional.`;
    // 💫 NEW: Return object structure for consistency
    return {
      positive: imagePrompt,
      negative: '',
      sceneReferenceImage: null
    };
  }
}

/**
 * Generate video prompt using templates
 * Falls back to hardcoded prompt if templates not available
 */
async function generateVideoPromptFromTemplate(useCase, productFocus, recommendedOptions, videoDuration, language, sessionId, addLog) {
  try {
    // Try language-aware prompt generation first (Priority 1)
    try {
      addLog(sessionId, `📝 Building video prompt in ${language === 'vi' ? 'Vietnamese' : 'English'}...`);
      
      const response = await buildLanguageAwarePrompt({
        analysis: { 
          character: {}, 
          product: { type: productFocus, category: 'clothing' } 
        },
        selectedOptions: { 
          scene: recommendedOptions.sceneLockedPrompt || recommendedOptions.scene || 'linhphap-tryon-room',
          lighting: 'professional',
          mood: recommendedOptions.mood || 'confident',
          style: recommendedOptions.style || 'minimalist',
          colorPalette: 'vibrant',
          cameraAngle: recommendedOptions.cameraAngle || 'eye-level',
          duration: videoDuration
        },
        language: language || 'en',
        useCase: 'video-generation'
      });

      if (response?.success || response?.positive) {
        const prompt = response.positive || response.data?.positive || '';
        addLog(sessionId, `✓ Video prompt generated (${language}, ${prompt.length} chars)`);
        return prompt;
      }
    } catch (langError) {
      console.warn('Language-aware video prompt generation failed, trying template...', langError);
    }

    // Priority 2: Try template service
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
    // Priority 3: Fallback to hardcoded prompt
    const videoPrompt = `Professional fashion video. Model wearing ${productFocus}. ` +
      `Duration: ${videoDuration}s. Scenario: Fashion shoot. ` +
      `Style: ${recommendedOptions.style}. Mood: ${recommendedOptions.mood}. ` +
      `Camera: ${recommendedOptions.cameraAngle}. High quality professional video.`;
    addLog(sessionId, `✓ Video prompt generated (fallback, ${videoPrompt.length} chars)`);
    return videoPrompt;
  }
}

/**
 * Helper: Get workflow steps based on use case (used in SessionRow)
 * Note: The main component uses a local function that applies translations
 */
const getWorkflowStepsRaw = (useCase) => {
  if (useCase === 'affiliate-video-tiktok') {
    return WORKFLOW_STEPS_AFFILIATE_TIKTOK;
  }
  return WORKFLOW_STEPS;
};

const ONE_CLICK_COMPACT_LAYOUT_BREAKPOINT = 1150;
const ONE_CLICK_COMPACT_SETTINGS_WIDTH = 216;
const ONE_CLICK_DESKTOP_SETTINGS_WIDTH = 408;

function useAdaptiveOneClickLayout(breakpoint = ONE_CLICK_COMPACT_LAYOUT_BREAKPOINT) {
  const containerRef = useRef(null);
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  useEffect(() => {
    const updateLayoutMode = () => {
      setIsCompactLayout(window.innerWidth < breakpoint);
    };

    updateLayoutMode();
    window.addEventListener('resize', updateLayoutMode);
    return () => window.removeEventListener('resize', updateLayoutMode);
  }, [breakpoint]);

  return { containerRef, isCompactLayout };
}


// Session component
function SessionRow({ session, isGenerating, onCancel, onViewLog, t }) {
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState(false);
  
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
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'inProgress':
        return <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />;
      default:
        return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  // Determine if loading based on step status
  const isLoading = session.steps?.some(s => s.inProgress);
  
  // Animation pulse class for loading state
  const loadingClass = isLoading ? 'animate-pulse' : '';

  return (
    <div className="border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 to-gray-900/50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/80 px-3 py-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-200 flex items-center gap-2">
          <span className="text-gray-500">Session</span> #{session.id}
          {session.completed && <CheckCircle className="w-3 h-3 text-green-500" />}
          {session.error && <AlertCircle className="w-3 h-3 text-red-500" />}
        </h4>
        {isLoading && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full animate-pulse">generating...</span>}
      </div>

      {session.manualAction && (
        <div className="border-b border-amber-700/40 bg-amber-950/30 px-3 py-2">
          <p className="text-[11px] font-medium text-amber-200">Manual action required</p>
          <p className="mt-1 text-[10px] text-amber-100/80">{session.manualAction.message}</p>
          <p className="mt-1 text-[10px] text-amber-300/80">Resolve it in the opened ChatGPT browser window. The flow will keep polling and resume when verification is cleared.</p>
        </div>
      )}

      {/* Main Content - Split Layout */}
      <div className="flex p-2 gap-2">
        {/* Left: Image Strip */}
        <div className="flex flex-col gap-1.5 min-w-fit">
          {/* Character Image */}
          <div className="w-16 h-16 rounded-lg border border-gray-700/50 bg-gray-950/70 overflow-hidden flex items-center justify-center flex-shrink-0">
            {session.step2Images?.wearing ? (
              <img src={session.step2Images.wearing} alt="Wearing" className="w-full h-full object-cover" />
            ) : (
              <div className={`${loadingClass} w-full h-full bg-gray-800/60 flex items-center justify-center`}>
                <ImageIcon className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>

          {/* Product/Holding Image */}
          <div className="w-16 h-16 rounded-lg border border-gray-700/50 bg-gray-950/70 overflow-hidden flex items-center justify-center flex-shrink-0">
            {session.step2Images?.holding ? (
              <img src={session.step2Images.holding} alt="Holding" className="w-full h-full object-cover" />
            ) : (
              <div className={`${loadingClass} w-full h-full bg-gray-800/60 flex items-center justify-center`}>
                <Package className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>

          {/* Video Preview */}
          <div className="w-16 h-16 rounded-lg border border-gray-700/50 bg-gray-950/70 overflow-hidden flex items-center justify-center flex-shrink-0">
            {session.videos?.[0] ? (
              <video src={session.videos[0]} className="w-full h-full object-cover" />
            ) : (
              <div className={`${loadingClass} w-full h-full bg-gray-800/60 flex items-center justify-center`}>
                <Video className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        </div>

        {/* Right: Step Status Grid */}
        <div className="flex-1 grid grid-cols-2 gap-1.5 min-w-0">
          {/* Step 1: Analysis */}
          <div className={`text-center p-2 rounded-lg border ${getStepStatus('analyze') === 'completed' ? 'border-green-700/50 bg-green-900/20' : 'border-gray-700/50 bg-gray-800/30'} ${loadingClass && getStepStatus('analyze') === 'inProgress' ? 'animate-pulse border-amber-600/50 bg-amber-900/20' : ''}`}>
            <div className="flex justify-center mb-1">{getStepIcon(getStepStatus('analyze'))}</div>
            <p className="text-[10px] text-gray-400 font-medium">Analyze</p>
          </div>

          {/* Step 2: Generate Images */}
          <div className={`text-center p-2 rounded-lg border ${getStepStatus('generate-images-parallel') === 'completed' ? 'border-green-700/50 bg-green-900/20' : 'border-gray-700/50 bg-gray-800/30'} ${loadingClass && getStepStatus('generate-images-parallel') === 'inProgress' ? 'animate-pulse border-amber-600/50 bg-amber-900/20' : ''}`}>
            <div className="flex justify-center mb-1">{getStepIcon(getStepStatus('generate-images-parallel'))}</div>
            <p className="text-[10px] text-gray-400 font-medium">Images</p>
          </div>

          {/* Step 3: Deep Analysis */}
          <div className={`text-center p-2 rounded-lg border ${getStepStatus('deep-analysis') === 'completed' ? 'border-green-700/50 bg-green-900/20' : 'border-gray-700/50 bg-gray-800/30'} ${loadingClass && getStepStatus('deep-analysis') === 'inProgress' ? 'animate-pulse border-amber-600/50 bg-amber-900/20' : ''}`}>
            <div className="flex justify-center mb-1">{getStepIcon(getStepStatus('deep-analysis'))}</div>
            <p className="text-[10px] text-gray-400 font-medium">Analysis</p>
          </div>

          {/* Step 4: Generate Video */}
          <div className={`text-center p-2 rounded-lg border ${getStepStatus('generate-video') === 'completed' ? 'border-green-700/50 bg-green-900/20' : 'border-gray-700/50 bg-gray-800/30'} ${loadingClass && getStepStatus('generate-video') === 'inProgress' ? 'animate-pulse border-amber-600/50 bg-amber-900/20' : ''}`}>
            <div className="flex justify-center mb-1">{getStepIcon(getStepStatus('generate-video'))}</div>
            <p className="text-[10px] text-gray-400 font-medium">Video</p>
          </div>

          {/* Step 5: Voiceover */}
          <div className={`text-center p-2 rounded-lg border ${getStepStatus('generate-voiceover') === 'completed' ? 'border-green-700/50 bg-green-900/20' : 'border-gray-700/50 bg-gray-800/30'} ${loadingClass && getStepStatus('generate-voiceover') === 'inProgress' ? 'animate-pulse border-amber-600/50 bg-amber-900/20' : ''}`}>
            <div className="flex justify-center mb-1">{getStepIcon(getStepStatus('generate-voiceover'))}</div>
            <p className="text-[10px] text-gray-400 font-medium">Voice</p>
          </div>

          {/* Finalize */}
          <div className={`text-center p-2 rounded-lg border ${getStepStatus('finalize') === 'completed' ? 'border-green-700/50 bg-green-900/20' : 'border-gray-700/50 bg-gray-800/30'} ${loadingClass && getStepStatus('finalize') === 'inProgress' ? 'animate-pulse border-amber-600/50 bg-amber-900/20' : ''}`}>
            <div className="flex justify-center mb-1">{getStepIcon(getStepStatus('finalize'))}</div>
            <p className="text-[10px] text-gray-400 font-medium">Finalize</p>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {(session.step1Prompts || session.analysis || sessionVideos.length > 0 || getSessionFrameLibrary(session).length > 0) && (
        <div className="border-t border-gray-700/50">
          {/* Prompts Section */}
          {session.step1Prompts && (
            <>
              <button
                onClick={() => setExpandedPrompts(!expandedPrompts)}
                className="w-full px-3 py-2 text-left text-xs text-gray-400 hover:text-gray-300 font-medium flex items-center justify-between hover:bg-gray-800/30 transition-colors"
              >
                <span>📝 Prompts & Script</span>
                {expandedPrompts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {expandedPrompts && (
                <div className="px-3 py-2 space-y-2 bg-gray-900/20 max-h-48 overflow-y-auto text-[10px]">
                  {session.step1Prompts?.wearing && (
                    <details className="bg-gray-800/50 rounded p-2 border border-gray-700/30">
                      <summary className="text-gray-400 cursor-pointer font-medium mb-1">Wearing Prompt</summary>
                      <p className="text-gray-500 whitespace-pre-wrap">{session.step1Prompts.wearing}</p>
                    </details>
                  )}
                  {session.step1Prompts?.holding && (
                    <details className="bg-gray-800/50 rounded p-2 border border-gray-700/30">
                      <summary className="text-gray-400 cursor-pointer font-medium mb-1">Holding Prompt</summary>
                      <p className="text-gray-500 whitespace-pre-wrap">{session.step1Prompts.holding}</p>
                    </details>
                  )}
                  {sessionSegmentScripts.length > 0 && (
                    <details className="bg-gray-800/50 rounded p-2 border border-gray-700/30">
                      <summary className="text-gray-400 cursor-pointer font-medium mb-1">Video Scripts</summary>
                      <div className="space-y-1">
                        {sessionSegmentScripts.map((seg, idx) => (
                          <p key={idx} className="text-gray-500"><span className="text-amber-400">[{seg.duration}s]</span> {seg.script}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </>
          )}

          {/* Hashtags */}
          {session.analysis?.hashtags?.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-700/50 flex flex-wrap gap-1">
              {session.analysis.hashtags.map((tag, idx) => (
                <span key={idx} className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded border border-green-700/50">
                  #{String(tag).replace('#', '')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Actions */}
      <div className="border-t border-gray-700/50 bg-gray-900/50 px-3 py-2 flex gap-1 items-center">
        <button
          onClick={() => onViewLog && onViewLog(session.flowId)}
          className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium bg-blue-600/40 text-blue-300 border border-blue-700/50 hover:bg-blue-600/60 transition-colors"
        >
          <Database className="w-3 h-3" />
          Details
        </button>
        <button
          onClick={() => setExpandedLogs(!expandedLogs)}
          className="flex-1 flex items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium bg-gray-700/40 text-gray-300 border border-gray-600/50 hover:bg-gray-700/60 transition-colors"
        >
          <FileText className="w-3 h-3" />
          Logs ({session.logs?.length || 0})
        </button>
      </div>

      {/* Logs View */}
      {expandedLogs && (
        <div className="max-h-32 overflow-y-auto text-[9px] bg-black/30 border-t border-gray-700/50 px-3 py-2 space-y-0.5 font-mono">
          {session.logs?.length > 0 ? (
            session.logs.map((log, idx) => (
              <div key={idx} className="text-gray-500">
                <span className="text-gray-700">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          ) : (
            <p className="text-gray-600 italic">No logs yet</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function OneClickCreatorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { containerRef: workspaceRef, isCompactLayout } = useAdaptiveOneClickLayout();

  const sidebarCardClass = 'studio-card-shell rounded-[0.75rem] p-2.5';
  const accentCardClass = 'studio-card-shell rounded-[0.75rem] p-2.5';
  const stepUploadCardClass = 'studio-card-shell flex h-full flex-col rounded-[0.75rem] p-2.5';
  const stepUploadDropzoneClass = 'studio-dropzone group relative flex items-center justify-center overflow-hidden rounded-[0.75rem] border p-2.5 text-center transition';
  const stepUploadActionClass = 'apple-option-chip inline-flex items-center justify-center gap-2 rounded-[0.625rem] px-2.5 py-2 text-xs font-semibold text-slate-700 transition disabled:opacity-50';
  const sessionShellClass = 'studio-card-shell flex min-h-0 flex-1 flex-col rounded-[0.875rem] p-3';
  const optionButtonBaseClass = 'apple-option-chip w-full rounded-[0.65rem] px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const providerButtonClass = 'apple-option-chip flex w-full items-center gap-2 rounded-[0.6rem] px-2 py-1 text-left text-[10px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const optionButtonIdleClass = 'text-slate-300';
  const selectedOptionClass = {
    amber: 'apple-option-chip-warm apple-option-chip-selected',
    cyan: 'apple-option-chip-cool apple-option-chip-selected',
    violet: 'apple-option-chip-violet apple-option-chip-selected',
    emerald: 'apple-option-chip-cool apple-option-chip-selected',
    sky: 'apple-option-chip-cool apple-option-chip-selected',
    pink: 'apple-option-chip-violet apple-option-chip-selected',
  };

  const getOptionButtonClass = (isSelected, selectedClass) =>
    `${optionButtonBaseClass} ${isSelected ? selectedClass : optionButtonIdleClass}`;

  const getProviderButtonClass = (isSelected, selectedClass) =>
    `${providerButtonClass} ${isSelected ? selectedClass : optionButtonIdleClass}`;

  const getSelectCardClass = () => {
    return `${sidebarCardClass} transition-all duration-300 hover:shadow-[0_8px_24px_rgba(51,65,85,0.10)]`;
  };

  const selectInputClass = 'w-full appearance-none rounded-[0.75rem] border border-white/40 bg-white/10 px-3 py-2 pr-10 text-xs font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_18px_rgba(100,156,198,0.08)] outline-none transition-all duration-200 hover:bg-white/15 focus:border-sky-300/60 disabled:cursor-not-allowed disabled:opacity-50';

  const getUseCaseLabel = (value) => {
    const option = USE_CASES.find((item) => item.value === value);
    return option ? t(option.labelKey) : value;
  };

  const getFocusLabel = (value) => {
    const option = FOCUS_OPTIONS.find((item) => item.value === value);
    return option ? t(option.labelKey) : value;
  };

  // Get translated workflow steps
  const getWorkflowSteps = () => {
    const workflowMap = {
      'analyze': 'analyze',
      'apply-recommendations': 'applyRecommendations',
      'generate-image': 'generateImage',
      'generate-videos': 'generateVideos',
      'tiktok-options': 'selectSettings',
      'generate-images-parallel': 'generate2Images',
      'deep-analysis': 'deepAnalysis',
      'generate-video': 'generateVideo',
      'generate-voiceover': 'generateVoiceover',
      'finalize': 'finalizePackage'
    };
    
    if (useCase === 'affiliate-video-tiktok') {
      return WORKFLOW_STEPS_AFFILIATE_TIKTOK.map(step => ({
        ...step,
        name: t(`oneClickCreator.workflow.${workflowMap[step.id] || step.id}`) || step.name
      }));
    }
    return WORKFLOW_STEPS.map(step => ({
      ...step,
      name: t(`oneClickCreator.workflow.${workflowMap[step.id] || step.id}`) || step.name
    }));
  };

  // Modal States
  const [showSessionLogModal, setShowSessionLogModal] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState(null);

  // Upload states
  const [characterImage, setCharacterImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [selectedCharacterProfile, setSelectedCharacterProfile] = useState(null);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [sceneImage, setSceneImage] = useState(null); // 💫 NEW: Optional scene reference image
  const fileInputRef = useRef(null);
  const productFileInputRef = useRef(null);
  const sceneFileInputRef = useRef(null); // 💫 NEW: Ref for scene file input

  // Gallery Picker State
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryPickerFor, setGalleryPickerFor] = useState(null); // 'character' or 'product'
  
  // 📸 Image cache - store fetched images locally to avoid re-fetching
  const imageCacheRef = useRef(new Map());
  
  // 🎯 Track image source: gallery or file upload (to skip Drive upload for gallery images)
  const [imageSource, setImageSource] = useState({ character: 'upload', product: 'upload' }); // 'upload' or 'gallery'

  // Settings
  const [useCase, setUseCase] = useState('affiliate-video-tiktok');
  const [productFocus, setProductFocus] = useState('full-outfit');
  const [imageProvider, setImageProvider] = useState('google-flow');
  const [videoProvider, setVideoProvider] = useState('google-flow');  // Aligned with image provider
  const [videoScenario, setVideoScenario] = useState('product-intro');  // Default scenario
  const [videoDuration, setVideoDuration] = useState(20);  // Default 20 seconds
  const [quantity, setQuantity] = useState(DESIRED_OUTPUT_COUNT);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [isHeadless, setIsHeadless] = useState(true);
  const [useShortPrompt, setUseShortPrompt] = useState(false);
  
  // TikTok Affiliate Specific State (MUST come before useEffect that uses them!)
  const [tiktokVideoDuration, setTiktokVideoDuration] = useState(20);
  const [voiceOption, setVoiceOption] = useState('female-fast');
  const [deepAnalysisResult, setDeepAnalysisResult] = useState(null);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [generatedVoiceover, setGeneratedVoiceover] = useState(null);
  const [suggestedHashtags, setSuggestedHashtags] = useState([]);
  const [tiktokFlowId, setTiktokFlowId] = useState(null);
  const [tiktokScriptTemplate, setTiktokScriptTemplate] = useState('auto');

  // Workflow state
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [resumingSessionId, setResumingSessionId] = useState(null);
  const [resumeRequiredFlows, setResumeRequiredFlows] = useState(() => new Set());
  const [recentAffiliateSessions, setRecentAffiliateSessions] = useState([]);
  const [recentAffiliateSessionsLoading, setRecentAffiliateSessionsLoading] = useState(false);
  const pollingStopsRef = useRef(new Map());
  const [sceneOptions, setSceneOptions] = useState([]);
  const [selectedScene, setSelectedScene] = useState(DEFAULT_SCENE_VALUE);
  const [selectedScenePrompt, setSelectedScenePrompt] = useState('');
  const [sceneImageMode, setSceneImageMode] = useState('auto'); // auto | custom
  const [showScenePicker, setShowScenePicker] = useState(false);

  const isSessionWorkspaceMode = useCase === 'affiliate-video-tiktok' && (isGenerating || sessions.length > 0);
  const shouldUseCompactRailLayout = isCompactLayout || isSessionWorkspaceMode;

  const workspaceGridClass = 'one-click-main-grid relative grid min-h-0 flex-1 gap-3 overflow-hidden';
  const workspaceGridStyle = shouldUseCompactRailLayout
    ? { gridTemplateColumns: `${ONE_CLICK_COMPACT_SETTINGS_WIDTH}px minmax(0, 1fr)` }
    : { gridTemplateColumns: `${ONE_CLICK_DESKTOP_SETTINGS_WIDTH}px minmax(0, 1fr)` };
  const settingsPanelClass = shouldUseCompactRailLayout
      ? 'one-click-settings-panel one-click-settings-panel-compact grid grid-cols-1 content-start gap-1.5 overflow-y-auto pr-0.5 transition-all duration-200'
      : 'one-click-settings-panel grid grid-cols-2 content-start gap-1.5 overflow-y-auto pr-0.5 transition-all duration-200';
  const mainPanelClass = 'generation-content-plain flex h-full min-h-0 min-w-0 flex-col overflow-hidden transition-all duration-200';
  const imageProviderCardClass = sidebarCardClass;
  const hashtagsCardClass = 'studio-card-shell rounded-[0.75rem] p-2.5';


  
  




  useEffect(() => {
    const loadSceneOptions = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/prompt-options/scenes/lock-manager`);
        const data = await response.json();
        if (data?.success) {
          const scenes = data.data || [];
          setSceneOptions(scenes);
          if (scenes.length > 0) {
            const preferredScene = scenes.find(s => s.value === DEFAULT_SCENE_VALUE) || scenes[0];
            setSelectedScene(prev => prev || preferredScene?.value || DEFAULT_SCENE_VALUE);
            setSelectedScenePrompt(prev => prev || preferredScene?.sceneLockedPrompt || preferredScene?.sceneLockedPromptVi || preferredScene?.promptSuggestion || '');
          }
        }

      } catch (error) {
        console.warn('Failed to load scene options:', error.message);
      }
    };
    loadSceneOptions();
  }, []);

  useEffect(() => {
    if (useCase === 'affiliate-video-tiktok') {
      loadRecentAffiliateSessions();
    }
  }, [useCase]);

  // 💫 NEW: Auto-set aspect ratio based on use case
  useEffect(() => {
    if (useCase === 'affiliate-video-tiktok') {
      setAspectRatio('9:16');
      console.log('📐 TikTok use case detected: Setting aspect ratio to 9:16 (vertical)');
    } else {
      setAspectRatio('16:9');
    }
  }, [useCase]);

  const resolveSceneImageDataUrl = async (sceneValue = selectedScene, ratio = aspectRatio) => {
    if (!sceneValue || sceneOptions.length === 0) {
      return null;
    }

    const selectedSceneObj = sceneOptions.find(s => s.value === sceneValue);
    if (!selectedSceneObj) {
      return null;
    }

    let sceneImageUrl = null;
    if (selectedSceneObj.sceneLockedImageUrls && typeof selectedSceneObj.sceneLockedImageUrls === 'object') {
      sceneImageUrl = selectedSceneObj.sceneLockedImageUrls[ratio];
      if (!sceneImageUrl) {
        const otherAspect = ratio === '16:9' ? '9:16' : '16:9';
        sceneImageUrl = selectedSceneObj.sceneLockedImageUrls[otherAspect];
      }
    }

    if (!sceneImageUrl) sceneImageUrl = selectedSceneObj.sceneLockedImageUrl || null;
    if (!sceneImageUrl) sceneImageUrl = selectedSceneObj.previewImage || null;
    if (!sceneImageUrl) return null;

    let absoluteUrl = sceneImageUrl;
    if (!sceneImageUrl.startsWith('http://') && !sceneImageUrl.startsWith('https://')) {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const baseUrl = apiBase.replace('/api', '');
      absoluteUrl = `${baseUrl}${sceneImageUrl.startsWith('/') ? '' : '/'}${sceneImageUrl}`;
    }

    const response = await fetch(absoluteUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob || blob.size === 0) return null;

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => resolve(evt.target?.result || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  };

  // 💫 NEW: Auto-fetch scene lock image based on selectedScene + aspectRatio
  useEffect(() => {
    const autoFetchSceneImage = async () => {
      if (sceneImageMode === 'custom') {
        return;
      }

      try {
        const dataUrl = await resolveSceneImageDataUrl(selectedScene, aspectRatio);
        if (dataUrl) {
          setSceneImage(dataUrl);
          setSceneImageMode('auto');
          console.log(`✅ Scene lock image auto-loaded for ${selectedScene} (${aspectRatio})`);
        } else {
          console.warn(`⚠️  No scene image found for ${selectedScene} (${aspectRatio})`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to auto-fetch scene image: ${error.message}`);
      }
    };

    autoFetchSceneImage();
  }, [selectedScene, aspectRatio, sceneOptions, sceneImageMode]);


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
  const initSession = (id, inputImages = {}) => {
    // Calculate video count based on provider and total duration (120s = 2 minutes)
    const maxDuration = getMaxDurationForProvider(videoProvider);
    const videosCount = calculateVideoCount(videoProvider, 120);
    
    // Get workflow steps based on use case (using raw version without translation for session init)
    const workflowSteps = useCase === 'affiliate-video-tiktok' ? WORKFLOW_STEPS_AFFILIATE_TIKTOK : WORKFLOW_STEPS;
    
    return {
      id,
      steps: workflowSteps.map(s => ({ id: s.id, completed: false, error: null, inProgress: false })),
      logs: [],
      image: null,
      videos: [],
      videosCount,
      completed: false,
      error: null,
      inputImages,
      preview: {},
      step2Items: [],
      step2Progress: { total: 0, completed: 0 },
      step4Items: [],
      step4Progress: { total: 0, completed: 0 },
      analysis: { videoScripts: [], hashtags: [], voiceoverScript: '' }
    };
  };

  /**
   * Helper: Handle TikTok affiliate video workflow  
   * Steps: 1-Analyze, 2-Recommend, 3-Select Settings, 4-Generate 2 Images Parallel, 
   *        5-Deep Analysis, 6-Generate Video, 7-Generate Voiceover, 8-Finalize
   */
  const hydrateAffiliateSessionFromStatus = (statusData, sessionIdOverride = null) => {
    const flowId = statusData?.flowId;
    const sessionId = sessionIdOverride || statusData?.sessionId || flowId || statusData?.flowId;
    const flowState = statusData?.flowState || {};
    const currentStatus = String(statusData?.sessionStatus || statusData?.status || flowState?.status || '').toLowerCase();
    const isFailed = currentStatus.includes('failed');
    const isCompleted = currentStatus.includes('completed');
    const step1Completed = Boolean(flowState.step1?.completed)
      || Boolean(flowState.step2?.completed || flowState.step3?.completed || flowState.step4?.completed || flowState.step5?.completed)
      || currentStatus.includes('step2')
      || currentStatus.includes('step3')
      || currentStatus.includes('step4')
      || currentStatus.includes('step5')
      || isCompleted;
    const step2Completed = Boolean(flowState.step2?.completed)
      || Boolean(flowState.step3?.completed || flowState.step4?.completed || flowState.step5?.completed)
      || currentStatus.includes('step3')
      || currentStatus.includes('step4')
      || currentStatus.includes('step5')
      || isCompleted;
    const step3Completed = Boolean(flowState.step3?.completed)
      || Boolean(flowState.step4?.completed || flowState.step5?.completed)
      || currentStatus.includes('step4')
      || currentStatus.includes('step5')
      || isCompleted;
    const step4Completed = Boolean(flowState.step4?.completed)
      || Boolean(flowState.step5?.completed)
      || currentStatus.includes('step5')
      || isCompleted;
    const step5Completed = Boolean(flowState.step5?.completed) || isCompleted;
    const analysisSummary = flowState.step1?.analysisText || flowState.step1?.analysis?.characterDescription || '';
    const frameItems = flowState.step2?.frameLibrary || [];
    const videoItems = flowState.step4?.segmentVideos || [];
    const countCompletedItems = (items = []) => {
      if (!Array.isArray(items) || items.length === 0) return 0;
      const completedCount = items.filter((item) => item?.status === 'completed').length;
      return completedCount > 0 ? completedCount : items.length;
    };
    const terminalError = flowState.step5?.error || flowState.step4?.error || flowState.step3?.error || flowState.step2?.error || statusData?.error?.message || null;
    const actionRequired = flowState.actionRequired || statusData?.actionRequired || null;

    return {
      ...initSession(sessionId, {
        character: flowState.step1?.characterImage?.previewUrl || null,
        product: flowState.step1?.productImage?.previewUrl || null
      }),
      id: sessionId,
      flowId,
      completed: currentStatus === 'completed',
      error: currentStatus === 'failed' ? (terminalError || 'Flow failed') : null,
      manualAction: actionRequired,
        preview: { flowId, status: statusData?.status, sessionStatus: statusData?.sessionStatus, error: statusData?.error, ...(flowState || {}) },
      step1Prompts: {
          summary: analysisSummary,
        wearing: flowState.step2?.prompts?.wearing || '',
        holding: flowState.step2?.prompts?.holding || ''
      },
      step2Images: {
        wearing: flowState.step2?.images?.wearing?.previewUrl || flowState.step2?.images?.wearing?.path || null,
        holding: flowState.step2?.images?.holding?.previewUrl || flowState.step2?.images?.holding?.path || null
      },
      step2Items: frameItems,
      step2Progress: {
        total: frameItems.length || flowState.step2?.framePlan?.length || 0,
        completed: countCompletedItems(frameItems)
      },
      step4Items: videoItems,
      step4Progress: {
        total: videoItems.length || 0,
        completed: countCompletedItems(videoItems)
      },
      videos: videoItems.map((item) => item?.previewUrl || item?.path || item?.href).filter(Boolean),
      audioUrl: flowState.step5?.audio?.previewUrl || flowState.step5?.audio?.path || null,
      ttsText: flowState.step5?.voiceoverText || '',
      analysis: {
        step1: flowState.step1?.analysis || null,
        videoScripts: flowState.step3?.scripts || [],
        hashtags: flowState.step3?.hashtags || [],
        voiceoverScript: flowState.step3?.voiceoverScript || '',
        metadata: flowState.step3?.metadata || null
      },
      steps: [
        { id: 'analyze', completed: step1Completed, error: null, inProgress: !isFailed && !step1Completed && currentStatus.includes('step1') },
        { id: 'apply-recommendations', completed: step1Completed, error: null, inProgress: false },
        { id: 'tiktok-options', completed: true, error: null, inProgress: false },
        { id: 'generate-images-parallel', completed: step2Completed, error: flowState.step2?.error || null, inProgress: !isFailed && !step2Completed && (currentStatus.includes('step2') || flowState.step2?.status === 'processing') },
        { id: 'deep-analysis', completed: step3Completed, error: flowState.step3?.error || null, inProgress: !isFailed && !step3Completed && currentStatus.includes('step3') },
        { id: 'generate-video', completed: step4Completed, error: flowState.step4?.error || null, inProgress: !isFailed && !step4Completed && currentStatus.includes('step4') },
        { id: 'generate-voiceover', completed: step5Completed, error: flowState.step5?.error || null, inProgress: !isFailed && !step5Completed && currentStatus.includes('step5') },
        { id: 'finalize', completed: Boolean(flowState.step6?.completed) || currentStatus === 'completed', error: null, inProgress: currentStatus.includes('step6') }
      ]
    };
  };

  const fetchAffiliateFlowStatus = async (flowId) => {
    try {
      return await api.get('/ai/affiliate-video-tiktok/status/' + flowId);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 409 && error?.response?.data?.requiresResume) {
        setResumeRequiredFlows((prev) => {
          const next = new Set(prev);
          if (flowId) next.add(flowId);
          return next;
        });
        return {
          requiresResume: true,
          flowId,
          sessionStatus: error?.response?.data?.sessionStatus || null,
          status: 'requires-resume'
        };
      }
      throw new Error('Failed to load affiliate flow status' + (status ? ' (' + status + ')' : ''));
    }
  };

  const loadRecentAffiliateSessions = async () => {
    setRecentAffiliateSessionsLoading(true);
    try {
      const data = await api.get('/debug-sessions', { limit: 8 });
      const items = (data?.data || [])
        .filter((session) => ['affiliate-tiktok', 'one-click'].includes(session.flowType))
        .filter((session) => String(session.sessionId || '').startsWith('flow-'));
      setRecentAffiliateSessions(items);
    } catch (error) {
      console.warn('Failed to load recent affiliate sessions:', error.message);
      setRecentAffiliateSessions([]);
    } finally {
      setRecentAffiliateSessionsLoading(false);
    }
  };

  const resumeAffiliateSession = async (flowId, sessionIdOverride = null) => {
    if (!flowId) return null;

    setResumingSessionId(flowId);
    try {
      try {
        await api.post('/ai/affiliate-video-tiktok/resume/' + flowId, { resumeIntent: 'fe-manual-resume' });
      } catch (error) {
        const status = error?.response?.status;
        throw new Error('Resume failed' + (status ? ' (' + status + ')' : ''));
      }

      const statusData = await fetchAffiliateFlowStatus(flowId);
      if (statusData?.requiresResume) {
        throw new Error('Resume required to restore flow state');
      }
      setResumeRequiredFlows((prev) => {
        const next = new Set(prev);
        next.delete(flowId);
        return next;
      });
      const nextSession = hydrateAffiliateSessionFromStatus(statusData, sessionIdOverride || flowId);

      setSessions((prev) => {
        const existing = prev.find((item) => item.flowId === flowId || item.id === sessionIdOverride || item.id === flowId);
        if (existing) {
          return prev.map((item) => (item.id === existing.id ? { ...item, ...nextSession, id: existing.id } : item));
        }
        return [nextSession, ...prev];
      });
      setActiveSessionId(sessionIdOverride || flowId);

      const existingStop = pollingStopsRef.current.get(flowId);
      if (typeof existingStop === 'function') existingStop();
      const stopRef = { stop: false };
      const stopPolling = startPreviewPolling(flowId, sessionIdOverride || flowId, stopRef);
      pollingStopsRef.current.set(flowId, stopPolling);

      return statusData;
    } finally {
      setResumingSessionId(null);
    }
  };

  const rerunAffiliateStep3 = async (session, templateId = 'auto') => {
    if (!session?.flowId) return;
    const flowId = session.flowId;
    try {
      await api.post('/ai/affiliate-video-tiktok/step-3-deep-analysis', {
        flowId,
        scriptTemplateId: templateId
      });
      const statusData = await fetchAffiliateFlowStatus(flowId);
      const refreshed = hydrateAffiliateSessionFromStatus(statusData, session.id);
      setSessions((prev) => prev.map((item) => (item.id === session.id ? refreshed : item)));
    } catch (error) {
      console.error('Failed to rerun step 3:', error.message);
      throw error;
    }
  };

  const startPreviewPolling = (flowId, sessionId, stopRef = { stop: false }) => {
    const POLL_INTERVAL_MS = 1500;
    const NO_DATA_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const pollingStartedAt = Date.now();
    let lastSuccessfulFetchAt = Date.now();
    let lastUsefulDataAt = Date.now();
    let isPolling = false;

    const markSessionPollingStopped = (errorMessage) => {
      setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          error: errorMessage || s.error,
          steps: (s.steps || []).map(step => ({ ...step, inProgress: false }))
        };
      }));
    };

    const pollPreview = async () => {
      const now = Date.now();

      if (now - lastSuccessfulFetchAt > NO_DATA_TIMEOUT_MS) {
        markSessionPollingStopped('Preview polling stopped: no successful response for over 5 minutes.');
        return true;
      }

      try {
        const statusData = await fetchAffiliateFlowStatus(flowId);
        if (statusData?.requiresResume) {
          return true;
        }
        lastSuccessfulFetchAt = Date.now();
        const currentStatus = String(statusData?.sessionStatus || statusData?.status || "").toLowerCase();
        let preview = {};
        try {
          const previewData = await api.get('/ai/affiliate-video-tiktok/preview/' + flowId);
          preview = previewData.preview || {};
        } catch {
          preview = {};
        }

        const hasUsefulData = !!(
          statusData?.status || statusData?.flowState?.step1 || statusData?.flowState?.step2 || statusData?.flowState?.step3 || statusData?.flowState?.step4 || statusData?.flowState?.step5
        );

        if (hasUsefulData) {
          lastUsefulDataAt = Date.now();
        }

        if (!hasUsefulData && Date.now() - lastUsefulDataAt > NO_DATA_TIMEOUT_MS) {
          markSessionPollingStopped('Preview polling stopped: no status updates for over 5 minutes.');
          return true;
        }

        setSessions(prev => prev.map(s => {
          if (s.id !== sessionId) return s;

          const hydratedSession = hydrateAffiliateSessionFromStatus(statusData, sessionId);
          const nextSession = {
            ...s,
            ...hydratedSession,
            id: s.id,
            flowId: hydratedSession.flowId || s.flowId || flowId,
            preview: { ...(hydratedSession.preview || {}), ...(preview || {}) }
          };

          const step2Items = preview.step2?.items || hydratedSession.step2Items || [];
          const step4Items = preview.step4?.videos || hydratedSession.step4Items || [];

          if (preview.status === 'action_required' || preview.actionRequired) {
            nextSession.manualAction = preview.actionRequired || { message: 'Manual action required in browser' };
            nextSession.error = null;
          } else if (nextSession.manualAction) {
            nextSession.manualAction = null;
          }

          if (preview.step1) {
            nextSession.step1Prompts = {
              summary: hydratedSession.step1Prompts?.summary || nextSession.step1Prompts?.summary || '',
              wearing: preview.step1.wearingPrompt || nextSession.step1Prompts?.wearing || '',
              holding: preview.step1.holdingPrompt || nextSession.step1Prompts?.holding || ''
            };
          }

          if (preview.step2) {
            nextSession.step2Images = {
              wearing: preview.step2.images?.wearing || preview.step2.wearingImagePath || nextSession.step2Images?.wearing || null,
              holding: preview.step2.images?.holding || preview.step2.holdingImagePath || nextSession.step2Images?.holding || null
            };
            nextSession.step2Items = step2Items;
            nextSession.step2Progress = {
              total: hydratedSession.step2Progress?.total || preview.step2.imageCount || step2Items.length || 0,
              completed: hydratedSession.step2Progress?.completed || preview.step2.completedCount || step2Items.filter(item => item?.status === 'completed').length || 0
            };
          }

          if (preview.step3) {
            nextSession.analysis = {
              ...(nextSession.analysis || {}),
              videoScripts: preview.step3.videoScripts || nextSession.analysis?.videoScripts || [],
              hashtags: preview.step3.hashtags || nextSession.analysis?.hashtags || [],
              voiceoverScript: preview.step3.voiceoverScript || nextSession.analysis?.voiceoverScript || ''
            };
          }

          if (preview.step4) {
            nextSession.step4Items = step4Items;
            nextSession.step4Progress = {
              total: hydratedSession.step4Progress?.total || preview.step4.totalCount || step4Items.length || 0,
              completed: hydratedSession.step4Progress?.completed || preview.step4.completedCount || step4Items.filter(item => item?.status === 'completed').length || 0
            };
            nextSession.videos = step4Items.map(item => item?.path || item?.href || item?.url).filter(Boolean);
          }

          if (preview.step5) {
            nextSession.ttsText = preview.step5.ttsText || preview.step5.voiceoverText || nextSession.ttsText;
          }

          if (currentStatus === 'completed') {
            nextSession.completed = true;
            nextSession.error = null;
            nextSession.steps = (nextSession.steps || []).map(step => ({ ...step, completed: true, inProgress: false }));
          }

          if (currentStatus === 'failed') {
            nextSession.error = nextSession.error || preview.error || statusData?.error?.message || 'Flow failed';
            nextSession.manualAction = null;
            nextSession.steps = (nextSession.steps || []).map(step => ({ ...step, inProgress: false }));
          }

          return nextSession;
        }));

        return currentStatus === 'completed' || currentStatus === 'failed' || stopRef.stop;
      } catch (error) {
        if (Date.now() - lastSuccessfulFetchAt > NO_DATA_TIMEOUT_MS || Date.now() - pollingStartedAt > NO_DATA_TIMEOUT_MS) {
          markSessionPollingStopped('Preview polling stopped: unable to fetch status for over 5 minutes.');
          return true;
        }

        return stopRef.stop;
      }
    };

    let pollCount = 0;
    const maxPolls = Math.ceil(NO_DATA_TIMEOUT_MS / POLL_INTERVAL_MS) + 120;

    const pollInterval = setInterval(async () => {
      if (isPolling || stopRef.stop) return;
      isPolling = true;

      try {
        pollCount++;
        const shouldStop = await pollPreview();
        if (shouldStop || pollCount >= maxPolls || stopRef.stop) {
          clearInterval(pollInterval);
        }
      } finally {
        isPolling = false;
      }
    }, POLL_INTERVAL_MS);

    return () => {
      stopRef.stop = true;
      clearInterval(pollInterval);
    };
  };

  const handleAffiliateVideoTikTokFlow = async (
    characterImageBase64,
    productImageBase64,
    recommendedOptions,
    analysisResult,
    flowId,  // 💫 Accept flowId from caller to ensure session continuity
    language = 'en',  // 💫 Accept language parameter for prompt generation
    sceneImageBase64 = null,  // 💫 NEW: Optional scene reference image base64
    sessionId = null
  ) => {
    try {
      // 🔍 Validation: ensure all required base64 strings are provided
      if (!characterImageBase64) {
        throw new Error('Character image base64 is required but missing');
      }
      if (!productImageBase64) {
        throw new Error('Product image base64 is required but missing');
      }
      if (!sceneImageBase64) {
        throw new Error('Scene image base64 is required but missing');
      }
      
      console.log('🎬 Starting Affiliate Video TikTok Flow');
      console.log(`📋 Parameters received:`);
      console.log(`  Character base64: ${characterImageBase64?.substring(0, 50)}...${characterImageBase64?.length}B`);
      console.log(`  Product base64: ${productImageBase64?.substring(0, 50)}...${productImageBase64?.length}B`);
      if (sceneImageBase64) {
        console.log(`  Scene base64: ${sceneImageBase64?.substring(0, 50)}...${sceneImageBase64?.length}B`);
      }
      console.log(`  Options: ${JSON.stringify(recommendedOptions)}`);
      console.log(`  Analysis: ${analysisResult ? 'present' : 'missing'}`);
      clearAllResumeRequired();
      console.log(`  Flow ID: ${flowId}`);  // 💫 Log flowId
      console.log(`  Language: ${language}`);  // 💫 Log language
      
      // Extract voice settings
      const [voiceGender, voicePace] = voiceOption.split('-');
      const voiceName = getVoiceNameFromGenderPace(voiceGender, voicePace);
      
      // Construct payload from parameters - send base64 strings as JSON
      const payload = {
        characterImage: characterImageBase64,  // 💫 Keep as base64 string (not Blob)
        productImage: productImageBase64,      // 💫 Keep as base64 string (not Blob)
        sceneImage: sceneImageBase64,          // 💫 Keep as base64 string if available
        videoDuration: tiktokVideoDuration,
        voiceGender,
        voicePace,
        voiceName,  // 💫 NEW: Actual Gemini voice name
        productFocus: productFocus || 'full-outfit',
        imageProvider: imageProvider || 'google-flow',
        videoProvider: videoProvider || 'google-flow',
        scriptTemplateId: tiktokScriptTemplate || 'auto',
        generateVideo: true,
        generateVoiceover: true,
        flowId,  // 💫 Pass flowId in payload to maintain session
        language: language || 'en',  // 💫 Pass language for prompt generation (STEP 1, 3, 4)
        options: {
          ...(recommendedOptions || {}),
          useShortPrompt
        },
        disableSceneReferenceTransfer: false,
        imageSource: imageSource,  // 🎯 Pass image source tracking to skip Drive upload for gallery images
        useShortPrompt
      };
      
      console.log(`📤 Sending JSON request to /api/ai/affiliate-video-tiktok`);
      console.log(`   Character base64: ${characterImageBase64?.substring(0, 50)}...${characterImageBase64?.length}B`);
      console.log(`   Product base64: ${productImageBase64?.substring(0, 50)}...${productImageBase64?.length}B`);
      if (sceneImageBase64) {
        console.log(`   Scene base64: ${sceneImageBase64?.substring(0, 50)}...${sceneImageBase64?.length}B (auto-fetched)`);
      }

      const stopRef = { stop: false };
      const stopPolling = startPreviewPolling(flowId, sessionId, stopRef);

      // 🕐 Create AbortController for timeout (20 minutes for TikTok generation)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20 * 60 * 1000);

      let keepPollingAlive = false;

      try {
        const mainFlowResponse = await fetch('/api/ai/affiliate-video-tiktok', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal  // 🕐 Abort after 20 minutes
        });

        // 💫 LOG: Confirm scene image was sent
        console.log(`📤 FormData sent with:`);
        console.log(`  Character image: ✅ (${characterImageBase64.length} bytes)`);
        console.log(`  Product image: ✅ (${productImageBase64.length} bytes)`);
        console.log(`  Scene image: ${sceneImageBase64 ? '✅ (auto-fetched, ' + sceneImageBase64.length + ' bytes) ' : '❌ (not available)'}`);

        if (!mainFlowResponse.ok) {
          const errorData = await mainFlowResponse.json().catch(() => ({}));
          console.error(`❌ Backend error response [${mainFlowResponse.status}]:`, errorData);
          throw new Error(`Backend error: ${mainFlowResponse.status} - ${errorData.error || mainFlowResponse.statusText}`);
        }

        const mainFlowData = await mainFlowResponse.json();
        console.log(`✅ Backend response received:`, mainFlowData);

        if (!mainFlowData.success) {
          throw new Error(mainFlowData.error || mainFlowData.message || 'Main flow failed');
        }

        const step3Result = mainFlowData.data?.step3?.analysis || mainFlowData.data?.step3 || null;
        const step4Videos = mainFlowData.data?.step4?.segmentVideos || mainFlowData.data?.step4?.videos || [];
        setTiktokFlowId(mainFlowData.flowId || mainFlowData.data?.flowId || flowId);
        setDeepAnalysisResult(step3Result);
        setSuggestedHashtags(step3Result?.hashtags || mainFlowData.final_package?.metadata?.hashtags || []);
        setGeneratedVideo(step4Videos[0] || mainFlowData.data?.step4?.video || null);
        setGeneratedVoiceover(mainFlowData.data?.step5?.ttsText || step3Result?.voiceoverScript || null);

        return mainFlowData;
      } catch (requestError) {
        throw requestError;
      } finally {
        clearTimeout(timeoutId);
        if (!keepPollingAlive) {
          stopRef.stop = true;
          if (typeof stopPolling === 'function') stopPolling();
        }
      }
    } catch (error) {
      console.error('❌ TikTok flow error:', error);
      throw error;
    }
  };

  // 💫 NEW: Initialize backend session to get flowId
  const initializeBackendSession = async (sessionNumber) => {
    try {
      console.log(`\n📝 Initializing backend session for Session #${sessionNumber}...`);
      
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowType: 'one-click',
          useCase: useCase
        })
      });

      if (!response.ok) {
        throw new Error(`Backend session creation failed: ${response.status}`);
      }

      const data = await response.json();
      const flowId = data.data?.flowId || data.data?.sessionId;
      
      console.log(`✅ Backend session created: ${flowId}`);
      return flowId;
    } catch (error) {
      console.error(`❌ Failed to create backend session:`, error);
      throw error;
    }
  };

  // 🔄 Helper: Convert image URL to data URL (base64)
  const urlToDataUrl = async (imageUrl) => {
    try {
      // If already a data URL, return as-is
      if (imageUrl.startsWith('data:')) {
        console.log(`✅ Image already a data URL`);
        return imageUrl;
      }
      
      console.log(`🔄 Converting URL to data URL: ${imageUrl}`);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error(`❌ Failed to convert URL to data URL:`, error);
      throw new Error(`Failed to load image from URL: ${error.message}`);
    }
  };

  // Main generation flow
  const handleOneClickGeneration = async () => {
    if (!characterImage || !productImage) {
      alert(t('oneClickCreator.uploadBothImagesFirst'));
      return;
    }

    clearAllResumeRequired();
    setIsGenerating(true);
    setSessions([]);
    let sessionCreationFailed = false;

    try {
      // Convert images to base64
      console.log('📸 Converting images to base64...');
      
      // 🔄 Convert URLs to data URLs if needed
      let charImageData = characterImage;
      let prodImageData = productImage;
      let sceneImageData = sceneImage;
      
      // Character image
      if (charImageData && !charImageData.startsWith('data:')) {
        console.log('🔄 Character image is URL, converting to data URL...');
        charImageData = await urlToDataUrl(charImageData);
      }
      console.log(`Character image length: ${charImageData.length}B`);
      
      // Product image
      if (prodImageData && !prodImageData.startsWith('data:')) {
        console.log('🔄 Product image is URL, converting to data URL...');
        prodImageData = await urlToDataUrl(prodImageData);
      }
      console.log(`Product image length: ${prodImageData.length}B`);

      let finalSceneImageData = sceneImageData;
      if (!finalSceneImageData) {
        console.log('🔄 Scene image missing in UI state, trying default scene locked image fallback...');
        finalSceneImageData = await resolveSceneImageDataUrl(selectedScene, aspectRatio);
        if (finalSceneImageData) {
          setSceneImage(finalSceneImageData);
          setSceneImageMode('auto');
        }
      }

      if (!finalSceneImageData) {
        throw new Error('Scene reference image is required but could not be loaded from scene locked defaults.');
      }
      
      // Scene image
      if (finalSceneImageData && !finalSceneImageData.startsWith('data:')) {
        console.log('🔄 Scene image is URL, converting to data URL...');
        finalSceneImageData = await urlToDataUrl(finalSceneImageData);
      }

      console.log(`Scene image length: ${finalSceneImageData.length}B (${sceneImageMode === 'custom' ? 'custom upload' : 'scene lock default'})`);

      const charBase64 = charImageData.split(',')[1];
      const prodBase64 = prodImageData.split(',')[1];
      const sceneBase64 = finalSceneImageData.split(',')[1];

      
      // 💫 LOG: Verify base64 was extracted
      console.log(`✅ Extracted base64 strings:`);
      console.log(`  Character: ${charBase64?.substring(0, 50)}...${charBase64?.length}B`);
      console.log(`  Product: ${prodBase64?.substring(0, 50)}...${prodBase64?.length}B`);
      
      // 🔍 Validation: ensure all base64 strings are properly extracted
      if (!charBase64) {
        console.error('❌ Character image base64 extraction failed. Image format:', charImageData?.substring(0, 100));
        throw new Error('Character image data is invalid. Please upload or select a valid image.');
      }
      if (!prodBase64) {
        console.error('❌ Product image base64 extraction failed. Image format:', prodImageData?.substring(0, 100));
        throw new Error('Product image data is invalid. Please upload or select a valid image.');
      }
      if (!sceneBase64) {
        console.error('❌ Scene image base64 extraction failed. Image format:', finalSceneImageData?.substring(0, 100));
        throw new Error('Scene image data is invalid. Please reload the scene.');
      }
    if (sceneBase64) {
      console.log(`  Scene: ${sceneBase64?.substring(0, 50)}...${sceneBase64?.length}B (from auto-fetch or manual upload)`);
    }

    // Create sessions for each quantity
    const sharedInputImages = { character: charImageData, product: prodImageData, scene: finalSceneImageData };
    const newSessions = Array.from({ length: quantity }).map((_, idx) => initSession(idx + 1, sharedInputImages));
    setSessions(newSessions);
    setActiveSessionId(newSessions[0]?.id || null);

    // Process each session sequentially
    for (let s of newSessions) {
      const sessionId = s.id;
      console.log(`\n🔄 Starting Session #${sessionId}`);

      try {
        // ======== PRELOAD: Load all database options and filter by productFocus ========
        console.log(`📂 [S${sessionId}] Preload: Loading and filtering database options...`);
        addLog(sessionId, 'Loading and filtering style options from database...');
        
        const visibleCategories = getVisibleCategories(productFocus);
        console.log(`📋 Visible categories for ${productFocus}:`, visibleCategories);
        addLog(sessionId, `📋 Filtering for ${productFocus}: ${visibleCategories.length} categories`);
        
        let allDatabaseOptions = {};
        let filteredDatabaseOptions = {};
        
        try {
          const allOptionsResponse = await aiOptionsAPI.getAllOptions();
          if (allOptionsResponse.success && allOptionsResponse.data) {
            // Group options by category
            for (const option of allOptionsResponse.data) {
              if (!allDatabaseOptions[option.category]) {
                allDatabaseOptions[option.category] = [];
              }
              allDatabaseOptions[option.category].push(option);
            }
            
            // Filter to only visible categories
            for (const category of visibleCategories) {
              if (allDatabaseOptions[category]) {
                filteredDatabaseOptions[category] = allDatabaseOptions[category];
              }
            }
            
            console.log(`✅ Loaded ${Object.keys(allDatabaseOptions).length} categories, filtered to ${Object.keys(filteredDatabaseOptions).length}`);
            addLog(sessionId, `✓ Loaded ${Object.keys(filteredDatabaseOptions).length} categories for ${productFocus}`);
          }
        } catch (dbLoadError) {
          console.warn('⚠️ Could not load database options:', dbLoadError.message);
          addLog(sessionId, `⚠️ Database load failed, using AI recommendations only`);
        }

        // ✅ NOTE: Analysis moved to affiliate-video-tiktok flow (STEP 1)
        // This ensures single ChatGPT call per workflow stage
        console.log(`📊 [S${sessionId}] Preparing filtered options for flow...`);
        updateSessionStep(sessionId, 'analyze', { inProgress: true });
        addLog(sessionId, 'Preparing filtered categories for TikTok workflow...');

        // STEP 2: APPLY RECOMMENDATIONS (set defaults)
        console.log(`✨ [S${sessionId}] STEP 2: Set filtered category defaults`);
        updateSessionStep(sessionId, 'apply-recommendations', { inProgress: true });
        addLog(sessionId, 'Preparing filtered defaults for workflow...');

        let recommendedOptions = {};
        let analysisResult = null;

        try {
          // Set defaults from filtered database options
          const categoryDefaults = {};
          for (const [category, options] of Object.entries(filteredDatabaseOptions)) {
            if (options.length > 0) {
              categoryDefaults[category] = options[0].value;
            }
          }
          recommendedOptions = { ...categoryDefaults };
          recommendedOptions.scene = selectedScene || categoryDefaults.scene || 'linhphap-tryon-room';
          recommendedOptions.aspectRatio = aspectRatio || '9:16';
          const pickedScene = sceneOptions.find(s => s.value === recommendedOptions.scene);

          recommendedOptions.sceneLockedPrompt = (i18n.language || 'en').startsWith('vi')
            ? (pickedScene?.sceneLockedPromptVi || pickedScene?.sceneLockedPrompt || pickedScene?.promptSuggestionVi || pickedScene?.promptSuggestion || '')
            : (pickedScene?.sceneLockedPrompt || pickedScene?.sceneLockedPromptVi || pickedScene?.promptSuggestion || pickedScene?.promptSuggestionVi || '');
          console.log(`✅ Set defaults from ${Object.keys(categoryDefaults).length} categories`);
          addLog(sessionId, `✓ Prepared ${Object.keys(categoryDefaults).length} filtered categories`);
          
          updateSessionStep(sessionId, 'analyze', { completed: true, inProgress: false });
          updateSessionStep(sessionId, 'apply-recommendations', { completed: true, inProgress: false });
          console.log('📋 Final recommendedOptions:', JSON.stringify(recommendedOptions));
        } catch (recError) {
          console.error(`⚠️ Options error [S${sessionId}]:`, recError);
          addLog(sessionId, `⚠️ Using empty options, will use AI recommendations`);
          updateSessionStep(sessionId, 'analyze', { completed: true, inProgress: false });
          updateSessionStep(sessionId, 'apply-recommendations', { completed: true, inProgress: false });
        }

        // ======== SPECIAL FLOW: AFFILIATE VIDEO TIKTOK ========
        if (useCase === 'affiliate-video-tiktok') {
          try {
            addLog(sessionId, '🎬 Starting Affiliate Video TikTok workflow...');
            updateSessionStep(sessionId, 'tiktok-options', { completed: true, inProgress: false });
            
            // 💫 Create UNIQUE flowId for this session
            const flowId = `flow-${Date.now()}-${sessionId}`;
            addLog(sessionId, `📝 Flow ID: ${flowId}`);
            setSelectedFlowId(flowId);
            
            // 💫 Update session state with flowId for modal viewing
            setSessions(prev => prev.map(sess => {
              if (sess.id === sessionId) {
                return { ...sess, flowId };
              }
              return sess;
            }));
            
            // Call the TikTok flow
            // Note: tiktokFlowId will be set inside handleAffiliateVideoTikTokFlow,
            // and useEffect will automatically start polling when flowId becomes available
            const tiktokResult = await handleAffiliateVideoTikTokFlow(
              charBase64,
              prodBase64,
              recommendedOptions,
              analysisResult,
              flowId,
              i18n.language || 'en',
              sceneBase64,
              sessionId
            );

            if (tiktokResult?.recovered) {
              addLog(sessionId, 'Recovered from interrupted request. Session is now running from persisted state.');
              continue;
            }

            // Update session with results
            setSessions(prev => prev.map(sess => {
              if (sess.id === sessionId) {
                // Extract analysis data from deep analysis
                const analysisData = tiktokResult.data?.step3?.analysis || {};
                
                // Extract video paths if multiple videos were generated
                const videosList = tiktokResult.data?.step4?.videos || [];
                const videoUrls = videosList.map(v => v.path).filter(p => p);
                
                return {
                  ...sess,
                  flowId, // 💫 Store flowId with session
                  image: tiktokResult.data?.step2?.images?.wearing || 
                          tiktokResult.images?.wearing || 
                          tiktokResult.final_package?.images?.[0],
                  // 💫 Store all videos from step4 (multiple segments)
                  videos: videoUrls.length > 0 ? videoUrls : 
                         tiktokResult.data?.step4?.video ? [tiktokResult.data.step4.video.path] : 
                         tiktokResult.final_package?.video ? [tiktokResult.final_package.video] : 
                         [],
                  // 💫 Store analysis data including character, product, scripts, voiceover, hashtags
                  analysis: {
                    character: analysisData.character,
                    product: analysisData.product,
                    compatibility: analysisData.compatibility,
                    videoScripts: analysisData.videoScripts,
                    voiceoverScript: analysisData.voiceoverScript,
                    hashtags: analysisData.hashtags || tiktokResult.final_package?.metadata?.hashtags || []
                  },
                  voiceover: tiktokResult.final_package?.audio,
                  completed: true,
                };
              }
              return sess;
            }));

            addLog(sessionId, '✅ TikTok package complete!');
            updateSessionStep(sessionId, 'generate-images-parallel', { completed: true, inProgress: false });
            updateSessionStep(sessionId, 'deep-analysis', { completed: true, inProgress: false });
            updateSessionStep(sessionId, 'generate-video', { completed: true, inProgress: false });
            updateSessionStep(sessionId, 'generate-voiceover', { completed: true, inProgress: false });
            updateSessionStep(sessionId, 'finalize', { completed: true, inProgress: false });

            continue; // Skip standard flow
          } catch (tiktokError) {
            console.error(`❌ TikTok workflow error [S${sessionId}]:`, tiktokError);
            addLog(sessionId, `❌ TikTok workflow failed: ${tiktokError.message}`);
            updateSessionStep(sessionId, 'generate-images-parallel', { error: tiktokError.message, inProgress: false });
            throw tiktokError;
          }
        }

        // ======== STEP 3: GENERATE IMAGE ========
        console.log(`🎨 [S${sessionId}] Step 3: Generate Image`);
        updateSessionStep(sessionId, 'generate-image', { inProgress: true });
        addLog(sessionId, 'Building image prompt...');

        try {
          // Generate image prompt using language-aware builder (with fallback to templates)
          const promptResult = await generateImagePromptFromTemplate(
            useCase,
            productFocus,
            recommendedOptions,
            i18n.language || 'en',
            sessionId,
            addLog
          );

          // 💫 NEW: Extract prompt text and scene reference image
          const imagePrompt = typeof promptResult === 'string' ? promptResult : (promptResult?.positive || '');
          const sceneReferenceImage = promptResult?.sceneReferenceImage || null;

          if (sceneReferenceImage?.url) {
            addLog(sessionId, `✅ Scene reference image found: ${sceneReferenceImage.sceneLabel}`);
          } else {
            addLog(sessionId, `ℹ️  No scene reference image available`);
          }

          addLog(sessionId, 'Calling image generation...');

          // 💫 Determine aspect ratio for this generation
          let generationAspectRatio = aspectRatio;
          if (useCase === 'affiliate-video-tiktok') {
            generationAspectRatio = '9:16';
            addLog(sessionId, `📐 Using 9:16 aspect ratio (TikTok vertical format)`);
          } else {
            addLog(sessionId, `📐 Using ${generationAspectRatio} aspect ratio`);
          }

          const imageResponse = await browserAutomationAPI.generateBrowserOnly(
            imagePrompt,
            {
              generationProvider: imageProvider,
              imageGenProvider: imageProvider,
              characterImageBase64: charBase64,
              productImageBase64: prodBase64,
              sceneReferenceImage: sceneReferenceImage,  // 💫 NEW: Pass scene reference image
              aspectRatio: generationAspectRatio,
              imageCount: DESIRED_OUTPUT_COUNT,
              grokConversationId: analysisResult?.grokConversationId,
              characterDescription: analysisResult?.characterDescription,
              selectedCharacter: selectedCharacterProfile,
            }
          );

          console.log('📸 Image API Response:', imageResponse);
          addLog(sessionId, `Debug: Response structure - ${JSON.stringify(Object.keys(imageResponse))}`);
          
          // 💫 Store file paths from backend for video generation
          const generatedImagePaths = imageResponse?.data?.filePaths?.generatedImages || [];
          const inputImagePaths = imageResponse?.data?.filePaths || {};

          // Handle different response formats
          let imageUrl = null;
          if (imageResponse?.images?.length > 0) {
            imageUrl = imageResponse.images[0];
          } else if (imageResponse?.image) {
            imageUrl = imageResponse.image;
          } else if (imageResponse?.url) {
            imageUrl = imageResponse.url;
          } else if (imageResponse?.data?.generatedImages?.length > 0) {
            // Handle Google Flow response format
            imageUrl = imageResponse.data.generatedImages[0]?.url || imageResponse.data.generatedImages[0];
          } else if (imageResponse?.data?.images?.length > 0) {
            imageUrl = imageResponse.data.images[0];
          } else if (imageResponse?.data?.image) {
            imageUrl = imageResponse.data.image;
          } else if (typeof imageResponse === 'string') {
            imageUrl = imageResponse;
          }

          if (imageUrl) {
            setSessions(prev => prev.map(sess => {
              if (sess.id === sessionId) {
                return { 
                  ...sess, 
                  image: imageUrl,
                  // 💫 Store paths from backend for next steps
                  generatedImagePaths: generatedImagePaths,
                  inputImagePaths: inputImagePaths
                };
              }
              return sess;
            }));
            addLog(sessionId, '✓ Image generated successfully');
            addLog(sessionId, `Generated image paths stored: ${generatedImagePaths.join(', ')}`);
            updateSessionStep(sessionId, 'generate-image', { completed: true, inProgress: false });
          } else {
            console.error('❌ Could not extract imageUrl from response:', imageResponse);
            addLog(sessionId, `Full response: ${JSON.stringify(imageResponse)}`);
            throw new Error('No image URL in response');
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
                i18n.language || 'en',
                sessionId,
                addLog
              );
            }

            // 💫 Get generated image paths from session data (from image generation step)
            const currentSession = sessions.find(s => s.id === sessionId);
            const generatedPaths = currentSession?.generatedImagePaths || [];
            const inputPaths = currentSession?.inputImagePaths || {};

            // Generate video with proper settings
            const videoResponse = await browserAutomationAPI.generateVideoWithProvider({
              videoProvider,
              prompt: videoPrompt,
              duration: videoDuration,
              quality: 'high',
              aspectRatio,
              // 💫 NEW: Pass file paths instead of/in addition to base64
              characterImageBase64: charBase64,
              productImageBase64: prodBase64,
              generatedImagePaths: generatedPaths,
              characterImagePath: inputPaths.characterImage,
              productImagePath: inputPaths.productImage,
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
  } catch (error) {
    // Top-level error handling for image conversion/validation issues
    console.error('❌ Generation failed:', error);
    alert(`Generation failed: ${error.message}`);
    setIsGenerating(false);
  }
};
  const readImageFile = (file, onLoad) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => onLoad(evt.target?.result || null);
    reader.readAsDataURL(file);
  };

  const openInlineImagePicker = (onFile) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    };
    input.click();
  };

  const handleCharacterImageFile = (file) => {
    readImageFile(file, (result) => {
      if (!result) return;
      setCharacterImage(result);
      setImageSource((prev) => ({ ...prev, character: 'upload' }));
    });
  };

  const handleProductImageFile = (file) => {
    readImageFile(file, (result) => {
      if (!result) return;
      setProductImage(result);
      setImageSource((prev) => ({ ...prev, product: 'upload' }));
    });
  };

  const handleSceneImageFile = (file) => {
    readImageFile(file, (result) => {
      if (!result) return;
      setSceneImage(result);
      setSceneImageMode('custom');
    });
  };

  const openGalleryTarget = (target) => {
    setGalleryPickerFor(target);
    setShowGalleryPicker(true);
  };

  const clearResumeRequired = (flowId) => {
    setResumeRequiredFlows((prev) => {
      if (!flowId) return new Set();
      const next = new Set(prev);
      next.delete(flowId);
      return next;
    });
  };

  const clearAllResumeRequired = () => {
    setResumeRequiredFlows(new Set());
  };

  return (
    <div className="one-click-shell relative -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden text-[13px] text-white lg:-mx-6 lg:-mb-6 lg:-mt-6" data-main-body>
      <PageHeaderBar
        icon={<Sparkles className="h-4 w-4 text-amber-400" />}
        title={t('oneClickCreator.title')}
        subtitle={t('oneClickCreator.subtitle')}
        meta={`${getUseCaseLabel(useCase)} / ${getFocusLabel(productFocus)} / ${quantity} sessions`}
      />

      <div ref={workspaceRef} className="one-click-main-shell grid h-full min-h-0 w-full flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden px-4 pr-0 py-2.5">

        <div className={`${workspaceGridClass} min-h-0 flex-1`} style={workspaceGridStyle}>
          {/* LEFT SIDEBAR - Settings */}
          <div className={settingsPanelClass}>
            {isSessionWorkspaceMode && (
                <div className="studio-card-shell rounded-[0.75rem] p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">Inputs</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">Edit during run</p>
                  </div>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-100">Live</span>
                </div>

                <div className="space-y-1.5">
                  <div className="studio-card-shell rounded-[0.625rem] p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Character</span>
                      <Upload className="h-3 w-3 text-amber-300" />
                    </div>
                    <button type="button" onClick={() => openInlineImagePicker(handleCharacterImageFile)} className="flex h-16 w-full items-center justify-center overflow-hidden rounded-[0.55rem] border border-dashed border-slate-600/70 transition hover:border-amber-400/80">
                      {characterImage ? <img src={characterImage} alt="Character" className="h-full w-full object-cover" /> : <Upload className="h-4 w-4 text-slate-500" />}
                    </button>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <button type="button" onClick={() => openInlineImagePicker(handleCharacterImageFile)} className="apple-option-chip rounded-[0.45rem] px-1.5 py-1 text-[9px] font-semibold">Upload</button>
                      <button type="button" onClick={() => setShowCharacterSelector(true)} className="apple-option-chip rounded-[0.45rem] px-1.5 py-1 text-[9px] font-semibold">Profile</button>
                      <button type="button" onClick={() => openGalleryTarget('character')} className="apple-option-chip rounded-[0.45rem] px-1.5 py-1 text-[9px] font-semibold">Gallery</button>
                    </div>
                  </div>

                  <div className="studio-card-shell rounded-[0.625rem] p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Product</span>
                      <Package className="h-3 w-3 text-cyan-300" />
                    </div>
                    <button type="button" onClick={() => openInlineImagePicker(handleProductImageFile)} className="flex h-16 w-full items-center justify-center overflow-hidden rounded-[0.55rem] border border-dashed border-slate-600/70 transition hover:border-cyan-400/80">
                      {productImage ? <img src={productImage} alt="Product" className="h-full w-full object-cover" /> : <Upload className="h-4 w-4 text-slate-500" />}
                    </button>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <button type="button" onClick={() => openInlineImagePicker(handleProductImageFile)} className="apple-option-chip rounded-[0.45rem] px-1.5 py-1 text-[9px] font-semibold">Upload</button>
                      <button type="button" onClick={() => openGalleryTarget('product')} className="apple-option-chip rounded-[0.45rem] px-1.5 py-1 text-[9px] font-semibold">Gallery</button>
                    </div>
                  </div>

                  <div className="studio-card-shell rounded-[0.625rem] p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Scene</span>
                      <Wand2 className="h-3 w-3 text-violet-300" />
                    </div>
                    <button type="button" onClick={() => openInlineImagePicker(handleSceneImageFile)} className="flex h-16 w-full items-center justify-center overflow-hidden rounded-[0.55rem] border border-dashed border-slate-600/70 transition hover:border-violet-400/80">
                      {sceneImage ? <img src={sceneImage} alt="Scene" className="h-full w-full object-cover" /> : <Target className="h-4 w-4 text-slate-500" />}
                    </button>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <button type="button" onClick={() => openInlineImagePicker(handleSceneImageFile)} className="apple-option-chip rounded-[0.45rem] px-1.5 py-1 text-[9px] font-semibold">Upload</button>
                      <button type="button" onClick={() => setShowScenePicker(true)} className="apple-option-chip rounded-[0.45rem] px-1.5 py-1 text-[9px] font-semibold">Picker</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Use Case */}
            <div className={getSelectCardClass(Boolean(useCase), 'amber')}>
              <div className="mb-2 flex items-start gap-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-100">
                  <Target className="w-4 h-4 text-amber-300" />
                  {t('oneClickCreator.useCase')}
                </h3>
              </div>
              <div className="relative">
                <select
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  disabled={isGenerating}
                  className={selectInputClass}
                  title={getUseCaseLabel(useCase)}
                >
                  {USE_CASES.map(uc => (
                    <option key={uc.value} value={uc.value}>{t(uc.labelKey)}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" />
              </div>
            </div>

            {/* Product Focus */}
            <div className={getSelectCardClass(Boolean(productFocus), 'cyan')}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-100">
                  <FileText className="w-4 h-4 text-cyan-300" />
                  {t('oneClickCreator.productFocus')}
                </h3>
              </div>
              <div className="relative">
                <select
                  value={productFocus}
                  onChange={(e) => setProductFocus(e.target.value)}
                  disabled={isGenerating}
                  className={selectInputClass}
                >
                  {FOCUS_OPTIONS.map(fo => (
                    <option key={fo.value} value={fo.value}>{t(fo.labelKey)}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300" />
              </div>
            </div>


            {/* Media Providers */}
            <div className={imageProviderCardClass}>
              <div className="space-y-3">
                <div>
                  <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-100">
                    <ImageIcon className="h-4 w-4 text-amber-300" />
                    {t('oneClickCreator.imageProvider')}
                  </h3>
                  <div className="space-y-1">
                    {IMAGE_PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setImageProvider(p.id)}
                        disabled={isGenerating}
                        className={getProviderButtonClass(
                          imageProvider === p.id,
                          selectedOptionClass.amber
                        )}
                      >
                        <ProviderIcon providerId={p.id} />
                        <span className="leading-none">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/6 pt-2.5">
                  <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-gray-100">
                    <Video className="h-4 w-4 text-violet-300" />
                    {t('oneClickCreator.videoProvider')}
                  </h3>
                  <div className="space-y-1">
                    {VIDEO_PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setVideoProvider(p.id)}
                        disabled={isGenerating}
                        className={getProviderButtonClass(
                          videoProvider === p.id,
                          selectedOptionClass.violet
                        )}
                      >
                        <ProviderIcon providerId={p.id} />
                        <span className="leading-none">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>


            <div className={`${sidebarCardClass} one-click-settings-full`}>
              <h3 className="mb-2 text-xs font-semibold text-gray-100">Output Setup</h3>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Short Prompt</p>
                  <button
                    type="button"
                    onClick={() => setUseShortPrompt(prev => !prev)}
                    disabled={isGenerating}
                    className={getOptionButtonClass(
                      useShortPrompt,
                      selectedOptionClass.amber
                    )}
                  >
                    {useShortPrompt ? t('oneClickCreator.enabled') : t('oneClickCreator.disabled')}
                  </button>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quantity</p>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map(q => (
                      <button
                        key={q}
                        onClick={() => setQuantity(q)}
                        disabled={isGenerating}
                        className={getOptionButtonClass(
                          quantity === q,
                          selectedOptionClass.emerald
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Aspect</p>
                  <div className="grid grid-cols-2 gap-1">
                    {ASPECT_RATIOS.map(ar => (
                      <button
                        key={ar.id}
                        onClick={() => setAspectRatio(ar.id)}
                        disabled={isGenerating}
                        className={getOptionButtonClass(
                          aspectRatio === ar.id,
                          selectedOptionClass.sky
                        )}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* TikTok-Specific Settings */}
            {useCase === 'affiliate-video-tiktok' && (
              <>
                {/* Video Duration & Voice Selector */}
                <div className={`${accentCardClass} one-click-settings-full`}>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-sky-200">
                    <Clock className="w-4 h-4" />
                    {t('oneClickCreator.videoDuration')} {tiktokVideoDuration}s
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {TIKTOK_DURATIONS.map(duration => (
                      <button
                        key={duration}
                        onClick={() => setTiktokVideoDuration(duration)}
                        disabled={isGenerating}
                        className={getOptionButtonClass(
                          tiktokVideoDuration === duration,
                          selectedOptionClass.sky
                        )}
                      >
                        {duration}s
                      </button>
                    ))}
                  </div>
                  
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-pink-200">
                    <Volume2 className="w-3 h-3" />
                    {t('oneClickCreator.narratorVoice')}
                  </h3>
                  <div className="grid grid-cols-2 gap-1">
                    {VOICE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setVoiceOption(option.value)}
                        disabled={isGenerating}
                        className={`${getOptionButtonClass(
                          voiceOption === option.value,
                          selectedOptionClass.pink
                        )} text-left text-xs py-1.5`}
                      >
                        {t(option.labelKey)}
                      </button>
                    ))}
                  </div>

                </div>

                {/* Suggested Script Templates */}
                <div className={`${sidebarCardClass} one-click-settings-full`}>
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200">
                    <FileText className="w-3 h-3" />
                    {t('oneClickCreator.suggestedScripts')}
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {VIDEO_SCRIPT_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setTiktokScriptTemplate(template.id)}
                        disabled={isGenerating}
                        className={`group rounded-xl border px-3 py-2 text-left text-[11px] transition ${
                          tiktokScriptTemplate === template.id
                            ? 'border-amber-400/70 bg-amber-400/15 text-amber-100'
                            : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-300/50'
                        }`}
                      >
                        <div className="font-semibold">{template.title}</div>
                        <div className="mt-1 text-[10px] text-slate-400 group-hover:text-slate-300">
                          {template.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* TikTok Info */}
                {suggestedHashtags.length > 0 && (
                  <div className={`${hashtagsCardClass} one-click-settings-full`}>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-green-300">
                      <CheckCircle className="w-4 h-4" />
                      {t('oneClickCreator.suggestedHashtags')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {suggestedHashtags.map((tag, i) => (
                        <span key={i} className="bg-green-600/30 text-green-200 px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Toggle Compact Button removed from outer grid; placed inside main content for precise positioning */}


                    {/* CENTER - Main Content */}
          <div className={`${mainPanelClass} one-click-main-panel`}>
            {/* Scrollable Content Container */}
            <div className="flex h-full min-h-0 flex-1 flex-col space-y-2.5 overflow-y-auto pb-2.5 pr-0.5">
              {!isSessionWorkspaceMode && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className={stepUploadCardClass}>
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-amber-500">
                      <Upload className="h-3.5 w-3.5 text-amber-500" />
                      Character Image
                    </div>
                    <div
                      onClick={() => !isGenerating && fileInputRef.current?.click()}
                      data-testid="character-upload-dropzone"
                      className={`${stepUploadDropzoneClass} h-[188px] hover:bg-white/[0.03]`}
                    >
                      {characterImage ? (
                        <>
                          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[0.95rem] bg-white/20">
                            <img src={characterImage} alt="Character" className="max-h-full max-w-full rounded object-contain" />
                          </div>
                          <div className="absolute inset-0 rounded-[1.1rem] bg-[rgba(15,23,42,0.42)] opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                            <p className="text-white text-xs">{t('oneClickCreator.clickToChange')}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center">
                          <Upload className="mx-auto mb-2 h-7 w-7 text-slate-500" />
                          <p className="text-xs text-slate-500">{t('oneClickCreator.dragToUpload')}</p>
                          <p className="mt-1 text-xs text-slate-400">{t('oneClickCreator.orClickBelow')}</p>
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
                            setImageSource(prev => ({ ...prev, character: 'upload' }));
                          }
                        }}
                      />
                    </div>
                    <div className="mt-3 grid min-h-[40px] grid-cols-2 gap-2">
                      <button
                        data-testid="select-profile-button"
                        onClick={() => {
                          if (!isGenerating) {
                            setShowCharacterSelector(true);
                          }
                        }}
                        disabled={isGenerating}
                        className={stepUploadActionClass}
                      >
                        Select Profile
                      </button>
                      <button
                        onClick={() => {
                          if (!isGenerating) {
                            setGalleryPickerFor('character');
                            setShowGalleryPicker(true);
                          }
                        }}
                        disabled={isGenerating}
                        className={stepUploadActionClass}
                      >
                        <ImageIcon className="w-4 h-4" />
                        {t('oneClickCreator.chooseFromGallery')}
                      </button>
                    </div>
                  </div>

                  <div className={stepUploadCardClass}>
                    <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-600">
                      <Upload className="h-3.5 w-3.5 text-cyan-600" />
                      Product Image
                    </div>
                    <div
                      onClick={() => !isGenerating && productFileInputRef.current?.click()}
                      data-testid="product-upload-dropzone"
                      className={`${stepUploadDropzoneClass} h-[188px] hover:bg-white/[0.03]`}
                    >
                      {productImage ? (
                        <>
                          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[0.95rem] bg-white/20">
                            <img src={productImage} alt="Product" className="max-h-full max-w-full rounded object-contain" />
                          </div>
                          <div className="absolute inset-0 rounded-[1.1rem] bg-[rgba(15,23,42,0.42)] opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                            <p className="text-white text-xs">{t('oneClickCreator.clickToChange')}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center">
                          <Upload className="mx-auto mb-2 h-7 w-7 text-slate-500" />
                          <p className="text-xs text-slate-500">{t('oneClickCreator.dragToUpload')}</p>
                          <p className="mt-1 text-xs text-slate-400">{t('oneClickCreator.orClickBelow')}</p>
                        </div>
                      )}
                      <input
                        ref={productFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isGenerating}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => setProductImage(evt.target?.result);
                            reader.readAsDataURL(file);
                            setImageSource(prev => ({ ...prev, product: 'upload' }));
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!isGenerating) {
                          setGalleryPickerFor('product');
                          setShowGalleryPicker(true);
                        }
                      }}
                      disabled={isGenerating}
                      className={`${stepUploadActionClass} mt-3`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      {t('oneClickCreator.chooseFromGallery')}
                    </button>
                  </div>

                  <div className={stepUploadCardClass}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-violet-600">
                        <Wand2 className="w-3 h-3 text-violet-600" /> Scene
                      </p>
                      {sceneImage && (
                        <p className="text-[10px] font-medium text-violet-500">
                          {sceneOptions.find(s => s.value === selectedScene)?.label || 'Custom'}
                        </p>
                      )}
                    </div>
                    <div
                      onClick={() => !isGenerating && sceneFileInputRef.current?.click()}
                      className={`${stepUploadDropzoneClass} h-[188px] hover:bg-white/[0.03]`}
                    >
                        {sceneImage ? (
                          <>
                            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[0.95rem] bg-white/20">
                              <img src={sceneImage} alt="Scene" className="h-full w-full object-cover" />
                            </div>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (isGenerating) return;
                                setSceneImageMode('auto');
                                const autoSceneData = await resolveSceneImageDataUrl(selectedScene, aspectRatio);
                                setSceneImage(autoSceneData || null);
                              }}
                              disabled={isGenerating}
                              className="absolute right-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-red-300/70 bg-red-500/90 text-white opacity-0 shadow-lg shadow-black/40 transition-all hover:scale-105 hover:bg-red-400 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label="Remove scene reference"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                            <div className="absolute inset-0 z-10 rounded-[1.1rem] bg-[rgba(15,23,42,0.42)] opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                              <p className="text-white text-xs">{t('oneClickCreator.clickToChange')}</p>
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center">
                            <ImageIcon className="mx-auto mb-1 h-5 w-5 text-slate-500" />
                            <p className="text-xs text-slate-500">Click to add scene image</p>
                          </div>
                        )}
                      </div>
                    <input
                      ref={sceneFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isGenerating}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setSceneImage(evt.target?.result);
                            setSceneImageMode('custom');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="mt-3 grid min-h-[40px] grid-cols-2 gap-2">
                      <button
                        onClick={() => !isGenerating && sceneFileInputRef.current?.click()}
                        disabled={isGenerating}
                        className={stepUploadActionClass}
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </button>
                      <button
                        onClick={() => !isGenerating && setShowScenePicker(true)}
                        disabled={isGenerating}
                        className={stepUploadActionClass}
                      >
                        <Wand2 className="w-4 h-4" />
                        Picker
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              )}

            {sessions.length > 0 && (
              <div className={sessionShellClass}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                    <Clock className="h-4 w-4 text-sky-600" />
                    {t('oneClickCreator.generationSessions')} ({sessions.length})
                  </h3>
                  <span className="apple-option-chip rounded-full px-2 py-1 text-[10px] font-semibold text-slate-700">
                    {sessions.filter(s => s.completed).length}/{sessions.length} done
                  </span>
                </div>

                {(() => {
                  const activeSession = sessions.find(session => session.id === (activeSessionId || sessions[0]?.id)) || sessions[0];
                  const activeFlowId = activeSession?.flowId || activeSession?.preview?.flowId || null;
                  return (
                    <div className="grid min-h-0 flex-1 grid-rows-[auto,minmax(0,1fr)] gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 overflow-hidden">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {sessions.map((session) => {
                            const isActive = activeSession?.id === session.id;
                            const statusClass = session.error
                              ? "border-rose-500/40 text-rose-200"
                              : session.completed
                                ? "border-emerald-500/40 text-emerald-200"
                                : session.steps?.some(step => step.inProgress)
                                  ? "border-amber-500/40 text-amber-100"
                                  : "border-slate-600/70 text-slate-300";
                            return (
                              <button
                                key={session.id}
                                type="button"
                                onClick={() => setActiveSessionId(session.id)}
                                className={`rounded-2xl border px-3 py-2 text-left text-[11px] font-semibold transition ${isActive ? "apple-option-chip apple-option-chip-cool apple-option-chip-selected text-slate-900" : `studio-card-shell ${statusClass} hover:border-slate-300 hover:text-slate-900`}`}
                              >
                                <span className="block">Session #{session.id}</span>
                                <span className={`mt-1 block text-[10px] font-medium ${isActive ? "text-slate-500" : "text-current/80"}`}>
                                  {session.error ? "Needs attention" : session.completed ? "Completed" : session.steps?.some(step => step.inProgress) ? "Generating" : "Queued"}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {activeSession ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <SessionStatusPill status={getAffiliateSessionRunningStatus(activeSession)} label={activeSession.error ? 'Error' : activeSession.completed ? 'Done' : activeSession.steps?.some(step => step.inProgress) ? 'Running' : 'Ready'} />
                            <SessionStatusPill status={getAffiliateSessionStepStatus(activeSession, 'analyze')} label="Step 1" />
                            <SessionStatusPill status={getAffiliateSessionStepStatus(activeSession, 'generate-images-parallel')} label="Step 2" />
                            <SessionStatusPill status={getAffiliateSessionStepStatus(activeSession, 'deep-analysis')} label="Step 3" />
                            <SessionStatusPill status={getAffiliateSessionStepStatus(activeSession, 'generate-video')} label="Step 4" />
                            <SessionStatusPill status={getAffiliateSessionStepStatus(activeSession, 'generate-voiceover')} label="Step 5" />
                            <button
                              type="button"
                              onClick={() => {
                                if (activeFlowId) {
                                  setSelectedFlowId(activeFlowId);
                                  setShowSessionLogModal(true);
                                }
                              }}
                              disabled={!activeFlowId}
                              className="apple-option-chip inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Session Info
                            </button>
                          </div>
                        ) : null}
                      </div>

                      {activeSession ? (
                        <div className="min-h-0 overflow-y-auto pr-1">
                          <AffiliateSessionWorkspace session={activeSession} onRerunStep3={rerunAffiliateStep3} />
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            )}

            {useCase === 'affiliate-video-tiktok' && (
              <div className={sessionShellClass}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                    <Database className="h-4 w-4 text-sky-600" />
                    Recent DB Sessions
                  </h3>
                  <button
                    type="button"
                    onClick={loadRecentAffiliateSessions}
                    disabled={recentAffiliateSessionsLoading}
                    className="apple-option-chip inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {recentAffiliateSessionsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {recentAffiliateSessions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200/70 px-4 py-6 text-center text-xs text-slate-500">
                    {recentAffiliateSessionsLoading ? 'Loading sessions...' : 'No recent sessions yet.'}
                  </div>
                ) : (
                  <div className="grid max-h-[360px] gap-3 overflow-y-auto pr-1">
                    {recentAffiliateSessions.map((session) => (
                      <div key={session.sessionId} className="studio-card-shell flex min-h-[76px] items-start justify-between gap-4 rounded-2xl border px-4 py-5">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-800 break-all">{session.sessionId}</div>
                          <div className="mt-2 text-xs text-slate-500 leading-6">
                            {session.flowType} - {session.status} - {session.updatedAt ? new Date(session.updatedAt).toLocaleString() : ''}
                          </div>
                        {resumeRequiredFlows.has(session.sessionId) ? (
                          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-200/40 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Resume required
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFlowId(session.sessionId);
                            setShowSessionLogModal(true);
                          }}
                          className="apple-option-chip inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:text-slate-900"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => resumeAffiliateSession(session.sessionId)}
                          disabled={resumingSessionId === session.sessionId}
                          className="apple-option-chip inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {resumingSessionId === session.sessionId ? 'Resuming...' : 'Resume'}
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="apple-footer-bar one-click-footer-bar z-20 flex h-[60px] flex-shrink-0 items-center px-4">
        <div className="flex h-full w-full items-center justify-center">
          <button
            onClick={handleOneClickGeneration}
            disabled={!characterImage || !productImage || isGenerating}
            data-testid="one-click-generate-button"
            className="apple-cta-primary inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold leading-none transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('oneClickCreator.generating')} ({sessions.filter(s => s.completed).length}/{quantity})</span>
              </>
            ) : (
              <>
                <Rocket className="h-5 w-5" />
                <span>{t('oneClickCreator.oneClickGeneration')}</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>

      {/* Gallery Picker Modal */}
      <CharacterSelectorModal
        open={showCharacterSelector}
        onClose={() => setShowCharacterSelector(false)}
        onSelect={(c) => {
          setSelectedCharacterProfile(c);
          setCharacterImage(c.portraitUrl);
          setImageSource(prev => ({ ...prev, character: 'character-profile' }));
          setShowCharacterSelector(false);
        }}
      />

      <GalleryPicker
        isOpen={showGalleryPicker}
        onClose={() => {
          setShowGalleryPicker(false);
          setGalleryPickerFor(null);
        }}
        onSelect={(imageData) => {
          const resolvedImageUrl = imageData?.resolvedUrl || imageData?.thumbnail || imageData?.url;
          if (!imageData || !resolvedImageUrl) {
            console.error('Invalid image data from gallery:', imageData);
            alert(t('oneClickCreator.imageMissingUrl'));
            return;
          }

          if (imageData.assetId) {
            imageCacheRef.current.set(imageData.assetId, resolvedImageUrl);
          }

          if (galleryPickerFor === 'character') {
            setCharacterImage(resolvedImageUrl);
            setImageSource(prev => ({ ...prev, character: 'gallery' }));
          } else if (galleryPickerFor === 'product') {
            setProductImage(resolvedImageUrl);
            setImageSource(prev => ({ ...prev, product: 'gallery' }));
          }

          setShowGalleryPicker(false);
          setGalleryPickerFor(null);
        }}
        assetType="image"
        title={galleryPickerFor === 'character' ? t('oneClickCreator.selectCharacterImage') : t('oneClickCreator.selectProductImage')}
      />


      <ScenePickerModal
        isOpen={showScenePicker}
        onClose={() => setShowScenePicker(false)}
        scenes={sceneOptions}
        selectedScene={selectedScene}
        language={i18n.language || 'en'}
        aspectRatio={aspectRatio}
        onSelect={(value, scene) => {
          setSelectedScene(value);
          const isVi = (i18n.language || 'en').toLowerCase().startsWith('vi');
          setSelectedScenePrompt(isVi
            ? (scene?.sceneLockedPromptVi || scene?.sceneLockedPrompt || scene?.promptSuggestionVi || scene?.promptSuggestion || '')
            : (scene?.sceneLockedPrompt || scene?.sceneLockedPromptVi || scene?.promptSuggestion || scene?.promptSuggestionVi || ''));
        }}
      />

      {/* Session Log Modal */}
      <SessionLogModal
        isOpen={showSessionLogModal}
        onClose={() => {
          setShowSessionLogModal(false);
          setSelectedFlowId(null);
        }}
        sessionId={selectedFlowId}
        flowId={selectedFlowId}
      />
    </div>
  );
}





















