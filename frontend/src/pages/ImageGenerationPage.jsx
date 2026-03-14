/**
 * K-Creative Studio - Enhanced Virtual Try-On
 * - Step 1: Upload images (Character + Product)
 * - Step 2: AI Analysis with breakdown & extraction
 * - Step 3: Style customization & Prompt building (Merged)
 * - Step 4: Image generation with options
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload, Sparkles, FileText, Rocket, Image,
  Loader2, RefreshCw, X, Wand2, Shirt, Target, Save, ChevronRight, ChevronUp, ChevronDown, Shuffle, Zap, Database, Settings, BrainCircuit, SlidersHorizontal
} from 'lucide-react';

import { unifiedFlowAPI, browserAutomationAPI, promptsAPI, aiOptionsAPI, affiliateVideoTiktokAPI } from '../services/api';
import { getAuthHeaders } from '../services/authHeaders';

// Import Google Drive API
import driveAPI from '../services/driveAPI';

// Import Asset Service
import assetService from '../services/assetService';

// New: Session tracking and advanced prompt engineering
import SessionHistoryService from '../services/sessionHistoryService';
import { SessionHistory, generateSessionId } from '../utils/sessionHistory';
import { PromptLayering, PromptVariationGenerator, GrokConversationEnhancer } from '../utils/advancedPromptEngineering';

import AnalysisBreakdown from '../components/AnalysisBreakdown';
import RecommendationSelector from '../components/RecommendationSelector';
import CharacterProductSummary from '../components/CharacterProductSummary';
import PromptEditor from '../components/PromptEditor';
import GenerationOptions from '../components/GenerationOptions';
import GenerationResult from '../components/GenerationResult';
import PromptQualityIndicator from '../components/PromptQualityIndicator';
import Step3EnhancedWithSession from '../components/Step3EnhancedWithSession';
import ImagePromptWithTemplates from '../components/ImagePromptWithTemplates';
import GalleryPicker from '../components/GalleryPicker';
import SessionLogModal from '../components/SessionLogModal';
import ModalPortal from '../components/ModalPortal';
import ScenePickerModal from '../components/ScenePickerModal';
import CharacterSelectorModal from '../components/CharacterSelectorModal';
import PageHeaderBar from '../components/PageHeaderBar';
import { STYLE_CATEGORIES } from '../components/Step3Enhanced';
import { captureGenerationSession, resumeSession, getGenerationSessions, getGenerationSessionDetail } from '../services/generationSessionsService';
import {
  IMAGE_STUDIO_USE_CASES,
  getImageUseCaseLabel,
  getImageUseCaseUploadInstruction,
  getImageUseCaseInputSchema
} from '../config/imageUseCaseMatrix';
import { getRecommendationLabel } from '../utils/recommendationMeta';

// Steps - Style and Prompt merged into single step
const STEPS = [
  { id: 1, nameKey: 'imageGeneration.upload', icon: Upload },
  { id: 2, nameKey: 'imageGeneration.analysis', icon: BrainCircuit },
  { id: 3, nameKey: 'imageGeneration.stylePrompt', icon: SlidersHorizontal },
  { id: 4, nameKey: 'imageGeneration.generate', icon: Rocket },
];

// ?? Image Generation Configuration
const DESIRED_OUTPUT_COUNT = 2;  // Number of images to generate per request
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Use cases
const USE_CASES = [
  { value: 'change-clothes', label: 'changeClothes', description: 'M?c s?n ph?m l�n ngu?i m?u' },
  { value: 'character-holding-product', label: 'characterHoldingProduct', description: 'Nh�n v?t c?m s?n ph?m tr�n tay' },
  { value: 'affiliate-video-tiktok', label: 'affiliateVideoTikTok', description: 'Video affiliate TikTok 9:16 (lu?ng Step 1 + Step 2)' },
  { value: 'ecommerce-product', label: 'ecommerce', description: '?nh s?n ph?m thuong m?i' },
  { value: 'social-media', label: 'socialMedia', description: 'B�i dang m?ng x� h?i' },
  { value: 'fashion-editorial', label: 'editorial', description: 'B�i b�o th?i trang chuy�n nghi?p' },
  { value: 'lifestyle-scene', label: 'lifestyle', description: 'C?nh s?ng h�ng ng�y' },
  { value: 'before-after', label: 'beforeAfter', description: 'So s�nh tru?c/sau' },
];

const ACTIVE_IMAGE_USE_CASES = IMAGE_STUDIO_USE_CASES.length > 0
  ? IMAGE_STUDIO_USE_CASES.map((item) => ({
      value: item.value,
      label: item.labelKey,
      description: item.description
    }))
  : USE_CASES;

// Focus options
const FOCUS_OPTIONS = [
  { value: 'full-outfit', label: 'fullOutfit', description: 'To�n b? trang ph?c' },
  { value: 'top', label: 'top', description: 'Ph?n tr�n (�o)' },
  { value: 'bottom', label: 'bottom', description: 'Ph?n du?i (qu?n/v�y)' },
  { value: 'shoes', label: 'shoes', description: 'Gi�y' },
  { value: 'accessories', label: 'accessories', description: 'Ph? ki?n' },
  { value: 'specific-item', label: 'specific', description: 'M�n d? c? th?' },
];

const USE_CASE_DISPLAY_LABELS = {
  'change-clothes': 'Change Clothes',
  'character-holding-product': 'Holding Product',
  'affiliate-video-tiktok': 'Tiktok Affiliate',
  'ecommerce-product': 'E-commerce',
  'social-media': 'Social Media',
  'fashion-editorial': 'Editorial',
  'lifestyle-scene': 'Lifestyle',
  'before-after': 'Before / After',
};

const FOCUS_DISPLAY_LABELS = {
  'full-outfit': 'Full Outfit',
  top: 'Top',
  bottom: 'Bottom',
  shoes: 'Shoes',
  accessories: 'Accessories',
  'specific-item': 'Specific Item',
};

const getUseCaseDisplayLabel = (value) => getImageUseCaseLabel(value);
const getFocusDisplayLabel = (value) => FOCUS_DISPLAY_LABELS[value] || value;

const normalizePublicUrl = (value) => {
  if (!value) return null;
  const normalized = String(value).replace(/\\/g, '/');

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }

  if (normalized.startsWith('/')) {
    return API_BASE_URL.replace('/api', '') + normalized;
  }

  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    return API_BASE_URL.replace('/api', '') + normalized.slice(uploadsIndex);
  }

  const tempIndex = normalized.indexOf('/temp/');
  if (tempIndex >= 0) {
    return API_BASE_URL.replace('/api', '') + normalized.slice(tempIndex);
  }

  return API_BASE_URL.replace('/api', '') + '/' + normalized;
};

const normalizeAssetUrl = (url) => {
  if (!url) return null;
  const normalized = url.replace(/\\/g, '/');

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    try {
      const baseHost = (API_BASE_URL || '').replace('/api', '');
      if (baseHost && normalized.includes('localhost:5000')) {
        return normalized.replace(/https?:\/\/localhost:5000/gi, baseHost);
      }
    } catch (err) {
      // ignore
    }
    return normalized;
  }

  const tempMatch = normalized.match(/[\\/](temp)[\\/](.+)/i);
  if (tempMatch) {
    return `${API_BASE_URL.replace('/api', '')}/temp/${tempMatch[2]}`;
  }

  if (normalized.startsWith('/')) {
    return `${API_BASE_URL.replace('/api', '')}${normalized}`;
  }

  return `${API_BASE_URL.replace('/api', '')}/${normalized}`;
};

const getSceneLockedPrompt = (scene, language = 'en') => {
  const isVi = (language || 'en').toLowerCase().startsWith('vi');
  return isVi
    ? (scene?.sceneLockedPromptVi || scene?.sceneLockedPrompt || scene?.promptSuggestionVi || scene?.promptSuggestion || '')
    : (scene?.sceneLockedPrompt || scene?.sceneLockedPromptVi || scene?.promptSuggestion || scene?.promptSuggestionVi || '');
};

const getScenePreviewUrl = (scene, aspectRatio = '9:16') => {
  if (!scene) return null;

  if (scene.sceneLockedImageUrls && typeof scene.sceneLockedImageUrls === 'object') {
    const exact = scene.sceneLockedImageUrls[aspectRatio];
    if (exact) return normalizeAssetUrl(exact);

    if (aspectRatio === '16:9' && scene.sceneLockedImageUrls['9:16']) {
      return normalizeAssetUrl(scene.sceneLockedImageUrls['9:16']);
    }
    if (aspectRatio === '9:16' && scene.sceneLockedImageUrls['16:9']) {
      return normalizeAssetUrl(scene.sceneLockedImageUrls['16:9']);
    }
  }

  return normalizeAssetUrl(scene.sceneLockedImageUrl || scene.previewImage);
};

function ProviderGlyph({ providerId }) {
  const glyphClass = 'h-[18px] w-[18px]';

  if (providerId === 'google-flow') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={glyphClass}>
        <path d="M5 12c0-3.5 2.4-6 6-6 1.8 0 3.3.6 4.5 1.8" />
        <path d="M19 12c0 3.5-2.4 6-6 6-1.8 0-3.3-.6-4.5-1.8" />
        <path d="M14.5 5.5h2.8v2.8" />
        <path d="M9.5 18.5H6.7v-2.8" />
      </svg>
    );
  }

  if (providerId === 'bfl') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={glyphClass}>
        <path d="M12 3.5 5 7.5v8.8l7 4 7-4V7.5l-7-4Z" />
        <path d="m8.5 9.2 3.5 2 3.5-2" />
        <path d="M12 11.2v5.6" />
      </svg>
    );
  }

  if (providerId === 'zai') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={glyphClass}>
        <path d="M6 6h12L6 18h12" />
      </svg>
    );
  }

  if (providerId === 'grok') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={glyphClass}>
        <path d="M8 6h5a5 5 0 1 1 0 10H8z" />
        <path d="m12 11 5 7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={glyphClass}>
      <path d="M7 5h6l4 4v10H7z" />
      <path d="M13 5v4h4" />
      <path d="M9.25 15.5c.9-1.7 1.95-2.55 3.15-2.55 1.27 0 2.38.85 3.35 2.55" />
      <circle cx="10.2" cy="10.2" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Helper to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const urlToFile = async (url, filename = 'character-reference.jpg') => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
};

const MULTI_VALUE_OPTION_CATEGORIES = new Set(['accessories']);
const SKIPPED_OPTION_VALUES = new Set(['', 'not set', 'not-applicable', 'not-needed', 'keep-current']);

const normalizeOptionValueForStorage = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const shouldSkipOptionValue = (value) => {
  const normalized = normalizeOptionValueForStorage(value).toLowerCase();
  return SKIPPED_OPTION_VALUES.has(normalized);
};

const getValuesForCategorySave = (category, value) => {
  if (Array.isArray(value)) {
    return value
      .map(normalizeOptionValueForStorage)
      .filter((item) => item && !shouldSkipOptionValue(item));
  }

  const normalized = normalizeOptionValueForStorage(value);
  if (!normalized || shouldSkipOptionValue(normalized)) {
    return [];
  }

  if (MULTI_VALUE_OPTION_CATEGORIES.has(category) && normalized.includes(',')) {
    return normalized
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item && !shouldSkipOptionValue(item));
  }

  return [normalized];
};

const groupPromptOptionsByCategory = (response) => {
  const rawOptions = Array.isArray(response?.data) ? response.data : [];

  return rawOptions.reduce((grouped, option) => {
    if (!option?.category || !option?.value) {
      return grouped;
    }

    if (!grouped[option.category]) {
      grouped[option.category] = [];
    }

    const exists = grouped[option.category].some((entry) => entry.value === option.value);
    if (!exists) {
      grouped[option.category].push(option);
    }

    return grouped;
  }, {});
};

const normalizeAppliedOptionValue = (category, value) => {
  if (Array.isArray(value)) {
    return value
      .map(normalizeOptionValueForStorage)
      .filter((item) => item && !shouldSkipOptionValue(item));
  }

  const normalized = normalizeOptionValueForStorage(value);
  if (!normalized || shouldSkipOptionValue(normalized)) {
    return null;
  }

  if (MULTI_VALUE_OPTION_CATEGORIES.has(category) && normalized.includes(',')) {
    const values = normalized
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item && !shouldSkipOptionValue(item));
    return values.length > 0 ? values : null;
  }

  return normalized;
};

const buildAutoRecommendationDecisions = (recommendations = {}, saveStrategy = 'new-only') => {
  return Object.entries(recommendations || {}).reduce((acc, [category, recommendation]) => {
    if (!recommendation || ['analysis', 'newOptions', 'characterProfile', 'productDetails'].includes(category)) {
      return acc;
    }

    const rawChoice = recommendation.choiceArray && Array.isArray(recommendation.choiceArray) && recommendation.choiceArray.length > 0
      ? recommendation.choiceArray
      : recommendation.choice;
    const normalizedValue = normalizeAppliedOptionValue(category, rawChoice);

    if (normalizedValue == null || (Array.isArray(normalizedValue) && normalizedValue.length === 0)) {
      return acc;
    }

    const shouldSave = saveStrategy === 'all'
      ? getValuesForCategorySave(category, normalizedValue).length > 0
      : Array.isArray(recommendation?.newOptionCandidates) && recommendation.newOptionCandidates.length > 0;

    acc[category] = {
      action: 'apply',
      finalValue: normalizedValue,
      saveAsOption: shouldSave
    };

    return acc;
  }, {});
};

const getRecommendationOptionKeys = (recommendations = {}) => {
  return Object.keys(recommendations || {}).filter((key) => {
    if (['analysis', 'newOptions', 'characterProfile', 'productDetails'].includes(key)) {
      return false;
    }
    return Boolean(recommendations?.[key]?.choice || recommendations?.[key]?.choiceArray);
  });
};

const getUseCaseSmartDefaults = (useCase, sceneValue = 'linhphap-tryon-room') => {
  switch (useCase) {
    case 'creator-thumbnail':
      return {
        scene: sceneValue,
        lighting: 'high-key',
        mood: 'energetic',
        style: 'commercial',
        colorPalette: 'vibrant',
        cameraAngle: 'eye-level',
        framing: 'shoulders-up',
        expression: 'excited',
        gesture: 'reaction-hands',
        textOverlayZone: 'right-negative-space',
        productPresence: 'secondary-prop'
      };
    case 'story-character':
      return {
        scene: sceneValue,
        lighting: 'dramatic-rembrandt',
        mood: 'mysterious',
        style: 'editorial',
        colorPalette: 'earth-tones',
        cameraAngle: 'three-quarter',
        storyRole: 'narrator',
        expression: 'serious-focus',
        pose: 'explaining',
        sceneDepth: 'cinematic-depth',
        propCue: 'not-needed'
      };
    default:
      return {
        scene: sceneValue,
        lighting: 'soft-diffused',
        mood: 'confident',
        style: 'fashion-editorial',
        colorPalette: 'neutral',
        cameraAngle: 'three-quarter'
      };
  }
};

const getUseCaseStep1Copy = (useCase, { isCharacterRequired, isProductRequired } = {}) => {
  const base = {
    characterTitle: 'Character picker',
    characterUploadTitle: 'Add character image',
    characterUploadHint: isCharacterRequired
      ? 'Drag, click, or pick a saved profile below.'
      : 'Optional for this use case. Add one if you want stronger identity control.',
    characterUploadedLabel: 'Uploaded character',
    characterUploadedSubLabel: 'Tap to replace',
    characterSelectCta: 'Select profile',
    characterGalleryCta: 'Open gallery',
    productTitle: 'Product reference',
    productUploadTitle: 'Add product image',
    productUploadHint: isProductRequired
      ? 'Use a clean packshot or isolated product photo.'
      : 'Optional for this use case. Skip if you only need a character-first visual.',
    productUploadedLabel: 'Uploaded product',
    productUploadedSubLabel: 'Tap to replace',
    productGalleryCta: 'Open gallery',
    analyzeCta: 'Start Analysis'
  };

  if (useCase === 'creator-thumbnail') {
    return {
      ...base,
      characterTitle: 'Creator face reference',
      characterUploadTitle: 'Add creator face image',
      characterUploadHint: 'Use a clear face or upper-body image with strong identity and readable expression.',
      characterUploadedLabel: 'Uploaded creator reference',
      characterSelectCta: 'Select creator',
      productTitle: 'Optional prop reference',
      productUploadTitle: 'Add prop or product image',
      productUploadHint: isProductRequired
        ? 'Add the object you want the creator to react to or feature.'
        : 'Optional. Add a product or prop only if it strengthens the thumbnail hook.',
      productUploadedLabel: 'Uploaded prop reference',
      analyzeCta: 'Analyze Thumbnail Hook'
    };
  }

  if (useCase === 'story-character') {
    return {
      ...base,
      characterTitle: 'Story persona reference',
      characterUploadTitle: 'Add story character image',
      characterUploadHint: 'Use a clear image that defines the recurring face, vibe, and silhouette of the character.',
      characterUploadedLabel: 'Uploaded story persona',
      characterSelectCta: 'Select persona',
      productTitle: 'Optional prop or brand cue',
      productUploadTitle: 'Add prop reference',
      productUploadHint: isProductRequired
        ? 'Add the branded object or prop that should appear with the character.'
        : 'Optional. Add a prop only if it helps define the character world or story role.',
      productUploadedLabel: 'Uploaded prop cue',
      analyzeCta: 'Analyze Story Persona'
    };
  }

  return base;
};

// Tooltip component
function Tooltip({ children, content }) {
  return (
    <div className="group relative inline-block w-full">
      {children}
      <div className="absolute bottom-full left-0 mb-2 app-layer-overlay hidden group-hover:block w-48">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-normal">
          {content}
          <div className="absolute top-full left-4 border-8 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  );
}

function ClampedDescription({ text, className = '' }) {
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return undefined;

    const measure = () => {
      setIsTruncated(element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1);
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text]);

  return (
    <p
      ref={textRef}
      title={isTruncated ? text : undefined}
      className={className}
      style={{
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
        overflow: 'hidden'
      }}
    >
      {text}
    </p>
  );
}

// Get label by value
const getLabel = (list, value) => {
  const item = list.find(i => i.value === value);
  return item ? item.label : value;
};

// Get upload instructions by use case
const getUploadInstructions = (useCase) => {
  return getImageUseCaseUploadInstruction(useCase);
  const instructions = {
    'change-clothes': {
      character: 'Person to try on clothes (face, body visible)',
      product: 'Clothing/outfit to wear on the person',
      hint: 'System will fit the product onto the character while keeping their face/body same'
    },
    'character-holding-product': {
      character: 'Person to feature prominently (influencer/affiliate)',
      product: 'Product to hold or present in hands',
      hint: 'Character holds product; character is 60% focus, product is 40% focus'
    },
    'affiliate-video-tiktok': {
      character: 'KOL/creator r� m?t v� to�n th�n ho?c n?a th�n',
      product: 'S?n ph?m d�ng d? quay affiliate TikTok',
      hint: 'Use case n�y ch?y lu?ng Affiliate TikTok Step 1 (analyze) + Step 2 (generate wearing/holding)'
    },
    'ecommerce-product': {
      character: 'Optional: person for scale/styling reference',
      product: 'Product to showcase (main focus)',
      hint: 'Product is primary focus for retail applications'
    },
    'social-media': {
      character: 'Person for social media appeal',
      product: 'Product to wear or use',
      hint: 'Optimized for Instagram, TikTok, social engagement'
    },
    'fashion-editorial': {
      character: 'Model for editorial shoot',
      product: 'Garment or styling piece',
      hint: 'Magazine-style, high-fashion editorial composition'
    },
    'lifestyle-scene': {
      character: 'Person in everyday scenario',
      product: 'Product in lifestyle context',
      hint: 'Real-world, relatable lifestyle setting'
    },
    'before-after': {
      character: 'Before: original styling',
      product: 'After: styling with product',
      hint: 'Shows before/after comparison side-by-side'
    }
  };

  return instructions[useCase] || instructions['change-clothes'];
};


export default function ImageGenerationPage() {
  const { t, i18n } = useTranslation();
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [activeMode, setActiveMode] = useState('browser');
  const [showFinalPrompt, setShowFinalPrompt] = useState(true);
  
  // Ref for container
  const containerRef = useRef(null);
  const step3ComponentRef = useRef(null);
  const recommendationSelectorRef = useRef(null);
  const characterFileInputRef = useRef(null);
  const productFileInputRef = useRef(null);
  const sceneFileInputRef = useRef(null);

  // Data
  const [characterImage, setCharacterImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [useCase, setUseCase] = useState('change-clothes');
  const [productFocus, setProductFocus] = useState('full-outfit');
  const [promptMode, setPromptMode] = useState('step3');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [customOptions, setCustomOptions] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  // ?? Filter categories based on product focus
  const getVisibleCategories = () => {
    if (useCase === 'creator-thumbnail') {
      return ['scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle', 'framing', 'expression', 'gesture', 'textOverlayZone', 'productPresence'];
    }

    if (useCase === 'story-character') {
      return ['scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle', 'storyRole', 'expression', 'pose', 'sceneDepth', 'propCue'];
    }

    const baseCategories = ['scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle', 'shotType', 'bodyPose'];
    
    // Add clothing categories based on product focus
    if (productFocus === 'full-outfit') {
      return [...baseCategories, 'tops', 'bottoms', 'shoes', 'outerwear', 'accessories'];
    } else if (productFocus === 'top') {
      return [...baseCategories, 'tops', 'accessories'];
    } else if (productFocus === 'bottom') {
      return [...baseCategories, 'bottoms', 'shoes'];
    } else if (productFocus === 'shoes') {
      return [...baseCategories, 'shoes'];
    } else if (productFocus === 'accessories') {
      return [...baseCategories, 'accessories'];
    } else {
      // default
      return baseCategories;
    }
  };

  // Results
  const [analysis, setAnalysis] = useState(null);
  const [analysisRaw, setAnalysisRaw] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentSessionsLoading, setRecentSessionsLoading] = useState(false);
  const [recentResumeId, setRecentResumeId] = useState(null);
  const [recentPreview, setRecentPreview] = useState(null);
  const autoResumeRef = useRef(null);


  // Store images for generation step
  const [storedImages, setStoredImages] = useState({ character: null, product: null });

  // Loading
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Session Log Modal
  const [showSessionLogModal, setShowSessionLogModal] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationError, setGenerationError] = useState(null);  // ?? NEW: Error handling
  const [retryable, setRetryable] = useState(false);  // ?? NEW: Policy violation retry

  // Provider
  const [browserProvider, setBrowserProvider] = useState('chatgpt-browser');
  const [imageGenProvider, setImageGenProvider] = useState('grok');  // ?? NEW: Image generation provider
  const [generationProvider, setGenerationProvider] = useState('google-flow');  // ?? Image generation provider selection

  // Options from API
  const [promptOptions, setPromptOptions] = useState(null);
  const groupedPromptOptions = useMemo(() => groupPromptOptionsByCategory(promptOptions), [promptOptions]);
  const [sceneOptions, setSceneOptions] = useState([]);
  const [showScenePicker, setShowScenePicker] = useState(false);
  const [showSceneLockedPrompt, setShowSceneLockedPrompt] = useState(false);

  // Generation options
  const [imageCount, setImageCount] = useState(DESIRED_OUTPUT_COUNT);
  const [aspectRatio, setAspectRatio] = useState('9:16');  // ?? FIXED: Default to 9:16 (vertical)
  const [hasWatermark, setHasWatermark] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadToDrive, setUploadToDrive] = useState(true);  // ?? FIXED: Default to true (enabled)
  const [driveUploadStatus, setDriveUploadStatus] = useState(null);

  // New options tracking
  const [newOptions, setNewOptions] = useState([]);

  // Advanced generation settings
  const [generationSteps, setGenerationSteps] = useState(30);
  const [generationCfgScale, setGenerationCfgScale] = useState(7.5);
  const [generationSamplingMethod, setGenerationSamplingMethod] = useState('euler');
  const [generationSeed, setGenerationSeed] = useState(null);
  const [generationRandomSeed, setGenerationRandomSeed] = useState(true);

  // Analysis metadata
  const [analysisTime, setAnalysisTime] = useState(null);
  const [analysisMetadata, setAnalysisMetadata] = useState(null);

  // ?? NEW: Character description from analysis for precise generation
  const [characterDescription, setCharacterDescription] = useState(null);

  // ?? NEW: Grok conversation ID for reusing conversation across steps
  const [grokConversationId, setGrokConversationId] = useState(null);

  // ?? NEW: Storage configuration for generated images
  const [storageType, setStorageType] = useState('cloud'); // 'local' or 'cloud'
  const [localFolder, setLocalFolder] = useState(null);

  // Session history and advanced features (new)
  const [userId, setUserId] = useState('user-' + Math.random().toString(36).substr(2, 9)); // Generate random user ID
  const [referenceImages, setReferenceImages] = useState([]);

  // Gallery Picker State
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryPickerFor, setGalleryPickerFor] = useState(null); // 'character' or 'product'

  // Providers
  const PROVIDERS = [
    { id: 'chatgpt-browser', label: 'ChatGPT', description: 'Browser reasoning' },
    { id: 'grok', label: 'Grok', description: 'Fast browser flow' },
    { id: 'google-flow', label: 'Flow', description: 'Labs workflow' },
    { id: 'zai', label: 'Z.AI', description: 'Alternative browser provider' },
    { id: 'bfl', label: 'BFL FLUX', description: 'Flux engine' },
  ];
  
  // Image Generation Providers (for generation step)
  const IMAGE_GEN_PROVIDERS = [
    { id: 'grok', label: 'Grok Browser', description: 'Fast, web-based' },
    { id: 'google-flow', label: 'Google Labs Flow', description: 'High quality, 4K capable' },
    { id: 'bfl', label: 'BFL FLUX.2 Klein', description: 'High quality, virtual try-on' },
  ];

  const formatSessionTime = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const extractSessionPreview = (session) => {
    const detail = session?.detail || session;
    const workflowState = detail?.workflowState || {};
    const artifacts = detail?.artifacts || {};

    const outputCandidates = []
      .concat(artifacts.generatedImagePaths || [])
      .concat(artifacts.generatedImages || [])
      .concat(workflowState.images || []);

    const outputUrl = outputCandidates.length ? outputCandidates[outputCandidates.length - 1] : null;

    const characterInput = artifacts.characterImagePath || workflowState.inputs?.character?.url || workflowState.inputs?.character;
    const productInput = artifacts.productImagePath || workflowState.inputs?.product?.url || workflowState.inputs?.product;

    const inputs = [characterInput, productInput].filter(Boolean);

    const previewItems = [];
    if (inputs.length) {
      inputs.forEach((item) => previewItems.push({ type: 'input', url: normalizePublicUrl(item) }));
    }
    if (outputUrl) {
      previewItems.push({ type: 'output', url: normalizePublicUrl(outputUrl) });
    }

    return previewItems.slice(0, 3);
  };

  const loadRecentSessions = useCallback(async () => {
    setRecentSessionsLoading(true);
    try {
      const response = await getGenerationSessions({
        page: 1,
        limit: 5,
        flowType: 'image-generation',
        status: 'all'
      });
      const list = response?.data || [];
      const detailResults = await Promise.all(list.map(async (item) => {
        try {
          const detail = await getGenerationSessionDetail(item.sessionId);
          return { ...item, detail: detail.data || null };
        } catch (error) {
          return { ...item, detail: null };
        }
      }));
      setRecentSessions(detailResults);
    } catch (error) {
      console.warn('?? Could not load recent sessions:', error);
      setRecentSessions([]);
    } finally {
      setRecentSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentSessions();
  }, [loadRecentSessions]);

  // Load options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const options = await aiOptionsAPI.getAllOptions();
        setPromptOptions(options);

        const sceneResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/prompt-options/scenes/lock-manager`, {
          headers: {
            ...getAuthHeaders(),
          },
        });
        const sceneData = await sceneResponse.json();
        if (sceneData?.success) {
          setSceneOptions(sceneData.data || []);
          if (!selectedOptions.scene && sceneData.data?.length > 0) {
            setSelectedOptions(prev => ({ ...prev, scene: sceneData.data[0].value }));
          }
        }
      } catch (error) {
        console.warn('Could not load options:', error);
      }
    };
    loadOptions();
  }, []);

  // Handlers
  const handleOptionChange = (category, value) => {
    setSelectedOptions(prev => ({ ...prev, [category]: value }));
  };

  const handleGallerySelect = (items) => {
    // If single item (not multiselect), items will be an object
    const item = Array.isArray(items) ? items[0] : items;
    
    const selectedUrl = item?.selectUrl || item?.url;

    if (!item || !selectedUrl) {
      console.error('? Invalid item selected from gallery:', item);
      alert('Error: Selected item is missing image URL');
      return;
    }

    console.log(`?? Gallery item selected:`, { assetId: item.assetId, name: item.name, url: selectedUrl });
    
    if (galleryPickerFor === 'character') {
      // Fetch image from URL and convert to file
      console.log(`? Loading character image from gallery...`);
      fetch(selectedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: Failed to fetch image`);
          }
          return res.blob();
        })
        .then(blob => {
          if (!blob || blob.size === 0) {
            throw new Error('Received empty blob from server');
          }
          console.log(`? Image loaded: ${blob.size} bytes, type: ${blob.type}`);
          const file = new File([blob], item.name || 'character-from-gallery.jpg', { type: blob.type || 'image/jpeg' });
          const preview = URL.createObjectURL(file);
          setCharacterImage({ file, preview, source: 'gallery', assetId: item.assetId || null, name: item.name || file.name, sourceUrl: selectedUrl });
          console.log(`? Character image updated with preview`);
        })
        .catch(err => {
          console.error('? Failed to load gallery image:', err);
          alert(`Failed to load image: ${err.message}`);
        });
    } else if (galleryPickerFor === 'product') {
      // Fetch image from URL and convert to file
      console.log(`? Loading product image from gallery...`);
      fetch(selectedUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/*'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: Failed to fetch image`);
          }
          return res.blob();
        })
        .then(blob => {
          if (!blob || blob.size === 0) {
            throw new Error('Received empty blob from server');
          }
          console.log(`? Image loaded: ${blob.size} bytes, type: ${blob.type}`);
          const file = new File([blob], item.name || 'product-from-gallery.jpg', { type: blob.type || 'image/jpeg' });
          const preview = URL.createObjectURL(file);
          const assetId = item.assetId || item.id || item._id || null;  // ?? Use id or _id as fallback for assetId
          setProductImage({ file, preview, source: 'gallery', assetId, name: item.name || file.name, sourceUrl: selectedUrl });
          console.log(`? Product image updated with preview - assetId: ${assetId}`);
        })
        .catch(err => {
          console.error('? Failed to load gallery image:', err);
          alert(`Failed to load image: ${err.message}`);
        });
    }
  };

  const handleCustomOptionChange = (category, value) => {
    setCustomOptions(prev => ({ ...prev, [category]: value }));
  };

  const handleApplyStylePreset = (preset) => {
    setSelectedOptions(prev => ({
      ...prev,
      ...preset.styles
    }));
  };

  const handleSaveNewOption = async (category, value) => {
    const valuesToSave = getValuesForCategorySave(category, value);
    if (!category || valuesToSave.length === 0) {
      console.warn('? Cannot save option - missing category or value', { category, value });
      return;
    }

    console.log(`?? Saving ${valuesToSave.length} option(s) for ${category}:`, valuesToSave);
    setIsSaving(true);
    try {
      for (const item of valuesToSave) {
        console.log(`   ?? Sending POST request for ${item}...`);
        await aiOptionsAPI.createOption(
          category,
          item,
          item,
          `AI recommended ${category}`,
          {}
        );
      }

      if (!newOptions.includes(category)) {
        console.log(`   ?? Marking category as saved: ${category}`);
        setNewOptions(prev => [...prev, category]);
      }

      console.log('   ?? Refreshing options from database...');
      const options = await aiOptionsAPI.getAllOptions();
      console.log('   ? Options refreshed:', options);
      setPromptOptions(options);
    } catch (error) {
      console.error(`? Failed to save option(s) in "${category}":`, error);
      console.error('   Error details:', error.response?.data || error.message);
      alert(`Failed to save option: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const ensureImageSession = useCallback(async (currentFlowId) => {
    if (currentFlowId || selectedFlowId) {
      return currentFlowId || selectedFlowId;
    }

    const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const sessionResponse = await fetch('/api/sessions/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        flowType: 'image-generation',
        useCase: useCase
      })
    });

    if (!sessionResponse.ok) {
      throw new Error('Session creation failed: ' + sessionResponse.status);
    }

    const sessionData = await sessionResponse.json();
    const flowId = sessionData.data?.flowId || sessionData.data?.sessionId;

    if (flowId) {
      setSelectedFlowId(flowId);
    }

    return flowId;
  }, [selectedFlowId, useCase]);

  const buildImageWorkflowState = useCallback((overrides = {}) => {
    const characterInput = selectedCharacter
      ? {
          source: 'character-profile',
          id: selectedCharacter._id || selectedCharacter.id,
          name: selectedCharacter.name,
          alias: selectedCharacter.alias,
          url: selectedCharacter.portraitUrl
        }
      : characterImage
        ? {
            source: characterImage.source || 'upload',
            assetId: characterImage.assetId || null,
            name: characterImage.name || characterImage.file?.name || null,
            url: characterImage.sourceUrl || characterImage.preview || null
          }
        : null;

    const productInput = productImage
      ? {
          source: productImage.source || 'upload',
          assetId: productImage.assetId || null,
          name: productImage.name || productImage.file?.name || null,
          url: productImage.sourceUrl || productImage.preview || null
        }
      : null;

    return {
      flowType: 'image-generation',
      status: overrides.status || 'in-progress',
      currentStep: overrides.currentStep || currentStep,
      analysis: overrides.analysis !== undefined ? overrides.analysis : analysis,
      prompt: overrides.prompt !== undefined ? overrides.prompt : (generatedPrompt?.positive || null),
      negativePrompt: overrides.negativePrompt !== undefined ? overrides.negativePrompt : (generatedPrompt?.negative || null),
      selectedOptions: overrides.selectedOptions || selectedOptions,
      images: overrides.images || generatedImages,
      characterDescription: overrides.characterDescription || characterDescription,
      inputs: {
        useCase,
        productFocus,
        aspectRatio,
        character: overrides.characterInput || characterInput,
        product: overrides.productInput || productInput
      }
    };
  }, [analysis, generatedPrompt, selectedOptions, generatedImages, characterDescription, characterImage, productImage, selectedCharacter, currentStep, useCase, productFocus, aspectRatio]);

  const hydrateStoredImages = useCallback(async (inputs = {}) => {
    const nextStored = {};
    const getUrl = (value) => (typeof value === 'string' ? value : value?.url);
    const isRestorableUrl = (url) => url && !url.startsWith('blob:');

    const characterUrl = getUrl(inputs.character);
    if (isRestorableUrl(characterUrl)) {
      try {
        const file = await urlToFile(characterUrl, inputs.character?.name || 'character-reference.jpg');
        const base64 = await fileToBase64(file);
        nextStored.character = base64;
        setCharacterImage((prev) => prev?.file ? prev : ({
          file,
          preview: characterUrl,
          source: inputs.character?.source || 'resume',
          assetId: inputs.character?.assetId || null,
          name: inputs.character?.name || file.name,
          sourceUrl: characterUrl
        }));
      } catch (error) {
        console.warn('?? Resume: failed to hydrate character image', error);
      }
    }

    const productUrl = getUrl(inputs.product);
    if (isRestorableUrl(productUrl)) {
      try {
        const file = await urlToFile(productUrl, inputs.product?.name || 'product-reference.jpg');
        const base64 = await fileToBase64(file);
        nextStored.product = base64;
        setProductImage((prev) => prev?.file ? prev : ({
          file,
          preview: productUrl,
          source: inputs.product?.source || 'resume',
          assetId: inputs.product?.assetId || null,
          name: inputs.product?.name || file.name,
          sourceUrl: productUrl
        }));
      } catch (error) {
        console.warn('?? Resume: failed to hydrate product image', error);
      }
    }

    if (Object.keys(nextStored).length > 0) {
      setStoredImages((prev) => ({ ...prev, ...nextStored }));
    }
  }, [setCharacterImage, setProductImage, setStoredImages]);

  const applyResumeWorkflowState = useCallback((workflowState, resume) => {
    if (!workflowState) return;

    if (workflowState.selectedOptions) {
      setSelectedOptions(workflowState.selectedOptions);
    }

    if (workflowState.analysis) {
      setAnalysis(workflowState.analysis);
      setAnalysisRaw(workflowState.analysis);
    }

    if (workflowState.prompt) {
      setGeneratedPrompt({
        positive: workflowState.prompt,
        negative: workflowState.negativePrompt || ''
      });
    }

    if (Array.isArray(workflowState.images)) {
      setGeneratedImages(workflowState.images);
    }

    if (workflowState.characterDescription) {
      setCharacterDescription(workflowState.characterDescription);
    }

    const resumeStep = (() => {
      if (workflowState.images?.length) return 4;
      if (workflowState.prompt) return 4;
      if (workflowState.analysis) return 2;
      if (resume?.nextStep === 1) return 1;
      if (resume?.nextStep === 2) return 3;
      if (resume?.nextStep === 3) return 4;
      return workflowState.currentStep || 1;
    })();

    setCurrentStep(resumeStep);
  }, [setSelectedOptions, setAnalysis, setAnalysisRaw, setGeneratedPrompt, setGeneratedImages, setCharacterDescription, setCurrentStep]);

  const handleQuickResume = async (session) => {
    if (!session?.sessionId) return;

    setRecentResumeId(session.sessionId);
    try {
      const response = await resumeSession(session.sessionId, 'image-generation');
      if (!response?.success) {
        return;
      }

      const workflowState = response.workflowState;
      setSelectedFlowId(response.sessionId || session.sessionId);
      applyResumeWorkflowState(workflowState, response);

      if (workflowState?.inputs) {
        await hydrateStoredImages(workflowState.inputs);
      }

      autoResumeRef.current = { nextStep: response.nextStep };
    } catch (error) {
      console.error('?? Quick resume failed:', error);
    } finally {
      setRecentResumeId(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeSessionId = params.get('resumeSessionId');
    if (!resumeSessionId) return undefined;

    let cancelled = false;

    const runResume = async () => {
      try {
        const response = await resumeSession(resumeSessionId, 'image-generation');
        if (!response?.success || cancelled) return;

        const workflowState = response.workflowState;
        setSelectedFlowId(response.sessionId || resumeSessionId);
        applyResumeWorkflowState(workflowState, response);

        if (workflowState?.inputs) {
          await hydrateStoredImages(workflowState.inputs);
        }

        params.delete('resumeSessionId');
        params.delete('flowType');
        const next = params.toString();
        const nextUrl = next ? window.location.pathname + '?' + next : window.location.pathname;
        window.history.replaceState({}, '', nextUrl);
      } catch (error) {
        console.error('?? Resume failed:', error);
      }
    };

    runResume();

    return () => {
      cancelled = true;
    };
  }, [applyResumeWorkflowState, hydrateStoredImages]);

  useEffect(() => {
    const pending = autoResumeRef.current;
    if (!pending) return;

    if (pending.nextStep === 1) {
      autoResumeRef.current = null;
      return;
    }

    if (pending.nextStep === 2) {
      if (analysis?.analysis && !generatedPrompt?.positive && !isLoading) {
        autoResumeRef.current = null;
        handleBuildPrompt();
      }
      return;
    }

    if (pending.nextStep === 3) {
      if (generatedPrompt?.positive && generatedImages.length === 0 && !isGenerating) {
        autoResumeRef.current = null;
        handleStartGeneration();
      }
    }
  }, [analysis, generatedPrompt, generatedImages, isLoading, isGenerating]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleStartAnalysis = async () => {
    const effectiveCharacterFile = selectedCharacter?.portraitUrl ? await urlToFile(selectedCharacter.portraitUrl, `${selectedCharacter.alias || 'character'}.jpg`) : characterImage?.file;
    const inputSchema = getImageUseCaseInputSchema(useCase);
    const characterRequired = inputSchema.character !== 'optional';
    const productRequired = inputSchema.product !== 'optional';

    if ((characterRequired && !effectiveCharacterFile) || (productRequired && !productImage?.file)) return;

    setIsAnalyzing(true);
    const startTime = Date.now();
    
    try {
      const charBase64 = effectiveCharacterFile ? await fileToBase64(effectiveCharacterFile) : null;
      const prodBase64 = productImage?.file ? await fileToBase64(productImage.file) : null;

      let analysisResponse;

      if (useCase === 'affiliate-video-tiktok') {
        const flowId = `affiliate-${Date.now()}`;
        console.log('?? Using affiliate TikTok service flow (Step 1 + Step 2):', flowId);

        // ?? Determine image sources to avoid recreating assets
        const imageSource = {
          character: selectedCharacter ? 'character-profile' : 'upload',
          product: productImage?.source === 'gallery' ? 'gallery' : 'upload'
        };

        const step1Response = await affiliateVideoTiktokAPI.step1Analyze(
          effectiveCharacterFile,
          productImage.file,
          flowId,
          {
            productFocus,
            aspectRatio,
            scene: selectedOptions.scene || 'studio',
            lighting: selectedOptions.lighting || 'soft-diffused',
            mood: selectedOptions.mood || 'confident',
            style: selectedOptions.style || 'minimalist',
            colorPalette: selectedOptions.colorPalette || 'neutral',
            cameraAngle: selectedOptions.cameraAngle || 'eye-level',
            hairstyle: selectedOptions.hairstyle || '',
            makeup: selectedOptions.makeup || '',
            selectedCharacter,
            optionsLibrary: groupedPromptOptions,
            imageSource,  // ?? Pass source information to backend
            characterProfileId: selectedCharacter?._id,  // ?? Pass character ID for asset lookup
            productAssetId: productImage?.assetId  // ?? Pass product asset ID
          }
        );

        if (!step1Response?.success || !step1Response?.analysis) {
          throw new Error(step1Response?.error || 'Affiliate TikTok Step 1 failed');
        }

        const affiliateRecommendations = step1Response.analysis?.recommendations || step1Response.analysis || {};
        const affiliateAnalysisPreview = {
          analysis: step1Response.analysisText || (typeof step1Response.analysis === 'string' ? step1Response.analysis : JSON.stringify(step1Response.analysis)),
          recommendations: affiliateRecommendations,
          characterProfile: step1Response.analysis?.characterProfile || {},
          productDetails: step1Response.analysis?.productDetails || {},
          character: step1Response.analysis?.character || step1Response.analysis?.characterProfile || {},
          product: step1Response.analysis?.product || step1Response.analysis?.productDetails || {},
          analysisScore: step1Response.analysis?.analysis || {},
          newOptionsCreated: step1Response.newOptionsCreated || []
        };

        const autoDecisions = buildAutoRecommendationDecisions(affiliateRecommendations, 'new-only');
        const autoAppliedOptions = await applyRecommendationSelection(autoDecisions, {
          analysisData: affiliateAnalysisPreview,
          baseOptions: selectedOptions,
          goToStep: false,
          saveOptions: false
        });

        if (Array.isArray(step1Response.newOptionsCreated) && step1Response.newOptionsCreated.length > 0) {
          const refreshedOptions = await aiOptionsAPI.getAllOptions();
          setPromptOptions(refreshedOptions);
        }

        const step2Response = await affiliateVideoTiktokAPI.step2GenerateImages(flowId, {
          aspectRatio,
          productFocus,
          language: i18n.language || 'vi',
          characterName: selectedCharacter?.name || '',
          characterAlias: selectedCharacter?.alias || '',
          characterDisplayName: selectedCharacter?.name || selectedCharacter?.alias || '',
          ...autoAppliedOptions,
        });

        if (step2Response?.success) {
          const step2Images = [step2Response.wearingImage, step2Response.holdingImage]
            .filter(Boolean)
            .map((url, index) => ({
              url,
              filename: index === 0 ? 'affiliate-wearing.jpg' : 'affiliate-holding.jpg',
            }));

          if (step2Images.length > 0) {
            setGeneratedImages(step2Images);
            console.log('? Affiliate TikTok Step 2 images ready:', step2Images);
          }
        }

        analysisResponse = {
          success: true,
          data: {
            analysis: step1Response.analysisText || (typeof step1Response.analysis === 'string'
              ? step1Response.analysis
              : JSON.stringify(step1Response.analysis)),
            recommendations: step1Response.analysis,
            newOptionsCreated: step1Response.newOptionsCreated || [],
          },
        };      } else {
        analysisResponse = await browserAutomationAPI.analyzeBrowserOnly(
          charBase64,
          prodBase64,
          { 
            provider: browserProvider, 
            scene: selectedOptions.scene || 'studio', 
            lighting: selectedOptions.lighting || 'soft-diffused',
            mood: selectedOptions.mood || 'confident',
            style: selectedOptions.style || 'minimalist',
            colorPalette: selectedOptions.colorPalette || 'neutral',
            cameraAngle: selectedOptions.cameraAngle || 'eye-level',
            useCase,
            productFocus,
            selectedCharacter,
            optionsLibrary: groupedPromptOptions
          }
        );
      }

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      if (analysisResponse.success && analysisResponse.data) {
        setAnalysisRaw(analysisResponse.data);
        
        // Get raw analysis text from backend (JSON or text format)
        const analysisText = analysisResponse.data.analysis || '';
        
        // ? Backend already parses JSON and returns structured recommendations
        const backendData = analysisResponse.data.recommendations || {};
        
        // Verify we got valid data from backend
        if (!backendData || Object.keys(backendData).length === 0) {
          console.warn('??  No recommendations returned from backend analysis');
        }
        
        // Extract character profile & product details from backend (already parsed)
        const characterProfile = backendData.characterProfile || {};
        const productDetails = backendData.productDetails || {};
        
        // Extract all recommendations (both standard and custom categories)
        const recommendationKeys = ['scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle', 'hairstyle', 'makeup', 'bottoms', 'shoes', 'accessories', 'outerwear'];
        const recommendations = {};
        
        // Add standard recommendations
        recommendationKeys.forEach(key => {
          if (backendData[key]) {
            recommendations[key] = backendData[key];
          }
        });
        
        // Also capture any additional keys not in primary list (supports dynamic recommendations)
        Object.keys(backendData).forEach(key => {
          if (!['characterProfile', 'productDetails', 'analysis', 'newOptions', 'character', 'product', 'recommendations'].includes(key) && !recommendationKeys.includes(key)) {
            recommendations[key] = backendData[key];
          }
        });
        
        // Add analysis score if available
        const analysisScore = backendData.analysis || {};
        
        // Restructure data for components
        const analysisWithParsing = {
          analysis: analysisText,
          recommendations: recommendations,
          characterProfile: characterProfile,
          productDetails: productDetails,
          character: characterProfile,
          product: productDetails,
          analysisScore: analysisScore,
          newOptionsCreated: analysisResponse.data.newOptionsCreated || [],
        };
        
        // ?? FALLBACK: If no recommendations found, create defaults from analysis
        if (Object.keys(analysisWithParsing.recommendations).length === 0) {
          console.log('??  No recommendations found, creating comprehensive defaults...');
          
          // Create educated defaults based on what we know
          analysisWithParsing.recommendations = {
            scene: { choice: 'studio', reason: 'Studio setting provides professional lighting control for product showcase' },
            lighting: { choice: 'soft-diffused', reason: 'Soft lighting flatters the character and highlights product details' },
            mood: { choice: 'confident', reason: 'Confident mood conveys the product\'s casual-chic aesthetic' },
            style: { choice: 'editorial', reason: 'Editorial direction keeps the image fashion-forward and product-focused' },
            colorPalette: { choice: 'neutral', reason: 'Neutral grading keeps attention on product details and skin harmony' },
            cameraAngle: { choice: 'eye-level', reason: 'Direct eye-level framing creates engagement and shows fit accurately' },
            hairstyle: { choice: 'keep-current', reason: 'Current hairstyle complements the product without distraction' },
            makeup: { choice: 'light-makeup', reason: 'Light makeup maintains focus on the garment' },
          };
          console.log('? Created 6 default recommendations as fallback');
        }
        
        setAnalysis(analysisWithParsing);
        console.log('?? Full backend response data:', analysisResponse.data);
        console.log('?? Analysis saved to state:', analysisWithParsing);
        console.log('?? Recommendations available:', analysisWithParsing.recommendations);
        console.log('?? Character Profile:', analysisWithParsing.characterProfile);
        console.log('?? Product Details:', analysisWithParsing.productDetails);
        
        // Store response length for display
        const responseLength = typeof analysisResponse.data.analysis === 'string' 
          ? analysisResponse.data.analysis.length 
          : JSON.stringify(analysisResponse.data).length;
        
        setAnalysisMetadata({
          duration,
          responseLength,
          timestamp: new Date().toISOString(),
          provider: browserProvider
        });
        setAnalysisTime(duration);
        
        setStoredImages({
          character: charBase64,
          product: prodBase64
        });
        
        try {
          const flowId = await ensureImageSession(selectedFlowId);
          if (flowId) {
            await captureGenerationSession(flowId, {
              flowType: 'image-generation',
              useCase,
              status: 'in-progress',
              workflowState: buildImageWorkflowState({
                currentStep: 2,
                analysis: analysisWithParsing
              }),
              analysis: {
                analysisResult: {
                  provider: browserProvider,
                  duration,
                  productFocus,
                  aspectRatio
                }
              },
              log: {
                category: 'image-generation',
                message: 'Analysis completed',
                details: {
                  provider: browserProvider,
                  duration,
                  useCase
                }
              }
            });
          }
        } catch (sessionError) {
          console.warn('?? Could not capture analysis session (non-blocking):', sessionError.message);
        }
        
        // ?? NEW: Save Grok conversation ID for reuse in generation step
        if (analysisResponse.data.grokConversationId) {
          console.log('?? Saving Grok conversation ID:', analysisResponse.data.grokConversationId);
          setGrokConversationId(analysisResponse.data.grokConversationId);
        }
        
        // ?? NEW: Save character description for generation
        if (analysisResponse.data.characterDescription) {
          console.log('?? Saving character description:', analysisResponse.data.characterDescription.substring(0, 80));
          setCharacterDescription(analysisResponse.data.characterDescription);
        }

        // ?? NEW: Save uploaded source images as assets to gallery
        try {
          console.log('?? Saving source images as gallery assets...');
          
          // Generate session ID for tracking
          const sessionId = 'session-' + Date.now();
          
          // Save character image
          const charAsset = await assetService.saveUploadedFileAsAsset(
            effectiveCharacterFile,
            'character-image',
            sessionId,
            {
              width: characterProfile.estimatedWidth,
              height: characterProfile.estimatedHeight,
              description: characterProfile.description
            }
          );
          console.log('? Character image saved as asset:', charAsset);
          
          // Save product image
          const prodAsset = await assetService.saveUploadedFileAsAsset(
            productImage.file,
            'product-image',
            sessionId,
            {
              width: productDetails.estimatedWidth,
              height: productDetails.estimatedHeight,
              description: productDetails.description,
              focusArea: productFocus
            }
          );
          console.log('? Product image saved as asset:', prodAsset);
        } catch (assetError) {
          console.warn('??  Could not save source images as assets, but continuing...', assetError);
          // Continue even if asset saving fails - it's not critical
        }
        
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRecommendation = () => {
    if (analysis?.recommendations) {
      console.log('?? handleApplyRecommendation called');
      const rec = analysis.recommendations;
      console.log('?? Recommendations from analysis:', rec);
      const newOpts = { ...selectedOptions };
      getRecommendationOptionKeys(rec).forEach((key) => {
        const normalizedValue = normalizeAppliedOptionValue(key, rec[key]?.choiceArray?.length ? rec[key].choiceArray : rec[key]?.choice);
        if (normalizedValue != null && (!Array.isArray(normalizedValue) || normalizedValue.length > 0)) {
          newOpts[key] = normalizedValue;
        }
      });
      console.log('? New options to apply:', newOpts);
      setSelectedOptions(newOpts);
      
      // Expand all categories when applying recommendations
      const allCategories = {};
      Object.keys(STYLE_CATEGORIES).forEach(key => {
        allCategories[key] = true;
      });
      console.log('?? Expanding categories from handleApplyRecommendation:', allCategories);
      setExpandedCategories(allCategories);
    } else {
      console.log('? No recommendations found in handleApplyRecommendation');
    }
    setCurrentStep(3); // Go to merged Style & Prompt step
  };

  // Handle per-category recommendations (new flow with RecommendationSelector)
  const applyRecommendationSelection = async (decisions, {
    analysisData = analysis,
    baseOptions = selectedOptions,
    goToStep = true,
    saveOptions = true
  } = {}) => {
    const newOpts = { ...baseOptions };

    Object.entries(decisions || {}).forEach(([category, decision]) => {
      const normalizedValue = normalizeAppliedOptionValue(category, decision?.finalValue);
      if (normalizedValue == null || (Array.isArray(normalizedValue) && normalizedValue.length === 0)) {
        return;
      }

      newOpts[category] = normalizedValue;
      console.log('   ? ' + category + ':', normalizedValue);
    });

    if (Object.keys(newOpts).length === 0 && analysisData?.recommendations) {
      console.log('?? No valid decisions applied, using defaults from analysis...');
      const rec = analysisData.recommendations;
      getRecommendationOptionKeys(rec).forEach((key) => {
        if (rec[key]?.choice) {
          const fallbackValue = normalizeAppliedOptionValue(key, rec[key].choice);
          if (fallbackValue != null && (!Array.isArray(fallbackValue) || fallbackValue.length > 0)) {
            newOpts[key] = fallbackValue;
          }
        }
      });
    }

    const smartDefaults = getUseCaseSmartDefaults(
      useCase,
      baseOptions.scene || sceneOptions?.[0]?.value || 'linhphap-tryon-room'
    );
    Object.entries(smartDefaults).forEach(([key, value]) => {
      if (!newOpts[key]) {
        newOpts[key] = baseOptions[key] || value;
      }
    });

    console.log('? Options updated:', newOpts);
    setSelectedOptions(newOpts);

    if (saveOptions) {
      const toSave = Object.entries(decisions || {})
        .filter(([_, decision]) => decision?.saveAsOption)
        .flatMap(([category, decision]) => getValuesForCategorySave(category, decision.finalValue).map((value) => ({ category, value })));

      if (toSave.length > 0) {
        console.log('?? Saving ' + toSave.length + ' new options...');
        for (const { category, value } of toSave) {
          await handleSaveNewOption(category, value);
        }
      }
    }

    if (goToStep) {
      setCurrentStep(3);
    }

    return newOpts;
  };

  const handleApplyRecommendationSelection = async (decisions) => {
    console.log('?? Per-category decisions received:', decisions);

    try {
      await applyRecommendationSelection(decisions, {
        analysisData: analysis,
        baseOptions: selectedOptions,
        goToStep: true,
        saveOptions: true
      });
    } catch (error) {
      console.error('? Error applying recommendations:', error);
      alert('Error: ' + error.message);
    }
  };
// CRITICAL: Memoize this callback to prevent infinite loop in Step3EnhancedWithSession
  // Without useCallback, the function reference changes every render, causing useEffect dependencies to trigger infinitely
  const handlePromptChange = useCallback((promptData) => {
    console.log('?? Parent received prompt from Step3:', promptData);
    // Handle both string and object formats for backward compatibility
    if (typeof promptData === 'string') {
      setGeneratedPrompt({ positive: promptData, negative: '' });
    } else if (promptData && typeof promptData === 'object') {
      setGeneratedPrompt(promptData);
    }
  }, []); // Empty dependency array - function never changes after first render

  // Auto-apply recommendations when entering Step 3 and expand categories
  useEffect(() => {
    if (currentStep === 3 && analysis?.recommendations) {
      console.log('? Step 3 Entered - Auto-applying recommendations');
      console.log('?? Analysis recommendations:', analysis.recommendations);

      if (Object.keys(selectedOptions).length === 0) {
        console.log('?? Applying recommendations to options...');
        const rec = analysis.recommendations;
        const newOpts = {};
        let appliedCount = 0;

        for (const key of getRecommendationOptionKeys(rec)) {
          if (rec[key]?.choice) {
            const normalizedValue = normalizeAppliedOptionValue(key, rec[key].choice);
            if (normalizedValue != null && (!Array.isArray(normalizedValue) || normalizedValue.length > 0)) {
              newOpts[key] = normalizedValue;
              appliedCount++;
              console.log(`   ? ${key}:`, normalizedValue);
            }
          }
        }

        if (appliedCount > 0) {
          console.log(`? Applied ${appliedCount} recommendations`);
          setSelectedOptions(newOpts);
        } else {
          console.warn('?? No valid recommendations to apply');
        }
      } else {
        console.log('?? Options already set, skipping auto-apply');
      }

      const allCategories = {};
      getVisibleCategories().forEach((key) => {
        allCategories[key] = true;
      });
      setExpandedCategories(allCategories);
    }
  }, [currentStep, analysis, selectedOptions]);

  // ?? NEW: Get default options based on product focus
  const getDefaultOptionsByFocus = () => {
    const defaults = getUseCaseSmartDefaults(
      useCase,
      selectedOptions.scene || sceneOptions?.[0]?.value || 'linhphap-tryon-room'
    );

    // Add focus-specific defaults
    if (productFocus === 'full-outfit') {
      return {
        ...defaults,
        tops: '', // Will be filled from analysis or user selection
        bottoms: '',  // Will be filled from analysis or user selection
        shoes: '',    // Will be filled from analysis or user selection
        accessories: '', // Can be multi-value
        outerwear: '',
      };
    } else if (productFocus === 'top') {
      return {
        ...defaults,
        tops: '',
        accessories: '',
      };
    } else if (productFocus === 'bottom') {
      return {
        ...defaults,
        bottoms: '',
        shoes: '',
      };
    } else if (productFocus === 'shoes') {
      return {
        ...defaults,
        shoes: '',
      };
    } else if (productFocus === 'accessories') {
      return {
        ...defaults,
        accessories: '',
      };
    }

    return defaults;
  };

  const handleBuildPrompt = async () => {
    if (!analysis?.analysis) {
      console.error('? Cannot build prompt: analysis.analysis is missing');
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('?? Building prompt with:', { 
        optionsCount: Object.keys(selectedOptions).length,
        useCase,
        productFocus,
        focusSpecificDefaults: Object.keys(getDefaultOptionsByFocus())
      });
      
      // ?? FIXED: Merge with defaults to ensure all clothing categories are included
      const mergedOptions = {
        ...getDefaultOptionsByFocus(),
        ...selectedOptions  // User selections override defaults
      };

      console.log('?? Merged options being sent:', mergedOptions);
      
      const response = await unifiedFlowAPI.buildPrompt(
        analysis,
        mergedOptions,
        useCase,
        productFocus,
        i18n.language || 'en'  // ?? Pass language for prompt generation
      );

      if (response.success && response.data?.prompt) {
        console.log('? Prompt built successfully');
        setGeneratedPrompt(response.data.prompt);

        try {
          const flowId = await ensureImageSession(selectedFlowId);
          if (flowId) {
            const promptText = response.data.prompt?.positive || response.data.prompt;
            await captureGenerationSession(flowId, {
              flowType: 'image-generation',
              useCase,
              status: 'in-progress',
              workflowState: buildImageWorkflowState({
                currentStep: 3,
                prompt: promptText,
                negativePrompt: response.data.prompt?.negative || ''
              }),
              analysis: {
                promptBuild: {
                  provider: browserProvider,
                  promptLength: promptText ? String(promptText).length : 0
                }
              },
              log: {
                category: 'image-generation',
                message: 'Prompt built',
                details: {
                  provider: browserProvider
                }
              }
            });
          }
        } catch (sessionError) {
          console.warn('?? Could not capture prompt session (non-blocking):', sessionError.message);
        }

        // Move to Step 4 ONLY after successful prompt generation
        setCurrentStep(4);
      } else {
        console.error('? Build prompt response missing data:', response);
      }
    } catch (error) {
      console.error('Build prompt failed:', error);
      alert('Failed to build prompt: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!generatedPrompt?.positive) return;
    setIsLoading(true);

    try {
      const response = await promptsAPI.enhancePrompt(
        generatedPrompt.positive,
        analysis,
        selectedOptions
      );

      if (response.success) {
        setGeneratedPrompt({
          positive: response.enhancedPrompt,
          negative: generatedPrompt.negative
        });
      }
    } catch (error) {
      console.error('Enhance failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    console.log('?? Generate button clicked!');
    console.log('   currentStep:', currentStep);
    console.log('   generatedPrompt:', generatedPrompt);
    console.log('   generatedPrompt?.positive:', generatedPrompt?.positive);
    console.log('   activeMode:', activeMode);
    console.log('   storedImages:', storedImages);
    
    if (!generatedPrompt?.positive) {
      console.warn('?? No generated prompt found!');
      console.warn('   generatedPrompt is:', generatedPrompt);
      console.log('?? You need to complete Step 3 first:');
      console.log('   1. Select style options in the left sidebar');
      console.log('   2. Wait for the prompt to generate (should see blue/green/red boxes)');
      console.log('   3. Click "Next Step" to go to Step 4');
      return;
    }
    
    setIsGenerating(true);
    setCurrentStep(4);
    let flowId = null;

    try {
      try {
        flowId = await ensureImageSession(selectedFlowId);
        if (flowId) {
          await captureGenerationSession(flowId, {
            flowType: 'image-generation',
            useCase,
            status: 'in-progress',
            workflowState: buildImageWorkflowState({
              currentStep: 4,
              prompt: generatedPrompt?.positive || null
            }),
            analysis: {
              generationRequest: {
                activeMode,
                generationProvider,
                aspectRatio,
                imageCount,
                hasReferenceImage: !!referenceImage?.file,
                hasCustomPrompt: !!customPrompt,
                selectedOptions,
                selectedCharacter
              }
            },
            log: {
              category: 'image-generation',
              message: 'Image generation requested',
              details: {
                provider: generationProvider,
                imageCount,
                aspectRatio
              }
            }
          });
        }
      } catch (sessionError) {
        console.warn('?? Could not create backend session (non-blocking):', sessionError.message);
      }

      const finalPrompt = generatedPrompt.positive + (customPrompt ? '\n' + customPrompt : '');
      
      console.log('?? Starting generation...');
      console.log('   Mode:', activeMode);
      console.log('   Provider:', browserProvider);
      const generationInputSchema = getImageUseCaseInputSchema(useCase);
      const canGenerateFromStoredImages =
        (generationInputSchema.character === 'optional' || !!storedImages.character) &&
        (generationInputSchema.product === 'optional' || !!storedImages.product) &&
        (!!storedImages.character || !!storedImages.product);
      console.log('   Has stored images:', canGenerateFromStoredImages);
      console.log('   Has prompt:', !!finalPrompt);
      
      let response;
      
      if (activeMode === 'browser' && canGenerateFromStoredImages) {
        console.log('? Using browser generation mode with provider:', generationProvider);
        const refBase64 = referenceImage?.file ? await fileToBase64(referenceImage.file) : null;
        
        const genOptions = {
          generationProvider,  // ?? Image generation provider selection (grok or google-flow)
          imageGenProvider,  // ?? For backward compatibility
          negativePrompt: generatedPrompt.negative,
          // ?? Pass ALL selected options, not just hardcoded ones
          ...selectedOptions,
          // Overrides for explicitly set values
          aspectRatio,
          characterImageBase64: storedImages.character,
          productImageBase64: storedImages.product,
          useCase,
          referenceImageBase64: refBase64,
          imageCount,
          hasWatermark,
          grokConversationId, // Pass conversation ID to reuse
          grokUrl: null, // Will be set based on conversation ID
          // ?? NEW: Pass character description for better generation
          characterDescription,
          selectedCharacter,
          // Storage configuration
          storageType,
          localFolder,
          flowId,  // ?? Pass flowId to backend
          language: i18n.language || 'en'  // ?? Pass language for Vietnamese support
        };
        
        console.log('?? Sending generation request to backend...');
        response = await browserAutomationAPI.generateBrowserOnly(finalPrompt, genOptions);
        console.log('?? Generation response:', response);
      } else {
        console.log('?? Fallback to unified flow (images may not be stored)');
        console.log('   activeMode:', activeMode);
        console.log('   storedImages.character:', !!storedImages.character);
        console.log('   storedImages.product:', !!storedImages.product);
        
        const refBase64 = referenceImage?.file ? await fileToBase64(referenceImage.file) : null;
        
        response = await unifiedFlowAPI.generateImages({
          prompt: finalPrompt,
          negativePrompt: generatedPrompt.negative,
          options: {
            imageCount,
            aspectRatio,
            hasWatermark,
            referenceImage: refBase64,
            flowId  // ?? Pass flowId to backend
          }
        });
      }

      if (response?.success && response?.data?.generatedImages && response.data.generatedImages.length > 0) {
        console.log('? Generation successful! Generated images:', response.data.generatedImages);
        console.log('   Count:', response.data.generatedImages.length);
        console.log('   Details:', response.data.generatedImages.map((img, i) => ({
          index: i,
          url: img.url || img,
          filename: img.filename || 'N/A'
        })));
        setGenerationError(null);  // ?? Clear error on success
        setRetryable(false);  // ?? Clear retry flag
        setGeneratedImages(response.data.generatedImages);
        loadRecentSessions();
        if (flowId) {
          await captureGenerationSession(flowId, {
            flowType: 'image-generation',
            useCase,
            status: 'completed',
            artifacts: {
              characterImagePath: response.data?.filePaths?.characterImage || null,
              productImagePath: response.data?.filePaths?.productImage || null,
              generatedImagePaths: response.data?.filePaths?.generatedImages || response.data.generatedImages.map((img) => (typeof img === 'string' ? img : img.url)).filter(Boolean),
            },
            analysis: {
              generationResult: {
                provider: generationProvider,
                aspectRatio,
                count: response.data.generatedImages.length,
                prompt: finalPrompt,
                negativePrompt: generatedPrompt?.negative || '',
              },
            },
            metricStage: {
              stage: 'image-generation',
              status: 'completed',
              endTime: new Date(),
            },
            log: {
              category: 'image-generation',
              message: `Generated ${response.data.generatedImages.length} image(s) successfully`,
            },
          });
        }

        // ?? NEW: Save generated images as assets to gallery
        try {
          const sessionId = 'session-' + Date.now();
          console.log('?? Saving generated images as gallery assets...');
          const generatedPaths = response.data?.filePaths?.generatedImages || [];
          
          for (let i = 0; i < response.data.generatedImages.length; i++) {
            const img = response.data.generatedImages[i];
            const imageUrl = typeof img === 'string' ? img : img.url;
            const filename = img.filename || `generated-image-${i + 1}.png`;
            const localPath = generatedPaths[i] || (typeof img === 'object' ? (img.path || img.localPath) : null);
            
            try {
              // ?? FIXED: Convert prompt object to string for MongoDB schema
              const promptString = typeof generatedPrompt === 'string' 
                ? generatedPrompt 
                : (generatedPrompt?.positive || '');

              const asset = await assetService.saveGeneratedImageAsAsset(
                imageUrl,
                filename,
                sessionId,
                {
                  prompt: promptString,
                  model: 'google-flow',
                  imageCount,
                  aspectRatio,
                  generationIndex: i + 1,
                  localPath
                }
              );
              console.log(`? Generated image ${i + 1} saved as asset:`, asset);
            } catch (imgError) {
              console.warn(`??  Could not save generated image ${i + 1}:`, imgError);
              // Continue with other images even if one fails
            }
          }
        } catch (assetError) {
          console.warn('??  Could not save generated images as assets, but continuing...', assetError);
        }
        
        // Upload to Google Drive if enabled
        if (uploadToDrive && response.data.generatedImages.length > 0) {
          handleUploadToGoogleDrive(response.data.generatedImages);
        }
      } else if (response?.success === false && response?.data?.retryable) {
        // ?? Handle retryable error (from frontend retry button in UI)
        console.error('? Generation failed (retryable):', response.data.error);
        setGenerationError(response.data.error || response.message || 'Image generation failed');
        setRetryable(true);  // Allow retry from frontend
        alert(`?? ${response.data.error}\n\nPlease click "Retry Generation" to try again.`);
      } else if (response?.success === false && response?.data?.retryable === false) {
        // ?? CHANGED: Generation failed after 3 backend attempts - need to change images
        console.error('? Generation failed after 3 attempts:', response.data.error);
        setGenerationError(response.data.error || 'Generation failed after 3 attempts');
        setRetryable(false);  // No retry - need different images
        alert(`? ${response.data.error}\n\nPlease change your images and try again.`);
      } else if (response?.success === false) {
        // ?? Generation failed - general error
        console.error('? Generation failed:', response.message || response.error);
        setGenerationError(response.message || response.error || 'Image generation failed');
        setRetryable(false);
        alert(`? Generation failed: ${response.message || response.error}`);
      } else {
        console.error('? Generation response missing expected data:', response);
        setGenerationError('Invalid generation response - please try again');
        setRetryable(false);
      }
    } catch (error) {
      console.error('? Generation failed:', error);
      console.error('   Error message:', error.message);
      console.error('   Error details:', error);
      if (flowId) {
        await captureGenerationSession(flowId, {
          flowType: 'image-generation',
          useCase,
          error: {
            stage: 'image-generation',
            message: error.message || 'Generation failed - please try again',
          },
          log: {
            level: 'error',
            category: 'image-generation',
            message: error.message || 'Generation failed - please try again',
          },
        });
      }
      setGenerationError(error.message || 'Generation failed - please try again');
      setRetryable(true);  // Allow retry on network/other errors
      alert(`? Generation error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadToGoogleDrive = async (images) => {
    try {
      setDriveUploadStatus('Uploading to Google Drive...');
      
      const successfulUploads = [];
      let uploadError = null;
      
      for (const image of images) {
        try {
          // Convert base64 or URL to blob
          let blob;
          if (image.url?.startsWith('data:')) {
            // Base64 image
            const arr = image.url.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            const n = bstr.length;
            const u8arr = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
              u8arr[i] = bstr.charCodeAt(i);
            }
            blob = new Blob([u8arr], { type: mime });
          } else {
            // URL image - fetch and convert
            const response = await fetch(image.url);
            blob = await response.blob();
          }
          
          // Upload to drive
          const fileName = `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });
          
          const uploadResult = await driveAPI.uploadFile(file, {
            description: `Generated from K-Creative Studio\nPrompt: ${generatedPrompt?.positive?.slice(0, 100)}...`,
            metadata: {
              useCase: useCase,
              style: selectedOptions.style || 'unknown',
              generatedAt: new Date().toISOString(),
            }
          });

          // ?? FIXED: Check if upload is actually configured
          if (uploadResult?.source === 'local' || uploadResult?.notice) {
            console.warn(`??  Google Drive not configured, file saved locally: ${fileName}`);
            uploadError = uploadResult?.notice || 'Google Drive not configured';
          } else {
            console.log(`? Uploaded: ${fileName}`);
            successfulUploads.push(image.url);
          }
        } catch (error) {
          console.warn(`??  Could not upload to Google Drive:`, error.message);
          uploadError = error.message;
        }
      }
      
      // Update status with result
      if (uploadError && successfulUploads.length === 0) {
        setDriveUploadStatus(`??  ${uploadError}`);
        console.warn('?? Images displayed locally. Google Drive upload skipped.');
      } else if (successfulUploads.length > 0) {
        setDriveUploadStatus(`? Uploaded ${successfulUploads.length}/${images.length} images`);
      } else {
        setDriveUploadStatus(null);
      }

      // ?? NEW: Remove temporary local files after successful upload
      if (successfulUploads.length > 0) {
        try {
          for (const imageUrl of successfulUploads) {
            // Extract filename from URL if it's a local path
            const filename = imageUrl.split('/').pop() || imageUrl;
            const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
            const headers = { 'Content-Type': 'application/json' };
            if (accessToken) {
              headers.Authorization = `Bearer ${accessToken}`;
            }
            await fetch('/api/v1/browser-automation/delete-temp-file', {
              method: 'POST',
              headers,
              body: JSON.stringify({ filename })
            });
            console.log(`???  Removed temp file: ${filename}`);
          }
        } catch (error) {
          console.warn(`??  Could not remove temp files: ${error.message}`);
        }
      }
      
      setDriveUploadStatus(`? Successfully uploaded ${successfulUploads.length} image(s) to Google Drive!`);
      setTimeout(() => setDriveUploadStatus(null), 5000);
    } catch (error) {
      console.error('? Google Drive upload failed:', error);
      setDriveUploadStatus(`? Upload failed: ${error.message}`);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCharacterImage(null);
    setProductImage(null);
    setUseCase('change-clothes');
    setProductFocus('full-outfit');
    setPromptMode('step3');
    setSelectedOptions({});
    setCustomOptions({});
    setAnalysis(null);
    setAnalysisRaw(null);
    setGeneratedPrompt(null);
    setGeneratedImages([]);
    setStoredImages({ character: null, product: null });
    setImageCount(2);
    setAspectRatio('1:1');
    setHasWatermark(false);
    setReferenceImage(null);
    setReferenceImages([]);
    setCustomPrompt('');
    setGenerationError(null);  // ?? Clear error on reset
    setRetryable(false);  // ?? Clear retry flag on reset
    setNewOptions([]);
    setGenerationSteps(30);
    setGenerationCfgScale(7.5);
    setGenerationSamplingMethod('euler');
    setGenerationSeed(null);
    setGenerationRandomSeed(true);
    setGrokConversationId(null);
    setCharacterDescription(null);
    setStorageType('cloud');
    setLocalFolder(null);
  };

  // ============================================================
  // RENDER
  // ============================================================

  const showUseCaseFocusInfo = currentStep >= 2;
  const useCaseInputSchema = getImageUseCaseInputSchema(useCase);
  const isCharacterRequired = useCaseInputSchema.character !== 'optional';
  const isProductRequired = useCaseInputSchema.product !== 'optional';
  const hasCharacterInput = Boolean(selectedCharacter || characterImage);
  const hasProductInput = Boolean(productImage);
  const showOptionalProductAsSecondary = !isProductRequired && isCharacterRequired;
  const isReadyForAnalysis = (!isCharacterRequired || hasCharacterInput) && (!isProductRequired || hasProductInput);
  const step1Copy = getUseCaseStep1Copy(useCase, { isCharacterRequired, isProductRequired });
  const isReadyForPrompt = analysis && Object.keys(selectedOptions).length > 0;
  const isReadyForGeneration = generatedPrompt?.positive;
  const characterPreviewSrc = selectedCharacter?.portraitUrl || characterImage?.preview || null;
  const currentScene = sceneOptions.find((scene) => scene.value === selectedOptions.scene);
  const selectedScenePrompt = getSceneLockedPrompt(currentScene, i18n.language || 'en');
  const scenePreviewUrl = referenceImage?.preview || getScenePreviewUrl(currentScene, aspectRatio);
  const step1SectionClass = 'studio-card-shell rounded-[0.75rem] px-2.5 py-2';
  const uploadCardBaseClass = 'studio-card-shell flex min-h-[318px] flex-col rounded-[0.875rem] p-2.5';
  const uploadDropzoneBaseClass = 'studio-dropzone group relative flex items-center justify-center overflow-hidden rounded-[0.75rem] transition';
  const characterCardClass = `${uploadCardBaseClass} ${!isCharacterRequired ? 'opacity-80' : ''}`;
  const productCardClass = `${uploadCardBaseClass} ${showOptionalProductAsSecondary ? 'min-h-[304px] opacity-75 saturate-[0.88]' : ''}`;
  const sceneCardClass = uploadCardBaseClass;
  const getSectionOptionChipClass = (isSelected, tone = 'cool') => {
    const accentClass = isSelected
      ? tone === 'warm'
        ? 'apple-chip-usecase-selected'
        : tone === 'cool'
          ? 'apple-chip-focus-selected'
          : ''
      : '';
    const selectedClass = isSelected ? 'apple-option-chip-selected selected' : '';
    return `apple-option-chip ${tone ? `apple-option-chip-${tone}` : ''} ${selectedClass} ${accentClass} flex w-full items-center justify-between gap-2 rounded-[0.625rem] px-2.5 py-2 text-left text-[12px] font-medium leading-4 transition`;
  };

  const handleImageFileSelection = (event, setter) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setter({ file, preview: URL.createObjectURL(file), source: 'upload', name: file.name, size: file.size, type: file.type });
    event.target.value = '';
  };

  return (
    <div className="image-generation-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden lg:-mx-6 lg:-mb-6 lg:-mt-6" ref={containerRef} data-main-body>
      <PageHeaderBar
        icon={<Wand2 className="h-4 w-4 text-sky-400" />}
        title="Image generation workflow"
        meta={`${getUseCaseDisplayLabel(useCase)} / ${getFocusDisplayLabel(productFocus)} / ${browserProvider}`}
        className="h-16"
        contentClassName="px-5 lg:px-6"
        actions={(
          <div className="hidden items-center gap-1.5 lg:flex">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => isCompleted && setCurrentStep(step.id)}
                    disabled={!isCompleted && !isActive}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'apple-chip-step-active'
                        : isCompleted
                          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15'
                          : 'border-white/10 bg-white/[0.04] text-slate-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{t(step.nameKey)}</span>
                  </button>
                  {idx < STEPS.length - 1 && <div className={`h-px w-5 ${isCompleted ? 'bg-emerald-400/60' : 'bg-white/10'}`} />}
                </React.Fragment>
              );
            })}
          </div>
        )}
      />

      {/* ==================== MAIN BODY ==================== */}
      <div className={`${currentStep === 1 ? 'step1-main-shell' : ''} flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-2.5`}>
        <div className={`${currentStep === 1 ? 'step1-main-row' : ''} flex min-h-0 flex-1 items-stretch gap-[15px] overflow-hidden`}>
          {/* ==================== LEFT TOOLBAR: Mode + Provider ==================== */}
          <div className="hidden">
          <Tooltip content="Browser AI mode">
            <button
              onClick={() => setActiveMode('browser')}
              className={`rounded-2xl border p-2.5 transition-all ${
                activeMode === 'browser'
                  ? 'border-sky-300/35 bg-sky-300/18 text-sky-100 shadow-[0_12px_24px_rgba(8,78,120,0.25)]'
                  : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/15 hover:bg-white/[0.08] hover:text-white'
              }`}
              title="Browser AI"
            >
              <Sparkles className="h-4.5 w-4.5" />
            </button>
          </Tooltip>
          <Tooltip content="Upload image mode">
            <button
              onClick={() => setActiveMode('upload')}
              className={`rounded-2xl border p-2.5 transition-all ${
                activeMode === 'upload'
                  ? 'border-cyan-300/35 bg-cyan-300/14 text-cyan-100 shadow-[0_12px_24px_rgba(6,78,108,0.25)]'
                  : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/15 hover:bg-white/[0.08] hover:text-white'
              }`}
              title="Upload mode"
            >
              <Upload className="h-4.5 w-4.5" />
            </button>
          </Tooltip>

          <div className="h-px w-8 bg-white/10" />

          {activeMode === 'browser' && (
            <div className="flex flex-col gap-2">
              {PROVIDERS.map((provider) => (
                <Tooltip key={provider.id} content={`${provider.label} · ${provider.description}`}>
                  <button
                    onClick={() => setBrowserProvider(provider.id)}
                    className={`rounded-2xl border p-2.5 transition-all ${
                      browserProvider === provider.id
                        ? 'border-sky-300/35 bg-sky-400/15 text-sky-100 shadow-[0_12px_24px_rgba(8,78,120,0.25)]'
                        : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/15 hover:bg-white/[0.08] hover:text-white'
                    }`}
                    title={provider.label}
                  >
                    <ProviderGlyph providerId={provider.id} />
                  </button>
                </Tooltip>
              ))}
            </div>
          )}

          <div className="flex-1" />
          <Tooltip content="Reset current workflow">
            <button onClick={handleReset} className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-400 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white" title="Reset workflow">
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
          </Tooltip>
          </div>

          {/* ==================== LEFT SIDEBAR: Options ==================== */}
          <div className={`${currentStep === 2 ? 'w-[184px] xl:w-[198px]' : currentStep === 3 ? 'w-[198px]' : currentStep === 4 ? 'w-[250px] xl:w-[280px]' : 'w-[360px] xl:w-[420px]'} ${currentStep === 1 ? 'step1-responsive-sidebar step1-sidebar-panel' : ''} generation-content-plain flex min-h-0 flex-col flex-shrink-0 overflow-hidden transition-all duration-300`}>
          <div className={`step1-sidebar-scroll min-h-0 flex-1 space-y-3 ${currentStep === 1 ? 'overflow-y-auto overflow-x-hidden' : 'overflow-y-auto'}`}>
            {/* Step 1: Use Case & Focus */}
            {currentStep === 1 && (
              <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,0.9fr)] gap-2">
                <div className="space-y-3">
                  <section className={step1SectionClass}>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="rounded-xl bg-sky-300/10 p-2 text-sky-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <Shirt className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Setup</p>
                        <h3 className="text-sm font-semibold text-white">Use case</h3>
                      </div>
                    </div>
                    <div className="step1-option-grid grid grid-cols-1 gap-1.5">
                      {ACTIVE_IMAGE_USE_CASES.map((uc) => (
                        <button
                          key={uc.value}
                          onClick={() => setUseCase(uc.value)}
                          className={getSectionOptionChipClass(useCase === uc.value, 'warm') + ' min-h-[38px] px-1.5 py-1.5'}
                        >
                          <span className="block min-w-0 truncate">{getUseCaseDisplayLabel(uc.value)}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className={step1SectionClass}>
                    <div className="mb-2 flex items-center gap-2">
                      <div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <Target className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Composition</p>
                        <h3 className="text-sm font-semibold text-white">Product focus</h3>
                      </div>
                    </div>
                    <div className="step1-option-grid grid grid-cols-1 gap-1.5">
                      {FOCUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setProductFocus(opt.value)}
                          className={getSectionOptionChipClass(productFocus === opt.value, 'cool') + ' min-h-[38px] px-1.5 py-1.5'}
                        >
                          <span className="block min-w-0 truncate">{getFocusDisplayLabel(opt.value)}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <section className={step1SectionClass + ' px-2 py-2'}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">History</p>
                    <button
                      type="button"
                      onClick={loadRecentSessions}
                      disabled={recentSessionsLoading}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.08] hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-500"
                    >
                      {recentSessionsLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  {recentSessions.length === 0 && !recentSessionsLoading && (
                    <div className="text-[11px] text-slate-500">No recent sessions.</div>
                  )}

                  <div className="space-y-2">
                    {recentSessions.map((session) => {
                      const detail = session.detail || session;
                      const previewItems = extractSessionPreview(session);
                      const status = detail?.status || session.status;
                      const statusTone = status === 'completed' ? 'bg-emerald-500/20 text-emerald-200'
                        : status === 'failed' ? 'bg-rose-500/20 text-rose-200'
                        : 'bg-amber-500/20 text-amber-200';
                      return (
                        <div key={session.sessionId} className="rounded-xl border border-slate-800/80 bg-slate-950/60 px-2 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={"rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] " + statusTone}>
                              {status || 'unknown'}
                            </span>
                            {(status === 'in-progress' || status === 'failed') && (
                              <button
                                type="button"
                                onClick={() => handleQuickResume(session)}
                                disabled={recentResumeId === session.sessionId}
                                className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200 transition hover:bg-cyan-500/18 hover:text-cyan-100 disabled:cursor-not-allowed disabled:text-slate-500"
                              >
                                {recentResumeId === session.sessionId ? 'resuming...' : 'resume'}
                              </button>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-1">
                            {previewItems.length ? (
                              previewItems.map((item, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    if (!item.url) return;
                                    setRecentPreview({
                                      url: item.url,
                                      label: item.type === 'output' ? 'Output' : 'Input',
                                      sessionId: session.sessionId
                                    });
                                  }}
                                  className="relative h-9 w-9 overflow-hidden rounded-lg border border-slate-800/80 bg-black/40 transition hover:border-sky-400/50 hover:ring-2 hover:ring-sky-400/30"
                                  title={item.type === 'output' ? 'Preview output image' : 'Preview input image'}
                                >
                                  {item.url ? (
                                    <img src={item.url} alt="preview" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-500">N/A</div>
                                  )}
                                  <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/60 px-1 text-[8px] text-slate-200">{item.type === 'output' ? 'OUT' : 'IN'}</span>
                                </button>
                              ))
                            ) : (
                              <div className="text-[10px] text-slate-500">No preview</div>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-slate-400">
                            <span className="truncate">{session.sessionId}</span>
                            <span className="shrink-0">{formatSessionTime(detail?.updatedAt || detail?.createdAt || session.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}
            {/* Step 2: Image Previews */}
            {currentStep === 2 && (characterPreviewSrc || productImage) && (
              <div>
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2 flex items-center gap-1">
                  <Image className="w-3 h-3" /> Uploaded Images
                </h3>
                <div className="space-y-2">
                  {characterPreviewSrc && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Character</p>
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-300 bg-white/50 backdrop-blur-sm">
                        <img 
                          src={characterPreviewSrc} 
                          alt="Character" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  {productImage?.preview && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Product</p>
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-300 bg-white/50 backdrop-blur-sm">
                        <img 
                          src={productImage.preview} 
                          alt="Product" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Style Options - Inline Expansion */}
            {currentStep === 3 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-3 flex items-center gap-1">
                  <Wand2 className="w-3 h-3" /> Style Options
                </h3>
                <div className="mb-3 rounded-[1.45rem] bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.025))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="mb-2">
                    <p className="text-xs uppercase text-sky-300 font-semibold">Scene Locked</p>
                    <p className="text-sm text-white font-medium">{sceneOptions.find(s => s.value === selectedOptions.scene)?.label || selectedOptions.scene || 'Not selected'}</p>
                  </div>
                  <button
                    onClick={() => setShowSceneLockedPrompt(v => !v)}
                    className="text-xs text-sky-300 underline underline-offset-2"
                  >
                    {showSceneLockedPrompt ? 'Hide locked prompt' : 'Show locked prompt'}
                  </button>
                  {showSceneLockedPrompt && (
                    <p className="mt-2 text-xs leading-6 text-slate-600 whitespace-pre-wrap">
                      {(() => {
                        const currentScene = sceneOptions.find(s => s.value === selectedOptions.scene);
                        const isVi = (i18n.language || 'en').toLowerCase().startsWith('vi');
                        return isVi
                          ? (currentScene?.sceneLockedPromptVi || currentScene?.sceneLockedPrompt || currentScene?.promptSuggestionVi || currentScene?.promptSuggestion || 'No locked prompt')
                          : (currentScene?.sceneLockedPrompt || currentScene?.sceneLockedPromptVi || currentScene?.promptSuggestion || currentScene?.promptSuggestionVi || 'No locked prompt');
                      })()}
                    </p>
                  )}
                  <button
                    onClick={() => setShowScenePicker(true)}
                    className="mt-3 rounded-full bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.12] w-full"
                  >
                    Pick Scene
                  </button>
                </div>

                <div className="space-y-2">
                  {Object.entries(STYLE_CATEGORIES)
                    .filter(([key]) => key !== 'scene' && getVisibleCategories().includes(key))
                    .map(([key, category]) => {
                      const selectedLabel = Array.isArray(selectedOptions[key])
                        ? selectedOptions[key].join(', ')
                        : category.options.find((opt) => opt.value === selectedOptions[key])?.label || selectedOptions[key];

                      return (
                        <div key={key} className="rounded-[1.35rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.022))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <button
                            onClick={() => setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }))}
                            className="flex w-full items-center justify-between gap-3 rounded-[1.05rem] px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                          >
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 text-sm font-medium text-white">
                                <span className="text-sm">{category.icon}</span>
                                <span className="truncate">{category.label}</span>
                              </span>
                              {selectedLabel ? (
                                <span className="mt-1 block truncate text-[11px] text-sky-200/85">{selectedLabel}</span>
                              ) : null}
                            </span>
                            {expandedCategories[key] ? (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 rotate-90 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            )}
                          </button>

                          {expandedCategories[key] && (
                            <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto px-2 pb-2 pt-1">
                              {category.options.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleOptionChange(key, opt.value)}
                                  className={getSectionOptionChipClass(selectedOptions[key] === opt.value, 'cool')}
                                  title={opt.label}
                                >
                                  <span className="flex w-full items-center justify-between gap-2">
                                    {selectedOptions[key] === opt.value ? (
                                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-950/15 text-[9px] font-bold">
                                        ✓
                                      </span>
                                    ) : null}
                                    <span className="min-w-0 flex-1 truncate text-left">{opt.label}</span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Step 4: Generation Options */}
            {currentStep === 4 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2 flex items-center gap-1">
                  <Rocket className="w-3 h-3" /> Generation
                </h3>
                
                <GenerationOptions
                  imageCount={imageCount}
                  onImageCountChange={setImageCount}
                  aspectRatio={aspectRatio}
                  onAspectRatioChange={setAspectRatio}
                  hasWatermark={hasWatermark}
                  onWatermarkChange={setHasWatermark}
                  referenceImage={referenceImage}
                  onReferenceImageChange={setReferenceImage}
                  steps={generationSteps}
                  onStepsChange={setGenerationSteps}
                  cfgScale={generationCfgScale}
                  onCfgScaleChange={setGenerationCfgScale}
                  samplingMethod={generationSamplingMethod}
                  onSamplingMethodChange={setGenerationSamplingMethod}
                  seed={generationSeed}
                  onSeedChange={setGenerationSeed}
                  randomSeed={generationRandomSeed}
                  onRandomSeedChange={setGenerationRandomSeed}
                  imageGenProvider={imageGenProvider}
                />
              </div>
            )}
          </div>
          </div>

          {/* ==================== CENTER + RIGHT ==================== */}
          <div className={`${currentStep === 1 ? 'step1-work-area' : ''} flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}>
            <div className={`${currentStep === 1 ? 'step1-work-row' : ''} flex min-h-0 min-w-0 flex-1 overflow-hidden`}>
            {/* ==================== CENTER MAIN CONTENT ==================== */}
            <div className={`${currentStep === 1 ? 'step1-center-panel' : ''} generation-content-plain center-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}>
              {showUseCaseFocusInfo && (
                <div className="flex-shrink-0 px-4 py-2.5 shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-white/[0.05] px-3 py-1 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      Use case: <span className="font-medium text-white">{getUseCaseDisplayLabel(useCase)}</span>
                    </span>
                    <span className="rounded-full bg-white/[0.05] px-3 py-1 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      Focus: <span className="font-medium text-white">{getFocusDisplayLabel(productFocus)}</span>
                    </span>
                    </div>
                    {currentStep === 3 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPromptMode('template')}
                          className={`flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                            promptMode === 'template'
                              ? 'bg-sky-400/18 text-sky-50 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.18)]'
                              : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                          Use Template Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setPromptMode('step3')}
                          className={`flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                            promptMode === 'step3'
                              ? 'bg-sky-400/18 text-sky-50 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.18)]'
                              : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Use Step3 Mode
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={`${currentStep === 1 ? 'step1-center-scroll' : ''} flex-1 overflow-y-auto`}>
                <div className={`${currentStep === 1 ? 'step1-center-shell flex h-full min-h-0 flex-col' : ''} relative w-full max-w-none`}>
                  {/* Step 1: Upload */}
                  {currentStep === 1 && (
                    <div className="step1-upload-stage flex h-full min-h-0 flex-col gap-3">
                      <div className="step1-upload-toolbar flex flex-wrap items-center gap-1.5 rounded-[1.1rem] bg-white/[0.03] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:gap-1.5 lg:px-3 lg:py-2.5 xl:gap-2.5 xl:px-3.5">
                        <button
                          type="button"
                          onClick={() => setActiveMode('browser')}
                          className={`inline-flex items-center gap-1.25 rounded-full px-2.25 py-1 text-[11px] font-medium transition lg:gap-1.5 lg:px-3 lg:py-1.5 lg:text-xs ${
                            activeMode === 'browser'
                              ? 'apple-chip-browser-active'
                              : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Browser
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveMode('upload')}
                          className={`inline-flex items-center gap-1.25 rounded-full px-2.25 py-1 text-[11px] font-medium transition lg:gap-1.5 lg:px-3 lg:py-1.5 lg:text-xs ${
                            activeMode === 'upload'
                              ? 'apple-chip-upload-active'
                              : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          API
                        </button>
                        {activeMode === 'browser' && (
                          <>
                            <div className="mx-0.5 h-3.5 w-px bg-white/10 lg:mx-0.5 lg:h-4" />
                            {PROVIDERS.map((provider) => (
                              <button
                                key={provider.id}
                                type="button"
                                onClick={() => setBrowserProvider(provider.id)}
                                className={`inline-flex items-center gap-1.25 rounded-full px-2.25 py-1 text-[11px] font-medium transition lg:gap-1.5 lg:px-3 lg:py-1.5 lg:text-xs ${
                                  browserProvider === provider.id
                                    ? 'apple-chip-browser-active'
                                    : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                                }`}
                              >
                                <ProviderGlyph providerId={provider.id} />
                                {provider.label}
                              </button>
                            ))}
                          </>
                        )}
                      </div>

                      <div className="step1-upload-grid grid gap-3 md:grid-cols-3">
                        <section className={`step1-upload-card ${characterCardClass} group relative`}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCharacter(null);
                              setCharacterImage(null);
                            }}
                            className="pointer-events-none absolute right-3 top-3 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900/65 text-white opacity-0 ring-1 ring-white/16 shadow-[0_10px_18px_rgba(15,23,42,0.22)] transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-red-500/85"
                            title="Clear character"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="mb-3 flex items-start gap-3 pr-12">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Character</p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${isCharacterRequired ? 'apple-required-pill bg-red-500/12 text-red-500 ring-1 ring-red-500/20' : 'bg-slate-400/12 text-slate-300'}`}>
                                  {isCharacterRequired ? 'Required' : 'Optional'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => characterFileInputRef.current?.click()}
                            className={`step1-upload-dropzone ${uploadDropzoneBaseClass} h-[188px] hover:bg-white/[0.03]`}
                          >
                            {selectedCharacter ? (
                              <>
                                {selectedCharacter.portraitUrl ? (
                                  <img src={selectedCharacter.portraitUrl} alt={selectedCharacter.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-300">
                                    <Sparkles className="h-8 w-8 text-sky-300" />
                                    <span className="text-sm font-medium">{selectedCharacter.name}</span>
                                  </div>
                                )}
                                <div className="studio-media-overlay absolute inset-x-0 bottom-0 border-t border-black/10 bg-black/60 px-4 py-3 text-left backdrop-blur drop-shadow-lg">
                                  <p className="studio-media-overlay-title text-sm font-medium text-white drop-shadow">{selectedCharacter.name}</p>
                                  <p className="studio-media-overlay-meta text-xs text-white drop-shadow">@{selectedCharacter.alias}</p>
                                </div>
                              </>
                            ) : characterImage?.preview ? (
                              <>
                                <img src={characterImage.preview} alt="Character" className="h-full w-full object-contain p-3" />
                                <div className="studio-media-overlay absolute inset-x-0 bottom-0 border-t border-black/10 bg-black/60 px-4 py-3 text-left backdrop-blur drop-shadow-lg">
                                  <p className="studio-media-overlay-title text-sm font-medium text-white drop-shadow">{step1Copy.characterUploadedLabel}</p>
                                  <p className="studio-media-overlay-meta text-xs text-white drop-shadow">{step1Copy.characterUploadedSubLabel}</p>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center">
                                <Upload className="mb-3 h-8 w-8 text-slate-500 transition group-hover:text-sky-300" />
                                <p className="text-[15px] font-medium text-white">{step1Copy.characterUploadTitle}</p>
                                <p className="mt-1 text-xs text-slate-400">{step1Copy.characterUploadHint}</p>
                              </div>
                            )}
                            <input
                              ref={characterFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => handleImageFileSelection(event, setCharacterImage)}
                            />
                          </button>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setShowCharacterSelector(true)}
                              className="rounded-xl border border-sky-300/25 bg-sky-400/12 px-3 py-2 text-[13px] font-medium text-sky-100 transition hover:bg-sky-400/18"
                            >
                              {step1Copy.characterSelectCta}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setGalleryPickerFor('character');
                                setShowGalleryPicker(true);
                              }}
                              className="rounded-xl border border-sky-300/25 bg-sky-400/12 px-3 py-2 text-[13px] font-medium text-sky-100 transition hover:bg-sky-400/18"
                            >
                              {step1Copy.characterGalleryCta}
                            </button>
                          </div>
                        </section>

                        <section className={`step1-upload-card ${productCardClass} group relative`}>
                          <button
                            type="button"
                            onClick={() => setProductImage(null)}
                            className="pointer-events-none absolute right-3 top-3 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900/65 text-white opacity-0 ring-1 ring-white/16 shadow-[0_10px_18px_rgba(15,23,42,0.22)] transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-red-500/85"
                            title="Clear product"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="mb-3 flex items-start gap-3 pr-12">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">Product</p>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${isProductRequired ? 'apple-required-pill bg-red-500/12 text-red-500 ring-1 ring-red-500/20' : 'bg-slate-400/12 text-slate-300'}`}>
                                  {isProductRequired ? 'Required' : 'Optional'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => productFileInputRef.current?.click()}
                            className={`step1-upload-dropzone ${uploadDropzoneBaseClass} h-[188px] hover:bg-white/[0.03]`}
                          >
                            {productImage?.preview ? (
                              <>
                                <img src={productImage.preview} alt="Product" className="h-full w-full object-contain p-3" />
                                <div className="studio-media-overlay absolute inset-x-0 bottom-0 border-t border-black/10 bg-black/60 px-4 py-3 text-left backdrop-blur drop-shadow-lg">
                                  <p className="studio-media-overlay-title text-sm font-medium text-white drop-shadow">{step1Copy.productUploadedLabel}</p>
                                  <p className="studio-media-overlay-meta text-xs text-white drop-shadow">{step1Copy.productUploadedSubLabel}</p>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center">
                                <Upload className="mb-3 h-8 w-8 text-slate-500 transition group-hover:text-cyan-200" />
                                <p className="text-[15px] font-medium text-white">{step1Copy.productUploadTitle}</p>
                                <p className="mt-1 text-xs text-slate-400">{step1Copy.productUploadHint}</p>
                              </div>
                            )}
                            <input
                              ref={productFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => handleImageFileSelection(event, setProductImage)}
                            />
                          </button>

                          <div className="mt-3 grid grid-cols-1 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setGalleryPickerFor('product');
                                setShowGalleryPicker(true);
                              }}
                              className="rounded-xl border border-sky-300/25 bg-sky-400/12 px-3 py-2 text-[13px] font-medium text-sky-100 transition hover:bg-sky-400/18"
                            >
                              {step1Copy.productGalleryCta}
                            </button>
                          </div>
                        </section>

                        <section className={`step1-upload-card ${sceneCardClass} group relative`}>
                          <button
                            type="button"
                            onClick={() => setReferenceImage(null)}
                            className="pointer-events-none absolute right-3 top-3 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900/65 text-white opacity-0 ring-1 ring-white/16 shadow-[0_10px_18px_rgba(15,23,42,0.22)] transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-red-500/85"
                            title="Clear custom scene reference"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="mb-3 flex items-center justify-between gap-3 pr-12">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Scene</p>
                            <p className="text-sm text-white font-medium">{currentScene?.label || 'No scene selected'}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => sceneFileInputRef.current?.click()}
                            className={`step1-upload-dropzone step1-scene-dropzone ${uploadDropzoneBaseClass} h-[188px] hover:bg-white/[0.03]`}
                          >
                            {scenePreviewUrl ? (
                              <>
                                <img src={scenePreviewUrl} alt="Scene reference" className="h-full w-full object-cover" />
                                <div className="studio-media-overlay absolute inset-x-0 bottom-0 border-t border-black/10 bg-black/60 px-4 py-3 text-left backdrop-blur drop-shadow-lg">
                                  {referenceImage ? <p className="studio-media-overlay-title text-sm font-medium text-white drop-shadow">Custom scene reference</p> : null}
                                  <p className="studio-media-overlay-meta text-xs text-white drop-shadow">{referenceImage ? 'Tap to replace' : 'Upload to override with your own reference'}</p>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center">
                                <Upload className="mb-3 h-8 w-8 text-slate-500 transition group-hover:text-sky-300" />
                                <p className="text-sm font-medium text-white">Add scene reference</p>
                                <p className="mt-1 text-xs text-slate-400">Optional image for background and composition consistency.</p>
                              </div>
                            )}
                            <input
                              ref={sceneFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => handleImageFileSelection(event, setReferenceImage)}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowScenePicker(true)}
                            className="mt-3 w-full rounded-full bg-white/[0.08] px-3 py-2 text-xs font-medium text-white transition hover:bg-white/[0.12]"
                          >
                            Pick Scene
                          </button>

                        </section>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Analysis */}
                  {currentStep === 2 && analysis && (
                    <div className="space-y-4">
                      {/* Character & Product Summary at top */}
                      {/* <CharacterProductSummary
                        analysis={analysis}
                        characterImage={characterImage}
                        productImage={productImage}
                        onSaveNewOption={handleSaveNewOption}
                        isSaving={isSaving}
                      /> */}
                      
                      {/* Recommendation Selector - unified per-category decisions */}
                      <RecommendationSelector
                        ref={recommendationSelectorRef}
                        analysis={analysis}
                        existingOptions={groupedPromptOptions}
                        currentSelections={selectedOptions}
                        defaultAction={useCase === 'affiliate-video-tiktok' ? 'apply' : 'keep'}
                        defaultSaveStrategy={useCase === 'affiliate-video-tiktok' ? 'new-only' : 'manual'}
                        onApplyRecommendations={handleApplyRecommendationSelection}
                        isSaving={isSaving}
                      />
                    </div>
                  )}

            {/* Step 3: Style & Prompt (Merged) */}
            {currentStep === 3 && analysis && (
              <ImagePromptWithTemplates
                characterImage={characterImage}
                productImage={productImage}
                selectedOptions={selectedOptions}
                onOptionChange={handleOptionChange}
                generatedPrompt={generatedPrompt}
                onPromptChange={handlePromptChange}
                useCase={useCase}
                userId={userId}
                analysis={analysis}
                characterDescription={characterDescription}
                productFocus={productFocus}
                mode={promptMode}
                onModeChange={setPromptMode}
              />
            )}



                  {/* Step 4: Generation Result */}
                  {currentStep === 4 && (
                    <>
                      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[1.25rem] bg-white/[0.03] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <div className="flex flex-wrap items-center gap-2">
                          {IMAGE_GEN_PROVIDERS.map(provider => (
                            <button
                              key={provider.id}
                              onClick={() => setGenerationProvider(provider.id)}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                                generationProvider === provider.id
                                  ? 'bg-violet-500/18 text-violet-100'
                                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                              }`}
                            >
                              {provider.label.replace(' Browser', '').replace('Google Labs ', '').replace(' FLUX.2 Klein', '')}
                            </button>
                          ))}
                        </div>
                        <div className="h-5 w-px bg-white/10" />
                        <label className="flex items-center gap-2 cursor-pointer rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={uploadToDrive}
                            onChange={(e) => setUploadToDrive(e.target.checked)}
                            className="h-4 w-4 rounded bg-gray-700 border-gray-600 checked:bg-blue-600"
                          />
                          <span>Upload to Google Drive</span>
                        </label>
                        {driveUploadStatus && (
                          <span className="text-xs text-cyan-200">{driveUploadStatus}</span>
                        )}
                      </div>

                      <GenerationResult
                        images={generatedImages}
                        isGenerating={isGenerating}
                        onRegenerate={handleStartGeneration}
                        generationPrompt={generatedPrompt?.positive}
                        aspectRatio={aspectRatio}
                        styleOptions={selectedOptions}
                        isRegenerating={isGenerating}
                        characterImage={characterPreviewSrc}
                        productImage={productImage?.preview}
                        useCase={useCase}
                        productFocus={productFocus}
                        generationProvider={generationProvider}
                        uploadToDrive={uploadToDrive}
                        driveUploadStatus={driveUploadStatus}
                        expectedCount={imageCount}
                      />
                    </>
                  )}

                  {isAnalyzing && currentStep === 1 && (
                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[1.5rem] bg-slate-950/55 backdrop-blur-[2px]">
                      <div className="flex items-center gap-3 rounded-2xl bg-slate-900/80 px-5 py-3 shadow-[0_18px_40px_rgba(2,6,23,0.34)]">
                        <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
                        <span className="text-sm font-medium text-slate-100">{t('imageGeneration.analyzing')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ==================== RIGHT SIDEBAR ==================== */}
            {currentStep >= 2 && currentStep !== 4 && (
              <div className="w-64 min-h-0 flex-shrink-0 overflow-hidden">
                <div className="h-full space-y-4 overflow-y-auto pl-4 pr-0">
                  {currentStep === 2 && analysis && (
                    <div className="sidebar-analysis-summary space-y-3">
                      <h4 className="text-xs font-semibold uppercase text-gray-400">Analysis Summary</h4>
                      <div className="sidebar-analysis-cards space-y-4">
                        <div className="card-character-profile rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.34),rgba(15,23,42,0.14))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_12px_28px_rgba(2,6,23,0.14)]">
                          <div className="mb-1 text-xs font-semibold text-gray-300">Character</div>
                          <div className="card-character-content space-y-0.5 text-xs text-gray-400">
                            {analysis?.characterProfile && Object.entries(analysis.characterProfile).map(([key, value]) => {
                              if (!value) return null;
                              return (
                                <div key={key} className="truncate">
                                  <span className="text-gray-500">{getRecommendationLabel(key)}:</span> {value}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="card-product-details rounded-[1.6rem] bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.2),transparent_46%),linear-gradient(180deg,rgba(76,29,149,0.16),rgba(15,23,42,0.18))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_14px_30px_rgba(46,16,101,0.16)]">
                          <div className="mb-1 text-xs font-semibold text-gray-300">Product</div>
                          <div className="card-product-content space-y-0.5 text-xs text-gray-400">
                            {analysis?.productDetails && Object.entries(analysis.productDetails).map(([key, value]) => {
                              if (!value) return null;
                              return (
                                <div key={key} className="truncate">
                                  <span className="text-gray-500">{getRecommendationLabel(key)}:</span> {value}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.34),rgba(15,23,42,0.14))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_12px_28px_rgba(2,6,23,0.14)]">
                        <h4 className="mb-3 text-xs font-semibold uppercase text-gray-400">Preview</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="mb-1 text-xs font-medium text-gray-500">Character</p>
                            <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-900">
                              {characterPreviewSrc ? (
                                <img src={characterPreviewSrc} alt="Character" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No image</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-medium text-gray-500">Product</p>
                            <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-900">
                              {productImage?.preview ? (
                                <img src={productImage.preview} alt="Product" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">No image</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {generatedPrompt?.positive && (
                        <div className="rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_12px_28px_rgba(2,6,23,0.12)]">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h4 className="text-xs font-semibold uppercase text-gray-400">Prompt</h4>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(generatedPrompt.positive || '')}
                              className="rounded-full bg-white/[0.05] px-2 py-1 text-[11px] text-slate-200 transition hover:bg-white/[0.08]"
                            >
                              Copy
                            </button>
                          </div>
                          <p className="line-clamp-6 text-xs leading-5 text-slate-300">{generatedPrompt.positive}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

      </div>

      {/* ==================== ACTION BAR ==================== */}
      <div className="apple-footer-bar z-20 flex h-[60px] flex-shrink-0 items-center px-4">
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex items-center justify-center gap-2">
            {currentStep === 1 && (
              <button
                onClick={handleStartAnalysis}
                disabled={!isReadyForAnalysis || isAnalyzing}
                className="apple-cta-primary inline-flex h-11 items-center gap-2 rounded-lg px-4 leading-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>{t('imageGeneration.analyzing')}</span></>
                ) : (
                  <><Sparkles className="w-4 h-4" /><span>{step1Copy.analyzeCta}</span></>
                )}
              </button>
            )}

            {currentStep === 2 && analysis && (
              <button
                onClick={() => recommendationSelectorRef.current?.applySelections()}
                disabled={isSaving}
                className="apple-cta-primary inline-flex h-11 items-center gap-2 rounded-lg px-4 leading-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
                ) : (
                  <><ChevronRight className="w-4 h-4" /><span>Apply Selections & Continue</span></>
                )}
              </button>
            )}

            {currentStep === 3 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => step3ComponentRef.current?.triggerVariations()}
                  className="flex h-11 items-center gap-2 rounded-lg bg-purple-600 px-4 text-sm hover:bg-purple-700"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>{t('imageGeneration.variations')}</span>
                </button>
                <button
                  onClick={() => step3ComponentRef.current?.triggerOptimize()}
                  className="flex h-11 items-center gap-2 rounded-lg bg-orange-600 px-4 text-sm hover:bg-orange-700"
                >
                  <Zap className="w-4 h-4" />
                  <span>{t('imageGeneration.optimize')}</span>
                </button>
                <button
                  onClick={handleBuildPrompt}
                  disabled={isLoading || !analysis?.analysis}
                  className="flex h-11 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>{isLoading ? t('imageGeneration.building') : t('imageGeneration.nextStep')}</span>
                </button>
              </div>
            )}

            {currentStep === 4 && generatedImages.length === 0 && (
              <>
                {console.log('? Step 4 render - showing Generate button (generatedImages.length:', generatedImages.length, ')')}
                
                {generationError && (
                  <div className={`mb-4 rounded-lg border p-3 ${
                    retryable
                      ? 'border-orange-700/50 bg-orange-900/20'
                      : 'border-red-700/50 bg-red-900/20'
                  }`}>
                    <p className={`mb-2 text-sm ${retryable ? 'text-orange-300' : 'text-red-300'}`}>
                      {retryable ? 'Retryable error:' : 'Error:'} {generationError}
                    </p>
                    {retryable && (
                      <button
                        onClick={handleStartGeneration}
                        disabled={isGenerating}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /><span>{t('imageGeneration.generating')}</span></>
                        ) : (
                          <><RefreshCw className="w-4 h-4" /><span>{t('imageGeneration.retryGeneration')}</span></>
                        )}
                      </button>
                    )}
                    {!retryable && (
                      <p className="mt-2 text-xs text-gray-400">
                        Please select different images and try again
                      </p>
                    )}
                  </div>
                )}
                
                <button
                  onClick={handleStartGeneration}
                  disabled={isGenerating || !generatedPrompt}
                  className="apple-cta-primary inline-flex h-11 items-center gap-2 rounded-lg px-4 leading-none disabled:opacity-50"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>{t('imageGeneration.generating')}</span></>
                  ) : (
                    <><Rocket className="w-4 h-4" /><span>{t('imageGeneration.generateImages')}</span></>
                  )}
                </button>
              </>
            )}

            {generatedImages.length > 0 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 leading-none hover:bg-gray-600"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('imageGeneration.startNew')}</span>
                </button>
                {selectedFlowId && (
                  <button
                    onClick={() => {
                      setShowSessionLogModal(true);
                    }}
                    className="apple-cta-primary flex h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 leading-none"
                    title="Preview generation session"
                  >
                    <Database className="w-4 h-4" />
                    <span>{t('imageGeneration.sessionLog')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Gallery Picker Modal */}
      <GalleryPicker
        isOpen={showGalleryPicker}
        onClose={() => {
          setShowGalleryPicker(false);
          setGalleryPickerFor(null);
        }}
        onSelect={handleGallerySelect}
        assetType="image"
        title={galleryPickerFor === 'character' ? 'Select Character Image' : 'Select Product Image'}
      />


      <CharacterSelectorModal
        open={showCharacterSelector}
        onClose={() => setShowCharacterSelector(false)}
        onSelect={(c) => {
          setSelectedCharacter(c);
          setSelectedOptions(prev => ({ ...prev, characterAlias: c.alias, characterDisplayName: c.name }));
          setShowCharacterSelector(false);
        }}
      />

      <ScenePickerModal
        isOpen={showScenePicker}
        onClose={() => setShowScenePicker(false)}
        scenes={sceneOptions}
        selectedScene={selectedOptions.scene}
        language={i18n.language || 'en'}
        aspectRatio={aspectRatio}
        onSelect={(value, scene) => {
          setSelectedOptions(prev => ({ ...prev, scene: value }));
          // Store full scene object for accessing locked image and other properties
          if (scene) {
            // Scene data now available via selectedOptions.scene value lookup
            console.log(`? Selected scene: ${scene.label} (${value})`);
          }
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

      {recentPreview && (
        <ModalPortal>
          <div
            className="image-generation-preview-modal fixed inset-0 app-layer-modal z-[10000] flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setRecentPreview(null)}
          >
            <div
              className="image-generation-preview-surface relative w-fit max-w-[92vw] overflow-hidden rounded-2xl border border-white/10 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setRecentPreview(null)}
                className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="image-generation-preview-frame inline-flex items-center justify-center overflow-hidden rounded-xl p-3">
                <img
                  src={recentPreview.url}
                  alt="Recent session preview"
                  className="max-h-[72vh] max-w-[85vw] object-contain"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                <span>{recentPreview.label}</span>
                <span className="text-slate-500">{recentPreview.sessionId}</span>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}





