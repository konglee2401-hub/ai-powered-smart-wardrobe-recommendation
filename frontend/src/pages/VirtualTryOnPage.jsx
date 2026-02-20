/**
 * AI Creative Studio - PicsArt Style Layout
 * - 2 Left sidebars: Tools + Options
 * - Center: Preview
 * - Right: Style options
 * - Fixed bottom action bar
 */

import React, { useState, useEffect } from 'react';
import {
  Upload, Sparkles, Sliders, FileText, Rocket, Image,
  Loader2, RefreshCw, X, Video, Wand2, Settings, Shirt, Target, Save
} from 'lucide-react';

import { unifiedFlowAPI, browserAutomationAPI, promptsAPI, aiOptionsAPI } from '../services/api';

import StyleCustomizer from '../components/StyleCustomizer';

// Steps
const STEPS = [
  { id: 1, name: 'Upload', icon: Upload },
  { id: 2, name: 'Analysis', icon: Sparkles },
  { id: 3, name: 'Style', icon: Sliders },
  { id: 4, name: 'Prompt', icon: FileText },
  { id: 5, name: 'Generate', icon: Rocket },
];

// Use cases from original component
const USE_CASES = [
  { value: 'change-clothes', label: 'Change Clothes', description: 'Mặc sản phẩm lên người mẫu' },
  { value: 'ecommerce-product', label: 'E-commerce', description: 'Ảnh sản phẩm thương mại' },
  { value: 'social-media', label: 'Social Media', description: 'Bài đăng mạng xã hội' },
  { value: 'fashion-editorial', label: 'Editorial', description: 'Bài báo thời trang chuyên nghiệp' },
  { value: 'lifestyle-scene', label: 'Lifestyle', description: 'Cảnh sống hàng ngày' },
  { value: 'before-after', label: 'Before/After', description: 'So sánh trước/sau' },
];

// Focus options from original component
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

// Tooltip component - show below on hover
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

