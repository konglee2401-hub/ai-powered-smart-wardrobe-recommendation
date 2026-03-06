/**
 * 1-Click Creator Page
 * Full step-by-step workflow: Upload → Auto-Analyze → Apply Recommendations → Generate Images → Generate Videos
 * With per-session management and real-time progress tracking
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload, Sparkles, Rocket, Loader2, ChevronDown, ChevronUp,
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
import VideoPromptEnhancedWithChatGPT from '../components/VideoPromptEnhancedWithChatGPT';
import ScenePickerModal from '../components/ScenePickerModal';
import { 
  calculateVideoCount, 
  VIDEO_PROVIDER_LIMITS, 
  getMaxDurationForProvider,
  VIDEO_SCENARIOS,
  VIDEO_DURATIONS,
  getScenarioByValue
} from '../constants/videoGeneration';

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
  { id: 'grok', label: 'Grok', icon: '🤖' },
  { id: 'google-flow', label: 'Google Flow', icon: '🌐' },
  { id: 'bfl', label: 'BFL FLUX', icon: '🎨' },
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
const DESIRED_OUTPUT_COUNT = 1;  // 💫 Default: Generate 1 session per click (user can increase in UI)
const DEFAULT_SCENE_VALUE = 'linhphap-tryon-room';


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


// Session component
function SessionRow({ session, isGenerating, onCancel, onViewLog, t }) {
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
          {t('oneClickCreator.session')} #{session.id}{session.completed && ' ✓'}
          {session.error && ' ✗'}
        </h4>
        {session.error && (
          <span className="text-xs bg-red-600/20 text-red-300 px-2 py-1 rounded">
            {session.error}
          </span>
        )}
      </div>

      {/* Steps Progress */}
      <div className={`grid gap-2 mb-4 ${session.steps?.length > 6 ? 'grid-cols-4' : 'grid-cols-4'}`}>
        {session.steps?.map(step => {
          // Find the step definition
          const allSteps = [...WORKFLOW_STEPS, ...WORKFLOW_STEPS_AFFILIATE_TIKTOK];
          const stepDef = allSteps.find(s => s.id === step.id);
          const status = getStepStatus(step.id);
          return (
            <div key={step.id} className="text-center">
              <div className="flex justify-center mb-1">
                {getStepIcon(status)}
              </div>
              <p className="text-xs text-gray-400 truncate">{stepDef?.name || step.id}</p>
            </div>
          );
        })}
      </div>

      {/* Compact Step Previews */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <details className="bg-gray-900/40 border border-gray-700 rounded p-2">
          <summary className="text-xs text-gray-300 cursor-pointer">📝 Step 1 Prompts</summary>
          <div className="mt-2 space-y-2">
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Wearing prompt</p>
              <pre className="text-[11px] text-gray-300 whitespace-pre-wrap max-h-24 overflow-y-auto">{session.step1Prompts?.wearing || 'Waiting...'}</pre>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">Holding prompt</p>
              <pre className="text-[11px] text-gray-300 whitespace-pre-wrap max-h-24 overflow-y-auto">{session.step1Prompts?.holding || 'Waiting...'}</pre>
            </div>
          </div>
        </details>

        <details className="bg-gray-900/40 border border-gray-700 rounded p-2" open={!!session.step2Images}>
          <summary className="text-xs text-gray-300 cursor-pointer">📸 Step 2 Images</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="bg-gray-950/70 rounded overflow-hidden">
              {session.step2Images?.wearing ? <img src={session.step2Images.wearing} alt="Wearing" className="w-full h-24 object-cover" /> : <div className="h-24 flex items-center justify-center text-[11px] text-gray-500">Waiting</div>}
              <p className="text-[11px] text-gray-500 text-center py-1">Wearing</p>
            </div>
            <div className="bg-gray-950/70 rounded overflow-hidden">
              {session.step2Images?.holding ? <img src={session.step2Images.holding} alt="Holding" className="w-full h-24 object-cover" /> : <div className="h-24 flex items-center justify-center text-[11px] text-gray-500">Waiting</div>}
              <p className="text-[11px] text-gray-500 text-center py-1">Holding</p>
            </div>
          </div>
        </details>

        <details className="bg-gray-900/40 border border-gray-700 rounded p-2" open={!!session.analysis?.videoScripts?.length}>
          <summary className="text-xs text-gray-300 cursor-pointer">🎬 Step 3 Scripts & Hashtags</summary>
          <div className="mt-2 space-y-2">
            <div className="max-h-28 overflow-y-auto space-y-1">
              {(session.analysis?.videoScripts || []).length > 0 ? (session.analysis.videoScripts.map((seg, idx) => (
                <div key={idx} className="text-[11px] text-gray-300">
                  <span className="text-gray-400">[{seg.segment}] {seg.duration}s:</span> {seg.script}
                </div>
              ))) : <p className="text-[11px] text-gray-500">Waiting...</p>}
            </div>
            <div className="flex flex-wrap gap-1">
              {(session.analysis?.hashtags || []).length > 0 ? session.analysis.hashtags.map((tag, idx) => (
                <span key={idx} className="text-[11px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded">#{String(tag).replace('#', '')}</span>
              )) : <p className="text-[11px] text-gray-500">No hashtags yet</p>}
            </div>
          </div>
        </details>

        <details className="bg-gray-900/40 border border-gray-700 rounded p-2" open={!!session.videos?.length}>
          <summary className="text-xs text-gray-300 cursor-pointer">🎥 Step 4 Videos</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(session.videos || []).length > 0 ? session.videos.map((video, idx) => (
              <video key={idx} src={video} controls className="w-full h-24 object-cover rounded bg-black" />
            )) : <p className="text-[11px] text-gray-500 col-span-2">Waiting...</p>}
          </div>
        </details>

        <details className="col-span-2 bg-gray-900/40 border border-gray-700 rounded p-2" open={!!(session.ttsText || session.analysis?.voiceoverScript)}>
          <summary className="text-xs text-gray-300 cursor-pointer">🎙️ Step 5 TTS Text</summary>
          <pre className="mt-2 text-[11px] text-gray-300 whitespace-pre-wrap max-h-28 overflow-y-auto">{session.ttsText || session.analysis?.voiceoverScript || 'Waiting...'}</pre>
        </details>
      </div>

      {/* Logs */}
      <div className="border-t border-gray-700 pt-3">
        <button
          onClick={() => setExpandedLogs(!expandedLogs)}
          className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
        >
          <span>{t('oneClickCreator.logs')} ({session.logs?.length || 0})</span>
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
              <p className="text-xs text-gray-600 italic">{t('oneClickCreator.noLogsYet')}</p>
            )}
          </div>
        )}
      </div>

      {/* View Session Log Button */}
      <div className="border-t border-gray-700 pt-3 flex gap-2">
        <button
          onClick={() => onViewLog && onViewLog(session.flowId)}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
        >
          <Database className="w-4 h-4" />
          {t('oneClickCreator.viewSessionLog')}
        </button>
        <button
          onClick={() => setExpandedLogs(false)}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
        >
          {t('oneClickCreator.collapseAll')}
        </button>
      </div>
    </div>
  );
}

