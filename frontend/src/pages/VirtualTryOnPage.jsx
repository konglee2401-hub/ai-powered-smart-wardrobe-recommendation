/**
 * Virtual Try-On Page - Redesigned Layout
 * Sidebar Left: Steps Navigation + Quick Actions
 * Main Right: Content Area + Previews
 */

import React, { useState, useEffect } from 'react';
import {
  Upload, Sparkles, Sliders, FileText, Rocket, Image,
  ChevronLeft, ChevronRight, Check, AlertCircle, Loader2,
  Download, Save, RefreshCw, X, CheckCircle, Video, Settings
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
  { id: 1, name: 'Upload', icon: Upload, description: 'Upload images' },
  { id: 2, name: 'Analysis', icon: Sparkles, description: 'AI Analysis' },
  { id: 3, name: 'Style', icon: Sliders, description: 'Customize' },
  { id: 4, name: 'Prompt', icon: FileText, description: 'Build Prompt' },
  { id: 5, name: 'Generate', icon: Rocket, description: 'Generate' },
  { id: 6, name: 'Results', icon: Image, description: 'Results' },
];

// Tab configuration
const TABS = [
  { id: 'image', label: '🖼️ Image', icon: Image },
  { id: 'video', label: '🎬 Video', icon: Video }
];

// Mode configuration
const MODES = [
  { id: 'upload', label: '📤 Upload', icon: Upload },
  { id: 'browser', label: '🌐 Browser', icon: Sparkles },
  { id: 'prompt', label: '✏️ Prompt', icon: FileText }
];

