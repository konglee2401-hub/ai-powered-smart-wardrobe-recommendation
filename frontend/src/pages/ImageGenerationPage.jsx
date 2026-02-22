/**
 * AI Creative Studio - Enhanced Virtual Try-On
 * - Step 1: Upload images (Character + Product)
 * - Step 2: AI Analysis with breakdown & extraction
 * - Step 3: Style customization & Prompt building (Merged)
 * - Step 4: Image generation with options
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Sparkles, FileText, Rocket, Image,
  Loader2, RefreshCw, X, Video, Wand2, Settings, Shirt, Target, Save, ChevronRight, ChevronUp, ChevronDown, Shuffle, Zap
} from 'lucide-react';

import { unifiedFlowAPI, browserAutomationAPI, promptsAPI, aiOptionsAPI } from '../services/api';

// Import Google Drive API
import driveAPI from '../services/driveAPI';

// New: Session tracking and advanced prompt engineering
import SessionHistoryService from '../services/sessionHistoryService';
import { SessionHistory, generateSessionId } from '../utils/sessionHistory';
import { PromptLayering, PromptVariationGenerator, GrokConversationEnhancer } from '../utils/advancedPromptEngineering';

import AnalysisBreakdown from '../components/AnalysisBreakdown';
import CharacterProductSummary from '../components/CharacterProductSummary';
import PromptEditor from '../components/PromptEditor';
import GenerationOptions from '../components/GenerationOptions';
import GenerationResult from '../components/GenerationResult';
import PromptQualityIndicator from '../components/PromptQualityIndicator';
import NewOptionsDetected from '../components/NewOptionsDetected';
import Step3EnhancedWithSession from '../components/Step3EnhancedWithSession';
import GalleryPicker from '../components/GalleryPicker';
import { STYLE_CATEGORIES } from '../components/Step3Enhanced';

// Steps - Style and Prompt merged into single step
const STEPS = [
  { id: 1, name: 'Upload', icon: Upload },
  { id: 2, name: 'Analysis', icon: Sparkles },
  { id: 3, name: 'Style & Prompt', icon: Wand2 },
  { id: 4, name: 'Generate', icon: Rocket },
];

// Use cases
const USE_CASES = [
  { value: 'change-clothes', label: 'Change Clothes', description: 'Mặc sản phẩm lên người mẫu' },
  { value: 'ecommerce-product', label: 'E-commerce', description: 'Ảnh sản phẩm thương mại' },
  { value: 'social-media', label: 'Social Media', description: 'Bài đăng mạng xã hội' },
  { value: 'fashion-editorial', label: 'Editorial', description: 'Bài báo thời trang chuyên nghiệp' },
  { value: 'lifestyle-scene', label: 'Lifestyle', description: 'Cảnh sống hàng ngày' },
  { value: 'before-after', label: 'Before/After', description: 'So sánh trước/sau' },
];

// Focus options
const FOCUS_OPTIONS = [
  { value: 'full-outfit', label: 'Full Outfit', description: 'Toàn bộ trang phục' },
  { value: 'top', label: 'Top', description: 'Phần trên (áo)' },
  { value: 'bottom', label: 'Bottom', description: 'Phần dưới (quần/váy)' },
  { value: 'shoes', label: 'Shoes', description: 'Giày' },
  { value: 'accessories', label: 'Accessories', description: 'Phụ kiện' },
  { value: 'specific-item', label: 'Specific', description: 'Món đồ cụ thể' },
];

// Helper to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

// Tooltip component
function Tooltip({ children, content }) {
  return (
    <div className="group relative inline-block w-full">
      {children}
      <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block w-48">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-normal">
          {content}
          <div className="absolute top-full left-4 border-8 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  );
}

// Get label by value
const getLabel = (list, value) => {
  const item = list.find(i => i.value === value);
  return item ? item.label : value;
};

export default function ImageGenerationPage() {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('image');
  const [activeMode, setActiveMode] = useState('browser');
  const [showFinalPrompt, setShowFinalPrompt] = useState(true);
  
  // Ref for container
  const containerRef = useRef(null);
  const step3ComponentRef = useRef(null);

  // Data
  const [characterImage, setCharacterImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [useCase, setUseCase] = useState('change-clothes');
  const [productFocus, setProductFocus] = useState('full-outfit');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [customOptions, setCustomOptions] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  // Results
  const [analysis, setAnalysis] = useState(null);
  const [analysisRaw, setAnalysisRaw] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);

  // Store images for generation step
  const [storedImages, setStoredImages] = useState({ character: null, product: null });

  // Loading
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Provider
  const [browserProvider, setBrowserProvider] = useState('chatgpt-browser');
  const [imageGenProvider, setImageGenProvider] = useState('grok');  // 💫 NEW: Image generation provider
  const [generationProvider, setGenerationProvider] = useState('google-flow');  // 💫 Image generation provider selection

  // Options from API
  const [promptOptions, setPromptOptions] = useState(null);

  // Generation options
  const [imageCount, setImageCount] = useState(2);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [hasWatermark, setHasWatermark] = useState(false);
  const [referenceImage, setReferenceImage] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [uploadToDrive, setUploadToDrive] = useState(false);
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

  // 💫 NEW: Character description from analysis for precise generation
  const [characterDescription, setCharacterDescription] = useState(null);

  // 💫 NEW: Grok conversation ID for reusing conversation across steps
  const [grokConversationId, setGrokConversationId] = useState(null);

  // 💫 NEW: Storage configuration for generated images
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
    { id: 'chatgpt-browser', label: 'ChatGPT', icon: '🧠' },
    { id: 'grok', label: 'Grok', icon: '🤖' },
    { id: 'google-flow', label: 'Google Flow', icon: '🌐' },
    { id: 'zai', label: 'Z.AI', icon: '💎' },
  ];
  
  // Image Generation Providers (for generation step)
  const IMAGE_GEN_PROVIDERS = [
    { id: 'grok', label: 'Grok Browser', description: 'Fast, web-based' },
    { id: 'google-flow', label: 'Google Labs Flow', description: 'High quality, 4K capable' },
  ];

  // Load options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const options = await aiOptionsAPI.getAllOptions();
        setPromptOptions(options);
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
    
    if (galleryPickerFor === 'character') {
      // Fetch image from URL and convert to file
      fetch(item.url)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'character-from-gallery.jpg', { type: blob.type });
          const preview = URL.createObjectURL(file);
          setCharacterImage({ file, preview });
        })
        .catch(err => console.error('Failed to load gallery image:', err));
    } else if (galleryPickerFor === 'product') {
      // Fetch image from URL and convert to file
      fetch(item.url)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'product-from-gallery.jpg', { type: blob.type });
          const preview = URL.createObjectURL(file);
          setProductImage({ file, preview });
        })
        .catch(err => console.error('Failed to load gallery image:', err));
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
    if (!value) return;
    
    setIsSaving(true);
    try {
      await aiOptionsAPI.createOption(
        category,
        value,
        value,
        `AI recommended ${category}`,
        {}
      );

      // Mark category as saved - this will hide the save button for this category in NewOptionsDetected
      if (!newOptions.includes(category)) {
        setNewOptions(prev => [...prev, category]);
      }

      // Refresh options from database so newly saved options are in the list
      const options = await aiOptionsAPI.getAllOptions();
      setPromptOptions(options);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleStartAnalysis = async () => {
    if (!characterImage?.file || !productImage?.file) return;

    setIsAnalyzing(true);
    const startTime = Date.now();
    
    try {
      const charBase64 = await fileToBase64(characterImage.file);
      const prodBase64 = await fileToBase64(productImage.file);

      const analysisResponse = await browserAutomationAPI.analyzeBrowserOnly(
        charBase64,
        prodBase64,
        { 
          provider: browserProvider, 
          scene: selectedOptions.scene || 'studio', 
          lighting: selectedOptions.lighting || 'soft-diffused',
          mood: selectedOptions.mood || 'confident',
          style: selectedOptions.style || 'minimalist',
          colorPalette: selectedOptions.colorPalette || 'neutral',
          cameraAngle: selectedOptions.cameraAngle || 'eye-level'
        }
      );

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      if (analysisResponse.success && analysisResponse.data) {
        setAnalysisRaw(analysisResponse.data);
        
        // Parse analysis text from backend to extract structured data
        const analysisText = analysisResponse.data.analysis || analysisResponse.data;
        
        // Extract sections from analysis text
        const parseSection = (text, startMarker, endMarker) => {
          const start = text.indexOf(startMarker);
          const end = text.indexOf(endMarker);
          if (start !== -1 && end !== -1) {
            return text.substring(start + startMarker.length, end).trim();
          }
          return '';
        };
        
        // Parse CHARACTER PROFILE
        const charProfileText = parseSection(analysisText, '*** CHARACTER PROFILE START ***', '*** CHARACTER PROFILE END ***');
        const characterProfile = {};
        if (charProfileText) {
          const lines = charProfileText.split('\n').filter(l => l.includes(':'));
          lines.forEach(line => {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) characterProfile[key.toLowerCase().replace(/\s+/g, '_')] = value;
          });
        }
        
        // Parse PRODUCT DETAILS
        const prodText = parseSection(analysisText, '*** PRODUCT DETAILS START ***', '*** PRODUCT DETAILS END ***');
        const productDetails = {};
        if (prodText) {
          const lines = prodText.split('\n').filter(l => l.includes(':'));
          lines.forEach(line => {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) productDetails[key.toLowerCase().replace(/\s+/g, '_')] = value;
          });
        }
        
        // Parse RECOMMENDATIONS
        const recText = parseSection(analysisText, '*** RECOMMENDATIONS START ***', '*** RECOMMENDATIONS END ***');
        const recommendations = {};
        if (recText) {
          // Parse structured SCENE_CHOICE, LIGHTING_CHOICE, etc.
          const patterns = [
            { name: 'scene', pattern: /SCENE_CHOICE:\s*(\w+)/ },
            { name: 'lighting', pattern: /LIGHTING_CHOICE:\s*([\w-]+)/ },
            { name: 'mood', pattern: /MOOD_CHOICE:\s*(\w+)/ },
            { name: 'cameraAngle', pattern: /CAMERA_ANGLE:\s*([\w-]+)/ },
            { name: 'hairstyle', pattern: /HAIRSTYLE:\s*([\w-]+)/ },
            { name: 'makeup', pattern: /MAKEUP:\s*([\w-]+)/ },
          ];
          patterns.forEach(({ name, pattern }) => {
            const match = recText.match(pattern);
            if (match) {
              recommendations[name] = { choice: match[1], reason: 'From AI analysis' };
            }
          });
        }
        
        // Restructure data for components
        const analysisWithParsing = {
          analysis: analysisText,
          recommendations: recommendations,
          characterProfile: characterProfile,
          productDetails: productDetails,
          analysisScore: analysisResponse.data.recommendations?.analysis || {},
        };
        
        setAnalysis(analysisWithParsing);
        console.log('📊 Analysis saved to state:', analysisWithParsing);
        console.log('🎯 Recommendations available:', analysisWithParsing.recommendations);
        
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
        
        // 💫 NEW: Save Grok conversation ID for reuse in generation step
        if (analysisResponse.data.grokConversationId) {
          console.log('💾 Saving Grok conversation ID:', analysisResponse.data.grokConversationId);
          setGrokConversationId(analysisResponse.data.grokConversationId);
        }
        
        // 💫 NEW: Save character description for generation
        if (analysisResponse.data.characterDescription) {
          console.log('📝 Saving character description:', analysisResponse.data.characterDescription.substring(0, 80));
          setCharacterDescription(analysisResponse.data.characterDescription);
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
      console.log('🔄 handleApplyRecommendation called');
      const rec = analysis.recommendations;
      console.log('📥 Recommendations from analysis:', rec);
      const newOpts = { ...selectedOptions };
      // Extract .choice value from nested {choice, reason, alternatives} structure
      if (rec.scene?.choice) newOpts.scene = rec.scene.choice;
      if (rec.lighting?.choice) newOpts.lighting = rec.lighting.choice;
      if (rec.mood?.choice) newOpts.mood = rec.mood.choice;
      if (rec.style?.choice) newOpts.style = rec.style.choice;
      if (rec.colorPalette?.choice) newOpts.colorPalette = rec.colorPalette.choice;
      if (rec.cameraAngle?.choice) newOpts.cameraAngle = rec.cameraAngle.choice;
      console.log('✅ New options to apply:', newOpts);
      setSelectedOptions(newOpts);
      
      // Expand all categories when applying recommendations
      const allCategories = {};
      Object.keys(STYLE_CATEGORIES).forEach(key => {
        allCategories[key] = true;
      });
      console.log('📂 Expanding categories from handleApplyRecommendation:', allCategories);
      setExpandedCategories(allCategories);
    } else {
      console.log('❌ No recommendations found in handleApplyRecommendation');
    }
    setCurrentStep(3); // Go to merged Style & Prompt step
  };

  // CRITICAL: Memoize this callback to prevent infinite loop in Step3EnhancedWithSession
  // Without useCallback, the function reference changes every render, causing useEffect dependencies to trigger infinitely
  const handlePromptChange = useCallback((promptData) => {
    console.log('📥 Parent received prompt from Step3:', promptData);
    // Handle both string and object formats for backward compatibility
    if (typeof promptData === 'string') {
      setGeneratedPrompt({ positive: promptData, negative: '' });
    } else if (promptData && typeof promptData === 'object') {
      setGeneratedPrompt(promptData);
    }
  }, []); // Empty dependency array - function never changes after first render

  // Auto-apply recommendations when entering Step 3 and expand categories
  useEffect(() => {
    if (currentStep === 3) {
      console.log('✅ Step 3 Entered');
      console.log('📊 Current Analysis:', analysis);
      console.log('🎯 Current selectedOptions:', selectedOptions);
      
      // Check top-level recommendations, not nested
      if (analysis?.recommendations) {
        console.log('✓ Found recommendations at top level:', analysis.recommendations);
        
        // Always expand all style categories when in Step 3 with recommendations
        const allCategories = {};
        Object.keys(STYLE_CATEGORIES).forEach(key => {
          allCategories[key] = true;
        });
        console.log('📂 Expanding all categories in Step 3:', allCategories);
        setExpandedCategories(allCategories);
        
        // Only auto-apply if options are empty
        if (Object.keys(selectedOptions).length === 0) {
          console.log('📝 Applying recommendations...');
          const rec = analysis.recommendations;
          const newOpts = { ...selectedOptions };
          // Extract .choice value from nested {choice, reason, alternatives} structure
          if (rec.scene?.choice) newOpts.scene = rec.scene.choice;
          if (rec.lighting?.choice) newOpts.lighting = rec.lighting.choice;
          if (rec.mood?.choice) newOpts.mood = rec.mood.choice;
          if (rec.style?.choice) newOpts.style = rec.style.choice;
          if (rec.colorPalette?.choice) newOpts.colorPalette = rec.colorPalette.choice;
          if (rec.cameraAngle?.choice) newOpts.cameraAngle = rec.cameraAngle.choice;
          
          console.log('✅ Setting selectedOptions to:', newOpts);
          setSelectedOptions(newOpts);
        } else {
          console.log('⚠️ Options already selected:', selectedOptions);
        }
      } else {
        console.log('❌ No recommendations found. Analysis:', analysis);
      }
    }
  }, [currentStep, analysis]);

  const handleBuildPrompt = async () => {
    if (!analysis?.analysis) return;
    setIsLoading(true);
    setCurrentStep(4);

    try {
      const response = await unifiedFlowAPI.buildPrompt(
        analysis.analysis,
        selectedOptions,
        useCase,
        productFocus
      );

      if (response.success && response.data?.prompt) {
        setGeneratedPrompt(response.data.prompt);
      }
    } catch (error) {
      console.error('Build prompt failed:', error);
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
    console.log('🔘 Generate button clicked!');
    console.log('   currentStep:', currentStep);
    console.log('   generatedPrompt:', generatedPrompt);
    console.log('   generatedPrompt?.positive:', generatedPrompt?.positive);
    console.log('   activeMode:', activeMode);
    console.log('   storedImages:', storedImages);
    
    if (!generatedPrompt?.positive) {
      console.warn('⚠️ No generated prompt found!');
      console.warn('   generatedPrompt is:', generatedPrompt);
      console.log('📌 You need to complete Step 3 first:');
      console.log('   1. Select style options in the left sidebar');
      console.log('   2. Wait for the prompt to generate (should see blue/green/red boxes)');
      console.log('   3. Click "Next Step" to go to Step 4');
      return;
    }
    
    setIsGenerating(true);
    setCurrentStep(4);

    try {
      const finalPrompt = generatedPrompt.positive + (customPrompt ? '\n' + customPrompt : '');
      
      console.log('🎨 Starting generation...');
      console.log('   Mode:', activeMode);
      console.log('   Provider:', browserProvider);
      console.log('   Has stored images:', !!storedImages.character && !!storedImages.product);
      console.log('   Has prompt:', !!finalPrompt);
      
      let response;
      
      if (activeMode === 'browser' && storedImages.character && storedImages.product) {
        console.log('✅ Using browser generation mode with provider:', generationProvider);
        const refBase64 = referenceImage?.file ? await fileToBase64(referenceImage.file) : null;
        
        const genOptions = {
          generationProvider,  // 💫 Image generation provider selection (grok or google-flow)
          imageGenProvider,  // 💫 For backward compatibility
          negativePrompt: generatedPrompt.negative,
          scene: selectedOptions.scene || 'studio',
          lighting: selectedOptions.lighting || 'soft-diffused',
          mood: selectedOptions.mood || 'confident',
          style: selectedOptions.style || 'minimalist',
          colorPalette: selectedOptions.colorPalette || 'neutral',
          cameraAngle: selectedOptions.cameraAngle || 'eye-level',
          aspectRatio,
          characterImageBase64: storedImages.character,
          productImageBase64: storedImages.product,
          referenceImageBase64: refBase64,
          imageCount,
          hasWatermark,
          grokConversationId, // Pass conversation ID to reuse
          grokUrl: null, // Will be set based on conversation ID
          // 💫 NEW: Pass character description for better generation
          characterDescription,
          // Storage configuration
          storageType,
          localFolder
        };
        
        console.log('📤 Sending generation request to backend...');
        response = await browserAutomationAPI.generateBrowserOnly(finalPrompt, genOptions);
        console.log('📥 Generation response:', response);
      } else {
        console.log('⚠️ Fallback to unified flow (images may not be stored)');
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
            referenceImage: refBase64
          }
        });
      }

      if (response?.success && response?.data?.generatedImages) {
        console.log('✅ Generation successful! Generated images:', response.data.generatedImages);
        setGeneratedImages(response.data.generatedImages);
        
        // Upload to Google Drive if enabled
        if (uploadToDrive && response.data.generatedImages.length > 0) {
          handleUploadToGoogleDrive(response.data.generatedImages);
        }
      } else {
        console.error('❌ Generation response missing expected data:', response);
      }
    } catch (error) {
      console.error('❌ Generation failed:', error);
      console.error('   Error message:', error.message);
      console.error('   Error details:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadToGoogleDrive = async (images) => {
    try {
      setDriveUploadStatus('Uploading to Google Drive...');
      
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
          
          await driveAPI.uploadFile(file, {
            description: `Generated from Smart Wardrobe App\nPrompt: ${generatedPrompt?.positive?.slice(0, 100)}...`,
            metadata: {
              useCase: useCase,
              style: selectedOptions.style || 'unknown',
              generatedAt: new Date().toISOString(),
            }
          });
          
          console.log(`✅ Uploaded: ${fileName}`);
        } catch (error) {
          console.error('❌ Failed to upload single image:', error);
        }
      }
      
      setDriveUploadStatus(`✅ Successfully uploaded ${images.length} image(s) to Google Drive!`);
      setTimeout(() => setDriveUploadStatus(null), 5000);
    } catch (error) {
      console.error('❌ Google Drive upload failed:', error);
      setDriveUploadStatus(`❌ Upload failed: ${error.message}`);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setCharacterImage(null);
    setProductImage(null);
    setUseCase('change-clothes');
    setProductFocus('full-outfit');
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

  const isReadyForAnalysis = characterImage && productImage;
  const isReadyForPrompt = analysis && Object.keys(selectedOptions).length > 0;
  const isReadyForGeneration = generatedPrompt?.positive;

  const showUseCaseFocusInfo = currentStep >= 2;

  const mainBodyStyle = {
    height: 'calc(100vh - 56px)'
  };

  return (
    <div className="bg-gray-900 text-white flex flex-col" ref={containerRef} style={mainBodyStyle} data-main-body>
      {/* ==================== HEADER ==================== */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 flex-shrink-0 h-14">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            <span className="font-bold">AI Creative Studio</span>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => isCompleted && setCurrentStep(step.id)}
                    disabled={!isCompleted && !isActive}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      isActive ? 'bg-purple-600 text-white' : 
                      isCompleted ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 
                      'bg-gray-700/50 text-gray-500'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{step.name}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-4 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-600'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('image')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  activeTab === 'image' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  activeTab === 'video' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={handleReset} className="p-1.5 bg-gray-700 rounded hover:bg-gray-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MAIN BODY ==================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ==================== LEFT TOOLBAR: Mode + Provider ==================== */}
        <div className="w-12 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-3 gap-2 flex-shrink-0 overflow-y-auto">
          <button
            onClick={() => setActiveMode('browser')}
            className={`p-2 rounded-lg transition-all ${activeMode === 'browser' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="Browser AI"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveMode('upload')}
            className={`p-2 rounded-lg transition-all ${activeMode === 'upload' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
            title="Upload Mode"
          >
            <Upload className="w-5 h-5" />
          </button>

          <div className="w-8 h-px bg-gray-700" />

          {activeMode === 'browser' && (
            <div className="flex flex-col gap-1">
              {PROVIDERS.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => setBrowserProvider(provider.id)}
                  className={`p-2 rounded-lg transition-all ${browserProvider === provider.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                  title={provider.label}
                >
                  <span className="text-lg">{provider.icon}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />
          <button className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* ==================== LEFT SIDEBAR: Options ==================== */}
        <div className={`${currentStep === 3 ? 'w-80' : 'w-56'} bg-gray-800 border-r border-gray-700 flex flex-col flex-shrink-0 transition-all duration-300`}>
          <div className="p-3 space-y-4 overflow-y-auto flex-1">
            {/* Step 1: Use Case & Focus */}
            {currentStep === 1 && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                    <Shirt className="w-3 h-3" /> Use Case
                  </h3>
                  <div className="grid grid-cols-2 gap-1">
                    {USE_CASES.map(uc => (
                      <Tooltip key={uc.value} content={uc.description}>
                        <button
                          onClick={() => setUseCase(uc.value)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                            useCase === uc.value 
                              ? 'bg-purple-600/20 text-purple-400 border border-purple-600/50' 
                              : 'text-gray-400 hover:bg-gray-700 border border-transparent'
                          }`}
                        >
                          {uc.label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Focus
                  </h3>
                  <div className="grid grid-cols-2 gap-1">
                    {FOCUS_OPTIONS.map(opt => (
                      <Tooltip key={opt.value} content={opt.description}>
                        <button
                          onClick={() => setProductFocus(opt.value)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all ${
                            productFocus === opt.value 
                              ? 'bg-purple-600/20 text-purple-400 border border-purple-600/50' 
                              : 'text-gray-400 hover:bg-gray-700 border border-transparent'
                          }`}
                        >
                          {opt.label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Image Previews */}
            {currentStep === 2 && (characterImage || productImage) && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                  <Image className="w-3 h-3" /> Uploaded Images
                </h3>
                <div className="space-y-2">
                  {characterImage?.preview && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">👤 Character</p>
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
                        <img 
                          src={characterImage.preview} 
                          alt="Character" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  {productImage?.preview && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">👕 Product</p>
                      <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
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
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1">
                  <Wand2 className="w-3 h-3" /> Style Options
                </h3>
                <div className="space-y-2">
                  {Object.entries(STYLE_CATEGORIES).map(([key, category]) => (
                    <div key={key} className="border border-gray-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="w-full px-2 py-2 bg-gray-700 hover:bg-gray-600 transition flex items-center justify-between text-xs font-medium text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{category.icon}</span>
                          <span>{category.label}</span>
                        </span>
                        {expandedCategories[key] ? (
                          <ChevronRight className="w-3 h-3 transform rotate-90" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>

                      {expandedCategories[key] && (
                        <div className="p-2 bg-gray-800 space-y-1 max-h-40 overflow-y-auto">
                          {category.options.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setSelectedOptions(prev => ({ ...prev, [key]: opt.value }))}
                              className={`w-full px-2 py-1 text-xs rounded text-left transition ${
                                selectedOptions[key] === opt.value
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                              title={opt.label}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Generation Options */}
            {currentStep === 4 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                  <Rocket className="w-3 h-3" /> Generation
                </h3>
                
                {/* 💫 NEW: Image Generation Provider Selection */}
                <div className="mb-4 pb-4 border-b border-gray-700">
                  <label className="text-xs text-gray-400 mb-2 block">Image Generation Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setImageGenProvider('grok')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                        imageGenProvider === 'grok'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      🤖 Grok
                    </button>
                    <button
                      onClick={() => setImageGenProvider('lab-flow')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                        imageGenProvider === 'lab-flow'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      🎨 Google Lab Flow
                    </button>
                  </div>
                </div>
                
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
                />

                {/* 💫 NEW: Storage Configuration */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3 flex items-center gap-1">
                    <Save className="w-3 h-3" /> Image Storage
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => setStorageType('cloud')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                        storageType === 'cloud'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      ☁️ Cloud (ImgBB)
                    </button>
                    <button
                      onClick={() => setStorageType('local')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                        storageType === 'local'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      💾 Local Folder
                    </button>
                  </div>

                  {storageType === 'local' && (
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Folder Path</label>
                      <input
                        type="text"
                        placeholder="e.g., ./generated-images"
                        value={localFolder || ''}
                        onChange={(e) => setLocalFolder(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Default: ./generated-images</p>
                    </div>
                  )}

                  {storageType === 'cloud' && (
                    <div className="text-xs text-gray-400">
                      📁 Auto-folder: <span className="text-purple-400 font-mono">{new Date().toISOString().split('T')[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================== CENTER + RIGHT ==================== */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* ==================== CENTER MAIN CONTENT ==================== */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-900 overflow-hidden">
              {showUseCaseFocusInfo && (
                <div className="flex-shrink-0 bg-gray-800/50 px-4 py-2 border-b border-gray-700">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">Use case:</span>
                    <span className="text-purple-400 font-medium">{getLabel(USE_CASES, useCase)}</span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">Focus:</span>
                    <span className="text-purple-400 font-medium">{getLabel(FOCUS_OPTIONS, productFocus)}</span>
                  </div>
                </div>
              )}

              <div className="flex-1 p-4 overflow-auto">
                <div className="max-w-4xl mx-auto">
                  {/* Step 1: Upload */}
                  {currentStep === 1 && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="relative aspect-square bg-gray-800 rounded-xl border-2 border-dashed border-gray-600">
                        {characterImage?.preview ? (
                          <>
                            <img src={characterImage.preview} alt="Character" className="w-full h-full object-contain rounded-xl" />
                            <button onClick={() => setCharacterImage(null)} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:border-purple-500">
                            <Upload className="w-8 h-8 text-gray-500 mb-2" />
                            <span className="text-sm text-gray-500">Character</span>
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setCharacterImage({ file, preview: URL.createObjectURL(file) });
                              }}
                            />
                          </label>
                        )}
                      </div>

                      <div className="relative aspect-square bg-gray-800 rounded-xl border-2 border-dashed border-gray-600">
                        {productImage?.preview ? (
                          <>
                            <img src={productImage.preview} alt="Product" className="w-full h-full object-contain rounded-xl" />
                            <button onClick={() => setProductImage(null)} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:border-purple-500">
                            <Upload className="w-8 h-8 text-gray-500 mb-2" />
                            <span className="text-sm text-gray-500">Product</span>
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setProductImage({ file, preview: URL.createObjectURL(file) });
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gallery Picker Buttons */}
                  {currentStep === 1 && (
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      <button
                        onClick={() => {
                          setGalleryPickerFor('character');
                          setShowGalleryPicker(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 rounded-lg text-white text-sm font-medium transition-all transform hover:scale-105"
                      >
                        📁 Pick Character from Gallery
                      </button>
                      <button
                        onClick={() => {
                          setGalleryPickerFor('product');
                          setShowGalleryPicker(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg text-white text-sm font-medium transition-all transform hover:scale-105"
                      >
                        📁 Pick Product from Gallery
                      </button>
                    </div>
                  )}

                  {/* Step 2: Analysis */}
                  {currentStep === 2 && analysis && (
                    <AnalysisBreakdown
                      analysis={analysis}
                      newOptions={newOptions}
                      onSaveOption={handleSaveNewOption}
                      isSaving={isSaving}
                      metadata={analysisMetadata}
                    />
                  )}

            {/* Step 3: Style & Prompt (Merged) */}
            {currentStep === 3 && analysis && (
              <Step3EnhancedWithSession
                ref={step3ComponentRef}
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
              />
            )}



                  {/* Step 4: Generation Result */}
                  {currentStep === 4 && (
                    <>
                      {/* Image Generation Provider Selection */}
                      <div className="mb-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                          <Rocket className="w-4 h-4 text-purple-400" />
                          Choose Browser Provider
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {IMAGE_GEN_PROVIDERS.map(provider => (
                            <button
                              key={provider.id}
                              onClick={() => setGenerationProvider(provider.id)}
                              className={`p-3 rounded-lg text-left transition-all ${
                                generationProvider === provider.id
                                  ? 'bg-purple-600 border border-purple-500 shadow-lg shadow-purple-500/20'
                                  : 'bg-gray-700/50 border border-gray-600 hover:border-gray-500'
                              }`}
                            >
                              <div className="font-medium text-sm text-white">{provider.label}</div>
                              <div className="text-xs text-gray-400 mt-1">{provider.description}</div>
                              {generationProvider === provider.id && (
                                <div className="mt-2 text-xs text-purple-300 font-medium">✓ Selected</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Google Drive Upload Option */}
                      <div className="mb-6 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 rounded-lg p-4 border border-blue-700">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uploadToDrive}
                            onChange={(e) => setUploadToDrive(e.target.checked)}
                            className="w-5 h-5 rounded bg-gray-700 border-gray-600 checked:bg-blue-600"
                          />
                          <div>
                            <div className="text-sm font-semibold text-white">☁️ Upload to Google Drive</div>
                            <div className="text-xs text-gray-300">
                              Save generated images to Google Drive (Affiliate AI → Images → Uploaded → App)
                            </div>
                          </div>
                        </label>
                        
                        {driveUploadStatus && (
                          <div className="mt-3 p-2 rounded bg-blue-900/50 border border-blue-700">
                            <p className="text-xs text-blue-300">{driveUploadStatus}</p>
                          </div>
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
                        characterImage={characterImage?.preview}
                        productImage={productImage?.preview}
                      />
                    </>
                  )}

                  {(isAnalyzing) && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                      <span className="ml-2 text-gray-400">Analyzing...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ==================== ACTION BAR ==================== */}
              <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {currentStep === 1 && (isReadyForAnalysis ? '✅ Ready to analyze' : '⬆️ Upload 2 images')}
                    {currentStep === 2 && '📊 Analysis complete'}
                    {currentStep === 3 && '🎨 Style & Prompt editor'}
                    {currentStep === 4 && '🚀 Generate images'}
                  </div>

                  <div className="flex items-center gap-2">
                    {currentStep === 1 && (
                      <button
                        onClick={handleStartAnalysis}
                        disabled={!isReadyForAnalysis || isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAnalyzing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /><span>Analyzing...</span></>
                        ) : (
                          <><Sparkles className="w-4 h-4" /><span>Start Analysis</span></>
                        )}
                      </button>
                    )}

                    {currentStep === 2 && (
                      <button
                        onClick={() => {
                          handleApplyRecommendation();
                          setCurrentStep(3);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span>Apply AI Recommendation</span>
                      </button>
                    )}

                    {currentStep === 3 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => step3ComponentRef.current?.triggerVariations()}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 text-sm"
                        >
                          <Shuffle className="w-4 h-4" />
                          <span>Variations</span>
                        </button>
                        <button
                          onClick={() => step3ComponentRef.current?.triggerOptimize()}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 rounded-lg hover:bg-orange-700 text-sm"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Optimize</span>
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={handleBuildPrompt}
                          disabled={isLoading || !analysis?.analysis}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                        >
                          <ChevronRight className="w-4 h-4" />
                          <span>{isLoading ? 'Building...' : 'Next Step'}</span>
                        </button>
                      </div>
                    )}

                    {currentStep === 4 && generatedImages.length === 0 && (
                      <>
                        {console.log('✅ Step 4 render - showing Generate button (generatedImages.length:', generatedImages.length, ')')}
                        <button
                          onClick={handleStartGeneration}
                          disabled={isGenerating}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating...</span></>
                          ) : (
                            <><Rocket className="w-4 h-4" /><span>Generate Images</span></>
                          )}
                        </button>
                      </>
                    )}

                    {generatedImages.length > 0 && (
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Start New</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== RIGHT SIDEBAR ==================== */}
            <div className="w-60 bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0">
              <div className="p-4 space-y-4">
                {/* Step 2: Character + Product Summary */}
                {currentStep === 2 && analysis && (
                  <>
                    <CharacterProductSummary
                      analysis={analysis}
                      characterImage={characterImage}
                      productImage={productImage}
                      onSaveNewOption={handleSaveNewOption}
                      isSaving={isSaving}
                    />
                    
                    <NewOptionsDetected
                      analysis={analysis}
                      existingOptions={promptOptions}
                      newOptions={newOptions}
                      onSaveOption={handleSaveNewOption}
                      isSaving={isSaving}
                    />
                  </>
                )}

                {/* Step 3: Preview Images */}
                {currentStep === 3 && (
                  <>
                    {/* Character & Product Preview */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-gray-500 mb-1 font-medium">👤 Character</p>
                          <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
                            {characterImage?.preview ? (
                              <img src={characterImage.preview} alt="Character" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No image</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1 font-medium">👕 Product</p>
                          <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
                            {productImage?.preview ? (
                              <img src={productImage.preview} alt="Product" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No image</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Reference Images */}
                      <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-700">
                        <h4 className="text-xs font-semibold text-white mb-2">📸 Style References</h4>
                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                          {referenceImages.map((ref, idx) => (
                            <div key={ref.id} className="relative bg-gray-700 rounded overflow-hidden group aspect-square">
                              <img src={ref.base64} alt="Ref" className="w-full h-full object-cover" />
                              <button
                                onClick={() => setReferenceImages(referenceImages.filter((_, i) => i !== idx))}
                                className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {referenceImages.length < 3 && (
                          <label className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs cursor-pointer transition font-medium">
                            <Upload className="w-3 h-3" />
                            Add
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (referenceImages.length + files.length > 3) {
                                  alert('Max 3 reference images');
                                  return;
                                }
                                files.forEach(file => {
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    setReferenceImages(prev => [...prev, {
                                      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                      base64: evt.target.result,
                                      name: file.name
                                    }]);
                                  };
                                  reader.readAsDataURL(file);
                                });
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Deviation Indicator */}
                      {analysis?.recommendations && (
                        <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/50 space-y-2">
                          <h3 className="text-xs font-semibold text-blue-300">✨ AI Recommendations vs Current</h3>
                          <div className="space-y-1.5 text-xs">
                            {Object.entries(STYLE_CATEGORIES).map(([categoryKey]) => {
                              const aiRecObj = analysis.recommendations[categoryKey];
                              const aiRecChoice = aiRecObj?.choice;
                              const current = selectedOptions[categoryKey];
                              const changed = current && aiRecChoice && current !== aiRecChoice;
                              
                              // Show AI recommendations when available, OR user-selected values (style, colorPalette)
                              // style and colorPalette are user-selected, not from Grok analysis
                              const isUserSelectedOnly = (categoryKey === 'style' || categoryKey === 'colorPalette');
                              if (!aiRecChoice && !isUserSelectedOnly) return null;
                              
                              // Determine what to display
                              const displayValue = aiRecChoice || (isUserSelectedOnly && current);
                              if (!displayValue) return null;
                              
                              return (
                                <div key={categoryKey} className={`flex items-center justify-between px-2 py-1.5 rounded ${
                                  changed ? 'bg-yellow-500/20 border border-yellow-500/30' : 
                                  isUserSelectedOnly ? 'bg-purple-700/20 border border-purple-500/20' : 'bg-gray-700/30'
                                }`}>
                                  <span className="text-gray-400">{categoryKey}</span>
                                  <div className="flex items-center gap-1 text-right">
                                    <span className={changed ? 'text-yellow-300' : isUserSelectedOnly ? 'text-purple-300' : 'text-green-400'}>
                                      {displayValue}
                                    </span>
                                    {changed && (
                                      <>
                                        <span className="text-gray-500">→</span>
                                        <span className="text-yellow-400 font-medium">{current}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Step 3+: Style Summary */}
                {currentStep >= 3 && currentStep !== 3 && Object.keys(selectedOptions).length > 0 && (
                  <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-700 space-y-2">
                    <h3 className="text-xs font-semibold text-purple-300">✨ Current Style</h3>
                    <div className="space-y-1 text-xs">
                      {Object.entries(selectedOptions).map(([key, value]) => (
                        value && (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-500">{key}</span>
                            <span className="text-purple-300 font-medium">{value}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3+: Prompt Summary */}
                {currentStep >= 3 && currentStep !== 3 && generatedPrompt && (
                  <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg p-3 border border-purple-700/50 space-y-2">
                    <h3 className="text-xs font-semibold text-blue-300">📝 Prompt Summary</h3>
                    <div className="text-xs text-gray-400 line-clamp-4 leading-relaxed">
                      {generatedPrompt.positive}
                    </div>
                    {generatedPrompt.negative && (
                      <div className="pt-2 border-t border-purple-700/50">
                        <div className="text-xs text-gray-500 mb-1">Negative:</div>
                        <div className="text-xs text-gray-400 line-clamp-2">
                          {generatedPrompt.negative}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Generation Info */}
                {currentStep === 4 && (
                  <>
                    {/* Preview Images */}
                    {(characterImage || productImage) && (
                      <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-gray-500 mb-1 font-medium">👤 Character</p>
                            <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
                              {characterImage?.preview ? (
                                <img src={characterImage.preview} alt="Character" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No image</div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1 font-medium">👕 Product</p>
                            <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
                              {productImage?.preview ? (
                                <img src={productImage.preview} alt="Product" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No image</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Generation Settings */}
                    <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-700 space-y-2">
                      <h3 className="text-xs font-semibold text-gray-300">⚙️ Generation Settings</h3>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Images:</span>
                          <span className="text-gray-300">{imageCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Aspect Ratio:</span>
                          <span className="text-gray-300">{aspectRatio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Watermark:</span>
                        <span className="text-gray-300">{hasWatermark ? 'Yes' : 'No'}</span>
                      </div>
                      {referenceImage && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Reference:</span>
                          <span className="text-green-400">✓ Added</span>
                        </div>
                      )}
                    </div>
                    </div>

                    {/* Final Prompt Display */}
                    {generatedPrompt?.positive && (
                      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                        <button
                          onClick={() => setShowFinalPrompt(!showFinalPrompt)}
                          className="w-full px-3 py-2.5 flex items-center justify-between bg-gray-700 hover:bg-gray-600 transition"
                        >
                          <span className="flex items-center gap-2 text-xs font-medium text-white">
                            <FileText className="w-3 h-3 text-blue-400" />
                            Final Prompt
                          </span>
                          {showFinalPrompt ? (
                            <ChevronUp className="w-3 h-3 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                        
                        {showFinalPrompt && (
                          <div className="p-3 space-y-2.5">
                            <div>
                              <h4 className="text-xs font-semibold text-blue-400 mb-1.5">✅ Positive</h4>
                              <div className="bg-gray-900 rounded p-2 text-xs text-gray-300 max-h-32 overflow-y-auto border border-blue-900/30">
                                {generatedPrompt.positive}
                              </div>
                            </div>
                            
                            {generatedPrompt.negative && (
                              <div>
                                <h4 className="text-xs font-semibold text-red-400 mb-1.5">❌ Negative</h4>
                                <div className="bg-gray-900 rounded p-2 text-xs text-gray-300 max-h-20 overflow-y-auto border border-red-900/30">
                                  {generatedPrompt.negative}
                                </div>
                              </div>
                            )}
                            
                            {customPrompt && (
                              <div>
                                <h4 className="text-xs font-semibold text-purple-400 mb-1.5">+ Custom</h4>
                                <div className="bg-gray-900 rounded p-2 text-xs text-gray-300 border border-purple-900/30">
                                  {customPrompt}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
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
        mediaType="image"
        contentType="all"
        title={galleryPickerFor === 'character' ? 'Select Character Image' : 'Select Product Image'}
      />
    </div>
  );
}

