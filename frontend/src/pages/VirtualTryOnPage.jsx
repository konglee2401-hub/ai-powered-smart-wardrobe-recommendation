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

import { unifiedFlowAPI, browserAutomationAPI } from '../services/api';

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

  // Load provider status on mount
  useEffect(() => {
    loadProviderStatus();
  }, []);

  const loadProviderStatus = async () => {
    try {
      const status = await unifiedFlowAPI.getProviderStatus();
      setProviderStatus(status);
    } catch (error) {
      console.warn('Could not load provider status:', error);
    }
  };

  // Step validation
  const canProceedToStep = (step) => {
    switch (step) {
      case 2:
        // Upload mode: need both images
        if (activeMode === 'upload') {
          return characterImage && productImage && useCase && productFocus;
        }
        // Browser mode: need prompt
        if (activeMode === 'browser') {
          return browserPrompt.trim().length > 0;
        }
        // Prompt mode: need prompt
        if (activeMode === 'prompt') {
          return browserPrompt.trim().length > 0;
        }
        return false;
      case 3:
        return analysis && !isAnalyzing;
      case 4:
        return Object.keys(selectedOptions).length > 0;
      case 5:
        return generatedPrompt && promptBuilt;
      case 6:
        return generatedImages.length > 0 || generatedVideo;
      default:
        return true;
    }
  };

  // Step 1 -> Step 2: Start Analysis
  const handleStartAnalysis = async () => {
    if (!characterImage?.file || !productImage?.file) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await unifiedFlowAPI.analyzeUnified(
        characterImage.file,
        productImage.file,
        { useCase, productFocus }
      );

      setAnalysis(response.data.analysis);
      setCurrentStep(2);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisError(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2 -> Step 3: Apply AI recommendations
  const handleApplyRecommendations = () => {
    const aiOptions = {};
    if (analysis?.recommendations) {
      Object.entries(analysis.recommendations).forEach(([category, rec]) => {
        if (rec.primary) {
          aiOptions[category] = rec.primary;
        }
      });
    }
    setSelectedOptions(aiOptions);
    setCurrentStep(3);
  };

  // Step 3 -> Step 4: Build prompt
  const handleBuildPrompt = () => {
    setPromptBuilt(true);
    setCurrentStep(4);
  };

  // Handle prompt change
  const handlePromptChange = (prompt) => {
    setGeneratedPrompt(prompt);
  };

  // Handle regenerate prompt
  const handleRegeneratePrompt = async () => {
    if (!analysis) return;

    try {
      const response = await unifiedFlowAPI.analyzeUnified(
        characterImage.file,
        productImage.file,
        { useCase, productFocus, selectedOptions }
      );

      if (response.data?.analysis?.promptKeywords) {
        setGeneratedPrompt({
          positive: response.data.analysis.promptKeywords.join(', '),
          negative: 'blurry, low quality, distorted',
        });
      }
    } catch (error) {
      console.error('Failed to regenerate prompt:', error);
    }
  };

  // Step 4 -> Step 5: Start generation (Image or Video)
  const handleStartGeneration = async () => {
    if (!generatedPrompt && activeTab === 'image') return;

    setIsGenerating(true);
    setGenerationError(null);

    try {
      if (activeMode === 'browser' || activeMode === 'prompt') {
        // Browser/Prompt-only mode: Use browser automation
        if (activeTab === 'image') {
          const response = await browserAutomationAPI.generateImage(
            browserPrompt,
            browserProvider
          );
          
          if (response.success) {
            setGeneratedImages([{ url: response.imageUrl, provider: browserProvider }]);
            setCurrentStep(5);
          } else {
            throw new Error(response.error || 'Generation failed');
          }
        } else {
          // Video generation via browser
          const response = await browserAutomationAPI.generateVideo(
            browserPrompt,
            browserProvider
          );
          
          if (response.success) {
            setGeneratedVideo({ url: response.videoUrl });
            setCurrentStep(5);
          } else {
            throw new Error(response.error || 'Generation failed');
          }
        }
        return;
      }

      // Standard upload mode: Use existing generation logic
      if (activeTab === 'image') {
        // Image generation
        const response = await unifiedFlowAPI.generateImages({
          prompt: generatedPrompt.positive,
          negativePrompt: generatedPrompt.negative,
          options: {
            imageCount: selectedOptions.imageCount || 2,
            aspectRatio: selectedOptions.aspectRatio || '1:1',
          },
        });

        setGeneratedImages(response.data.images || []);
        setCurrentStep(5);
      } else {
        // Video generation
        const videoPrompt = generatedPrompt?.positive || 
          (analysis?.promptKeywords?.join(', ')) || 
          'A person wearing fashionable clothes, smooth motion';
        
        const response = await unifiedFlowAPI.generateVideo({
          prompt: videoPrompt,
          provider: videoOptions.model,
          options: {
            durationSeconds: videoOptions.duration,
            motionStyle: videoOptions.motionStyle
          },
          referenceImages: characterImage ? [{ url: characterImage.preview }] : []
        });

        setGeneratedVideo(response.data || response);
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationError(error.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Step navigation
  const handleNextStep = () => {
    if (currentStep === 1) {
      handleStartAnalysis();
    } else if (currentStep === 2) {
      handleApplyRecommendations();
    } else if (currentStep === 3) {
      handleBuildPrompt();
    } else if (currentStep === 4) {
      // At step 4 (prompt), build prompt first then move to generation
      handleBuildPrompt();
    } else if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
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
          <div className="space-y-8">
            {/* Use Case Selector */}
            <UseCaseSelector
              selectedUseCase={useCase}
              onUseCaseChange={setUseCase}
            />

            {/* Product Focus Selector */}
            <ProductFocusSelector
              selectedFocus={productFocus}
              onFocusChange={setProductFocus}
            />

            {/* Image Upload */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📤 Upload Images</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👤 Character Image (Người Mẫu)
                  </label>
                  <ImageUpload
                    image={characterImage?.preview}
                    onUpload={(file) => setCharacterImage({
                      file,
                      preview: URL.createObjectURL(file),
                    })}
                    onRemove={() => setCharacterImage(null)}
                    label="Upload character image"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    👗 Product Image (Sản Phẩm)
                  </label>
                  <ImageUpload
                    image={productImage?.preview}
                    onUpload={(file) => setProductImage({
                      file,
                      preview: URL.createObjectURL(file),
                    })}
                    onRemove={() => setProductImage(null)}
                    label="Upload product image"
                  />
                </div>
              </div>

              {/* Ready notice */}
              {characterImage && productImage && useCase && productFocus && (
                <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Sẵn sàng tiến hành phân tích!</p>
                      <p className="text-sm text-green-600">
                        Click "Tiếp Tục" để bắt đầu AI Analysis
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Analysis Display */}
            <AnalysisDisplay
              characterAnalysis={analysis?.character}
              productAnalysis={analysis?.product}
              compatibility={analysis?.compatibility}
              recommendations={analysis?.recommendations}
              pose={analysis?.pose}
              stylingNotes={analysis?.stylingNotes}
              isAnalyzing={isAnalyzing}
            />

            {/* Error message */}
            {analysisError && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <p className="text-red-800">{analysisError}</p>
                </div>
              </div>
            )}

            {/* Apply recommendations button */}
            {analysis && !isAnalyzing && (
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-purple-800">AI Analysis Complete!</p>
                    <p className="text-sm text-purple-600">
                      AI đã phân tích và đưa ra recommendations. Click "Tiếp Tục" để áp dụng.
                    </p>
                  </div>
                  <button
                    onClick={handleApplyRecommendations}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Sparkles className="w-5 h-5" />
                    Apply AI Recommendations
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <StyleCustomizer
            aiRecommendations={analysis?.recommendations}
            selectedOptions={selectedOptions}
            onOptionsChange={setSelectedOptions}
            customOptions={customOptions}
          />
        );

      case 4:
        return (
          <div className="space-y-6">
            <PromptBuilder
              analysis={analysis}
              selectedOptions={selectedOptions}
              onPromptChange={handlePromptChange}
              generatedPrompt={generatedPrompt}
              onRegeneratePrompt={handleRegeneratePrompt}
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
                  onClick={handleBuildPrompt}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Rocket className="w-5 h-5" />
                  Continue to Generation
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
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg transition-colors
                  ${currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>

              <button
                onClick={handleNextStep}
                disabled={!canProceedToStep(currentStep + 1) || isAnalyzing || isGenerating}
                className={`
                  flex items-center gap-2 px-8 py-3 rounded-lg transition-colors
                  ${!canProceedToStep(currentStep + 1) || isAnalyzing || isGenerating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                  }
                `}
              >
                {isAnalyzing || isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : currentStep === 4 ? (
                  <>
                    <Rocket className="w-5 h-5" />
                    Build Prompt & Continue
                  </>
                ) : currentStep === 5 ? (
                  <>
                    <Rocket className="w-5 h-5" />
                    Generate
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding for fixed navigation */}
      <div className="h-24" />
    </div>
  );
}
