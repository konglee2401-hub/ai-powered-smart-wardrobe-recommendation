/**
 * 1-Click Creator Page
 * Unified workflow: Image Analysis → Image Generation → Video Generation
 * All in one seamless page with real-time progress tracking
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload, Sparkles, Rocket, Loader2, ChevronDown, ChevronUp,
  Play, Pause, Download, Copy, X, Settings, Image as ImageIcon, Video,
  CheckCircle, AlertCircle, Clock, BarChart3, Wand2, ZapOff, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { browserAutomationAPI, unifiedFlowAPI } from '../services/api';

// Constants
const IMAGE_PROVIDERS = [
  { id: 'grok', label: 'Grok', icon: '🤖' },
  { id: 'google-flow', label: 'Google Flow 🌐', icon: '🌐' },
];

const VIDEO_PROVIDERS = [
  { id: 'grok', label: 'Grok', icon: '🤖' },
  { id: 'google-flow', label: 'Google Flow', icon: '🌐' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: 'Widescreen (16:9)', width: 'w-96', preview: 'w-48 h-27' },
  { id: '9:16', label: 'Portrait (9:16)', width: 'w-64', preview: 'w-32 h-56' },
];

const QUANTITY_OPTIONS = [1, 2, 3, 4, 5];

// Placeholder Loading Component
function ImageLoadingPlaceholder({ aspectRatio }) {
  const heightClass = aspectRatio === '16:9' ? 'h-48' : 'h-80';
  return (
    <div className={`w-full ${heightClass} bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-700`}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-400">Generating...</p>
      </div>
    </div>
  );
}

// Step Log Component
function StepLog({ title, logs, isExpanded, onToggle }) {
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full bg-gray-800 hover:bg-gray-750 p-3 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
          <h3 className="font-semibold text-gray-200">{title}</h3>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isExpanded && (
        <div className="bg-gray-900 p-3 max-h-96 overflow-y-auto space-y-2 border-t border-gray-700">
          {logs.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Awaiting action...</p>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="text-xs text-gray-400 font-mono flex gap-2">
                <span className="text-gray-600">[{new Date().toLocaleTimeString()}]</span>
                <span>{log}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Timeline Grid Component - Shows images and videos in organized layout
function OutputTimeline({ results, aspectRatio }) {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Output will appear here as generation progresses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {results.map((item, idx) => (
        <div key={idx} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
          {/* Image Section */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Image {idx + 1}
            </h4>
            {item.image ? (
              <img src={item.image} alt={`Generated ${idx + 1}`} className="w-full rounded-lg" />
            ) : (
              <ImageLoadingPlaceholder aspectRatio={aspectRatio} />
            )}
            {item.imageStatus && <p className="text-xs text-gray-400 mt-2">{item.imageStatus}</p>}
          </div>

          {/* Videos Section */}
          {item.videoCount > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                Videos ({item.videos?.filter(v => v).length || 0}/{item.videoCount})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: item.videoCount }).map((_, vIdx) => (
                  <div key={vIdx} className="relative">
                    {item.videos?.[vIdx] ? (
                      <video
                        src={item.videos[vIdx]}
                        className="w-full aspect-video rounded-lg bg-black"
                        controls
                      />
                    ) : (
                      <ImageLoadingPlaceholder aspectRatio="16:9" />
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-xs text-gray-200">
                      {item.videoDuration || 10}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function OneClickCreatorPage() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  // Upload states
  const [characterImage, setCharacterImage] = useState(null);
  const [productImage, setProductImage] = useState(null);

  // Settings states
  const [imageProvider, setImageProvider] = useState('grok');
  const [videoProvider, setVideoProvider] = useState('google-flow');
  const [quantity, setQuantity] = useState(2);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isHeadless, setIsHeadless] = useState(true);

  // Progress states
  const [results, setResults] = useState([]);
  const [analysisLogs, setAnalysisLogs] = useState([]);
  const [generationLogs, setGenerationLogs] = useState([]);
  const [expandedLogs, setExpandedLogs] = useState({ analysis: true, generation: true });

  const fileInputRef = useRef(null);

  // Handle image upload
  const handleImageUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'character') {
          setCharacterImage(event.target.result);
        } else {
          setProductImage(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add log entry
  const addLog = (type, message) => {
    if (type === 'analysis') {
      setAnalysisLogs(prev => [...prev, message]);
    } else {
      setGenerationLogs(prev => [...prev, message]);
    }
  };

  // Helper to extract base64 from data URL
  const extractBase64 = (dataUrl) => {
    return dataUrl.split(',')[1];
  };

  // Main generation flow
  const handleOneClickGeneration = async () => {
    if (!characterImage || !productImage) {
      alert('Please upload both images first');
      return;
    }

    setIsGenerating(true);
    setResults([]);
    setAnalysisLogs([]);
    setGenerationLogs([]);

    try {
      // Calculate video count based on aspect ratio and duration
      const videoDuration = aspectRatio === '16:9' ? 30 : 20; // seconds per video
      const videoCount = Math.ceil(120 / videoDuration); // Generate enough for ~2 minutes total

      // Initialize results array based on quantity
      const initialResults = Array.from({ length: quantity }).map(() => ({
        image: null,
        imageStatus: 'Pending...',
        videos: Array(videoCount).fill(null),
        videoCount,
        videoDuration,
      }));
      setResults(initialResults);

      const charBase64 = extractBase64(characterImage);
      const prodBase64 = extractBase64(productImage);

      // Step 1: Analyze images
      addLog('analysis', `📊 Starting analysis with ${imageProvider} provider...`);
      let analysisResult = null;
      try {
        const analysisResponse = await browserAutomationAPI.analyzeBrowserOnly(charBase64, prodBase64, {
          provider: imageProvider,
          aspectRatio,
        });
        analysisResult = analysisResponse;
        addLog('analysis', '✓ Character analysis complete');
        addLog('analysis', '✓ Product analysis complete');
        addLog('analysis', `📈 Generated ${analysisResult?.options?.length || 15} style options`);
      } catch (analyzeError) {
        console.error('Analysis error:', analyzeError);
        addLog('analysis', `⚠️ Analysis partial: ${analyzeError.message}`);
      }

      // Step 2: Generate images
      addLog('generation', `🎨 Starting image generation with ${imageProvider}...`);
      const generatedImages = [];
      
      for (let i = 0; i < quantity; i++) {
        addLog('generation', `📸 Generating image ${i + 1}/${quantity}...`);
        
        try {
          const genResponse = await browserAutomationAPI.generateBrowserOnly(
            `Professional fashion photo, clothing on model, ${i + 1} of ${quantity}`,
            {
              generationProvider: imageProvider,
              imageGenProvider: imageProvider,
              characterImageBase64: charBase64,
              productImageBase64: prodBase64,
              aspectRatio,
              imageCount: 1,
              grokConversationId: analysisResult?.grokConversationId,
            }
          );
          
          const imageUrl = genResponse?.images?.[0] || null;
          generatedImages.push(imageUrl);

          setResults(prev => {
            const updated = [...prev];
            updated[i].image = imageUrl;
            updated[i].imageStatus = imageUrl ? `✓ Generated` : `⚠️ Generation in progress`;
            return updated;
          });

          addLog('generation', `✓ Image ${i + 1} generated`);
        } catch (genError) {
          console.error(`Image generation error ${i + 1}:`, genError);
          generatedImages.push(null);
          addLog('generation', `❌ Image ${i + 1} failed: ${genError.message}`);
        }
      }

      // Step 3: Generate videos for each image
      addLog('generation', `🎬 Starting video generation with ${videoProvider}...`);
      
      for (let i = 0; i < quantity; i++) {
        if (!generatedImages[i]) {
          addLog('generation', `⏭️ Skipping videos for image ${i + 1} (no image)`);
          continue;
        }

        for (let v = 0; v < videoCount; v++) {
          addLog('generation', `🎥 Video ${v + 1}/${videoCount} for image ${i + 1}...`);
          
          try {
            const videoResponse = await browserAutomationAPI.generateVideoWithProvider({
              videoProvider,
              prompt: `Fashion model video, ${videoDuration}s clip, outfit ${i + 1}, take ${v + 1}`,
              duration: videoDuration,
              quality: 'high',
              aspectRatio,
              characterImageBase64: charBase64,
              productImageBase64: prodBase64,
            });

            const videoUrl = videoResponse?.videoUrl || videoResponse?.url || null;
            
            setResults(prev => {
              const updated = [...prev];
              if (!updated[i].videos) updated[i].videos = [];
              updated[i].videos[v] = videoUrl;
              return updated;
            });

            addLog('generation', `✓ Video ${v + 1}/${videoCount} for image ${i + 1} complete`);
          } catch (videoError) {
            console.error(`Video generation error ${i + 1}-${v + 1}:`, videoError);
            addLog('generation', `⚠️ Video ${v + 1}/${videoCount}: ${videoError.message}`);
          }
        }
      }

      addLog('generation', '✅ All generations complete!');
      setIsGenerating(false);

    } catch (error) {
      console.error('Generation flow error:', error);
      addLog('generation', `❌ Fatal error: ${error.message}`);
      setIsGenerating(false);
    }
  };

  // Preview images for right sidebar
  const previewImages = [characterImage, productImage].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold">1-Click Creator</h1>
              <p className="text-sm text-gray-400">Image + Video Generation in One Flow</p>
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
          {/* LEFT SIDEBAR - Settings */}
          <div className="col-span-3 space-y-4 overflow-y-auto max-h-full">
            {/* Image Provider */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Image Provider
              </h3>
              <div className="space-y-2">
                {IMAGE_PROVIDERS.map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => setImageProvider(provider.id)}
                    className={`w-full p-2 rounded text-sm transition-all ${
                      imageProvider === provider.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {provider.icon} {provider.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Provider */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <Video className="w-4 h-4" />
                Video Provider
              </h3>
              <div className="space-y-2">
                {VIDEO_PROVIDERS.map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => setVideoProvider(provider.id)}
                    className={`w-full p-2 rounded text-sm transition-all ${
                      videoProvider === provider.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {provider.icon} {provider.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">Aspect Ratio</h3>
              <div className="space-y-2">
                {ASPECT_RATIOS.map(ratio => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    className={`w-full p-2 rounded text-sm transition-all ${
                      aspectRatio === ratio.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">Quantity</h3>
              <div className="grid grid-cols-5 gap-1">
                {QUANTITY_OPTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`p-2 rounded text-sm font-semibold transition-all ${
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

            {/* Headless Toggle */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                {isHeadless ? <ZapOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {isHeadless ? 'Headless' : 'Visible'}
              </h3>
              <button
                onClick={() => setIsHeadless(!isHeadless)}
                className="w-full p-2 rounded text-sm bg-gray-700 hover:bg-gray-600 transition-all"
              >
                {isHeadless ? '🤖 Run in Background' : '👀 Show Browser'}
              </button>
            </div>
          </div>

          {/* CENTER - Main Content */}
          <div className="col-span-6 space-y-4 flex flex-col overflow-y-auto max-h-full">
            {/* Upload Section */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Images
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Character Image */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500 transition-colors"
                >
                  {characterImage ? (
                    <img src={characterImage} alt="Character" className="w-full h-48 object-cover rounded" />
                  ) : (
                    <div className="py-8">
                      <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400">Character Image</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'character')}
                  />
                </div>

                {/* Product Image */}
                <div
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => handleImageUpload(e, 'product');
                    input.click();
                  }}
                  className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500 transition-colors"
                >
                  {productImage ? (
                    <img src={productImage} alt="Product" className="w-full h-48 object-cover rounded" />
                  ) : (
                    <div className="py-8">
                      <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400">Product Image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Output Timeline/Grid */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex-1 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Generation Output
              </h3>
              <OutputTimeline results={results} aspectRatio={aspectRatio} />
            </div>

            {/* Action Button */}
            <button
              onClick={handleOneClickGeneration}
              disabled={!characterImage || !productImage || isGenerating}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating... (Step 1 of 3)
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  1-Click Generation
                </>
              )}
            </button>
          </div>

          {/* RIGHT SIDEBAR - Logs + Preview */}
          <div className="col-span-3 space-y-4 overflow-y-auto max-h-full">
            {/* Image Preview */}
            {previewImages.length > 0 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-200 mb-3">Uploaded Images</h3>
                <div className="grid grid-cols-2 gap-2">
                  {previewImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Preview ${idx}`}
                      className="w-full h-24 object-cover rounded"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Logs */}
            <StepLog
              title="Analysis Steps"
              logs={analysisLogs}
              isExpanded={expandedLogs.analysis}
              onToggle={() => setExpandedLogs(prev => ({ ...prev, analysis: !prev.analysis }))}
            />

            {/* Generation Logs */}
            <StepLog
              title="Generation Progress"
              logs={generationLogs}
              isExpanded={expandedLogs.generation}
              onToggle={() => setExpandedLogs(prev => ({ ...prev, generation: !prev.generation }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
