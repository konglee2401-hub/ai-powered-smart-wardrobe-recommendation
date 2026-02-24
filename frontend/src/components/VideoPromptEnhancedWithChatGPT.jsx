/**
 * Enhanced Video Prompt Generator with ChatGPT Integration
 * Features:
 * - 5 integrated generators (Style, Movement, Camera, Lighting, Templates)
 * - Correct segment duration calculation
 * - ChatGPT response parsing and auto-fill
 * - Review & edit before submission
 */

import React, { useState, useEffect } from 'react';
import {
  Wand2, RefreshCw, Sparkles, Loader2, Check, AlertCircle,
  ChevronDown, ChevronUp, Plus, X, Copy, Download, Send,
  PlayCircle, Zap, BookOpen, Camera, Lightbulb, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { VIDEO_SCENARIOS } from '../constants/videoScenarios';
// 💫 NEW: Import segment calculation functions
import { 
  calculateSegmentCount, 
  getSegmentDurationForProvider 
} from '../constants/videoGeneration';
import {
  generateVideoScriptPrompt,
  generateStyleVariationPrompt,
  generateMovementDetailPrompt,
  generateCameraGuidancePrompt,
  generateLightingSetupPrompt,
  generateTemplateLibraryPrompt
} from '../utils/videoPromptGenerators';

export default function VideoPromptEnhancedWithChatGPT({
  onNext,
  videoDuration = 20,  // 💫 NEW: Accept video duration from props
  videoScenario = 'Fashion Flow',
  videoStyle = 'Normal Speed',
  videoProvider = 'grok',
  productType = 'Product',
  productDetails = 'Product details',
  targetAudience = 'General audience',
  onPromptsChange,
  onSegmentSelect,
  selectedImage,
  initialSegments
}) {
  // ==================== STATE: CONFIGURATION ====================
  const [duration, setDuration] = useState(videoDuration);  // 💫 FIXED: Use prop value instead of hardcoded 20
  const [scenario, setScenario] = useState(videoScenario);
  const [style, setStyle] = useState(videoStyle);
  const [productName, setProductName] = useState(productType);
  const [productDesc, setProductDesc] = useState(productDetails);
  const [audience, setAudience] = useState(targetAudience);

  // ==================== STATE: GENERATION ====================
  const [generatorType, setGeneratorType] = useState('scenario'); // scenario, style, movement, camera, lighting, template
  const [isGenerating, setIsGenerating] = useState(false);
  const [parsedSegments, setParsedSegments] = useState([]);
  const [showSegmentReview, setShowSegmentReview] = useState(false);
  const [chatGPTResponse, setChatGPTResponse] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  // ==================== STATE: SEGMENT EDITING ====================
  const [editingSegments, setEditingSegments] = useState([]);
  const [expandedSegment, setExpandedSegment] = useState(0);

  // ==================== STATE: ADVANCED OPTIONS ====================
  const [advancedOptions, setAdvancedOptions] = useState({
    variationCount: 5,
    movementType: 'walk',
    movementDuration: 8,
    cameraAspectRatio: '9:16',
    lightingStyle: 'studio-bright',
    templateCount: 30
  });

  // ==================== CALCULATE SEGMENT DURATION ====================
  // 💫 FIXED: Use dynamic calculation based on provider instead of hardcoded logic
  const segmentCount = calculateSegmentCount(videoProvider, duration);
  const segmentDurationPerProvider = getSegmentDurationForProvider(videoProvider);
  const perSegmentDuration = Math.round((duration / segmentCount) * 10) / 10;

  // ==================== SCENARIOS & FLOWS ====================
  const SCENARIO_OPTIONS = [
    { name: '👗 Fashion Flow' },
    { name: '🎯 Product Zoom' },
    { name: '💡 Styling Tips' },
    { name: '🌟 Casual Vibe' },
    { name: '✨ Glamour Slow-Motion' },
    { name: '⚡ Dynamic Energy' }
  ];

  const STYLE_OPTIONS = [
    { name: '🎬 Slow Motion', speed: '50%' },
    { name: '▶️ Normal Speed', speed: '100%' },
    { name: '⚡ Quick Cuts', speed: '125%' },
    { name: '✨ Graceful Float', speed: '60%' }
  ];

  // ==================== GENERATOR CONFIGURATIONS ====================
  const GENERATORS = [
    {
      id: 'scenario',
      name: '🎬 Scenario Script',
      icon: PlayCircle,
      description: 'Generate detailed segment-by-segment scripts'
    },
    {
      id: 'style',
      name: '🎨 Style Variations',
      icon: TrendingUp,
      description: 'Create 5+ different stylistic approaches'
    },
    {
      id: 'movement',
      name: '🚶 Movement Detail',
      icon: Zap,
      description: 'Frame-by-frame breakdown of movements'
    },
    {
      id: 'camera',
      name: '📹 Camera Guidance',
      icon: Camera,
      description: 'Detailed camera work specifications'
    },
    {
      id: 'lighting',
      name: '💡 Lighting Setup',
      icon: Lightbulb,
      description: 'Complete lighting design'
    },
    {
      id: 'template',
      name: '📚 Template Library',
      icon: BookOpen,
      description: 'Generate 20-30 unique templates'
    }
  ];

  // ==================== INITIALIZE SEGMENT EDITING STATE ====================
  // 💫 NEW: Sync duration state when videoDuration prop changes
  useEffect(() => {
    setDuration(videoDuration);
  }, [videoDuration]);

  useEffect(() => {
    // If initialSegments provided and valid, restore them
    if (initialSegments && Array.isArray(initialSegments) && initialSegments.length > 0) {
      // Check if they're segment objects or just strings
      if (typeof initialSegments[0] === 'object' && initialSegments[0].script !== undefined) {
        // Already segment objects, use them directly
        setEditingSegments(initialSegments);
        return;
      }
    }

    // Otherwise create empty segments
    const emptySegments = Array.from({ length: segmentCount }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      name: `Segment ${i + 1}`,
      duration: perSegmentDuration,
      timeCode: formatTimeCode(i + 1, segmentCount, duration),
      script: '',
      movements: '',
      cameraWork: '',
      lighting: '',
      musicDescription: ''
    }));
    setEditingSegments(emptySegments);
  }, [segmentCount, perSegmentDuration, duration, initialSegments]);

  // ==================== FORMAT TIME CODE ====================
  const formatTimeCode = (segmentNum, totalSegments, totalDuration) => {
    const segDuration = totalDuration / totalSegments;
    const startSec = (segmentNum - 1) * segDuration;
    const endSec = segmentNum * segDuration;
    const formatTime = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
    return `${formatTime(startSec)}-${formatTime(endSec)}`;
  };

  // ==================== GENERATE CHATGPT PROMPT ====================
  const generateChatGPTPrompt = () => {
    let prompt = '';

    switch (generatorType) {
      case 'scenario':
        prompt = generateVideoScriptPrompt(
          scenario,
          productName,
          productDesc,
          audience,
          style,
          duration,
          segmentCount
        );
        break;

      case 'style':
        prompt = generateStyleVariationPrompt(
          productName,
          advancedOptions.variationCount
        );
        break;

      case 'movement':
        prompt = generateMovementDetailPrompt(
          advancedOptions.movementType,
          advancedOptions.movementDuration,
          productName,
          productDesc
        );
        break;

      case 'camera':
        prompt = generateCameraGuidancePrompt(
          scenario,
          segmentCount,
          advancedOptions.cameraAspectRatio,
          productName
        );
        break;

      case 'lighting':
        prompt = generateLightingSetupPrompt(
          scenario,
          advancedOptions.lightingStyle,
          productName,
          'medium'
        );
        break;

      case 'template':
        prompt = generateTemplateLibraryPrompt(
          advancedOptions.templateCount
        );
        break;

      default:
        prompt = generateVideoScriptPrompt(scenario, productName, productDesc, audience, style, duration, segmentCount);
    }

    return prompt;
  };

  // ==================== SEND TO CHATGPT & PARSE RESPONSE ====================
  const handleGenerateSegments = async () => {
    try {
      setIsGenerating(true);

      const prompt = generateChatGPTPrompt();

      // Call backend to send prompt to ChatGPT via browser automation
      const response = await api.post('/video/generate-video-scripts', {
        scenarioId: scenario.toLowerCase().replace(/\s+/g, '-'),
        style: style.toLowerCase().replace(/\s+/g, '-'),
        duration,
        segments: segmentCount,
        productName,
        productDescription: productDesc,
        targetAudience: audience,
        videoStyle: style,
        generatorType, // Send which generator was used
        prompt // Send the generated prompt
      });

      console.log('✅ Backend response received:', response.data);
      console.log('Full response object:', response);
      console.log('Response structure:', {
        hasSuccess: !!response.data?.success,
        hasData: !!response.data?.data,
        dataKeys: Object.keys(response.data?.data || {}),
        segmentCount: response.data?.data?.segments?.length,
        mode: response.data?.data?.mode || response.data?.mode
      });

      if (!response.data) {
        throw new Error('No response from server');
      }

      if (response.data.success === false) {
        throw new Error(response.data.error || 'Failed to generate scripts');
      }

      // Backend returns structured segments (from parseVideoScript)
      // Response structure: { success: true, data: { segments: [...], rawContent: "...", mode: "..." } }
      const responseData = response.data.data || response.data; // Fallback in case response is not nested
      const parsedSegs = responseData.segments || [];
      const rawContent = responseData.rawContent || '';
      
      console.log('✅ Extracted data:', {
        responseData: responseData,
        parsedSegs: parsedSegs,
        rawContentLength: rawContent.length
      });

      console.log(`📊 Parsed segments count: ${parsedSegs.length}`);
      console.log('First segment:', parsedSegs[0]);

      if (!Array.isArray(parsedSegs) || parsedSegs.length === 0) {
        console.error('❌ Invalid segments:', parsedSegs);
        throw new Error(`No segments received. Segments: ${JSON.stringify(parsedSegs).substring(0, 100)}`);
      }

      // Auto-fill editingSegments with parsed data
      // First, ensure we have enough empty segments to fill
      let targetSegments = editingSegments;
      
      if (!targetSegments || targetSegments.length === 0 || targetSegments.length < parsedSegs.length) {
        console.warn(`⚠️  editingSegments (${editingSegments.length}) doesn't match parsedSegs (${parsedSegs.length}), creating new ones`);
        targetSegments = Array.from({ length: parsedSegs.length }, (_, i) => ({
          id: i + 1,
          number: i + 1,
          name: `Segment ${i + 1}`,
          duration: perSegmentDuration,
          timeCode: formatTimeCode(i + 1, parsedSegs.length, duration),
          script: '',
          movements: '',
          cameraWork: '',
          lighting: '',
          musicDescription: ''
        }));
      }

      const filledSegments = targetSegments.map((seg, idx) => {
        const parsedSeg = parsedSegs[idx] || {};
        
        console.log(`Filling segment ${idx} with:`, {
          name: parsedSeg.name,
          duration: parsedSeg.duration,
          hasScript: !!parsedSeg.script,
          scriptLength: parsedSeg.script?.length || 0
        });

        return {
          ...seg,
          name: parsedSeg.name || seg.name,
          duration: parsedSeg.duration || perSegmentDuration,
          script: parsedSeg.script || '',
          movements: Array.isArray(parsedSeg.movements)
            ? parsedSeg.movements.join('\n')
            : (parsedSeg.movements || ''),
          cameraWork: parsedSeg.cameraWork || '',
          lighting: parsedSeg.lighting || '',
          musicDescription: parsedSeg.musicDescription || ''
        };
      });

      console.log(`✅ Filled ${filledSegments.length} segments with data`);
      
      setEditingSegments(filledSegments);
      setChatGPTResponse(rawContent);
      setDemoMode(responseData.mode === 'demo');
      setShowSegmentReview(true);

      // Show warning if in demo mode
      if (responseData.mode === 'demo') {
        toast.success(
          '⚠️ Demo Mode: ChatGPT browser unavailable. Installing Puppeteer would enable live generation.',
          { duration: 5000 }
        );
      } else {
        toast.success(`✅ Generated ${segmentCount} segments from ChatGPT!`);
      }
    } catch (error) {
      console.error('❌ Error generating segments:', error);
      console.error('Error details:', {
        message: error.message,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        errorStack: error.stack
      });
      
      // Provide helpful error messages
      let errorMessage = 'Failed to generate segments';
      
      if (error.response?.status === 500) {
        errorMessage = 'Backend error: ChatGPT browser automation failed. Make sure Puppeteer is installed.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid request parameters';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout: ChatGPT took too long to respond';
      } else if (error.message.includes('No segments')) {
        errorMessage = 'No segments were generated. Please check the response from the backend.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  // ==================== UPDATE SEGMENT ====================
  const handleUpdateSegment = (index, field, value) => {
    setEditingSegments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // ==================== SUBMIT PROMPTS ====================
  const handleSubmitPrompts = () => {
    if (editingSegments.some(seg => !seg.script.trim())) {
      toast.error('Please fill in all segment scripts');
      return;
    }

    // Send full segment objects (not just scripts) to preserve all data
    if (onPromptsChange) {
      onPromptsChange(editingSegments);
    }

    if (onNext) {
      onNext();
    }

    toast.success('✅ Segments prepared for video generation!');
  };

  // ==================== RENDER ====================
  // When review mode is active, return COMPACT layout for sidebar
  if (showSegmentReview) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="pb-4 border-b border-gray-700">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Check className="w-5 h-5 text-green-400" />
            Review Segments
          </h2>
          <p className="text-xs text-gray-400 mt-1">{editingSegments.length} segments ready</p>
        </div>

        {/* Segments List (Compact in sidebar) */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-2">
          {/* ChatGPT Response Summary */}
          {chatGPTResponse && (
            <div className={`rounded p-2 text-xs mb-3 ${demoMode ? 'bg-yellow-900/20 border border-yellow-700/30' : 'bg-blue-900/20 border border-blue-700/30'}`}>
              <div className="flex items-center gap-1 mb-1">
                {demoMode ? (
                  <>
                    <AlertCircle className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-300 font-semibold">Demo</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-300 font-semibold">Live</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-300 line-clamp-2">
                {chatGPTResponse.substring(0, 100)}...
              </p>
            </div>
          )}

          {/* Segments List */}
          {editingSegments.map((segment, idx) => (
            <button
              key={segment.id}
              onClick={() => {
                setExpandedSegment(expandedSegment === idx ? -1 : idx);
                if (onSegmentSelect) {
                  onSegmentSelect(segment, idx);
                }
              }}
              className={`w-full text-left px-3 py-2 rounded border transition ${
                expandedSegment === idx
                  ? 'bg-purple-600/30 border-purple-500 ring-1 ring-purple-500'
                  : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 text-white ${
                  segment.script ? 'bg-green-600/60' : 'bg-yellow-600/60'
                }`}>
                  {segment.number}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-medium text-white truncate">{segment.name}</h4>
                  <p className="text-xs text-gray-400">{segment.duration}s</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-gray-700 mt-4 pt-4 space-y-2">
          <button
            onClick={handleSubmitPrompts}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2 rounded text-sm transition"
          >
            <Check className="w-4 h-4 inline mr-1" />
            Use Segments
          </button>

          <button
            onClick={() => setShowSegmentReview(false)}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded text-sm transition"
          >
            ← Regenerate
          </button>
        </div>
      </div>
    );
  }

  // Normal render for configuration step
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          ChatGPT Generator
        </h2>
        <p className="text-xs text-gray-400">
          Generate video scripts with AI
        </p>
      </div>

      {/* Video Flow Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold mb-1">📹 Video Flow</label>
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
        >
          {SCENARIO_OPTIONS.map(opt => (
            <option key={opt.name} value={opt.name}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>

      {/* Video Style */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold mb-1">💫 Video Style</label>
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
        >
          {STYLE_OPTIONS.map(opt => (
            <option key={opt.name} value={opt.name}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product Name */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold mb-1">📦 Product Name</label>
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="e.g., Summer Dress"
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
        />
      </div>

      {/* Audience */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold mb-1">👥 Target Audience</label>
        <input
          type="text"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g., Women 18-35"
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
        />
      </div>

      {/* Product Details (collapsed) */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold mb-1">📝 Details</label>
        <textarea
          value={productDesc}
          onChange={(e) => setProductDesc(e.target.value)}
          placeholder="Product features..."
          rows={2}
          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs resize-none"
        />
      </div>

      {/* Segment Duration Display */}
      <div className="bg-purple-900/20 border border-purple-700/30 rounded p-2">
        <p className="text-xs text-gray-300">
          <span className="text-purple-300 font-semibold">{duration}s</span> total
          {' '} • {' '}
          <span className="text-purple-300 font-semibold">{segmentCount}</span> segments
          {' '} • {' '}
          <span className="text-purple-300 font-semibold">{perSegmentDuration}s</span> each
        </p>
      </div>

      {/* Generator Type (Minimal) */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold mb-1">🎯 Generator</label>
        <div className="grid grid-cols-2 gap-2">
          {GENERATORS.slice(0, 2).map(gen => (
            <button
              key={gen.id}
              onClick={() => setGeneratorType(gen.id)}
              className={`px-2 py-1 rounded text-xs transition border ${
                generatorType === gen.id
                  ? 'bg-purple-600 border-purple-400 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              {gen.name.split(' ')[1] || 'Gen'}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerateSegments}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold py-2 rounded flex items-center justify-center gap-2 transition text-sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Generate
          </>
        )}
      </button>
    </div>
  );
}

