/**
 * AI Creative Studio - Main Page
 * Sidebar Left: All Options (Use Case, Product Focus, Style Options...)
 * Main Right: Upload, Previews, Results
 */

import React, { useState, useEffect } from 'react';
import {
  Upload, Sparkles, Sliders, FileText, Rocket, Image,
  ChevronLeft, ChevronRight, Check, Loader2,
  Download, Save, RefreshCw, X, CheckCircle, Video, Wand2
} from 'lucide-react';

import { unifiedFlowAPI, browserAutomationAPI, promptsAPI, aiOptionsAPI } from '../services/api';

import UseCaseSelector from '../components/UseCaseSelector';
import ProductFocusSelector from '../components/ProductFocusSelector';
import StyleCustomizer from '../components/StyleCustomizer';
import PromptBuilder from '../components/PromptBuilder';

// Tab configuration
const TABS = [
  { id: 'image', label: '🖼️ Image', icon: Image },
  { id: 'video', label: '🎬 Video', icon: Video }
];

// Mode configuration
const MODES = [
  { id: 'upload', label: '📤 Upload', icon: Upload },
  { id: 'browser', label: '🌐 Browser', icon: Sparkles }
];

export default function VirtualTryOnPage() {
  // Tab & Mode
  const [activeTab, setActiveTab] = useState('image');
  const [activeMode, setActiveMode] = useState('upload');

  // Upload State
  const [characterImage, setCharacterImage] = useState(null);
  const [productImage, setProductImage] = useState(null);

  // Options State (ALL in sidebar)
  const [useCase, setUseCase] = useState('change-clothes');
  const [productFocus, setProductFocus] = useState('full-outfit');
  const [selectedOptions, setSelectedOptions] = useState({});
  const [customOptions, setCustomOptions] = useState({});

  // Analysis & Generation State
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Browser Provider
  const [browserProvider, setBrowserProvider] = useState('grok');

  // Options from API
  const [promptOptions, setPromptOptions] = useState(null);

  const BROWSER_PROVIDERS = [
    { id: 'grok', label: '🤖 Grok', description: 'AI mạnh' },
    { id: 'zai', label: '💎 Z.AI', description: 'Nhanh' },
  ];

  // Load options on mount
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

  const handlePromptChange = (prompt) => {
    setGeneratedPrompt(prompt);
  };

  // ============================================================
  // MAIN ACTIONS
  // ============================================================

  const handleStartAnalysis = async () => {
    if (!characterImage?.file || !productImage?.file) return;

    if (activeMode === 'browser') {
      setIsAnalyzing(true);
      try {
        const response = await browserAutomationAPI.generateImage(
          characterImage.file,
          productImage.file,
          { provider: browserProvider }
        );

        if (response.success && response.data) {
          if (response.data.analysis) setAnalysis(response.data.analysis);
          if (response.data.generatedImages?.length > 0) {
            setGeneratedImages(response.data.generatedImages);
          }
        }
      } catch (error) {
        console.error('Browser failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await unifiedFlowAPI.analyzeUnified(
        characterImage.file,
        productImage.file,
        { useCase, productFocus }
      );

      if (response.success && response.data) {
        setAnalysis(response.data);
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
  // MAIN RENDER
  // ============================================================

  const isReadyForAnalysis = characterImage && productImage && useCase && productFocus;
  const isReadyForPrompt = analysis && Object.keys(selectedOptions).length > 0;
  const isReadyForGeneration = generatedPrompt?.positive;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900">AI Creative Studio</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Mode */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                {MODES.map(mode => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setActiveMode(mode.id)}
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
                      onClick={() => setActiveTab(tab.id)}
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
          {/* ==================== LEFT SIDEBAR ==================== */}
          <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Section: Use Case */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">🎯 Use Case</h3>
                <UseCaseSelector selectedUseCase={useCase} onUseCaseChange={setUseCase} />
              </div>

              {/* Section: Product Focus */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">👗 Product Focus</h3>
                <ProductFocusSelector selectedFocus={productFocus} onFocusChange={setProductFocus} />
              </div>

              {/* Section: Browser Provider */}
              {activeMode === 'browser' && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">🌐 AI Provider</h3>
                  <div className="space-y-2">
                    {BROWSER_PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setBrowserProvider(provider.id)}
                        className={`w-full p-2.5 rounded-lg border-2 transition-all text-left ${
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

              {/* Section: Style Options */}
              {analysis && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">✨ Style Options</h3>
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

              {/* Section: Action Buttons */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                {/* Analyze Button */}
                {!analysis && (
                  <button
                    onClick={handleStartAnalysis}
                    disabled={!isReadyForAnalysis || isAnalyzing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isAnalyzing ? 'Analyzing...' : 'Start AI Analysis'}
                  </button>
                )}

                {/* Build Prompt Button */}
                {analysis && !generatedPrompt && (
                  <button
                    onClick={handleBuildPrompt}
                    disabled={!isReadyForPrompt || isLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {isLoading ? 'Building...' : 'Build Prompt'}
                  </button>
                )}

                {/* Enhance Button */}
                {generatedPrompt && !generatedImages.length && (
                  <div className="space-y-2">
                    <button
                      onClick={handleEnhancePrompt}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 disabled:bg-gray-200"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Enhance Prompt
                    </button>
                    <button
                      onClick={handleStartGeneration}
                      disabled={!isReadyForGeneration || isGenerating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                )}

                {/* Reset */}
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset All
                </button>
              </div>
            </div>
          </div>

          {/* ==================== RIGHT MAIN CONTENT ==================== */}
          <div className="flex-1 min-w-0 bg-gray-50">
            <div className="p-6">
              {/* Upload Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  📤 Upload Images
                </h3>
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
              </div>

              {/* Analysis Results */}
              {analysis && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    🤖 AI Analysis Results
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-600 bg-gray-50 p-4 rounded-lg overflow-auto max-h-64">
                      {typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Final Prompt */}
              {generatedPrompt && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    📝 Final Prompt
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Positive Prompt</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                        {generatedPrompt.positive}
                      </div>
                    </div>
                    {generatedPrompt.negative && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase">Negative Prompt</label>
                        <div className="mt-1 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                          {generatedPrompt.negative}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generated Images */}
              {generatedImages.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Image className="w-5 h-5 text-green-500" />
                    🖼️ Generated Images ({generatedImages.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {generatedImages.map((image, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg overflow-hidden group">
                        <div className="relative">
                          <img src={image.url} alt={`Generated ${index + 1}`} className="w-full h-48 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => window.open(image.url, '_blank')}
                              className="p-2 bg-white/90 rounded-full hover:bg-white"
                              title="View"
                            >
                              <Image className="w-4 h-4 text-gray-800" />
                            </button>
                            <button
                              onClick={() => navigator.clipboard.writeText(image.url)}
                              className="p-2 bg-white/90 rounded-full hover:bg-white"
                              title="Copy URL"
                            >
                              <Save className="w-4 h-4 text-gray-800" />
                            </button>
                          </div>
                        </div>
                        <div className="p-2 text-center">
                          <span className="text-xs text-gray-500">Image {index + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading States */}
              {(isAnalyzing || isGenerating) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {isAnalyzing ? '🤖 AI is Analyzing...' : '🎨 Generating Images...'}
                  </h3>
                  <p className="text-gray-500">Please wait a moment</p>
                </div>
              )}

              {/* Empty State */}
              {!analysis && !isAnalyzing && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                  <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to Create</h3>
                  <p className="text-gray-500 mb-4">Upload images and configure options in the sidebar</p>
                  {isReadyForAnalysis && (
                    <button
                      onClick={handleStartAnalysis}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                    >
                      <Sparkles className="w-4 h-4" />
                      Start AI Analysis
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom padding */}
      <div className="h-6" />
    </div>
  );
}
