/**
 * Virtual Try-On Page - Phase 1 Unified Flow
 * 6-step flow: Upload → Analysis → Customize → Prompt → Generate → Results
 * Supports both Image and Video generation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload, Sparkles, Sliders, FileText, Rocket, Image,
  ChevronLeft, ChevronRight, Check, AlertCircle, Loader2,
  Download, Save, RefreshCw, X, CheckCircle, Video
} from 'lucide-react';

import { unifiedFlowAPI, browserAutomationAPI, promptsAPI, aiOptionsAPI } from '../services/api';

// Import components
import UseCaseSelector from '../components/UseCaseSelector';
import ProductFocusSelector from '../components/ProductFocusSelector';
import ImageUpload from '../components/ImageUpload';
import AnalysisDisplay from '../components/AnalysisDisplay';
import StyleCustomizer from '../components/StyleCustomizer';
import PromptBuilder from '../components/PromptBuilder';

// Step configuration
const STEPS = [
  { id: 1, name: 'Upload & Setup', icon: Upload },
  { id: 2, name: 'AI Analysis', icon: Sparkles },
  { id: 3, name: 'Style Customization', icon: Sliders },
  { id: 4, name: 'Prompt Building', icon: FileText },
  { id: 5, name: 'Generation', icon: Rocket },
  { id: 6, name: 'Results', icon: Image },
];

// Tab configuration for Image vs Video
const TABS = [
  { id: 'image', label: '🖼️ Image Generation', icon: Image },
  { id: 'video', label: '🎬 Video Generation', icon: Video }
];

// Mode configuration for input methods
const MODES = [
  { id: 'upload', label: '📤 Upload', icon: Upload },
  { id: 'browser', label: '🌐 Browser AI', icon: Sparkles },
  { id: 'prompt', label: '✏️ Prompt Only', icon: FileText }
];

export default function VirtualTryOnPage() {
  // Tab management - Image vs Video
  const [activeTab, setActiveTab] = useState('image');
  // Mode management - Upload vs Browser vs Prompt
  const [activeMode, setActiveMode] = useState('upload');
  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // Data states
  const [characterImage, setCharacterImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [useCase, setUseCase] = useState('change-clothes');
  const [productFocus, setProductFocus] = useState('full-outfit');

  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const [selectedOptions, setSelectedOptions] = useState({});
  const [customOptions, setCustomOptions] = useState({});

  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [promptBuilt, setPromptBuilt] = useState(false);

  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Add this line for general loading state

  const [providerStatus, setProviderStatus] = useState(null);

  // Video-specific states
  const [videoOptions, setVideoOptions] = useState({
    model: 'auto',
    duration: 5,
    resolution: '720p',
    motionStyle: 'smooth'
  });
  const [generatedVideo, setGeneratedVideo] = useState(null);

  // Browser automation states
  const [browserProvider, setBrowserProvider] = useState('grok');
  const [browserPrompt, setBrowserPrompt] = useState('');

  // Browser AI provider options
  const BROWSER_PROVIDERS = [
    { id: 'grok', label: '🤖 Grok (grok.com)', description: 'AI mạnh, không cần API key' },
    { id: 'zai', label: '💎 Z.AI (chat.z.ai)', description: 'Image generation nhanh' },
  ];

  const [promptOptions, setPromptOptions] = useState(null);

  // Load provider status and prompt options on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log("Loading initial data...");
        const [status, options] = await Promise.all([
          unifiedFlowAPI.getProviderStatus(),
          aiOptionsAPI.getAllOptions() // Fetch all prompt options
        ]);
        setProviderStatus(status);
        setPromptOptions(options);
        console.log("Initial data loaded.", { status, options });
      } catch (error) {
        console.warn('Could not load initial data:', error);
      }
    };
    loadInitialData();
  }, []);

  // Step validation
  const canProceedToStep = (step) => {
    switch (step) {
      case 2:
        return characterImage && productImage && useCase && productFocus;
      case 3:
        return analysis && !isAnalyzing;
      case 4:
        return analysis && Object.keys(selectedOptions).length > 0;
      case 5:
        // CRITICAL FIX: The "Generate" button should be enabled once a prompt exists.
        return generatedPrompt?.positive && !isGenerating && !isLoading;
      case 6:
        return generatedImages.length > 0 || generatedVideo;
      default:
        return true;
    }
  };
  const handleOptionChange = (category, value) => {
    setSelectedOptions(prev => ({ ...prev, [category]: value }));
  };

  const handleCustomOptionChange = (category, value) => {
    setCustomOptions(prev => ({ ...prev, [category]: value }));
  };

  // Handle prompt changes from the PromptBuilder component
  const handlePromptChange = (prompt) => {
    setGeneratedPrompt(prompt);
  };

  // Regenerate prompt based on analysis data
  const handleRegeneratePrompt = async (currentAnalysis) => {
    // Handle both nested and direct analysis structures
    const analysisData = currentAnalysis?.analysis || currentAnalysis;

    if (!analysisData) {
      console.warn("Cannot regenerate prompt: analysis data is missing.");
      return;
    }

    try {
      if (analysisData?.promptKeywords) {
        const keywords = Object.values(analysisData.promptKeywords).flat().join(', ');
        setGeneratedPrompt({
          positive: keywords,
          negative: 'blurry, low quality, distorted',
        });
      } else if (analysisData?.summary) {
        setGeneratedPrompt({
          positive: analysisData.summary,
          negative: 'blurry, low quality, distorted',
        });
      } else {
        console.warn("Analysis result does not contain promptKeywords or summary for prompt generation.");
      }
    } catch (error) {
      console.error('Failed to regenerate prompt:', error);
    }
  };

  // ============================================================
  // STEP HANDLERS - Flow control
  // ============================================================

  /**
   * STEP 1 -> STEP 2/5: Unified Analysis or Browser AI Mode
   * For 'browser' mode: skips to generation directly using browser automation
   * For 'upload' mode: uses API-based analysis
   */
  const handleStartAnalysis = async () => {
    if (!characterImage?.file || !productImage?.file) return;

    // Browser AI mode - use browser automation for full flow
    if (activeMode === 'browser') {
      setIsAnalyzing(true);
      setAnalysisError(null);
      console.log('🌐 BROWSER MODE: Starting browser automation flow...');

      try {
        // Call browser automation API (analyze + generate in one go)
        const response = await browserAutomationAPI.generateImage(
          characterImage.file,
          productImage.file,
          { provider: browserProvider }
        );

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Browser automation failed');
        }

        // Store analysis if available
        if (response.data.analysis) {
          setAnalysis(response.data.analysis);
        }

        // Store generated images
        const images = response.data.generatedImages || [];
        if (images.length > 0) {
          setGeneratedImages(images);
          console.log(`✅ Browser automation complete: ${images.length} images generated`);
          
          // Move directly to results (step 6)
          setCurrentStep(6);
        } else {
          throw new Error('No images generated from browser automation');
        }

      } catch (error) {
        console.error('❌ Browser automation failed:', error);
        setAnalysisError(error.message || 'Browser AI failed. Please try again.');
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // Normal upload mode - use API-based analysis
    setIsAnalyzing(true);
    setAnalysisError(null);
    console.log('📸 STEP 1: Starting unified analysis...');

    try {
      const response = await unifiedFlowAPI.analyzeUnified(
        characterImage.file,
        productImage.file,
        { useCase, productFocus }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Analysis failed');
      }

      // Store the full response data (includes analysis and metadata)
      setAnalysis(response.data);
      console.log('✅ Analysis complete, moving to customization');
      
      // Move to step 2 (Apply AI Recommendations)
      setCurrentStep(2);
      setAnalysisError(null);
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setAnalysisError(error.message || 'Analysis failed. Please try again.');
      setCurrentStep(1); // Stay on step 1
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * STEP 2 -> STEP 3: Apply AI Recommendations and Move to Customization
   * User reviews and accepts AI recommendations, then proceeds to customization
   */
  const handleApplyRecommendations = async () => {
    if (!analysis?.analysis) return;
    
    console.log('🎯 STEP 2->3: Applying recommendations and moving to customization');

    try {
      // Extract AI recommendations from analysis
      const analysisData = analysis.analysis;
      const aiOptions = {};
      
      if (analysisData?.recommendations) {
        Object.entries(analysisData.recommendations).forEach(([category, rec]) => {
          if (rec.primary) {
            aiOptions[category] = rec.primary;
          }
        });
      }

      // Set selected options from recommendations
      setSelectedOptions(aiOptions);
      console.log('✅ Recommendations applied:', aiOptions);
      
      // Move to step 3 (Style Customization)
      setCurrentStep(3);
    } catch (error) {
      console.error('❌ Failed to apply recommendations:', error);
      setAnalysisError(error.message);
    }
  };

  /**
   * STEP 3 -> STEP 4: Build Prompt from Analysis and Options
   * Takes the analysis + selected options and builds a detailed, use-case-aware prompt
   */
  const handleBuildPrompt = async () => {
    if (!analysis?.analysis) {
      setAnalysisError('No analysis data available');
      return;
    }

    setIsLoading(true);
    console.log(`🎨 STEP 3->4: Building smart prompt (useCase: ${useCase}, focus: ${productFocus})...`);

    try {
      const response = await unifiedFlowAPI.buildPrompt(
        analysis.analysis,  // Pass just the analysis object, not the wrapper
        selectedOptions,
        useCase,           // Pass use case for smart prompt building
        productFocus       // Pass product focus for context-aware suggestions
      );

      if (!response.success || !response.data?.prompt) {
        throw new Error(response.error || 'Failed to build prompt');
      }

      // Set the generated prompt
      setGeneratedPrompt(response.data.prompt);
      console.log('✅ Smart prompt built successfully');

      // Move to step 4 (Prompt Building/Review)
      setCurrentStep(4);
    } catch (error) {
      console.error('❌ Prompt building failed:', error);
      setAnalysisError(error.message || 'Failed to build prompt');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * STEP 4: Enhance/Refine the Prompt (Optional)
   * User can enhance the built prompt before generation
   */
  const handleEnhancePrompt = async () => {
    if (!generatedPrompt?.positive) {
      console.error('❌ No prompt to enhance');
      return;
    }

    setIsLoading(true);
    console.log('✨ STEP 4: Enhancing prompt...');

    try {
      const response = await promptsAPI.enhancePrompt(
        generatedPrompt.positive,
        analysis,
        selectedOptions
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to enhance prompt');
      }

      // Update with enhanced prompt
      setGeneratedPrompt({
        positive: response.enhancedPrompt,
        negative: generatedPrompt.negative
      });

      console.log('✅ Prompt enhanced successfully');
      setPromptBuilt(true);
    } catch (error) {
      console.error('❌ Enhancement failed:', error);
      setAnalysisError('Could not enhance prompt. Using current prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * STEP 4 -> STEP 5: Generate Images from Prompt
   * Calls the generation API with the built prompt
   */
  const handleStartGeneration = async () => {
    if (!generatedPrompt?.positive) {
      console.error('❌ No prompt for generation');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    console.log('🎨 STEP 4->5: Starting image generation...');

    try {
      const response = await unifiedFlowAPI.generateImages({
        prompt: generatedPrompt.positive,
        negativePrompt: generatedPrompt.negative,
        options: {
          imageCount: selectedOptions.imageCount || 2,
          aspectRatio: selectedOptions.aspectRatio || '1:1'
        }
      });

      if (!response.success || !response.data?.generatedImages) {
        throw new Error(response.error || 'Image generation failed');
      }

      // Set generated images
      const images = response.data.generatedImages || [];
      setGeneratedImages(images);
      console.log(`✅ Generated ${images.length} images`);

      // Move to step 5 (Results)
      setCurrentStep(5);
    } catch (error) {
      console.error('❌ Generation failed:', error);
      setGenerationError(error.message || 'Image generation failed. Please try again.');
      setCurrentStep(4); // Stay on step 4
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================================
  // STEP NAVIGATION
  // ============================================================

  /**
   * handleNextStep - Orchestrates progression through the 6-step workflow
   * Each step has specific prerequisites and triggers specific actions
   */
  const handleNextStep = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Upload → Step 2: Analysis
        // Prerequisites: Both images and settings selected
        if (!characterImage?.file || !productImage?.file) {
          setAnalysisError('Please upload both images');
          return;
        }
        handleStartAnalysis();
        break;

      case 2:
        // Step 2: Analysis → Step 3: Customization
        // Automatically apply AI recommendations and move to customization
        handleApplyRecommendations();
        break;

      case 3:
        // Step 3: Customization → Step 4: Prompt Building
        // User has selected options; now build the detailed prompt
        if (Object.keys(selectedOptions).length === 0) {
          setAnalysisError('Please select at least one customization option');
          return;
        }
        handleBuildPrompt();
        break;

      case 4:
        // Step 4: Prompt → Step 5: Generation
        // Prompt is ready; start image generation
        if (!generatedPrompt?.positive) {
          setAnalysisError('No prompt available for generation');
          return;
        }
        handleStartGeneration();
        break;

      case 5:
        // Step 5: Results → Step 6: Download/Share
        setCurrentStep(6);
        break;

      case 6:
        // Already at results
        break;

      default:
        if (currentStep < 6) {
          setCurrentStep(currentStep + 1);
        }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Reset flow
  const handleReset = () => {
    setCurrentStep(1);
    setCharacterImage(null);
    setProductImage(null);
    setUseCase('change-clothes');
    setProductFocus('full-outfit');
    setAnalysis(null);
    setIsAnalyzing(false);
    setAnalysisError(null);
    setSelectedOptions({});
    setCustomOptions({});
    setGeneratedPrompt(null);
    setPromptBuilt(false);
    setGeneratedImages([]);
    setIsGenerating(false);
    setGenerationError(null);
    setBrowserPrompt('');
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Compact: Use Case + Product Focus + Browser Provider (2 columns) */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Use Case Selector - Compact */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  🎯 Use Case
                </label>
                <UseCaseSelector
                  selectedUseCase={useCase}
                  onUseCaseChange={setUseCase}
                />
              </div>

              {/* Product Focus Selector - Compact */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  👗 Product Focus
                </label>
                <ProductFocusSelector
                  selectedFocus={productFocus}
                  onFocusChange={setProductFocus}
                />
              </div>
            </div>

            {/* Browser AI Provider Selector - Only show in browser mode */}
            {activeMode === 'browser' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  🌐 Browser AI Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {BROWSER_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setBrowserProvider(provider.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        browserProvider === provider.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{provider.label}</div>
                      <div className="text-xs text-gray-500">{provider.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image Upload */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📤 Upload Images</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👤 Character (Người Mẫu)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                    {characterImage?.preview ? (
                      <div className="relative aspect-square bg-gray-50">
                        <img
                          src={characterImage.preview}
                          alt="Character"
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={() => setCharacterImage(null)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-square cursor-pointer hover:bg-gray-50">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCharacterImage({
                                file,
                                preview: URL.createObjectURL(file),
                              });
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👗 Product (Sản Phẩm)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                    {productImage?.preview ? (
                      <div className="relative aspect-square bg-gray-50">
                        <img
                          src={productImage.preview}
                          alt="Product"
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={() => setProductImage(null)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-square cursor-pointer hover:bg-gray-50">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Click to upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setProductImage({
                                file,
                                preview: URL.createObjectURL(file),
                              });
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Ready notice */}
              {characterImage && productImage && useCase && productFocus && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 text-sm">Sẵn sàng! Click "Start AI Analysis"</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <AnalysisDisplay
            analysis={analysis?.analysis}
            isAnalyzing={isAnalyzing}
          />
        );

      case 3:
        return (
          <StyleCustomizer
            options={promptOptions}
            selectedOptions={selectedOptions}
            onOptionChange={handleOptionChange}
            customOptions={customOptions}
            onCustomOptionChange={handleCustomOptionChange}
            recommendations={analysis?.analysis?.recommendations}
            newOptions={analysis?.analysis?.newOptions}
            analysis={analysis?.analysis}
          />
        );

      case 4:
        return (
          <div className="space-y-6">
            <PromptBuilder
              analysis={analysis?.analysis}
              selectedOptions={selectedOptions}
              generatedPrompt={generatedPrompt}
              onPromptChange={handlePromptChange}
              onRegeneratePrompt={() => handleRegeneratePrompt(analysis?.analysis)}
            />

            {/* Build prompt button */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800">Prompt Ready!</p>
                  <p className="text-sm text-blue-600">
                    Prompt đã được tạo. Click "Tiếp Tục" để bắt đầu generation.
                  </p>
                </div>
                <button
                  onClick={handleEnhancePrompt}
                  disabled={!generatedPrompt?.positive || isLoading}
                  className="flex items-center justify-center w-full px-8 py-3 text-base font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Building Prompt...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      Build Prompt
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            {/* Generation Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              {isGenerating ? (
                <div className="text-center py-8">
                  <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    🔄 Generating Images...
                  </h3>
                  <p className="text-gray-500">
                    Smart fallback system đang thử các providers. Vui lòng chờ...
                  </p>
                </div>
              ) : generatedImages.length > 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    ✅ Generation Complete!
                  </h3>
                  <p className="text-gray-500">
                    Đã tạo {generatedImages.length} images thành công.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Generation Failed
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {generationError || 'Có lỗi xảy ra. Vui lòng thử lại.'}
                  </p>
                  <button
                    onClick={handleStartGeneration}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Results Preview */}
            {generatedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {generatedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={`Generated ${index + 1}`}
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                      <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                        <Download className="w-5 h-5 text-white" />
                      </button>
                      <button className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                        <Save className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Image className="w-6 h-6" />
                Generated Images
              </h2>
              <p className="text-green-100 mt-1">
                {generatedImages.length} images đã được tạo thành công
              </p>
            </div>

            {/* Results Grid */}
            {generatedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {generatedImages.map((image, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
                    <div className="relative">
                      <img
                        src={image.url}
                        alt={`Generated ${index + 1}`}
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => window.open(image.url, '_blank')}
                          className="p-3 bg-white/90 rounded-full hover:bg-white transition-colors"
                          title="Download"
                        >
                          <Download className="w-5 h-5 text-gray-800" />
                        </button>
                        <button
                          onClick={() => navigator.clipboard.writeText(image.url)}
                          className="p-3 bg-white/90 rounded-full hover:bg-white transition-colors"
                          title="Copy URL"
                        >
                          <Save className="w-5 h-5 text-gray-800" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Image {index + 1}</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                          {image.provider || 'Generated'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 pt-6">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Start New Session
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Virtual Try-On Studio
              </h1>
              <p className="text-sm text-gray-500">
                Unified AI Analysis & Generation
              </p>
            </div>

            {/* Mode & Tab Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Mode Selector - Compact */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                {MODES.map(mode => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => { setActiveMode(mode.id); handleReset(); }}
                      className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                        activeMode === mode.id 
                          ? 'bg-white text-purple-700 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title={mode.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-2">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); handleReset(); }}
                      className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                      ${activeTab === tab.id 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Mode Indicator */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm font-medium">
          {activeTab === 'image' 
            ? '🖼️ Image Generation Mode - Create stunning product images' 
            : '🎬 Video Generation Mode - Create dynamic video content'
          }
        </div>
      </div>

      {/* Step Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => isCompleted && setCurrentStep(step.id)}
                    disabled={!isCompleted && !isActive}
                    className={`
                      flex flex-col items-center gap-1 transition-colors
                      ${isActive ? 'text-purple-600' : isCompleted ? 'text-green-600 hover:text-green-700' : 'text-gray-400'}
                      ${isCompleted ? 'cursor-pointer' : 'cursor-not-allowed'}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isActive ? 'bg-purple-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'}
                    `}>
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : isActive ? (
                        <Icon className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-medium">{step.id}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium hidden sm:block">{step.name}</span>
                  </button>

                  {index < STEPS.length - 1 && (
                    <div className={`
                      flex-1 h-1 mx-2 rounded
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                    `} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      {currentStep < 6 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-end gap-4">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevStep}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
              )}

              {/* Step 1: Start Analysis */}
              {currentStep === 1 && (
                <button onClick={handleNextStep} disabled={!canProceedToStep(2) || isAnalyzing} className="flex items-center justify-center w-full sm:w-auto px-8 py-3 text-base font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                  {isAnalyzing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                  Start AI Analysis
                </button>
              )}

              {/* Step 2: Apply Recommendations */}
              {currentStep === 2 && (
                <button onClick={handleNextStep} disabled={!canProceedToStep(3)} className="flex items-center justify-center w-full sm:w-auto px-8 py-3 text-base font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                  <Sliders className="w-5 h-5 mr-2" />
                  Apply Recommendations
                </button>
              )}

              {/* Step 3: Continue to Final Prompt */}
              {currentStep === 3 && (
                <button onClick={handleNextStep} disabled={!canProceedToStep(4)} className="flex items-center justify-center w-full sm:w-auto px-8 py-3 text-base font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                  Continue to Final Prompt
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              )}

              {/* Step 4: Enhance and Generate */}
              {currentStep === 4 && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleEnhancePrompt}
                    disabled={isLoading || isGenerating}
                    className="flex items-center justify-center px-6 py-2 text-sm font-medium text-purple-700 bg-purple-100 border border-transparent rounded-lg hover:bg-purple-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                    Enhance with AI
                  </button>
                  <button
                    onClick={handleStartGeneration}
                    disabled={!canProceedToStep(5) || isGenerating || isLoading}
                    className="flex items-center justify-center w-full sm:w-auto px-8 py-3 text-base font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Rocket className="w-5 h-5 mr-2" />}
                    Generate {activeTab === 'image' ? 'Images' : 'Video'}
                  </button>
                </div>
              )}
              
              {/* Step 5: View Results -> Step 6 */}
              {currentStep === 5 && (
                <button onClick={handleNextStep} disabled={!canProceedToStep(6)} className="flex items-center justify-center w-full sm:w-auto px-8 py-3 text-base font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                    <Image className="w-5 h-5 mr-2" />
                    View Results
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding for fixed navigation */}
      <div className="h-24" />
    </div>
  );
}
