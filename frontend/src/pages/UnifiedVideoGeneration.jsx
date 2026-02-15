import React, { useState, useEffect, useRef } from 'react';
import axiosInstance from '../services/axios';
import { API_BASE_URL } from '../config/api';
import { 
  Upload, Wand2, Image as ImageIcon, Video, Sparkles, 
  AlertCircle, CheckCircle, Clock, ChevronRight, ChevronDown,
  RefreshCw, Terminal, X, Menu, Eye, Settings, Zap, Play,
  Save, Star, Download, Trash2, Edit3, RotateCcw, Check,
  Layers, Camera, Film, Music, Sliders, Grid, List
} from 'lucide-react';

export default function UnifiedVideoGeneration() {
  // ==================== REFS ====================
  const sessionId = useRef(`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // ==================== STATE: IMAGES ====================
  const [characterImage, setCharacterImage] = useState(null);
  const [characterPreview, setCharacterPreview] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [productPreview, setProductPreview] = useState(null);

  // ==================== STATE: PHASE 1 - PRE-ANALYSIS ====================
  const [analysisMode, setAnalysisMode] = useState('semi-auto'); // manual, semi-auto, full-auto, hybrid
  const [productFocus, setProductFocus] = useState('full-outfit'); // top, bottom, footwear, accessories, full-outfit
  const [preferredModel, setPreferredModel] = useState('auto');
  const [availableModels, setAvailableModels] = useState([]);

  // ==================== STATE: PHASE 2 - ANALYSIS & OPTIONS ====================
  const [characterAnalysis, setCharacterAnalysis] = useState(null);
  const [productAnalysis, setProductAnalysis] = useState(null);
  const [useCase, setUseCase] = useState('fashion-editorial');

  // AI Suggestions (what AI recommends)
  const [aiSuggestions, setAiSuggestions] = useState({
    scene: '',
    lighting: '',
    mood: '',
    style: '',
    colorPalette: ''
  });

  // User selections (final choices)
  const [userSelections, setUserSelections] = useState({
    scene: '',
    lighting: '',
    mood: '',
    style: '',
    colorPalette: ''
  });

  // Track which options were changed from AI suggestions
  const [changedOptions, setChangedOptions] = useState({
    scene: false,
    lighting: false,
    mood: false,
    style: false,
    colorPalette: false
  });

  // Options from database
  const [allOptions, setAllOptions] = useState({
    scene: [],
    lighting: [],
    mood: [],
    style: [],
    colorPalette: [],
    useCase: []
  });

  // Prompt
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptMode, setPromptMode] = useState('full'); // 'full' or 'short'
  const [builtPrompt, setBuiltPrompt] = useState('');
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // ==================== STATE: PHASE 3 - IMAGE GENERATION ====================
  const [imageCount, setImageCount] = useState(2);
  const [imageProvider, setImageProvider] = useState('auto');
  const [generationMethod, setGenerationMethod] = useState('api'); // 'api' or 'browser-automation'
  const [browserProvider, setBrowserProvider] = useState('google-labs'); // google-labs, grok, image-z-ai, seedream
  const [availableProviders, setAvailableProviders] = useState([]);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [savingImages, setSavingImages] = useState({});

  // ==================== STATE: PHASE 4 - VIDEO GENERATION ====================
  const [selectedImagesForVideo, setSelectedImagesForVideo] = useState([]);
  const [videoOptions, setVideoOptions] = useState({
    duration: 5,
    cameraMovement: 'static',
    transitionStyle: 'fade',
    aspectRatio: '16:9',
    fps: 24,
    loop: false,
    addMusic: false,
    musicStyle: ''
  });
  const [videoPrompt, setVideoPrompt] = useState('');
  const [customVideoPrompt, setCustomVideoPrompt] = useState('');
  const [videoProvider, setVideoProvider] = useState('auto');
  const [generatedVideo, setGeneratedVideo] = useState(null);

  // ==================== STATE: UI ====================
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    preAnalysis: true,
    analysis: false,
    imageGen: false,
    videoGen: false
  });

  // ==================== LOAD DATA ON MOUNT ====================

  useEffect(() => {
    addLog('🚀 Session started', 'info', { sessionId: sessionId.current });
    loadAvailableModels();
    loadPromptOptions();
    loadImageProviders();
  }, []);

  // ==================== AUTO-BUILD PROMPT ====================

  useEffect(() => {
    if (characterAnalysis && productAnalysis) {
      buildPromptPreview();
    }
  }, [promptMode, useCase, userSelections, customPrompt, characterAnalysis, productAnalysis]);

  // ==================== LOGGING ====================

  const addLog = (message, type = 'info', details = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const log = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      message,
      type,
      details
    };

    setLogs(prev => [...prev, log]);

    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type] || 'ℹ️';

    console.log(`${emoji} [${timestamp}] ${message}`, details || '');
  };

  // ==================== LOAD FUNCTIONS ====================

  const loadAvailableModels = async () => {
    try {
      const response = await axiosInstance.get(`/api/ai/models`);
      const models = response.data.data.models;
      setAvailableModels(models);
      addLog(`Loaded ${response.data.data.available} analysis models`, 'success');
    } catch (error) {
      addLog('Failed to load analysis models', 'error', error.message);
    }
  };

  const loadPromptOptions = async () => {
    try {
      const response = await axiosInstance.get(`/api/prompt-options`);
      const options = response.data.data.options;
      setAllOptions(options);
      addLog(`Loaded ${response.data.data.total} prompt options`, 'success');
    } catch (error) {
      addLog('Failed to load prompt options', 'error', error.message);
    }
  };

  const loadImageProviders = async () => {
    try {
      const response = await axiosInstance.get(`/api/image-gen/providers`);
      const providers = response.data.data.providers || [];
      setAvailableProviders(providers);
      addLog(`Loaded ${providers.length} image generation providers`, 'success');
    } catch (error) {
      addLog('Failed to load image providers', 'error', error.message);
    }
  };

  // ==================== IMAGE UPLOAD ====================

  const handleImageUpload = (file, type) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'character') {
        setCharacterImage(file);
        setCharacterPreview(reader.result);
        addLog(`Character image uploaded: ${file.name}`, 'success', {
          size: `${(file.size / 1024).toFixed(2)} KB`,
          type: file.type
        });
      } else {
        setProductImage(file);
        setProductPreview(reader.result);
        addLog(`Product image uploaded: ${file.name}`, 'success', {
          size: `${(file.size / 1024).toFixed(2)} KB`,
          type: file.type
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // ==================== ANALYZE IMAGES ====================

  const analyzeImages = async () => {
    if (!characterImage || !productImage) {
      setError('Please upload both character and product images');
      return;
    }

    setLoading(true);
    setError(null);
    addLog('='.repeat(80), 'info');
    addLog('PHASE 2: ANALYZING IMAGES', 'info');
    addLog('='.repeat(80), 'info');
    addLog(`Analysis Mode: ${analysisMode}`, 'info');
    addLog(`Product Focus: ${productFocus}`, 'info');
    addLog(`Model: ${preferredModel}`, 'info');

    try {
      // Analyze character
      addLog('Analyzing character image...', 'info');

      const characterFormData = new FormData();
      characterFormData.append('image', characterImage);
      characterFormData.append('preferredModel', preferredModel);

      const characterResponse = await axios.post(
        `${API_BASE_URL}/ai/analyze-character`,
        characterFormData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setCharacterAnalysis(characterResponse.data.data.analysis);
      addLog('✅ Character analysis complete', 'success', {
        model: characterResponse.data.data.modelUsed,
        duration: `${characterResponse.data.data.duration}s`
      });

      // Analyze product with focus area
      addLog(`Analyzing product image (focus: ${productFocus})...`, 'info');

      const productFormData = new FormData();
      productFormData.append('image', productImage);
      productFormData.append('preferredModel', preferredModel);
      productFormData.append('focusArea', productFocus);

      const productResponse = await axios.post(
        `${API_BASE_URL}/ai/analyze-product`,
        productFormData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setProductAnalysis(productResponse.data.data.analysis);
      addLog('✅ Product analysis complete', 'success', {
        model: productResponse.data.data.modelUsed,
        duration: `${productResponse.data.data.duration}s`
      });

      // Extract AI suggestions
      const analysis = characterResponse.data.data.analysis + ' ' + productResponse.data.data.analysis;
      const suggestions = extractSuggestions(analysis);
      setAiSuggestions(suggestions);
      addLog('✨ AI suggestions extracted', 'success', suggestions);

      // Apply based on mode
      if (analysisMode === 'full-auto') {
        setUserSelections(suggestions);
        setChangedOptions({
          scene: false,
          lighting: false,
          mood: false,
          style: false,
          colorPalette: false
        });
        addLog('🤖 Full Auto: All AI suggestions applied', 'success');
      } else if (analysisMode === 'semi-auto') {
        // Show suggestions but don't apply yet
        addLog('🔔 Semi Auto: Review AI suggestions before applying', 'info');
      } else if (analysisMode === 'manual') {
        addLog('✋ Manual: Select all options manually', 'info');
      }

      setCurrentStep(2);
      setExpandedSections(prev => ({ ...prev, preAnalysis: false, analysis: true }));
      addLog('✅ Analysis phase completed', 'success');

      // Reload options (might have new ones from AI)
      await loadPromptOptions();

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setError(`Analysis failed: ${errorMsg}`);
      addLog('❌ Analysis failed', 'error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ==================== EXTRACT SUGGESTIONS ====================

  const extractSuggestions = (analysis) => {
    const text = typeof analysis === 'string' ? analysis : JSON.stringify(analysis);
    const lowerText = text.toLowerCase();

    const suggestions = {
      scene: '',
      lighting: '',
      mood: '',
      style: '',
      colorPalette: ''
    };

    // Scene detection
    if (lowerText.includes('studio') || lowerText.includes('white background')) {
      suggestions.scene = 'studio';
    } else if (lowerText.includes('outdoor') || lowerText.includes('nature')) {
      suggestions.scene = 'outdoor-natural';
    } else if (lowerText.includes('urban') || lowerText.includes('street') || lowerText.includes('city')) {
      suggestions.scene = 'urban-street';
    } else if (lowerText.includes('indoor') || lowerText.includes('interior')) {
      suggestions.scene = 'indoor-cozy';
    } else if (lowerText.includes('minimal')) {
      suggestions.scene = 'minimalist';
    } else if (lowerText.includes('luxury') || lowerText.includes('elegant')) {
      suggestions.scene = 'luxury';
    } else if (lowerText.includes('beach') || lowerText.includes('ocean')) {
      suggestions.scene = 'beach';
    } else if (lowerText.includes('forest') || lowerText.includes('woods')) {
      suggestions.scene = 'forest';
    } else if (lowerText.includes('rooftop')) {
      suggestions.scene = 'rooftop';
    } else if (allOptions.scene?.length > 0) {
      suggestions.scene = allOptions.scene[0].value;
    }

    // Lighting detection
    if (lowerText.includes('natural light') || lowerText.includes('daylight')) {
      suggestions.lighting = 'natural';
    } else if (lowerText.includes('soft') || lowerText.includes('diffused')) {
      suggestions.lighting = 'soft-diffused';
    } else if (lowerText.includes('dramatic') || lowerText.includes('moody')) {
      suggestions.lighting = 'dramatic';
    } else if (lowerText.includes('golden hour') || lowerText.includes('sunset')) {
      suggestions.lighting = 'golden-hour';
    } else if (lowerText.includes('studio light')) {
      suggestions.lighting = 'studio-professional';
    } else if (lowerText.includes('backlit')) {
      suggestions.lighting = 'backlit';
    } else if (lowerText.includes('rim light')) {
      suggestions.lighting = 'rim-light';
    } else if (lowerText.includes('low key') || lowerText.includes('dark')) {
      suggestions.lighting = 'low-key';
    } else if (lowerText.includes('high key') || lowerText.includes('bright')) {
      suggestions.lighting = 'high-key';
    } else if (allOptions.lighting?.length > 0) {
      suggestions.lighting = allOptions.lighting[0].value;
    }

    // Mood detection
    if (lowerText.includes('confident') || lowerText.includes('strong')) {
      suggestions.mood = 'confident';
    } else if (lowerText.includes('elegant') || lowerText.includes('sophisticated')) {
      suggestions.mood = 'elegant';
    } else if (lowerText.includes('casual') || lowerText.includes('relaxed')) {
      suggestions.mood = 'casual';
    } else if (lowerText.includes('energetic') || lowerText.includes('dynamic')) {
      suggestions.mood = 'energetic';
    } else if (lowerText.includes('mysterious') || lowerText.includes('enigmatic')) {
      suggestions.mood = 'mysterious';
    } else if (lowerText.includes('playful') || lowerText.includes('fun')) {
      suggestions.mood = 'playful';
    } else if (lowerText.includes('romantic') || lowerText.includes('dreamy')) {
      suggestions.mood = 'romantic';
    } else if (lowerText.includes('powerful') || lowerText.includes('fierce')) {
      suggestions.mood = 'powerful';
    } else if (lowerText.includes('serene') || lowerText.includes('calm')) {
      suggestions.mood = 'serene';
    } else if (allOptions.mood?.length > 0) {
      suggestions.mood = allOptions.mood[0].value;
    }

    // Style detection
    if (lowerText.includes('editorial') || lowerText.includes('magazine')) {
      suggestions.style = 'fashion-editorial';
    } else if (lowerText.includes('commercial') || lowerText.includes('advertising')) {
      suggestions.style = 'commercial';
    } else if (lowerText.includes('lifestyle')) {
      suggestions.style = 'lifestyle';
    } else if (lowerText.includes('artistic') || lowerText.includes('creative')) {
      suggestions.style = 'artistic';
    } else if (lowerText.includes('minimal')) {
      suggestions.style = 'minimalist';
    } else if (lowerText.includes('vintage') || lowerText.includes('retro')) {
      suggestions.style = 'vintage';
    } else if (lowerText.includes('street style')) {
      suggestions.style = 'street-style';
    } else if (lowerText.includes('luxury') || lowerText.includes('high-end')) {
      suggestions.style = 'luxury';
    } else if (lowerText.includes('avant-garde')) {
      suggestions.style = 'avant-garde';
    } else if (allOptions.style?.length > 0) {
      suggestions.style = allOptions.style[0].value;
    }

    // Color Palette detection
    if (lowerText.includes('vibrant') || lowerText.includes('colorful') || lowerText.includes('bright')) {
      suggestions.colorPalette = 'vibrant';
    } else if (lowerText.includes('pastel') || lowerText.includes('soft color')) {
      suggestions.colorPalette = 'pastel';
    } else if (lowerText.includes('monochrome') || lowerText.includes('black and white')) {
      suggestions.colorPalette = 'monochrome';
    } else if (lowerText.includes('earth tone') || lowerText.includes('natural color')) {
      suggestions.colorPalette = 'earth-tones';
    } else if (lowerText.includes('bold') || lowerText.includes('high contrast')) {
      suggestions.colorPalette = 'bold-contrast';
    } else if (lowerText.includes('muted') || lowerText.includes('subdued')) {
      suggestions.colorPalette = 'muted';
    } else if (lowerText.includes('neon') || lowerText.includes('fluorescent')) {
      suggestions.colorPalette = 'neon';
    } else if (lowerText.includes('jewel tone')) {
      suggestions.colorPalette = 'jewel-tones';
    } else if (lowerText.includes('neutral')) {
      suggestions.colorPalette = 'neutral';
    } else if (allOptions.colorPalette?.length > 0) {
      suggestions.colorPalette = allOptions.colorPalette[0].value;
    }

    return suggestions;
  };

  // ==================== APPLY AI SUGGESTION ====================

  const applyAiSuggestion = (field) => {
    setUserSelections(prev => ({
      ...prev,
      [field]: aiSuggestions[field]
    }));
    setChangedOptions(prev => ({
      ...prev,
      [field]: false
    }));
    addLog(`✅ Applied AI suggestion for ${field}`, 'success', {
      value: aiSuggestions[field]
    });
  };

  const applyAllSuggestions = () => {
    setUserSelections(aiSuggestions);
    setChangedOptions({
      scene: false,
      lighting: false,
      mood: false,
      style: false,
      colorPalette: false
    });
    addLog('✅ Applied all AI suggestions', 'success', aiSuggestions);
  };

  // ==================== HANDLE OPTION CHANGE ====================

  const handleOptionChange = (field, value) => {
    setUserSelections(prev => ({
      ...prev,
      [field]: value
    }));

    // Mark as changed if different from AI suggestion
    const isChanged = value !== aiSuggestions[field];
    setChangedOptions(prev => ({
      ...prev,
      [field]: isChanged
    }));

    if (isChanged) {
      addLog(`🔄 ${field} changed manually`, 'info', {
        from: aiSuggestions[field],
        to: value
      });
    }
  };

  // ==================== BUILD PROMPT PREVIEW ====================

  const buildPromptPreview = async () => {
    if (!characterAnalysis || !productAnalysis) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/ai/build-prompt`, {
        characterAnalysis,
        productAnalysis,
        mode: promptMode,
        useCase,
        userSelections,
        customPrompt,
        maxLength: promptMode === 'short' ? 500 : 2000
      });

      setBuiltPrompt(response.data.data.prompt);

    } catch (error) {
      console.error('Failed to build prompt:', error);
      addLog('Failed to build prompt preview', 'error', error.message);
    }
  };

  // ==================== RE-ANALYZE ====================

  const reAnalyze = async () => {
    setCharacterAnalysis(null);
    setProductAnalysis(null);
    setAiSuggestions({
      scene: '',
      lighting: '',
      mood: '',
      style: '',
      colorPalette: ''
    });
    setChangedOptions({
      scene: false,
      lighting: false,
      mood: false,
      style: false,
      colorPalette: false
    });

    if (analysisMode === 'full-auto') {
      setUserSelections({
        scene: '',
        lighting: '',
        mood: '',
        style: '',
        colorPalette: ''
      });
    }

    addLog('🔄 Re-analyzing images...', 'info');
    await analyzeImages();
  };

  // ==================== GENERATE IMAGES ====================

  const generateImages = async () => {
    if (!builtPrompt) {
      setError('Please analyze images first');
      return;
    }

    setLoading(true);
    setError(null);
    addLog('='.repeat(80), 'info');
    addLog('PHASE 3: GENERATING IMAGES', 'info');
    addLog('='.repeat(80), 'info');
    addLog(`Method: ${generationMethod}`);

    if (generationMethod === 'api') {
      addLog(`Provider: ${imageProvider}`, 'info');
    } else {
      addLog(`Browser Provider: ${browserProvider}`, 'info');
    }

    addLog(`Count: ${imageCount}`, 'info');
    addLog(`Prompt: ${builtPrompt.substring(0, 200)}...`, 'info');

    try {
      const formData = new FormData();
      formData.append('prompt', builtPrompt);
      formData.append('negativePrompt', 'blurry, low quality, distorted, deformed, ugly, bad anatomy');
      formData.append('count', imageCount.toString());
      formData.append('characterImage', characterImage);
      formData.append('productImage', productImage);

      let response;

      if (generationMethod === 'api') {
        formData.append('selectedModel', imageProvider);

        response = await axios.post(
          `${API_BASE_URL}/image-gen/generate`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 180000
          }
        );
      } else {
        // Browser automation
        formData.append('provider', browserProvider);

        response = await axios.post(
          `${API_BASE_URL}/image-gen/browser-generate`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000 // 5 minutes for browser automation
          }
        );
      }

      const images = response.data.data.images.map(img => ({
        ...img,
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        saved: false
      }));

      setGeneratedImages(images);
      addLog(`✅ Generated ${images.length} images`, 'success');
      setCurrentStep(3);
      setExpandedSections(prev => ({ ...prev, analysis: false, imageGen: true }));

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setError(`Image generation failed: ${errorMsg}`);
      addLog('❌ Image generation failed', 'error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RE-GENERATE SINGLE IMAGE ====================

  const regenerateImage = async (index) => {
    addLog(`🔄 Re-generating image ${index + 1}...`, 'info');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('prompt', builtPrompt);
      formData.append('negativePrompt', 'blurry, low quality, distorted, deformed, ugly, bad anatomy');
      formData.append('count', '1');
      formData.append('characterImage', characterImage);
      formData.append('productImage', productImage);

      if (generationMethod === 'api') {
        formData.append('selectedModel', imageProvider);
      } else {
        formData.append('provider', browserProvider);
      }

      const endpoint = generationMethod === 'api'
        ? `${API_BASE_URL}/image-gen/generate`
        : `${API_BASE_URL}/image-gen/browser-generate`;

      const response = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000
      });

      const newImage = {
        ...response.data.data.images[0],
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        saved: false
      };

      setGeneratedImages(prev => {
        const updated = [...prev];
        updated[index] = newImage;
        return updated;
      });

      addLog(`✅ Image ${index + 1} re-generated`, 'success');

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      addLog(`❌ Re-generation failed`, 'error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ==================== SAVE IMAGE TO DB ====================

  const saveImageToDb = async (image, index) => {
    setSavingImages(prev => ({ ...prev, [image.id]: true }));
    addLog(`💾 Saving image ${index + 1} to database...`, 'info');

    try {
      const imageData = {
        sessionId: sessionId.current,
        userId: 'anonymous', // TODO: Add user authentication
        characterImageUrl: characterPreview,
        productImageUrl: productPreview,
        characterAnalysis,
        productAnalysis,
        analysisMode,
        productFocus,
        analysisModel: preferredModel,
        selectedOptions: userSelections,
        aiSuggestions,
        fullPrompt: builtPrompt,
        customPrompt,
        promptMode,
        imageUrl: image.url,
        imageProvider: image.provider || imageProvider,
        generationMethod,
        width: image.width,
        height: image.height,
        seed: image.seed,
        generationTime: image.generationTime
      };

      const response = await axios.post(`${API_BASE_URL}/history/images`, imageData);

      setGeneratedImages(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          saved: true,
          dbId: response.data.data._id
        };
        return updated;
      });

      addLog(`✅ Image ${index + 1} saved to database`, 'success', {
        id: response.data.data._id
      });

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      addLog(`❌ Failed to save image ${index + 1}`, 'error', errorMsg);
    } finally {
      setSavingImages(prev => ({ ...prev, [image.id]: false }));
    }
  };

  // ==================== TOGGLE IMAGE SELECTION FOR VIDEO ====================

  const toggleImageForVideo = (image) => {
    setSelectedImagesForVideo(prev => {
      const exists = prev.find(img => img.id === image.id);
      if (exists) {
        return prev.filter(img => img.id !== image.id);
      } else {
        return [...prev, image];
      }
    });
  };

  // ==================== BUILD VIDEO PROMPT ====================

  const buildVideoPrompt = async () => {
    if (selectedImagesForVideo.length === 0) {
      setError('Please select at least one image for video');
      return;
    }

    addLog('🎬 Building video prompt...', 'info');

    try {
      const response = await axios.post(`${API_BASE_URL}/video/build-prompt`, {
        characterAnalysis,
        productAnalysis,
        userSelections,
        videoOptions,
        customVideoPrompt,
        imageCount: selectedImagesForVideo.length
      });

      setVideoPrompt(response.data.data.prompt);
      addLog('✅ Video prompt built', 'success');
      setExpandedSections(prev => ({ ...prev, imageGen: false, videoGen: true }));

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      addLog('❌ Failed to build video prompt', 'error', errorMsg);
    }
  };

  // ==================== GENERATE VIDEO ====================

  const generateVideo = async () => {
    if (!videoPrompt) {
      setError('Please build video prompt first');
      return;
    }

    setLoading(true);
    setError(null);
    addLog('='.repeat(80), 'info');
    addLog('PHASE 4: GENERATING VIDEO', 'info');
    addLog('='.repeat(80), 'info');
    addLog(`Provider: ${videoProvider}`, 'info');
    addLog(`Duration: ${videoOptions.duration}s`, 'info');
    addLog(`Prompt: ${videoPrompt.substring(0, 200)}...`, 'info');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/video/generate`,
        {
          prompt: videoPrompt,
          customPrompt: customVideoPrompt,
          videoOptions,
          sourceImages: selectedImagesForVideo.map(img => img.url),
          provider: videoProvider
        },
        { timeout: 600000 } // 10 minutes
      );

      setGeneratedVideo(response.data.data.video);
      addLog('✅ Video generated successfully', 'success');

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setError(`Video generation failed: ${errorMsg}`);
      addLog('❌ Video generation failed', 'error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ==================== RENDER OPTION SELECT ====================

  const renderOptionSelect = (field, label, icon) => {
    const options = allOptions[field] || [];
    const aiValue = aiSuggestions[field];
    const userValue = userSelections[field];
    const isChanged = changedOptions[field];
    const hasAiSuggestion = aiValue && analysisMode !== 'manual';
    const isDisabled = analysisMode === 'full-auto';

    return (
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
          <span className="flex items-center">
            {icon} {label}
            {isChanged && (
              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full flex items-center">
                <Edit3 className="w-3 h-3 mr-1" />
                Changed
              </span>
            )}
            {!isChanged && hasAiSuggestion && userValue === aiValue && (
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                AI
              </span>
            )}
          </span>
          {hasAiSuggestion && analysisMode === 'semi-auto' && userValue !== aiValue && (
            <button
              onClick={() => applyAiSuggestion(field)}
              className="text-xs text-purple-600 hover:text-purple-800 flex items-center font-semibold"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply AI
            </button>
          )}
        </label>
        <select
          value={userValue}
          onChange={(e) => handleOptionChange(field, e.target.value)}
          disabled={isDisabled}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 transition-all ${
            isDisabled
              ? 'bg-gray-100 cursor-not-allowed border-gray-300'
              : isChanged
              ? 'border-orange-400 bg-orange-50'
              : userValue === aiValue && hasAiSuggestion
              ? 'border-purple-400 bg-purple-50'
              : 'border-gray-300 bg-white'
          }`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {aiValue === opt.value && hasAiSuggestion ? ' ⭐' : ''}
            </option>
          ))}
        </select>
        {isDisabled && (
          <p className="text-xs text-gray-500 mt-1 flex items-center">
            <Zap className="w-3 h-3 mr-1" />
            Full Auto mode - AI controls this option
          </p>
        )}
      </div>
    );
  };

  // ==================== TOGGLE SECTION ====================

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-purple-600 mr-3" />
            AI Fashion Video Generator
          </h1>
          <p className="text-gray-600">
            Complete workflow: Upload → Configure → Analyze → Generate Images → Create Video
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Session ID: {sessionId.current}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
          {[
            { num: 1, label: 'Setup & Analyze', icon: Upload },
            { num: 2, label: 'Configure Options', icon: Settings },
            { num: 3, label: 'Generate Images', icon: ImageIcon },
            { num: 4, label: 'Create Video', icon: Video }
          ].map((step, idx) => (
            <React.Fragment key={step.num}>
              <div className={`flex items-center ${currentStep >= step.num ? 'text-purple-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  currentStep >= step.num ? 'bg-purple-600 text-white scale-110' : 'bg-gray-200'
                }`}>
                  {currentStep > step.num ? <CheckCircle className="w-6 h-6" /> : step.num}
                </div>
                <span className="ml-2 font-medium hidden sm:inline whitespace-nowrap">{step.label}</span>
              </div>
              {idx < 3 && <ChevronRight className="w-6 h-6 mx-2 sm:mx-4 text-gray-400 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start animate-shake">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex gap-4">

          {/* Main Panel */}
          <div className={`flex-1 transition-all duration-300 ${showLogs ? 'mr-80' : ''}`}>

            {/* ==================== PHASE 1: PRE-ANALYSIS SETUP ==================== */}
            <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
              <button
                onClick={() => toggleSection('preAnalysis')}
                className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
              >
                <div className="flex items-center">
                  <Upload className="w-6 h-6 text-purple-600 mr-3" />
                  <div className="text-left">
                    <h2 className="text-xl font-bold text-gray-900">Phase 1: Pre-Analysis Setup</h2>
                    <p className="text-sm text-gray-600">Upload images and configure analysis settings</p>
                  </div>
                </div>
                {expandedSections.preAnalysis ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
              </button>

              {expandedSections.preAnalysis && (
                <div className="p-6">

                  {/* Image Upload */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Character Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Character Image *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors">
                        {characterPreview ? (
                          <div className="relative group">
                            <img src={characterPreview} alt="Character" className="w-full h-64 object-cover rounded-lg" />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                              <button
                                onClick={() => {
                                  setCharacterImage(null);
                                  setCharacterPreview(null);
                                  setCharacterAnalysis(null);
                                }}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-all"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 font-medium">Click to upload character image</p>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e.target.files[0], 'character')}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Product Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Image *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-400 transition-colors">
                        {productPreview ? (
                          <div className="relative group">
                            <img src={productPreview} alt="Product" className="w-full h-64 object-cover rounded-lg" />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                              <button
                                onClick={() => {
                                  setProductImage(null);
                                  setProductPreview(null);
                                  setProductAnalysis(null);
                                }}
                                className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-all"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 font-medium">Click to upload product image</p>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(e.target.files[0], 'product')}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Analysis Configuration */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-purple-600" />
                      Analysis Configuration
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Analysis Mode */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          🤖 Analysis Mode *
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: 'manual', label: 'Manual', desc: 'You select all options manually', icon: '✋' },
                            { value: 'semi-auto', label: 'Semi-Auto', desc: 'AI suggests, you confirm', icon: '🔔' },
                            { value: 'full-auto', label: 'Full Auto', desc: 'AI selects everything', icon: '🤖' },
                            { value: 'hybrid', label: 'Hybrid', desc: 'Mix of manual and auto', icon: '🎯' }
                          ].map(mode => (
                            <label
                              key={mode.value}
                              className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                analysisMode === mode.value
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-purple-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="analysisMode"
                                value={mode.value}
                                checked={analysisMode === mode.value}
                                onChange={(e) => setAnalysisMode(e.target.value)}
                                className="mt-1"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center">
                                  <span className="mr-2">{mode.icon}</span>
                                  <span className="font-semibold text-gray-900">{mode.label}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">{mode.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Product Focus */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          👗 Product Focus Area *
                        </label>
                        <div className="space-y-2">
                          {[
                            { value: 'full-outfit', label: 'Full Outfit', desc: 'Analyze entire outfit', icon: '👔' },
                            { value: 'top', label: 'Top', desc: 'Focus on shirt/jacket/blouse', icon: '👕' },
                            { value: 'bottom', label: 'Bottom', desc: 'Focus on pants/skirt', icon: '👖' },
                            { value: 'footwear', label: 'Footwear', desc: 'Focus on shoes/boots', icon: '👟' },
                            { value: 'accessories', label: 'Accessories', desc: 'Focus on bags/jewelry', icon: '👜' }
                          ].map(focus => (
                            <label
                              key={focus.value}
                              className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                productFocus === focus.value
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-purple-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="productFocus"
                                value={focus.value}
                                checked={productFocus === focus.value}
                                onChange={(e) => setProductFocus(e.target.value)}
                                className="mt-1"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center">
                                  <span className="mr-2">{focus.icon}</span>
                                  <span className="font-semibold text-gray-900">{focus.label}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">{focus.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Analysis Model */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🧠 Analysis Model
                      </label>
                      <select
                        value={preferredModel}
                        onChange={(e) => setPreferredModel(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="auto">Auto (Priority-based selection)</option>
                        {availableModels.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.provider}) {model.free && '- FREE'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Analyze Button */}
                  <button
                    onClick={analyzeImages}
                    disabled={!characterImage || !productImage || loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <Clock className="w-6 h-6 mr-3 animate-spin" />
                        Analyzing Images...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-6 h-6 mr-3" />
                        Analyze Images with AI
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* ==================== PHASE 2: ANALYSIS & OPTIONS ==================== */}
            {(characterAnalysis || productAnalysis) && (
              <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                <button
                  onClick={() => toggleSection('analysis')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-colors"
                >
                  <div className="flex items-center">
                    <Sparkles className="w-6 h-6 text-purple-600 mr-3" />
                    <div className="text-left">
                      <h2 className="text-xl font-bold text-gray-900">Phase 2: AI Analysis & Options</h2>
                      <p className="text-sm text-gray-600">Configure styling options based on AI analysis</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        reAnalyze();
                      }}
                      disabled={loading}
                      className="mr-4 flex items-center px-4 py-2 text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-analyze
                    </button>
                    {expandedSections.analysis ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                  </div>
                </button>

                {expandedSections.analysis && (
                  <div className="p-6">

                    {/* Analysis Summary */}
                    <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                        <Eye className="w-5 h-5 mr-2 text-blue-600" />
                        Analysis Summary
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-gray-700 mb-1">Character:</p>
                          <p className="text-gray-600 text-xs leading-relaxed">
                            {typeof characterAnalysis === 'string'
                              ? characterAnalysis.substring(0, 200)
                              : JSON.stringify(characterAnalysis).substring(0, 200)}...
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700 mb-1">Product ({productFocus}):</p>
                          <p className="text-gray-600 text-xs leading-relaxed">
                            {typeof productAnalysis === 'string'
                              ? productAnalysis.substring(0, 200)
                              : JSON.stringify(productAnalysis).substring(0, 200)}...
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* AI Suggestions (Semi-Auto mode) */}
                    {analysisMode === 'semi-auto' && Object.values(aiSuggestions).some(v => v) && (
                      <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-2 border-purple-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-700 flex items-center">
                            <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                            AI Suggestions (Click to Apply)
                          </h3>
                          <button
                            onClick={applyAllSuggestions}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center text-sm font-semibold"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Apply All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(aiSuggestions).map(([key, value]) => {
                            if (!value) return null;
                            const option = allOptions[key]?.find(o => o.value === value);
                            const isApplied = userSelections[key] === value;
                            return (
                              <button
                                key={key}
                                onClick={() => applyAiSuggestion(key)}
                                disabled={isApplied}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                                  isApplied
                                    ? 'bg-purple-600 text-white cursor-default'
                                    : 'bg-white text-purple-700 border-2 border-purple-300 hover:bg-purple-100'
                                }`}
                              >
                                {isApplied && <Check className="w-3 h-3 inline mr-1" />}
                                {key}: {option?.label || value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Use Case */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🎯 Use Case
                      </label>
                      <select
                        value={useCase}
                        onChange={(e) => setUseCase(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        {(allOptions.useCase || []).map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Different use cases generate different prompt styles
                      </p>
                    </div>

                    {/* Styling Options Grid */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      {renderOptionSelect('scene', 'Scene', '🎬')}
                      {renderOptionSelect('lighting', 'Lighting', '💡')}
                      {renderOptionSelect('mood', 'Mood', '😊')}
                      {renderOptionSelect('style', 'Photography Style', '📸')}
                      {renderOptionSelect('colorPalette', 'Color Palette', '🎨')}
                    </div>

                    {/* Custom Prompt */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ✍️ Custom Prompt (Optional)
                      </label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Add any additional instructions or details..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                      />
                    </div>

                    {/* Prompt Mode Toggle */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📝 Prompt Mode
                      </label>
                      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
                        <button
                          onClick={() => setPromptMode('full')}
                          className={`px-4 py-2 rounded-md transition-all ${
                            promptMode === 'full'
                              ? 'bg-white text-purple-600 shadow-md font-semibold'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Full Prompt
                        </button>
                        <button
                          onClick={() => setPromptMode('short')}
                          className={`px-4 py-2 rounded-md transition-all ${
                            promptMode === 'short'
                              ? 'bg-white text-purple-600 shadow-md font-semibold'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Short Prompt
                        </button>
                      </div>
                    </div>

                    {/* Prompt Preview */}
                    <div>
                      <button
                        onClick={() => setShowPromptPreview(!showPromptPreview)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                      >
                        <span className="font-semibold text-gray-700 flex items-center">
                          <Eye className="w-5 h-5 mr-2" />
                          Prompt Preview
                          {builtPrompt && (
                            <span className="ml-2 text-sm text-gray-500">
                              ({builtPrompt.length} characters)
                            </span>
                          )}
                        </span>
                        {showPromptPreview ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>

                      {showPromptPreview && builtPrompt && (
                        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{builtPrompt}</p>
                          {builtPrompt.length > 1800 && (
                            <p className="text-xs text-orange-600 mt-3 flex items-center">
                              <AlertCircle className="w-4 h-4 mr-1" />
                              Prompt is long ({builtPrompt.length} chars). Will auto-shorten if needed.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* ==================== PHASE 3: IMAGE GENERATION ==================== */}
            {characterAnalysis && productAnalysis && (
              <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                <button
                  onClick={() => toggleSection('imageGen')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 transition-colors"
                >
                  <div className="flex items-center">
                    <ImageIcon className="w-6 h-6 text-green-600 mr-3" />
                    <div className="text-left">
                      <h2 className="text-xl font-bold text-gray-900">Phase 3: Image Generation</h2>
                      <p className="text-sm text-gray-600">Generate images using AI or browser automation</p>
                    </div>
                  </div>
                  {expandedSections.imageGen ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                </button>

                {expandedSections.imageGen && (
                  <div className="p-6">

                    {/* Generation Method */}
                    <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        🚀 Generation Method
                      </label>
                      <div className="grid md:grid-cols-2 gap-4">
                        <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          generationMethod === 'api'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300 bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="generationMethod"
                            value="api"
                            checked={generationMethod === 'api'}
                            onChange={(e) => setGenerationMethod(e.target.value)}
                            className="mt-1"
                          />
                          <div className="ml-3">
                            <div className="font-semibold text-gray-900 flex items-center">
                              <Zap className="w-4 h-4 mr-2 text-purple-600" />
                              API (Fast & Reliable)
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Direct API calls to Replicate, Fireworks, etc.
                            </p>
                          </div>
                        </label>

                        <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          generationMethod === 'browser-automation'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300 bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="generationMethod"
                            value="browser-automation"
                            checked={generationMethod === 'browser-automation'}
                            onChange={(e) => setGenerationMethod(e.target.value)}
                            className="mt-1"
                          />
                          <div className="ml-3">
                            <div className="font-semibold text-gray-900 flex items-center">
                              <Camera className="w-4 h-4 mr-2 text-green-600" />
                              Browser Automation (Free)
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              Automate Google Labs, Grok, etc. (slower but free)
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Provider Selection */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      {generationMethod === 'api' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🎨 Image Generation Provider
                          </label>
                          <select
                            value={imageProvider}
                            onChange={(e) => setImageProvider(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="auto">🔄 Auto (Try best providers first)</option>
                            
                            <optgroup label="🚀 Tier 1: OpenRouter (1 key, 10 models)">
                              <option value="openrouter-flux-1.1-pro">💎 Flux 1.1 Pro ($0.04) ⭐⭐⭐⭐⭐</option>
                              <option value="openrouter-flux-pro">⚡ Flux Pro ($0.055) ⭐⭐⭐⭐⭐</option>
                              <option value="openrouter-flux-dev">🔥 Flux Dev ($0.025) ⭐⭐⭐⭐</option>
                              <option value="openrouter-flux-schnell">⚡ Flux Schnell ($0.003) ⭐⭐⭐</option>
                              <option value="openrouter-sd3">🎨 SD3 ($0.035) ⭐⭐⭐⭐</option>
                              <option value="openrouter-sdxl">🖼️ SDXL ($0.002) ⭐⭐⭐</option>
                              <option value="openrouter-ideogram-v2">✨ Ideogram V2 ($0.08) ⭐⭐⭐⭐</option>
                              <option value="openrouter-recraft-v3">🎭 Recraft V3 ($0.05) ⭐⭐⭐⭐</option>
                              <option value="openrouter-fal-flux-pro">🌟 FAL Flux Pro ($0.055) ⭐⭐⭐⭐</option>
                              <option value="openrouter-fal-flux-realism">📸 FAL Flux Realism ($0.05) ⭐⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="🆓 Tier 2: Google (Free)">
                              <option value="gemini-2.0-flash-image">✨ Gemini 2.0 Flash ⭐⭐⭐⭐</option>
                              <option value="google-imagen-3">🎨 Imagen 3 ⭐⭐⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="🎮 Tier 3: NVIDIA (Free)">
                              <option value="nvidia-sdxl">🖼️ SDXL ⭐⭐⭐</option>
                              <option value="nvidia-sd3">🎨 SD3 ⭐⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="🔥 Tier 4: Fireworks (Free Credits)">
                              <option value="fireworks-sd3">🎨 SD3 ⭐⭐⭐⭐</option>
                              <option value="fireworks-playground-v2.5">🎮 Playground v2.5 ⭐⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="🤝 Tier 5: Together AI (Free Credits)">
                              <option value="together-flux-schnell">⚡ Flux Schnell ⭐⭐⭐</option>
                              <option value="together-sdxl">🖼️ SDXL ⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="🌟 Tier 6: FAL.ai (Free Tier)">
                              <option value="fal-flux-pro">💎 Flux Pro ⭐⭐⭐⭐</option>
                              <option value="fal-flux-realism">📸 Flux Realism ⭐⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="🎨 Tier 7: Segmind (Free Tier)">
                              <option value="segmind-sd3">🎨 SD3 ⭐⭐⭐⭐</option>
                              <option value="segmind-sdxl">🖼️ SDXL ⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="🚀 Tier 8: DeepInfra (Free Tier)">
                              <option value="deepinfra-sdxl">🖼️ SDXL ⭐⭐⭐</option>
                              <option value="deepinfra-flux-schnell">⚡ Flux Schnell ⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="🤗 Tier 9: Hugging Face (Free)">
                              <option value="huggingface-flux">⚡ Flux Schnell ⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="🔷 Tier 10: Replicate (Paid)">
                              <option value="replicate-flux-pro">💎 Flux Pro ($0.055) ⭐⭐⭐⭐⭐</option>
                            </optgroup>
                            
                            <optgroup label="⚠️ Fallback">
                              <option value="pollinations">🌸 Pollinations (No key needed) ⭐⭐</option>
                            </optgroup>
                          </select>
                          
                          <p className="text-xs text-gray-500 mt-1">
                            {imageProvider === 'auto' 
                              ? '✅ Recommended: Will try OpenRouter first (10 models with 1 key), then other free providers'
                              : imageProvider.startsWith('openrouter')
                              ? '🚀 OpenRouter: Best quality, multiple models with single API key'
                              : imageProvider === 'pollinations'
                              ? '⚠️ Pollinations: Free but lower quality, used as last resort'
                              : imageProvider.startsWith('gemini') || imageProvider.startsWith('google')
                              ? '🆓 Google: Free with generous limits, excellent quality'
                              : imageProvider.startsWith('nvidia')
                              ? '🆓 NVIDIA: Free tier, good quality'
                              : '🆓 Free tier or credits available'}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🌐 Browser Provider
                          </label>
                          <select
                            value={browserProvider}
                            onChange={(e) => setBrowserProvider(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="google-labs">Google Labs (Imagen 3) - FREE</option>
                            <option value="grok">Grok (xAI) - FREE</option>
                            <option value="image-z-ai">Image.z.ai - FREE</option>
                            <option value="seedream">ByteDance SeeDream - FREE</option>
                          </select>
                          <p className="text-xs text-orange-600 mt-1 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Requires browser automation setup
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🔢 Number of Images
                        </label>
                        <select
                          value={imageCount}
                          onChange={(e) => setImageCount(Number(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value={1}>1 image</option>
                          <option value={2}>2 images</option>
                          <option value={4}>4 images</option>
                        </select>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <button
                      onClick={generateImages}
                      disabled={loading || !builtPrompt}
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:from-green-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      {loading ? (
                        <>
                          <Clock className="w-6 h-6 mr-3 animate-spin" />
                          Generating Images...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 mr-3" />
                          Generate {imageCount} Image{imageCount > 1 ? 's' : ''} with AI
                        </>
                      )}
                    </button>

                    {/* Generated Images */}
                    {generatedImages.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            Generated Images ({generatedImages.length})
                          </h3>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                const allSaved = generatedImages.every(img => img.saved);
                                if (!allSaved) {
                                  generatedImages.forEach((img, idx) => {
                                    if (!img.saved) saveImageToDb(img, idx);
                                  });
                                }
                              }}
                              disabled={generatedImages.every(img => img.saved)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center text-sm font-semibold"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save All
                            </button>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          {generatedImages.map((img, idx) => (
                            <div key={img.id} className="relative group bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-purple-400 transition-all">
                              {/* Image */}
                              <div className="relative">
                                <img
                                  src={img.url}
                                  alt={`Generated ${idx + 1}`}
                                  className="w-full h-auto"
                                />

                                {/* Overlay on hover */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-all flex space-x-2">
                                    <a
                                      href={img.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all flex items-center"
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View
                                    </a>
                                    <a
                                      href={img.url}
                                      download={`fashion-ai-${idx + 1}.png`}
                                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-all flex items-center"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </a>
                                  </div>
                                </div>

                                {/* Provider badge */}
                                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                  {img.provider || imageProvider}
                                </div>

                                {/* Saved badge */}
                                {img.saved && (
                                  <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Saved
                                  </div>
                                )}

                                {/* Video selection checkbox */}
                                <div className="absolute bottom-2 left-2">
                                  <label className="flex items-center bg-white bg-opacity-90 px-3 py-2 rounded-lg cursor-pointer hover:bg-opacity-100 transition-all">
                                    <input
                                      type="checkbox"
                                      checked={selectedImagesForVideo.some(i => i.id === img.id)}
                                      onChange={() => toggleImageForVideo(img)}
                                      className="mr-2"
                                    />
                                    <span className="text-xs font-semibold text-gray-900">Use for video</span>
                                  </label>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="p-3 bg-white border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => saveImageToDb(img, idx)}
                                      disabled={img.saved || savingImages[img.id]}
                                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center text-sm font-semibold"
                                    >
                                      {savingImages[img.id] ? (
                                        <>
                                          <Clock className="w-3 h-3 mr-1 animate-spin" />
                                          Saving...
                                        </>
                                      ) : img.saved ? (
                                        <>
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Saved
                                        </>
                                      ) : (
                                        <>
                                          <Save className="w-3 h-3 mr-1" />
                                          Save
                                        </>
                                      )}
                                    </button>

                                    <button
                                      onClick={() => regenerateImage(idx)}
                                      disabled={loading}
                                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center text-sm font-semibold"
                                    >
                                      <RotateCcw className="w-3 h-3 mr-1" />
                                      Re-gen
                                    </button>
                                  </div>

                                  <div className="text-xs text-gray-500">
                                    #{idx + 1}
                                  </div>
                                </div>

                                {/* Image metadata */}
                                {(img.width || img.seed) && (
                                  <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                                    {img.width && <span>{img.width}x{img.height}</span>}
                                    {img.seed && <span>Seed: {img.seed}</span>}
                                    {img.generationTime && <span>{img.generationTime}s</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Video Generation Teaser */}
                        {selectedImagesForVideo.length > 0 && (
                          <div className="mt-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 border-2 border-purple-300">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                  <Video className="w-5 h-5 text-purple-600 mr-2" />
                                  Ready for Video Generation
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {selectedImagesForVideo.length} image{selectedImagesForVideo.length > 1 ? 's' : ''} selected. Configure video options below.
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  buildVideoPrompt();
                                  setCurrentStep(4);
                                }}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center font-semibold"
                              >
                                <ChevronRight className="w-5 h-5 mr-2" />
                                Continue to Video
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            {/* ==================== PHASE 4: VIDEO GENERATION ==================== */}
            {selectedImagesForVideo.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                <button
                  onClick={() => toggleSection('videoGen')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
                >
                  <div className="flex items-center">
                    <Video className="w-6 h-6 text-purple-600 mr-3" />
                    <div className="text-left">
                      <h2 className="text-xl font-bold text-gray-900">Phase 4: Video Generation</h2>
                      <p className="text-sm text-gray-600">Create stunning fashion videos from your images</p>
                    </div>
                  </div>
                  {expandedSections.videoGen ? <ChevronDown className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
                </button>

                {expandedSections.videoGen && (
                  <div className="p-6">

                    {/* Selected Images Preview */}
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                        <Layers className="w-5 h-5 mr-2 text-purple-600" />
                        Selected Images ({selectedImagesForVideo.length})
                      </h3>
                      <div className="flex space-x-3 overflow-x-auto pb-2">
                        {selectedImagesForVideo.map((img, idx) => (
                          <div key={img.id} className="relative flex-shrink-0">
                            <img
                              src={img.url}
                              alt={`Selected ${idx + 1}`}
                              className="w-32 h-32 object-cover rounded-lg border-2 border-purple-400"
                            />
                            <div className="absolute -top-2 -right-2 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <button
                              onClick={() => toggleImageForVideo(img)}
                              className="absolute -top-2 -left-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Video Options */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                        <Sliders className="w-5 h-5 mr-2 text-purple-600" />
                        Video Options
                      </h3>

                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Duration */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ⏱️ Duration (seconds)
                          </label>
                          <input
                            type="number"
                            min="3"
                            max="30"
                            value={videoOptions.duration}
                            onChange={(e) => setVideoOptions(prev => ({ ...prev, duration: Number(e.target.value) }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        {/* Camera Movement */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            📹 Camera Movement
                          </label>
                          <select
                            value={videoOptions.cameraMovement}
                            onChange={(e) => setVideoOptions(prev => ({ ...prev, cameraMovement: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="static">Static (No movement)</option>
                            <option value="zoom-in">Zoom In</option>
                            <option value="zoom-out">Zoom Out</option>
                            <option value="pan-left">Pan Left</option>
                            <option value="pan-right">Pan Right</option>
                            <option value="rotate">Rotate</option>
                            <option value="dynamic">Dynamic (AI decides)</option>
                          </select>
                        </div>

                        {/* Transition Style */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🎬 Transition Style
                          </label>
                          <select
                            value={videoOptions.transitionStyle}
                            onChange={(e) => setVideoOptions(prev => ({ ...prev, transitionStyle: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="none">None</option>
                            <option value="fade">Fade</option>
                            <option value="dissolve">Dissolve</option>
                            <option value="slide">Slide</option>
                            <option value="wipe">Wipe</option>
                            <option value="morph">Morph</option>
                          </select>
                        </div>

                        {/* Aspect Ratio */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            📐 Aspect Ratio
                          </label>
                          <select
                            value={videoOptions.aspectRatio}
                            onChange={(e) => setVideoOptions(prev => ({ ...prev, aspectRatio: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait/TikTok)</option>
                            <option value="1:1">1:1 (Square/Instagram)</option>
                            <option value="4:5">4:5 (Instagram Feed)</option>
                          </select>
                        </div>

                        {/* FPS */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            🎞️ Frame Rate (FPS)
                          </label>
                          <select
                            value={videoOptions.fps}
                            onChange={(e) => setVideoOptions(prev => ({ ...prev, fps: Number(e.target.value) }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          >
                            <option value={24}>24 FPS (Cinematic)</option>
                            <option value={30}>30 FPS (Standard)</option>
                            <option value={60}>60 FPS (Smooth)</option>
                          </select>
                        </div>

                        {/* Music */}
                        <div>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={videoOptions.addMusic}
                              onChange={(e) => setVideoOptions(prev => ({ ...prev, addMusic: e.target.checked }))}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              🎵 Add Background Music
                            </span>
                          </label>
                          {videoOptions.addMusic && (
                            <input
                              type="text"
                              value={videoOptions.musicStyle}
                              onChange={(e) => setVideoOptions(prev => ({ ...prev, musicStyle: e.target.value }))}
                              placeholder="e.g., upbeat, chill, dramatic..."
                              className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Custom Video Prompt */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ✍️ Custom Video Prompt (Optional)
                      </label>
                      <textarea
                        value={customVideoPrompt}
                        onChange={(e) => setCustomVideoPrompt(e.target.value)}
                        placeholder="Add specific video instructions (e.g., 'smooth transitions between outfits', 'focus on fabric details')..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                      />
                    </div>

                    {/* Video Provider */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🎥 Video Provider
                      </label>
                      <select
                        value={videoProvider}
                        onChange={(e) => setVideoProvider(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="auto">Auto (Best Available)</option>
                        <option value="runway">Runway Gen-2</option>
                        <option value="pika">Pika Labs</option>
                        <option value="stable-video">Stable Video Diffusion</option>
                        <option value="kling">Kling AI</option>
                      </select>
                    </div>

                    {/* Build Video Prompt Button */}
                    {!videoPrompt && (
                      <button
                        onClick={buildVideoPrompt}
                        disabled={loading}
                        className="w-full mb-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      >
                        <Wand2 className="w-5 h-5 mr-2" />
                        Build Video Prompt
                      </button>
                    )}

                    {/* Video Prompt Preview */}
                    {videoPrompt && (
                      <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                          <Eye className="w-5 h-5 mr-2" />
                          Video Prompt
                        </h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{videoPrompt}</p>
                        <button
                          onClick={buildVideoPrompt}
                          className="mt-3 text-sm text-purple-600 hover:text-purple-800 flex items-center font-semibold"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Rebuild Prompt
                        </button>
                      </div>
                    )}

                    {/* Generate Video Button */}
                    <button
                      onClick={generateVideo}
                      disabled={loading || !videoPrompt}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      {loading ? (
                        <>
                          <Clock className="w-6 h-6 mr-3 animate-spin" />
                          Generating Video... (This may take 5-10 minutes)
                        </>
                      ) : (
                        <>
                          <Video className="w-6 h-6 mr-3" />
                          Generate Fashion Video
                        </>
                      )}
                    </button>

                    {/* Generated Video */}
                    {generatedVideo && (
                      <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border-2 border-green-300">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                          <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
                          Video Generated Successfully!
                        </h3>
                        <div className="bg-black rounded-lg overflow-hidden mb-4">
                          <video
                            src={generatedVideo.videoUrl}
                            controls
                            className="w-full"
                            poster={generatedVideo.thumbnailUrl}
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            <p>Duration: {generatedVideo.duration}s</p>
                            <p>Provider: {generatedVideo.videoProvider}</p>
                            {generatedVideo.fileSize && (
                              <p>Size: {(generatedVideo.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <a
                              href={generatedVideo.videoUrl}
                              download="fashion-video.mp4"
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center font-semibold"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </a>
                            <button
                              onClick={generateVideo}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center font-semibold"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Re-generate
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

          </div>

          {/* ==================== LOGS SIDEBAR ==================== */}
          <div className={`fixed right-0 top-0 h-full bg-white shadow-2xl transition-all duration-300 z-50 ${
            showLogs ? 'w-80' : 'w-0'
          } overflow-hidden`}>
            <div className="h-full flex flex-col">
              {/* Logs Header */}
              <div className="bg-gray-900 text-white p-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center">
                  <Terminal className="w-5 h-5 mr-2" />
                  <span className="font-semibold">System Logs</span>
                  <span className="ml-2 bg-gray-700 px-2 py-0.5 rounded-full text-xs">{logs.length}</span>
                </div>
                <button
                  onClick={() => setShowLogs(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Logs Content */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {logs.length === 0 ? (
                  <div className="text-center mt-8">
                    <Terminal className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No logs yet</p>
                    <p className="text-gray-400 text-xs mt-1">Start by uploading images</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg text-xs font-mono transition-all hover:shadow-md ${
                          log.type === 'error' ? 'bg-red-100 text-red-900 border border-red-300' :
                          log.type === 'success' ? 'bg-green-100 text-green-900 border border-green-300' :
                          log.type === 'warning' ? 'bg-yellow-100 text-yellow-900 border border-yellow-300' :
                          'bg-gray-100 text-gray-900 border border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-gray-500 text-xs">{log.timestamp}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            log.type === 'error' ? 'bg-red-200' :
                            log.type === 'success' ? 'bg-green-200' :
                            log.type === 'warning' ? 'bg-yellow-200' :
                            'bg-gray-200'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="font-semibold mb-1">{log.message}</div>
                        {log.details && (
                          <div className="mt-2 pl-2 border-l-2 border-gray-400 text-xs text-gray-700">
                            {typeof log.details === 'object'
                              ? JSON.stringify(log.details, null, 2)
                              : log.details
                            }
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logs Footer */}
              <div className="bg-gray-100 p-3 border-t border-gray-200 flex-shrink-0">
                <button
                  onClick={() => setLogs([])}
                  disabled={logs.length === 0}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 py-2 px-3 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Clear All Logs
                </button>
              </div>
            </div>
          </div>

          {/* Logs Toggle Button (Fixed) */}
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`fixed right-4 bottom-4 bg-gray-900 text-white p-4 rounded-full shadow-lg hover:bg-gray-800 transition-all z-40 ${
              showLogs ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-110'
            }`}
          >
            <Terminal className="w-6 h-6" />
            {logs.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold animate-pulse">
                {logs.length}
              </span>
            )}
          </button>

        </div>

      </div>
    </div>
  );
}