export default function VirtualTryOnPage() {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('image');
  const [activeMode, setActiveMode] = useState('browser');

  // Data
  const [characterImage, setCharacterImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [useCase, setUseCase] = useState('change-clothes');
  const [productFocus, setProductFocus] = useState('full-outfit');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [customOptions, setCustomOptions] = useState({});

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
  const [browserProvider, setBrowserProvider] = useState('grok');

  // Options from API
  const [promptOptions, setPromptOptions] = useState(null);

  const PROVIDERS = [
    { id: 'grok', label: 'Grok', icon: '🤖' },
    { id: 'zai', label: 'Z.AI', icon: '💎' },
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

  const handleCustomOptionChange = (category, value) => {
    setCustomOptions(prev => ({ ...prev, [category]: value }));
  };

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleStartAnalysis = async () => {
    if (!characterImage?.file || !productImage?.file) return;

    setIsAnalyzing(true);
    setCurrentStep(2);

    try {
      const analysisResponse = await browserAutomationAPI.analyzeBrowserOnly(
        characterImage.file,
        productImage.file,
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

      if (analysisResponse.success && analysisResponse.data) {
        // Store raw response for display
        setAnalysisRaw(analysisResponse.data);
        
        // Extract analysis content
        setAnalysis(analysisResponse.data);
        
        // Store image base64
        const charBase64 = await fileToBase64(characterImage.file);
        const prodBase64 = await fileToBase64(productImage.file);
        
        setStoredImages({
          character: charBase64,
          product: prodBase64
        });
        
        // Stay at Step 2 - show analysis result
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRecommendation = () => {
    // Apply AI recommendations and go to Step 3
    if (analysis?.analysis?.recommendations) {
      const rec = analysis.analysis.recommendations;
      
      // Apply recommendations to selectedOptions
      const newOptions = { ...selectedOptions };
      if (rec.scene) newOptions.scene = rec.scene;
      if (rec.lighting) newOptions.lighting = rec.lighting;
      if (rec.mood) newOptions.mood = rec.mood;
      if (rec.style) newOptions.style = rec.style;
      if (rec.colorPalette) newOptions.colorPalette = rec.colorPalette;
      if (rec.cameraAngle) newOptions.cameraAngle = rec.cameraAngle;
      
      setSelectedOptions(newOptions);
    }
    
    // Go to Step 3
    setCurrentStep(3);
  };

  const handleSaveRecommendations = async () => {
    if (!analysis?.analysis?.recommendations) return;
    
    setIsSaving(true);
    try {
      const rec = analysis.analysis.recommendations;
      
      // Save each recommendation as new option
      if (rec.scene) {
        await aiOptionsAPI.createOption('scene', rec.scene, rec.scene, `AI recommended scene`, {});
      }
      if (rec.lighting) {
        await aiOptionsAPI.createOption('lighting', rec.lighting, rec.lighting, `AI recommended lighting`, {});
      }
      if (rec.mood) {
        await aiOptionsAPI.createOption('mood', rec.mood, rec.mood, `AI recommended mood`, {});
      }
      if (rec.colorPalette) {
        await aiOptionsAPI.createOption('colorPalette', rec.colorPalette, rec.colorPalette, `AI recommended color palette`, {});
      }
      
      // Reload options
      const options = await aiOptionsAPI.getAllOptions();
      setPromptOptions(options);
      
      alert('Recommendations saved to database!');
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

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
    if (!generatedPrompt?.positive) return;
    setIsGenerating(true);
    setCurrentStep(5);

    try {
      let response;
      
      if (activeMode === 'browser' && storedImages.character && storedImages.product) {
        response = await browserAutomationAPI.generateBrowserOnly(
          generatedPrompt.positive,
          {
            provider: browserProvider,
            negativePrompt: generatedPrompt.negative,
            scene: selectedOptions.scene || 'studio',
            lighting: selectedOptions.lighting || 'soft-diffused',
            mood: selectedOptions.mood || 'confident',
            style: selectedOptions.style || 'minimalist',
            colorPalette: selectedOptions.colorPalette || 'neutral',
            cameraAngle: selectedOptions.cameraAngle || 'eye-level',
            aspectRatio: selectedOptions.aspectRatio || '1:1',
            characterImageBase64: storedImages.character,
            productImageBase64: storedImages.product
          }
        );
      } else {
        response = await unifiedFlowAPI.generateImages({
          prompt: generatedPrompt.positive,
          negativePrompt: generatedPrompt.negative,
          options: {
            imageCount: selectedOptions.imageCount || 2,
            aspectRatio: selectedOptions.aspectRatio || '1:1'
          }
        });
      }

      if (response.success && response.data?.generatedImages) {
        setGeneratedImages(response.data.generatedImages);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
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
  };

  // ============================================================
  // RENDER
  // ============================================================

  const isReadyForAnalysis = characterImage && productImage;
  const isReadyForPrompt = analysis && Object.keys(selectedOptions).length > 0;
  const isReadyForGeneration = generatedPrompt?.positive;

  // Show Use Case / Focus info
  const showUseCaseFocusInfo = currentStep >= 2;

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* ==================== HEADER ==================== */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0 h-12">
        <div className="flex items-center justify-between">
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
      <div className="flex-1 flex min-h-0">
        {/* ==================== LEFT TOOLBAR 1: Mode + Provider ==================== */}
        <div className="w-12 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-3 gap-2 flex-shrink-0">
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

        {/* ==================== LEFT SIDEBAR 2: Options ==================== */}
        <div className="w-56 bg-gray-800 border-r border-gray-700 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-3 space-y-4 overflow-y-auto flex-1">
            {/* Step 1: Use Case + Focus (before analysis) */}
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

            {/* Step 3: Style Options (after apply recommendation) */}
            {currentStep >= 3 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1">
                  <Sliders className="w-3 h-3" /> Style
                </h3>
                <StyleCustomizer
                  options={promptOptions}
                  selectedOptions={selectedOptions}
                  onOptionChange={handleOptionChange}
                  customOptions={customOptions}
                  onCustomOptionChange={handleCustomOptionChange}
                  analysis={analysis?.analysis}
                />
              </div>
            )}
          </div>
        </div>

        {/* ==================== CENTER + RIGHT: Combined ==================== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Inner flex: Center (scrollable) + Right (scrollable) */}
          <div className="flex-1 flex min-h-0">
            {/* ==================== CENTER: Preview ==================== */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-900">
              {/* Use Case / Focus Info Bar */}
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

              {/* Content Area - SCROLLABLE */}
              <div className="flex-1 p-4 overflow-auto">
                <div className="max-w-3xl mx-auto">
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

                  {/* Step 2: Analysis Result */}
                  {currentStep === 2 && analysisRaw && (
                    <div className="space-y-4">
                      <div className="bg-gray-800 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-purple-400 mb-2">🤖 AI Analysis Result</h3>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-auto max-h-96 bg-gray-900 rounded-lg p-3">
                          {typeof analysisRaw === 'string' ? analysisRaw : JSON.stringify(analysisRaw, null, 2)}
                        </pre>
                      </div>

                      {analysis?.analysis?.recommendations && (
                        <div className="bg-gray-800 rounded-xl p-4">
                          <h3 className="text-sm font-semibold text-green-400 mb-2">📋 Extracted Keywords</h3>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(analysis.analysis.recommendations).map(([key, value]) => (
                              <span key={key} className="px-2 py-1 bg-gray-700 rounded text-xs">
                                {key}: <span className="text-purple-400">{value}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3+: Generated Images */}
                  {generatedImages.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Generated ({generatedImages.length})</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {generatedImages.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img.url} alt={`Gen ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center">
                              <button onClick={() => window.open(img.url, '_blank')} className="p-1 bg-white/20 rounded">
                                <Image className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading */}
                  {(isAnalyzing || isGenerating) && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                      <span className="ml-2 text-gray-400">{isAnalyzing ? 'Analyzing...' : 'Generating...'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ==================== STICKY BOTTOM ACTION BAR ==================== */}
              <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {isReadyForAnalysis ? '✅ Ready to start' : '⬆️ Upload images'}
                  </div>

                  <div className="flex items-center gap-2">
                    {currentStep === 1 && (
                      <button
                        onClick={handleStartAnalysis}
                        disabled={!isReadyForAnalysis || isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
                      >
                        {isAnalyzing ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm font-medium">Analyzing...</span></>
                        ) : (
                          <><Sparkles className="w-4 h-4" /><span className="text-sm font-medium">Start AI</span></>
                        )}
                      </button>
                    )}

                    {currentStep === 2 && (
                      <button onClick={handleApplyRecommendation} className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">
                        <Wand2 className="w-4 h-4" /><span className="text-sm font-medium">Apply Recommendations</span>
                      </button>
                    )}

                    {currentStep === 3 && !generatedPrompt && !isLoading && (
                      <button onClick={handleBuildPrompt} disabled={!isReadyForPrompt} className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                        <FileText className="w-4 h-4" /><span className="text-sm font-medium">Build Prompt</span>
                      </button>
                    )}

                    {currentStep >= 4 && generatedPrompt && generatedImages.length === 0 && (
                      <div className="flex items-center gap-2">
                        <button onClick={handleEnhancePrompt} disabled={isLoading} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50">
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        </button>
                        <button onClick={handleStartGeneration} disabled={!isReadyForGeneration || isGenerating} className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                          {isGenerating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm font-medium">Generating...</span></>
                          ) : (
                            <><Rocket className="w-4 h-4" /><span className="text-sm font-medium">Generate</span></>
                          )}
                        </button>
                      </div>
                    )}

                    {generatedImages.length > 0 && (
                      <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
                        <RefreshCw className="w-4 h-4" /><span className="text-sm font-medium">New</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== RIGHT SIDEBAR: Style Options ==================== */}
            <div className="w-64 bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0">
              <div className="p-3 space-y-4">
                {currentStep === 2 && analysis && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">💾 Save Recommendations</h3>
                    <button onClick={handleSaveRecommendations} disabled={isSaving} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600/20 text-green-400 border border-green-600/50 rounded-lg hover:bg-green-600/30 disabled:opacity-50">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="text-xs">Save to Database</span>
                    </button>
                  </div>
                )}

                {currentStep >= 3 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Style Options</h3>
                    <StyleCustomizer options={promptOptions} selectedOptions={selectedOptions} onOptionChange={handleOptionChange} customOptions={customOptions} onCustomOptionChange={handleCustomOptionChange} recommendations={analysis?.analysis?.recommendations} analysis={analysis?.analysis} />
                  </div>
                )}

                {generatedPrompt && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Prompt</h3>
                    <div className="bg-gray-900 rounded-lg p-2 text-xs text-gray-300 max-h-32 overflow-auto">{generatedPrompt.positive}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