export default function OneClickCreatorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

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
  const sceneFileInputRef = useRef(null); // 💫 NEW: Ref for scene file input

  // Gallery Picker State
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryPickerFor, setGalleryPickerFor] = useState(null); // 'character' or 'product'
  
  // 🎯 Track image source: gallery or file upload (to skip Drive upload for gallery images)
  const [imageSource, setImageSource] = useState({ character: 'upload', product: 'upload' }); // 'upload' or 'gallery'

  // Settings
  const [useCase, setUseCase] = useState('change-clothes');
  const [productFocus, setProductFocus] = useState('full-outfit');
  const [imageProvider, setImageProvider] = useState('bfl');
  const [videoProvider, setVideoProvider] = useState('google-flow');  // Aligned with image provider
  const [videoScenario, setVideoScenario] = useState('product-intro');  // Default scenario
  const [videoDuration, setVideoDuration] = useState(20);  // Default 20 seconds
  const [quantity, setQuantity] = useState(DESIRED_OUTPUT_COUNT);
  const [aspectRatio, setAspectRatio] = useState('16:9');
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

  // Workflow state
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sceneOptions, setSceneOptions] = useState([]);
  const [selectedScene, setSelectedScene] = useState(DEFAULT_SCENE_VALUE);
  const [selectedScenePrompt, setSelectedScenePrompt] = useState('');
  const [sceneImageMode, setSceneImageMode] = useState('auto'); // auto | custom
  const [showScenePicker, setShowScenePicker] = useState(false);




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
  const initSession = (id) => {
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
      error: null
    };
  };

  /**
   * Helper: Handle TikTok affiliate video workflow  
   * Steps: 1-Analyze, 2-Recommend, 3-Select Settings, 4-Generate 2 Images Parallel, 
   *        5-Deep Analysis, 6-Generate Video, 7-Generate Voiceover, 8-Finalize
   */
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

      // Safety timeout if no successful response for too long
      if (now - lastSuccessfulFetchAt > NO_DATA_TIMEOUT_MS) {
        markSessionPollingStopped('Preview polling stopped: no successful response for over 5 minutes.');
        return true;
      }

      try {
        const response = await fetch(`/api/ai/affiliate-video-tiktok/preview/${flowId}`);

        if (!response.ok) {
          // Stop immediately on backend 5xx to avoid infinite noisy polling
          if (response.status >= 500) {
            markSessionPollingStopped(`Preview polling stopped due to server error (${response.status}).`);
            return true;
          }

          // For non-500 errors, stop if stale for too long
          if (Date.now() - pollingStartedAt > NO_DATA_TIMEOUT_MS) {
            markSessionPollingStopped('Preview polling stopped: no valid preview data within 5 minutes.');
            return true;
          }

          return false;
        }

        lastSuccessfulFetchAt = Date.now();
        const data = await response.json();
        const preview = data.preview || {};
        const hasUsefulData = !!(
          preview.status || preview.step1 || preview.step2 || preview.step3 || preview.step4 || preview.step5
        );

        if (hasUsefulData) {
          lastUsefulDataAt = Date.now();
        }

        // Stop if API keeps responding but no meaningful data for 5 minutes
        if (!hasUsefulData && Date.now() - lastUsefulDataAt > NO_DATA_TIMEOUT_MS) {
          markSessionPollingStopped('Preview polling stopped: no preview updates for over 5 minutes.');
          return true;
        }

        setSessions(prev => prev.map(s => {
          if (s.id !== sessionId) return s;

          const nextSession = { ...s };

          if (preview.step1) {
            nextSession.step1Prompts = {
              wearing: preview.step1.wearingPrompt,
              holding: preview.step1.holdingPrompt
            };
            nextSession.steps = (nextSession.steps || []).map(step => step.id === 'analyze' ? { ...step, completed: true, inProgress: false } : step);
          }

          if (preview.step2) {
            nextSession.step2Images = {
              wearing: preview.step2.wearingImagePath,
              holding: preview.step2.holdingImagePath
            };
            nextSession.steps = (nextSession.steps || []).map(step => step.id === 'generate-images-parallel' ? { ...step, completed: true, inProgress: false } : step);
          }

          if (preview.step3) {
            nextSession.analysis = {
              ...(nextSession.analysis || {}),
              videoScripts: preview.step3.videoScripts || [],
              hashtags: preview.step3.hashtags || [],
              voiceoverScript: preview.step3.voiceoverScript || ''
            };
            nextSession.steps = (nextSession.steps || []).map(step => step.id === 'deep-analysis' ? { ...step, completed: true, inProgress: false } : step);
          }

          if (preview.step4) {
            nextSession.videos = (preview.step4.videos || []).map(v => v.path || v.url).filter(Boolean);
            nextSession.steps = (nextSession.steps || []).map(step => step.id === 'generate-video' ? { ...step, completed: true, inProgress: false } : step);
          }

          if (preview.step5) {
            nextSession.ttsText = preview.step5.ttsText || nextSession.ttsText;
            nextSession.steps = (nextSession.steps || []).map(step => step.id === 'generate-voiceover' ? { ...step, completed: true, inProgress: false } : step);
          }

          if (preview.status === 'completed') {
            nextSession.completed = true;
            nextSession.steps = (nextSession.steps || []).map(step => ({ ...step, completed: true, inProgress: false }));
          }

          if (preview.status === 'failed') {
            nextSession.error = nextSession.error || 'Flow failed';
            nextSession.steps = (nextSession.steps || []).map(step => ({ ...step, inProgress: false }));
          }

          return nextSession;
        }));

        return preview.status === 'completed' || preview.status === 'failed' || stopRef.stop;
      } catch (e) {
        // Stop polling if no data can be fetched for too long
        if (Date.now() - lastSuccessfulFetchAt > NO_DATA_TIMEOUT_MS) {
          markSessionPollingStopped('Preview polling stopped: unable to fetch preview for over 5 minutes.');
          return true;
        }

        return stopRef.stop;
      }
    };

    let pollCount = 0;
    const maxPolls = Math.ceil(NO_DATA_TIMEOUT_MS / POLL_INTERVAL_MS) + 120; // keep hard cap with buffer

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
      console.log('🎬 Starting Affiliate Video TikTok Flow');
      console.log(`📋 Parameters received:`);
      console.log(`  Character base64: ${characterImageBase64?.substring(0, 50)}...${characterImageBase64?.length}B`);
      console.log(`  Product base64: ${productImageBase64?.substring(0, 50)}...${productImageBase64?.length}B`);
      if (sceneImageBase64) {
        console.log(`  Scene base64: ${sceneImageBase64?.substring(0, 50)}...${sceneImageBase64?.length}B`);
      }
      console.log(`  Options: ${JSON.stringify(recommendedOptions)}`);
      console.log(`  Analysis: ${analysisResult ? 'present' : 'missing'}`);
      console.log(`  Flow ID: ${flowId}`);  // 💫 Log flowId
      console.log(`  Language: ${language}`);  // 💫 Log language
      
      // Extract voice settings
      const [voiceGender, voicePace] = voiceOption.split('-');
      
      // Construct payload from parameters - send base64 strings as JSON
      const payload = {
        characterImage: characterImageBase64,  // 💫 Keep as base64 string (not Blob)
        productImage: productImageBase64,      // 💫 Keep as base64 string (not Blob)
        sceneImage: sceneImageBase64,          // 💫 Keep as base64 string if available
        videoDuration: tiktokVideoDuration,
        voiceGender,
        voicePace,
        productFocus: productFocus || 'full-outfit',
        imageProvider: imageProvider || 'google-flow',
        videoProvider: videoProvider || 'google-flow',
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
      console.log(`   Character base64: ${characterImageBase64.substring(0, 50)}...${characterImageBase64.length}B`);
      console.log(`   Product base64: ${productImageBase64.substring(0, 50)}...${productImageBase64.length}B`);
      if (sceneImageBase64) {
        console.log(`   Scene base64: ${sceneImageBase64.substring(0, 50)}...${sceneImageBase64.length}B (auto-fetched)`);
      }

      const stopRef = { stop: false };
      const stopPolling = startPreviewPolling(flowId, sessionId, stopRef);

      const mainFlowResponse = await fetch('/api/ai/affiliate-video-tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      stopRef.stop = true;
      if (typeof stopPolling === 'function') stopPolling();

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

      setTiktokFlowId(mainFlowData.flowId || mainFlowData.data?.flowId || flowId);
      setDeepAnalysisResult(mainFlowData.data?.step3?.analysis || null);
      setSuggestedHashtags(mainFlowData.data?.step3?.analysis?.hashtags || []);
      setGeneratedVideo(mainFlowData.data?.step4?.videos?.[0] || null);
      setGeneratedVoiceover(mainFlowData.data?.step5?.ttsText || mainFlowData.data?.step3?.analysis?.voiceoverScript || null);

      return mainFlowData;

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

  // Main generation flow
  const handleOneClickGeneration = async () => {
    if (!characterImage || !productImage) {
      alert(t('oneClickCreator.uploadBothImagesFirst'));
      return;
    }

    setIsGenerating(true);
    setSessions([]);
    let sessionCreationFailed = false;

    // Convert images to base64
    console.log('📸 Converting images to base64...');
    console.log(`Character image length: ${characterImage.length}B`);
    console.log(`Product image length: ${productImage.length}B`);

    let finalSceneImageData = sceneImage;
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

    console.log(`Scene image length: ${finalSceneImageData.length}B (${sceneImageMode === 'custom' ? 'custom upload' : 'scene lock default'})`);

    const charBase64 = characterImage.split(',')[1];
    const prodBase64 = productImage.split(',')[1];
    const sceneBase64 = finalSceneImageData.split(',')[1];

    
    // 💫 LOG: Verify base64 was extracted
    console.log(`✅ Extracted base64 strings:`);
    console.log(`  Character: ${charBase64?.substring(0, 50)}...${charBase64?.length}B`);
    console.log(`  Product: ${prodBase64?.substring(0, 50)}...${prodBase64?.length}B`);
    if (sceneBase64) {
      console.log(`  Scene: ${sceneBase64?.substring(0, 50)}...${sceneBase64?.length}B (from auto-fetch or manual upload)`);
    }

    // Create sessions for each quantity
    const newSessions = Array.from({ length: quantity }).map((_, idx) => initSession(idx + 1));
    setSessions(newSessions);

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
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold">{t('oneClickCreator.title')}</h1>
              <p className="text-sm text-gray-400">{t('oneClickCreator.subtitle')}</p>
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

      <div className="max-w-7xl mx-auto px-6 py-6 h-[calc(100vh-80px)]">

        <div className="grid grid-cols-12 gap-6 h-full">
          {/* LEFT SIDEBAR - Settings */}
          <div className="col-span-3 space-y-4 overflow-y-auto pr-2">
            {/* Use Case */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                {t('oneClickCreator.useCase')}
              </h3>
              <select
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3 py-2 rounded bg-gray-700 text-gray-200 text-sm border border-gray-600 focus:border-amber-500 outline-none disabled:opacity-50"
              >
                {USE_CASES.map(uc => (
                  <option key={uc.value} value={uc.value}>{t(uc.labelKey)}</option>
                ))}
              </select>
            </div>

            {/* Product Focus */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('oneClickCreator.productFocus')}
              </h3>
              <select
                value={productFocus}
                onChange={(e) => setProductFocus(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3 py-2 rounded bg-gray-700 text-gray-200 text-sm border border-gray-600 focus:border-amber-500 outline-none disabled:opacity-50"
              >
                {FOCUS_OPTIONS.map(fo => (
                  <option key={fo.value} value={fo.value}>{t(fo.labelKey)}</option>
                ))}
              </select>
            </div>

            {/* Analysis Provider Info */}
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t('oneClickCreator.analysisAuto')}
              </h3>
              <p className="text-xs text-blue-200">
                🤖 {t('oneClickCreator.analysisProvider')}
              </p>
            </div>

            {/* Image Provider */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                {t('oneClickCreator.imageProvider')}
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


            {/* Prompt Mode */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">{t('oneClickCreator.useShortPrompt')}</h3>
              <button
                type="button"
                onClick={() => setUseShortPrompt(prev => !prev)}
                disabled={isGenerating}
                className={`w-full px-3 py-2 rounded text-sm font-medium transition-all disabled:opacity-50 ${
                  useShortPrompt
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                {useShortPrompt ? t('oneClickCreator.enabled') : t('oneClickCreator.disabled')}
              </button>
              <p className="text-xs text-gray-400 mt-2">{t('oneClickCreator.shortPromptHint')}</p>
            </div>

            {/* Video Provider */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <Video className="w-4 h-4" />
                {t('oneClickCreator.videoProvider')}
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
              <h3 className="text-sm font-semibold text-gray-200 mb-3">{t('oneClickCreator.quantity')}</h3>
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
              <h3 className="text-sm font-semibold text-gray-200 mb-3">{t('oneClickCreator.aspectRatio')}</h3>
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
                {t('oneClickCreator.videoGenerationAuto')}
              </h3>
              <p className="text-xs text-purple-200 mb-2">
                {videoDuration}s video with scenario: <span className="font-bold">{VIDEO_SCENARIOS.find(s => s.value === videoScenario)?.label}</span>
              </p>
              <p className="text-xs text-purple-200">
                {calculateVideoCount(videoProvider, videoDuration)} clips via <span className="font-bold">{VIDEO_PROVIDERS.find(p => p.id === videoProvider)?.label}</span>
              </p>
            </div>

            {/* TikTok-Specific Settings */}
            {useCase === 'affiliate-video-tiktok' && (
              <>
                {/* Video Duration Selector */}
                <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t('oneClickCreator.videoDuration')}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {TIKTOK_DURATIONS.map(duration => (
                      <button
                        key={duration}
                        onClick={() => setTiktokVideoDuration(duration)}
                        disabled={isGenerating}
                        className={`px-3 py-2 rounded text-sm font-semibold transition-all disabled:opacity-50 ${
                          tiktokVideoDuration === duration
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                        }`}
                      >
                        {duration}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Options Selector */}
                <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-pink-300 mb-3 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    {t('oneClickCreator.narratorVoice')}
                  </h3>
                  <div className="space-y-1.5">
                    {VOICE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setVoiceOption(option.value)}
                        disabled={isGenerating}
                        className={`w-full px-3 py-2 rounded text-sm font-medium transition-all disabled:opacity-50 text-left ${
                          voiceOption === option.value
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                        }`}
                      >
                        {t(option.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TikTok Info */}
                {suggestedHashtags.length > 0 && (
                  <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-green-300 mb-2 flex items-center gap-2">
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

          {/* CENTER - Main Content */}
          <div className="col-span-9 space-y-0 flex flex-col overflow-hidden">
            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {/* Upload Section */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4" />
{t('oneClickCreator.uploadImagesStep')}
                <button onClick={() => setShowCharacterSelector(true)} className="ml-3 px-2 py-1 text-xs rounded bg-fuchsia-600">Select Character Profile</button>
              </h3>

              <div className="mb-4 p-3 rounded-lg border border-purple-700/60 bg-purple-950/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-purple-300">Scene Locked</p>
                    <p className="text-sm text-white font-medium">{sceneOptions.find(s => s.value === selectedScene)?.label || selectedScene || 'Not selected'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScenePicker(true)}
                    className="px-3 py-1 text-xs rounded bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    Pick Scene
                  </button>
                </div>
                <details className="mt-2">
                  <summary className="text-xs text-purple-200 cursor-pointer">Locked prompt</summary>
                  <p className="text-xs text-gray-200 mt-1">{selectedScenePrompt || 'No locked prompt'}</p>
                </details>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Character Image */}
                <div className="space-y-2">
                  <div
                    onClick={() => !isGenerating && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500 transition-colors disabled:opacity-50 relative group"
                  >
                    {characterImage ? (
                      <>
                        <img src={characterImage} alt="Character" className="w-full h-40 object-cover rounded" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                          <p className="text-white text-xs">{t('oneClickCreator.clickToChange')}</p>
                        </div>
                      </>
                    ) : (
                      <div className="py-8">
                        <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                        <p className="text-sm text-gray-400">{t('oneClickCreator.dragToUpload')}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('oneClickCreator.orClickBelow')}</p>
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
                          setImageSource(prev => ({ ...prev, character: 'upload' })); // 🎯 Mark as uploaded file
                        }
                      }}
                    />
                  </div>
                  {/* 💫 NEW: Gallery picker button for character image */}
                  <button
                    onClick={() => {
                      if (!isGenerating) {
                        setGalleryPickerFor('character');
                        setShowGalleryPicker(true);
                      }
                    }}
                    disabled={isGenerating}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {t('oneClickCreator.chooseFromGallery')}
                  </button>
                </div>

                {/* Product Image */}
                <div className="space-y-2">
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
                          setImageSource(prev => ({ ...prev, product: 'upload' })); // 🎯 Mark as uploaded file
                        }
                      };
                      input.click();
                    }}
                    className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500 transition-colors disabled:opacity-50 relative group"
                  >
                    {productImage ? (
                      <>
                        <img src={productImage} alt="Product" className="w-full h-40 object-cover rounded" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                          <p className="text-white text-xs">{t('oneClickCreator.clickToChange')}</p>
                        </div>
                      </>
                    ) : (
                      <div className="py-8">
                        <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                        <p className="text-sm text-gray-400">{t('oneClickCreator.dragToUpload')}</p>
                        <p className="text-xs text-gray-500 mt-1">{t('oneClickCreator.orClickBelow')}</p>
                      </div>
                    )}
                  </div>
                  {/* 💫 NEW: Gallery picker button for product image */}
                  <button
                    onClick={() => {
                      if (!isGenerating) {
                        setGalleryPickerFor('product');
                        setShowGalleryPicker(true);
                      }
                    }}
                    disabled={isGenerating}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {t('oneClickCreator.chooseFromGallery')}
                  </button>
                </div>
              </div>

              {/* 💫 NEW: Scene Reference Image (Optional) */}
              <div className="border border-dashed border-gray-600 rounded-lg p-3 bg-gray-900/50">
                <p className="text-xs uppercase text-gray-400 font-semibold mb-2 flex items-center gap-2">
                  <Wand2 className="w-3 h-3" /> Scene Reference Image (Optional)
                </p>
                <p className="text-xs text-gray-500 mb-3">Upload a reference image of your scene to ensure consistent background and lighting across all generations.</p>
                
                <div className="flex gap-2">
                  <div
                    onClick={() => !isGenerating && sceneFileInputRef.current?.click()}
                    className="flex-1 border-2 border-dashed border-gray-600 rounded-lg p-3 text-center cursor-pointer hover:border-blue-500 transition-colors disabled:opacity-50 relative group"
                  >
                    {sceneImage ? (
                      <>
                        <img src={sceneImage} alt="Scene" className="w-full h-24 object-cover rounded" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                          <p className="text-white text-xs">{t('oneClickCreator.clickToChange')}</p>
                        </div>
                      </>
                    ) : (
                      <div className="py-4">
                        <ImageIcon className="w-5 h-5 mx-auto text-gray-500 mb-1" />
                        <p className="text-xs text-gray-400">Click to add scene image</p>
                      </div>
                    )}
                  </div>
                  
                  {sceneImage && (
                    <button
                      onClick={async () => {
                        if (isGenerating) return;
                        setSceneImageMode('auto');
                        const autoSceneData = await resolveSceneImageDataUrl(selectedScene, aspectRatio);
                        setSceneImage(autoSceneData || null);
                      }}
                      disabled={isGenerating}
                      className="px-2 py-2 text-xs rounded bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 transition-colors flex items-center gap-1"
                    >
                      ✕ Remove
                    </button>
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
              </div>
            </div>

            {/* Sessions Display (now inside scrollable container) */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('oneClickCreator.generationSessions')} ({sessions.length})
                </h3>
                
                {sessions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">{t('oneClickCreator.sessionsWillAppear')}</p>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        isGenerating={isGenerating}
                        t={t}
                        onViewLog={(flowId) => {
                          setSelectedFlowId(flowId);
                          setShowSessionLogModal(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Action Button */}
            <button
              onClick={handleOneClickGeneration}
              disabled={!characterImage || !productImage || isGenerating}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center justify-center gap-2 transition-all mt-4 flex-shrink-0 sticky bottom-0 z-10"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('oneClickCreator.generating')} ({sessions.filter(s => s.completed).length}/{quantity})
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  {t('oneClickCreator.oneClickGeneration')}
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
          if (!imageData || !imageData.url) {
            console.error('❌ Invalid image data from gallery:', imageData);
            alert(t('oneClickCreator.imageMissingUrl'));
            return;
          }
          
          console.log(`🖼️ Gallery image selected:`, { assetId: imageData.assetId, name: imageData.name, url: imageData.url });
          
          if (galleryPickerFor === 'character') {
            console.log(`⏳ Loading character image from gallery...`);
            
            // Helper function to fetch with retry for pending assets
            const fetchWithRetry = (url, attempt = 1, maxAttempts = 3) => {
              fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'image/*' }
              })
                .then(res => {
                  // Handle 503 (asset still processing) with retry
                  if (res.status === 503) {
                    const retryAfter = res.headers?.get('Retry-After') || '5';
                    const waitTime = parseInt(retryAfter) * 1000;
                    
                    if (attempt < maxAttempts) {
                      console.log(`⏳ Asset is being prepared... retrying in ${retryAfter}s (attempt ${attempt}/${maxAttempts})`);
                      setTimeout(() => fetchWithRetry(url, attempt + 1, maxAttempts), waitTime);
                      return;
                    } else {
                      throw new Error('Asset is still being prepared after multiple retries');
                    }
                  }
                  
                  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch image`);
                  return res.blob();
                })
                .then(blob => {
                  if (!blob || blob.size === 0) throw new Error('Received empty blob');
                  console.log(`✅ Image loaded: ${blob.size} bytes, type: ${blob.type}`);
                  // Convert blob to data URL for consistent storage
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const dataUrl = evt.target?.result;
                    setCharacterImage(dataUrl);
                    setImageSource(prev => ({ ...prev, character: 'gallery' })); // 🎯 Mark as from gallery
                    console.log(`✨ Character image updated as data URL (${dataUrl?.length}B)`);
                  };
                  reader.readAsDataURL(blob);
                })
                .catch(err => {
                  console.error('❌ Failed to load gallery image:', err);
                  alert(`${t('oneClickCreator.failedToLoadImage')}: ${err.message}`);
                });
            };
            
            fetchWithRetry(imageData.url);
          } else if (galleryPickerFor === 'product') {
            console.log(`⏳ Loading product image from gallery...`);
            
            // Helper function to fetch with retry for pending assets
            const fetchWithRetry = (url, attempt = 1, maxAttempts = 3) => {
              fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'image/*' }
              })
                .then(res => {
                  // Handle 503 (asset still processing) with retry
                  if (res.status === 503) {
                    const retryAfter = res.headers?.get('Retry-After') || '5';
                    const waitTime = parseInt(retryAfter) * 1000;
                    
                    if (attempt < maxAttempts) {
                      console.log(`⏳ Asset is being prepared... retrying in ${retryAfter}s (attempt ${attempt}/${maxAttempts})`);
                      setTimeout(() => fetchWithRetry(url, attempt + 1, maxAttempts), waitTime);
                      return;
                    } else {
                      throw new Error('Asset is still being prepared after multiple retries');
                    }
                  }
                  
                  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch image`);
                  return res.blob();
                })
                .then(blob => {
                  if (!blob || blob.size === 0) throw new Error('Received empty blob');
                  console.log(`✅ Image loaded: ${blob.size} bytes, type: ${blob.type}`);
                  // Convert blob to data URL for consistent storage
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const dataUrl = evt.target?.result;
                    setProductImage(dataUrl);
                    setImageSource(prev => ({ ...prev, product: 'gallery' })); // 🎯 Mark as from gallery
                    console.log(`✨ Product image updated as data URL (${dataUrl?.length}B)`);
                  };
                  reader.readAsDataURL(blob);
                })
                .catch(err => {
                  console.error('❌ Failed to load gallery image:', err);
                  alert(`${t('oneClickCreator.failedToLoadImage')}: ${err.message}`);
                });
            };
            
            fetchWithRetry(imageData.url);
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
