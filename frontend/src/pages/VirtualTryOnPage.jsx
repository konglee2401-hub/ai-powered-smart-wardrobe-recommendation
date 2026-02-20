/**
 * AI Creative Studio - PicsArt Style Layout
 * - Compact toolbar icons (left)
 * - Steps bar (top of main)
 * - Action buttons (below preview)
 */

import React, { useState, useEffect } from 'react';
import {
  Upload, Sparkles, Sliders, FileText, Rocket, Image,
  Loader2, RefreshCw, X, Video, Wand2, Layers, Settings
} from 'lucide-react';

import { unifiedFlowAPI, browserAutomationAPI, promptsAPI, aiOptionsAPI } from '../services/api';

import UseCaseSelector from '../components/UseCaseSelector';
import ProductFocusSelector from '../components/ProductFocusSelector';
import StyleCustomizer from '../components/StyleCustomizer';

// Steps
const STEPS = [
  { id: 1, name: 'Upload', icon: Upload },
  { id: 2, name: 'Analyze', icon: Sparkles },
  { id: 3, name: 'Style', icon: Sliders },
  { id: 4, name: 'Prompt', icon: FileText },
  { id: 5, name: 'Generate', icon: Rocket },
];

export default function VirtualTryOnPage() {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('image'); // image | video
  const [activeMode, setActiveMode] = useState('browser'); // browser | upload - DEFAULT browser

  // Data
  const [characterImage, setCharacterImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [useCase, setUseCase] = useState('change-clothes');
  const [productFocus, setProductFocus] = useState('full-outfit');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [customOptions, setCustomOptions] = useState({});

  // Results
  const [analysis, setAnalysis] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);

  // Loading states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      const response = await browserAutomationAPI.generateImage(
        characterImage.file,
        productImage.file,
        { provider: browserProvider }
      );

      if (response.success && response.data) {
        if (response.data.analysis) {
          setAnalysis(response.data.analysis);
          setCurrentStep(3);
        }
        if (response.data.generatedImages?.length > 0) {
          setGeneratedImages(response.data.generatedImages);
          setCurrentStep(5);
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
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
      const response = await unifiedFlowAPI.generateImages({
        prompt: generatedPrompt.positive,
        negativePrompt: generatedPrompt.negative,
        options: {
          imageCount: selectedOptions.imageCount || 2,
          aspectRatio: selectedOptions.aspectRatio || '1:1'
        }
      });

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
    setGeneratedPrompt(null);
    setGeneratedImages([]);
  };

  // ============================================================
  // RENDER
  // ============================================================

  const isReadyForAnalysis = characterImage && productImage;
  const isReadyForPrompt = analysis && Object.keys(selectedOptions).length > 0;
  const isReadyForGeneration = generatedPrompt?.positive;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* ==================== TOP BAR ==================== */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-400" />
            <span className="font-bold">AI Creative Studio</span>
          </div>

          {/* Steps Bar */}
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

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Tab: Image/Video */}
            <div className="flex bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('image')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  activeTab === 'image' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Image</span>
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  activeTab === 'video' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Video</span>
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="p-1.5 bg-gray-700 rounded hover:bg-gray-600"
              title="Reset"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== MAIN LAYOUT ==================== */}
      <div className="flex h-[calc(100vh-48px)]">
        {/* ==================== LEFT TOOLBAR (Icons only) ==================== */}
        <div className="w-14 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-3 gap-2">
          {/* Mode: Browser/Upload */}
          <div className="flex flex-col gap-1">
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
          </div>

          <div className="w-8 h-px bg-gray-700" />

          {/* Provider */}
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Settings */}
          <button className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* ==================== CENTER: PREVIEW + ACTIONS ==================== */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-900">
          {/* Upload Area / Preview */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="max-w-4xl mx-auto">
              {/* Upload Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Character */}
                <div className="relative aspect-square bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 overflow-hidden">
                  {characterImage?.preview ? (
                    <>
                      <img src={characterImage.preview} alt="Character" className="w-full h-full object-contain" />
                      <button
                        onClick={() => setCharacterImage(null)}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                      >
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

                {/* Product */}
                <div className="relative aspect-square bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 overflow-hidden">
                  {productImage?.preview ? (
                    <>
                      <img src={productImage.preview} alt="Product" className="w-full h-full object-contain" />
                      <button
                        onClick={() => setProductImage(null)}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                      >
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

              {/* Generated Images */}
              {generatedImages.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Generated ({generatedImages.length})</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {generatedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img.url} alt={`Gen ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center gap-1">
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
                  <span className="ml-2 text-gray-400">
                    {isAnalyzing ? 'Analyzing...' : 'Generating...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ==================== ACTION BAR (Bottom) ==================== */}
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              {/* Left: Options toggles */}
              <div className="flex items-center gap-3">
                {/* Use Case */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Use:</span>
                  <select
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
                  >
                    <option value="change-clothes">Change Clothes</option>
                    <option value="try-on">Try On</option>
                    <option value="style-transfer">Style Transfer</option>
                  </select>
                </div>

                {/* Focus */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Focus:</span>
                  <select
                    value={productFocus}
                    onChange={(e) => setProductFocus(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
                  >
                    <option value="full-outfit">Full Outfit</option>
                    <option value="upper-body">Upper</option>
                    <option value="lower-body">Lower</option>
                  </select>
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Analyze */}
                {!analysis && !isAnalyzing && (
                  <button
                    onClick={handleStartAnalysis}
                    disabled={!isReadyForAnalysis}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">Start AI</span>
                  </button>
                )}

                {/* Build Prompt */}
                {analysis && !generatedPrompt && !isLoading && (
                  <button
                    onClick={handleBuildPrompt}
                    disabled={!isReadyForPrompt}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Build Prompt</span>
                  </button>
                )}

                {/* Enhance + Generate */}
                {generatedPrompt && generatedImages.length === 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleEnhancePrompt}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleStartGeneration}
                      disabled={!isReadyForGeneration || isGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <Rocket className="w-4 h-4" />
                      <span className="text-sm font-medium">Generate</span>
                    </button>
                  </div>
                )}

                {/* New Session */}
                {generatedImages.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">New</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT SIDEBAR (Collapsible Options) ==================== */}
        <div className="w-64 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <div className="p-3 space-y-4">
            {/* Style Options */}
            {analysis && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Style Options</h3>
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
              </div>
            )}

            {/* Current Prompt */}
            {generatedPrompt && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Prompt</h3>
                <div className="bg-gray-900 rounded-lg p-2 text-xs text-gray-300 max-h-32 overflow-auto">
                  {generatedPrompt.positive}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