export default function VirtualTryOnPage() {
  // State management
  const [activeTab, setActiveTab] = useState('image');
  const [activeMode, setActiveMode] = useState('upload');
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
  const [isLoading, setIsLoading] = useState(false);

  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  const [browserProvider, setBrowserProvider] = useState('grok');
  const [promptOptions, setPromptOptions] = useState(null);

  // Provider options
  const BROWSER_PROVIDERS = [
    { id: 'grok', label: '🤖 Grok', description: 'AI mạnh, không cần API key' },
    { id: 'zai', label: '💎 Z.AI', description: 'Image generation nhanh' },
  ];

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [status, options] = await Promise.all([
          unifiedFlowAPI.getProviderStatus(),
          aiOptionsAPI.getAllOptions()
        ]);
        setPromptOptions(options);
      } catch (error) {
        console.warn('Could not load initial data:', error);
      }
    };
    loadInitialData();
  }, []);

  // Step validation
  const canProceedToStep = (step) => {
    switch (step) {
      case 2: return characterImage && productImage && useCase && productFocus;
      case 3: return analysis && !isAnalyzing;
      case 4: return analysis && Object.keys(selectedOptions).length > 0;
      case 5: return generatedPrompt?.positive && !isGenerating && !isLoading;
      case 6: return generatedImages.length > 0;
      default: return true;
    }
  };

  const handleOptionChange = (category, value) => {
    setSelectedOptions(prev => ({ ...prev, [category]: value }));
  };

  const handleCustomOptionChange = (category, value) => {
    setCustomOptions(prev => ({ ...prev, [category]: value }));
  };

  const handlePromptChange = (prompt) => {
    setGeneratedPrompt(prompt);
  };

  // ============================================================
  // MAIN FLOW HANDLERS
  // ============================================================

  const handleStartAnalysis = async () => {
    if (!characterImage?.file || !productImage?.file) return;

    // Browser mode
    if (activeMode === 'browser') {
      setIsAnalyzing(true);
      setAnalysisError(null);

      try {
        const response = await browserAutomationAPI.generateImage(
          characterImage.file,
          productImage.file,
          { provider: browserProvider }
        );

        if (!response.success || !response.data) {
          throw new Error(response.error || 'Browser automation failed');
        }

        if (response.data.analysis) {
          setAnalysis(response.data.analysis);
        }

        const images = response.data.generatedImages || [];
        if (images.length > 0) {
          setGeneratedImages(images);
          setCurrentStep(6);
        }
      } catch (error) {
        console.error('❌ Browser automation failed:', error);
        setAnalysisError(error.message || 'Browser AI failed. Please try again.');
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // Normal upload mode
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await unifiedFlowAPI.analyzeUnified(
        characterImage.file,
        productImage.file,
        { useCase, productFocus }
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Analysis failed');
      }

      setAnalysis(response.data);
      setCurrentStep(2);
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setAnalysisError(error.message || 'Analysis failed. Please try again.');
      setCurrentStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyRecommendations = async () => {
    if (!analysis?.analysis) return;
    
    const analysisData = analysis.analysis;
    const aiOptions = {};
    
    if (analysisData?.recommendations) {
      Object.entries(analysisData.recommendations).forEach(([category, rec]) => {
        if (rec.primary) {
          aiOptions[category] = rec.primary;
        }
      });
    }

    setSelectedOptions(aiOptions);
    setCurrentStep(3);
  };

  const handleBuildPrompt = async () => {
    if (!analysis?.analysis) {
      setAnalysisError('No analysis data available');
      return;
    }

    setIsLoading(true);

    try {
      const response = await unifiedFlowAPI.buildPrompt(
        analysis.analysis,
        selectedOptions,
        useCase,
        productFocus
      );

      if (!response.success || !response.data?.prompt) {
        throw new Error(response.error || 'Failed to build prompt');
      }

      setGeneratedPrompt(response.data.prompt);
      setCurrentStep(4);
    } catch (error) {
      console.error('❌ Prompt building failed:', error);
      setAnalysisError(error.message || 'Failed to build prompt');
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

      if (!response.success) {
        throw new Error(response.error || 'Failed to enhance prompt');
      }

      setGeneratedPrompt({
        positive: response.enhancedPrompt,
        negative: generatedPrompt.negative
      });
    } catch (error) {
      console.error('❌ Enhancement failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGeneration = async () => {
    if (!generatedPrompt?.positive) return;

    setIsGenerating(true);
    setGenerationError(null);

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

      setGeneratedImages(response.data.generatedImages || []);
      setCurrentStep(5);
    } catch (error) {
      console.error('❌ Generation failed:', error);
      setGenerationError(error.message || 'Image generation failed.');
      setCurrentStep(4);
    } finally {
      setIsGenerating(false);
    }
  };

  // Navigation
  const handleNextStep = () => {
    switch (currentStep) {
      case 1:
        if (!characterImage?.file || !productImage?.file) {
          setAnalysisError('Please upload both images');
          return;
        }
        handleStartAnalysis();
        break;
      case 2: handleApplyRecommendations(); break;
      case 3:
        if (Object.keys(selectedOptions).length === 0) {
          setAnalysisError('Please select at least one option');
          return;
        }
        handleBuildPrompt();
        break;
      case 4:
        if (!generatedPrompt?.positive) {
          setAnalysisError('No prompt available');
          return;
        }
        handleStartGeneration();
        break;
      case 5: setCurrentStep(6); break;
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

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
    setGeneratedImages([]);
    setIsGenerating(false);
    setGenerationError(null);
  };

  // ============================================================
  // RENDER FUNCTIONS
  // ============================================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Upload
        return (
          <div className="space-y-6">
            {/* Settings Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3">🎯 Use Case</label>
                <UseCaseSelector selectedUseCase={useCase} onUseCaseChange={setUseCase} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3">👗 Product Focus</label>
                <ProductFocusSelector selectedFocus={productFocus} onFocusChange={setProductFocus} />
              </div>
            </div>

            {/* Browser Provider */}
            {activeMode === 'browser' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <label className="block text-sm font-semibold text-gray-800 mb-3">🌐 Browser AI</label>
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

            {/* Upload Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📤 Upload Images</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Character */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">👤 Character</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                    {characterImage?.preview ? (
                      <div className="relative aspect-square bg-gray-50">
                        <img src={characterImage.preview} alt="Character" className="w-full h-full object-contain" />
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
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setCharacterImage({ file, preview: URL.createObjectURL(file) });
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Product */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">👗 Product</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                    {productImage?.preview ? (
                      <div className="relative aspect-square bg-gray-50">
                        <img src={productImage.preview} alt="Product" className="w-full h-full object-contain" />
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
              </div>

              {/* Ready Notice */}
              {characterImage && productImage && useCase && productFocus && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-green-800 text-sm">Sẵn sàng! Click "Start AI Analysis"</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2: // Analysis
        return <AnalysisDisplay analysis={analysis?.analysis} isAnalyzing={isAnalyzing} />;

      case 3: // Style Customization
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

      case 4: // Prompt Building
        return (
          <div className="space-y-6">
            <PromptBuilder
              analysis={analysis?.analysis}
              selectedOptions={selectedOptions}
              generatedPrompt={generatedPrompt}
              onPromptChange={handlePromptChange}
              onRegeneratePrompt={() => {}}
            />
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800">Prompt Ready!</p>
                  <p className="text-sm text-blue-600">Click "Tiếp Tục" để bắt đầu generation.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 5: // Generation
      case 6: // Results
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Image className="w-6 h-6" />
                Generated Images
              </h2>
              <p className="text-green-100 mt-1">
                {generatedImages.length} images đã được tạo thành công
              </p>
            </div>

            {/* Grid */}
            {generatedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {generatedImages.map((image, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
                    <div className="relative">
                      <img src={image.url} alt={`Generated ${index + 1}`} className="w-full h-64 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button onClick={() => window.open(image.url, '_blank')} className="p-3 bg-white/90 rounded-full hover:bg-white" title="Download">
                          <Download className="w-5 h-5 text-gray-800" />
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(image.url)} className="p-3 bg-white/90 rounded-full hover:bg-white" title="Copy URL">
                          <Save className="w-5 h-5 text-gray-800" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Image {index + 1}</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">{image.provider || 'Generated'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 pt-6">
              <button onClick={handleReset} className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
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

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Compact */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900">Virtual Try-On Studio</h1>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Mode */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                {MODES.map(mode => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => { setActiveMode(mode.id); handleReset(); }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                        activeMode === mode.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* Tab */}
              <div className="flex items-center gap-1">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); handleReset(); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="max-w-full mx-auto">
        <div className="flex">
          {/* LEFT SIDEBAR - Steps Navigation */}
          <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)]">
            <div className="p-4">
              {/* Steps */}
              <div className="space-y-1.5 mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Workflow</h3>
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;

                  return (
                    <button
                      key={step.id}
                      onClick={() => isCompleted && setCurrentStep(step.id)}
                      disabled={!isCompleted && !isActive}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isActive ? 'bg-purple-50 border border-purple-200' : isCompleted ? 'bg-green-50 border border-green-200 hover:border-green-300' : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-purple-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : isActive ? <Icon className="w-4 h-4" /> : <span className="text-xs font-bold">{step.id}</span>}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm font-medium truncate ${isActive ? 'text-purple-700' : isCompleted ? 'text-green-700' : 'text-gray-400'}`}>
                          {step.name}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{step.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Session Info */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-100 mb-4">
                <div className="text-xs font-semibold text-purple-600 mb-2">📊 Session</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Step:</span>
                    <span className="font-medium text-purple-700">{currentStep}/6</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mode:</span>
                    <span className="font-medium text-gray-700">{activeMode === 'browser' ? '🌐' : activeMode === 'prompt' ? '✏️' : '📤'}</span>
                  </div>
                  {generatedImages.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Generated:</span>
                      <span className="font-medium text-green-600">{generatedImages.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0">
            {/* Progress Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all" style={{ width: `${(currentStep / 6) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Step {currentStep} of 6</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">{renderStepContent()}</div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      {currentStep < 6 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-full mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Back */}
              <div className="w-24">
                {currentStep > 1 && (
                  <button onClick={handlePrevStep} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
              </div>

              {/* Center - Action */}
              <div className="flex-1 flex justify-center">
                {currentStep === 1 && (
                  <button onClick={handleNextStep} disabled={!canProceedToStep(2) || isAnalyzing} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300">
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isAnalyzing ? 'Analyzing...' : 'Start AI Analysis'}
                  </button>
                )}

                {currentStep === 2 && (
                  <button onClick={handleNextStep} disabled={!canProceedToStep(3)} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300">
                    <Sliders className="w-4 h-4" /> Apply & Continue
                  </button>
                )}

                {currentStep === 3 && (
                  <button onClick={handleNextStep} disabled={!canProceedToStep(4)} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {currentStep === 4 && (
                  <div className="flex items-center gap-3">
                    <button onClick={handleEnhancePrompt} disabled={isLoading || isGenerating} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 disabled:bg-gray-200">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Enhance
                    </button>
                    <button onClick={handleStartGeneration} disabled={!canProceedToStep(5) || isGenerating || isLoading} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300">
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} Generate
                    </button>
                  </div>
                )}

                {currentStep === 5 && (
                  <button onClick={() => setCurrentStep(6)} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                    <Image className="w-4 h-4" /> View Results
                  </button>
                )}
              </div>

              {/* Right placeholder */}
              <div className="w-24" />
            </div>
          </div>
        </div>
      )}

      {/* Bottom padding */}
      <div className="h-20" />
    </div>
  );
}
