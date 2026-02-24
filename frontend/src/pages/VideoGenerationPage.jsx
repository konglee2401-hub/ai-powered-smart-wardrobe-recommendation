/**
 * AI Creative Studio - Video Generation
 * - Step 1: Provider + Settings (Duration + Scenario)
 * - Step 2: Prompt (Script Builder)
 * - Step 3: Generate (Video Creation)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2, RefreshCw, Settings as SettingsIcon, FileText, Rocket,
  Loader2, ChevronRight, ChevronUp, ChevronDown, Save, Video,
  Play, Pause, Volume2, VolumeX, Download, Copy, Sparkles, Plus, X, Upload

} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, browserAutomationAPI } from '../services/api';
import GalleryPicker from '../components/GalleryPicker';
import ScenarioImageUploadComponent from '../components/ScenarioImageUploadComponent';  // 💫 NEW
import driveAPI from '../services/driveAPI';
import { 
  VIDEO_DURATIONS, 
  VIDEO_SCENARIOS,
  VIDEO_PROVIDER_LIMITS,
  getAvailableDurations,
  getMaxDurationForProvider,
  calculateVideoCount,
  calculateSegmentCount,  // 💫 NEW: Dynamic segment calculation
  getSegmentDurationForProvider  // 💫 NEW: Get segment duration per provider
} from '../constants/videoGeneration';
import VideoPromptStepWithTemplates from '../components/VideoPromptStepWithTemplates';
import VideoPromptEnhancedWithChatGPT from '../components/VideoPromptEnhancedWithChatGPT';

const STEPS = [
  { id: 1, name: 'Settings', icon: SettingsIcon },
  { id: 2, name: 'Prompt', icon: FileText },
  { id: 3, name: 'Generate', icon: Rocket },
];

// 💫 NEW: Video Provider Options
const VIDEO_PROVIDERS = [
  { id: 'grok', label: 'Grok', icon: '🤖', description: 'Fast, interactive video generation' },
  { id: 'google-flow', label: 'Google Flow', icon: '🌐', description: 'High quality, Advanced AI' },
];

// Step 1: Settings Component
// 💫 UPDATED: Added scenarioImages parameter for multiple image uploads
function VideoSettingsStep({ 
  onNext, 
  selectedDuration, 
  onDurationChange, 
  selectedScenario, 
  onScenarioChange, 
  onImageChange,
  scenarioImages = {},  // 💫 NEW: Multiple scenario-specific images
  onScenarioImagesChange = () => {},  // 💫 NEW: Handler for scenario images
  videoProvider, 
  onVideoProviderChange, 
  selectedAspectRatio, 
  onAspectRatioChange 
}) {
  const scenario = VIDEO_SCENARIOS.find(s => s.value === selectedScenario);
  
  // Get available durations based on provider
  const availableDurations = getAvailableDurations(videoProvider);
  const maxDuration = getMaxDurationForProvider(videoProvider);
  const maxPerVideo = VIDEO_PROVIDER_LIMITS[videoProvider]?.maxDurationPerVideo || 10;

  return (
    <div className="space-y-4">
      {/* 💫 NEW: Provider Selection */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Video Provider
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {VIDEO_PROVIDERS.map(provider => (
            <button
              key={provider.id}
              onClick={() => onVideoProviderChange(provider.id)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                videoProvider === provider.id
                  ? 'border-amber-500 bg-amber-600/20 text-white'
                  : 'border-gray-700 hover:border-gray-600 text-gray-300'
              }`}
            >
              <div className="text-lg mb-1">{provider.icon}</div>
              <div className="font-medium text-sm">{provider.label}</div>
              <div className="text-xs text-gray-400 mt-1">{provider.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Provider Info Banner */}
      <div className={`rounded-lg p-3 border ${
        videoProvider === 'google-flow' 
          ? 'bg-blue-900/20 border-blue-700/50' 
          : 'bg-green-900/20 border-green-700/50'
      }`}>
        <div className="text-xs">
          <span className="text-gray-400">Max </span>
          <span className="font-semibold text-white">{maxPerVideo}s</span>
          <span className="text-gray-400"> per video • </span>
          <span className="font-semibold text-white">{maxDuration}s</span>
          <span className="text-gray-400"> total</span>
        </div>
      </div>

      {/* 💫 NEW: Aspect Ratio Selection */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Play className="w-4 h-4 text-blue-400" />
          Aspect Ratio
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onAspectRatioChange('16:9')}
            className={`p-3 rounded-lg border-2 transition-all text-center ${
              selectedAspectRatio === '16:9'
                ? 'border-blue-500 bg-blue-600/20 text-white'
                : 'border-gray-700 hover:border-gray-600 text-gray-300'
            }`}
          >
            <div className="text-sm font-semibold">📺 16:9</div>
            <div className="text-xs text-gray-400 mt-1">Widescreen</div>
          </button>

          <button
            onClick={() => onAspectRatioChange('9:16')}
            className={`p-3 rounded-lg border-2 transition-all text-center ${
              selectedAspectRatio === '9:16'
                ? 'border-blue-500 bg-blue-600/20 text-white'
                : 'border-gray-700 hover:border-gray-600 text-gray-300'
            }`}
          >
            <div className="text-sm font-semibold">📱 9:16</div>
            <div className="text-xs text-gray-400 mt-1">Portrait</div>
          </button>
        </div>
      </div>

      {/* Duration Selection - Filtered by Provider */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Play className="w-4 h-4 text-purple-400" />
          Video Duration
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {availableDurations.map(duration => {
            const videoCount = calculateVideoCount(videoProvider, duration.value);
            return (
              <button
                key={duration.value}
                onClick={() => onDurationChange(duration.value)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedDuration === duration.value
                    ? 'border-purple-500 bg-purple-600/20 text-white'
                    : 'border-gray-700 hover:border-gray-600 text-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{duration.label}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {videoCount} × {maxPerVideo}-second clips
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenario Selection */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          Video Scenario
        </h3>
        <div className="space-y-2">
          {VIDEO_SCENARIOS.map(scen => (
            <button
              key={scen.value}
              onClick={() => onScenarioChange(scen.value)}
              className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                selectedScenario === scen.value
                  ? 'border-blue-500 bg-blue-600/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className={`font-medium text-sm ${selectedScenario === scen.value ? 'text-blue-300' : 'text-gray-300'}`}>
                {scen.label}
              </div>
              <div className="text-xs text-gray-400 mt-1">{scen.description}</div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// Step 2: Prompt Builder Component
// 💫 UPDATED: Added scenarioImages parameter for scenario-specific prompt generation
function VideoPromptStep({ 
  onNext, 
  duration, 
  scenario,
  prompts,
  onPromptsChange,
  selectedImage,
  isGenerating,
  videoProvider,
  scenarioImages = {}  // 💫 NEW: Multiple scenario-specific images
}) {
  const scen = VIDEO_SCENARIOS.find(s => s.value === scenario);
  const segments = calculateSegmentCount(videoProvider, duration);  // 💫 FIXED: Dynamic based on provider
  const maxPerVideo = getSegmentDurationForProvider(videoProvider);  // 💫 FIXED: Get correct duration per provider
  const [isGeneratingPrompts, setIsGeneratingPrompts] = React.useState(false);
  const [promptError, setPromptError] = React.useState(null);

  const handlePromptChange = (index, value) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    onPromptsChange(newPrompts);
  };

  const handleAutoFill = () => {
    if (scen?.scriptTemplate) {
      onPromptsChange(scen.scriptTemplate);
      setPromptError(null);
    }
  };

  // 💫 UPDATED: Generate scenario-specific prompts with image analysis
  const handleGeneratePromptsFromChatGPT = async () => {
    setIsGeneratingPrompts(true);
    setPromptError(null);
    
    try {
      // 💫 NEW: Use scenario-specific prompt generation endpoint with image uploads
      const formData = new FormData();
      formData.append('scenario', scenario);
      formData.append('duration', duration);
      formData.append('segments', segments);
      formData.append('productName', scenarioImages?.productName || 'Product');
      formData.append('additionalDetails', scenarioImages?.additionalDetails || '');
      
      // 💫 Add uploaded images (Form Data handles files)
      if (scenarioImages?.characterWearing?.file) {
        formData.append('character_wearing_outfit', scenarioImages.characterWearing.file);
      }
      if (scenarioImages?.characterHolding?.file) {
        formData.append('character_holding_product', scenarioImages.characterHolding.file);
      }
      if (scenarioImages?.productReference?.file) {
        formData.append('product_reference', scenarioImages.productReference.file);
      }

      // 💫 Call new endpoint for scenario-based prompt generation
      const response = await api.post('/videos/generate-scenario-prompts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.success && response.data.prompts) {
        onPromptsChange(response.data.prompts);
      } else {
        setPromptError('Failed to generate scenario prompts. Using template instead.');
        handleAutoFill();
      }
    } catch (error) {
      console.error('Error generating scenario prompts:', error);
      
      // Fallback: Try old endpoint if scenario-specific fails
      try {
        const response = await browserAutomationAPI.generateVideoPromptsChatGPT(
          duration,
          scenario,
          segments,
          'professional',
          videoProvider,
          null,
          '16:9'
        );

        if (response.success && response.data.prompts) {
          onPromptsChange(response.data.prompts);
        } else {
          setPromptError('Failed to generate prompts. Using template instead.');
          handleAutoFill();
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setPromptError('Could not generate prompts. Using template instead.');
        handleAutoFill();
      }
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Help Text - Dynamic based on provider */}
      <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/50">
        <p className="text-xs text-blue-300">
          ✨ Each segment is ~{maxPerVideo} seconds. Describe the action, camera movement, and details for each segment. 
          {videoProvider === 'grok' 
            ? ' Grok will generate videos with smooth transitions between segments.'
            : ' Google Flow Veo will generate high-quality video clips optimized for each segment.'}
        </p>
      </div>

      {/* Prompt Generation Buttons - Use ChatGPT as default */}
      <div className="flex gap-2">
        <button
          onClick={handleGeneratePromptsFromChatGPT}
          disabled={isGeneratingPrompts}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-900/30 hover:bg-green-900/50 border border-green-700/50 rounded-lg text-xs font-medium text-green-300 transition-colors disabled:opacity-50"
        >
          {isGeneratingPrompts ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              Generate with ChatGPT
            </>
          )}
        </button>

        <button
          onClick={handleAutoFill}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 rounded-lg text-xs font-medium text-blue-300 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          Use Template
        </button>
      </div>

      {/* Error Message */}
      {promptError && (
        <div className="bg-red-900/20 rounded-lg p-3 border border-red-700/50">
          <p className="text-xs text-red-300">{promptError}</p>
        </div>
      )}

      {/* Prompt Segments - Dynamic segment duration */}
      <div className="space-y-3">
        {Array.from({ length: segments }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-purple-300">
                Segment {idx + 1} / {segments} (~{maxPerVideo}s)
              </label>
              <span className="text-xs text-gray-500">
                {(idx + 1) * maxPerVideo}s
              </span>
            </div>
            <textarea
              value={prompts[idx] || ''}
              onChange={(e) => handlePromptChange(idx, e.target.value)}
              placeholder={`Describe the action for segment ${idx + 1}...`}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
              rows="3"
            />
            {prompts[idx] && (
              <div className="text-xs text-gray-400">
                {prompts[idx].length} characters
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
        <p className="text-xs text-gray-400">
          💡 <strong>Pro tip:</strong> Mention specific details like clothing, accessories, emotions, camera angles, and movements for better results.
        </p>
      </div>
    </div>
  );
}

// Step 3: Video Generation Component
function VideoGenerationStep({
  duration,
  scenario,
  prompts,
  selectedImage,
  onBack,
  isGenerating,
  onGenerate,
  videoProvider,  // 💫 NEW: Added parameter
  generatedVideos = [],  // 💫 NEW: Display generated videos
  uploadToDrive = false,  // 💫 NEW: Drive upload flag
  onUploadToDriveChange = () => {}  // 💫 NEW: Drive upload handler
}) {
  const segments = calculateSegmentCount(videoProvider, duration);  // 💫 FIXED: Dynamic based on provider
  const scen = VIDEO_SCENARIOS.find(s => s.value === scenario);
  const [expandedSegment, setExpandedSegment] = useState(0);

  return (
    <div className="space-y-4">
      {/* 💫 NEW: Show generated videos if available */}
      {generatedVideos.length > 0 && (
        <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/50">
          <h3 className="text-sm font-semibold text-green-300 mb-3">✅ Generated Video Segments</h3>
          <div className="space-y-2">
            {generatedVideos.map((video) => (
              <div key={video.segmentNum} className="bg-gray-800/50 rounded p-3 border border-green-700/30 flex items-center justify-between">
                <div className="text-xs">
                  <div className="text-green-300 font-semibold">
                    📹 Segment {video.segmentNum}: {video.filename}
                  </div>
                  <div className="text-gray-400 mt-1">{video.prompt.substring(0, 60)}...</div>
                </div>
                <a
                  href={video.url}
                  download
                  className="flex items-center gap-1 px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-xs font-medium text-white transition"
                >
                  <Download className="w-3 h-3" />
                  Download
                </a>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-green-300">
            ✅ {generatedVideos.length} of {segments} videos ready | All files can be downloaded and merged
          </div>
        </div>
      )}

      {/* Video Settings Summary */}
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg p-4 border border-purple-700/50">
        <h3 className="text-sm font-semibold text-purple-300 mb-3">📹 Video Configuration</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Duration:</span>
            <div className="text-purple-300 font-medium">{duration}s ({segments} segments)</div>
          </div>
          <div>
            <span className="text-gray-500">Scenario:</span>
            <div className="text-purple-300 font-medium">{scen?.label}</div>
          </div>
        </div>
      </div>

      {/* Source Image - FIXED: Changed object-cover to object-contain for proper fit */}
      {selectedImage && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400">Source Image</label>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            <div className="aspect-square flex items-center justify-center bg-gray-950">
              <img
                src={selectedImage}
                alt="Source"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Script Preview */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          Video Script ({segments} segments)
        </h3>
        <div className="space-y-2">
          {prompts.map((prompt, idx) => {
            // Handle both string and object formats
            const scriptText = typeof prompt === 'string' ? prompt : (prompt?.script || '');
            return (
              <div key={idx} className="border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedSegment(expandedSegment === idx ? -1 : idx)}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 transition flex items-center justify-between text-xs font-medium text-white"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 font-bold">Seg {idx + 1}</span>
                    <span className="text-gray-400">{scriptText.substring(0, 40)}...</span>
                  </div>
                  {expandedSegment === idx ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                
                {expandedSegment === idx && (
                  <div className="bg-gray-800 p-3 border-t border-gray-700">
                    <p className="text-xs text-gray-300 leading-relaxed">{scriptText}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 💫 NEW: Google Drive Upload Option */}
      <div className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 rounded-lg p-3 border border-blue-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={uploadToDrive}
            onChange={(e) => onUploadToDriveChange(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-700 border-gray-600 checked:bg-blue-600"
          />
          <div>
            <div className="text-xs font-semibold text-white">☁️ Upload Generated Videos to Google Drive</div>
            <div className="text-xs text-gray-300">Save videos to Drive: Uploaded → App → Videos</div>
          </div>
        </label>
      </div>

      {/* Generation Info */}
      <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-700/50">
        <p className="text-xs text-yellow-300">
          ⏱️ <strong>Important:</strong> Grok supports ~10 seconds per segment. Your video will be generated as {segments} separate clips that will be combined.
        </p>
      </div>
    </div>
  );
}

// Main Component
export default function VideoGenerationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedScenario, setSelectedScenario] = useState('product-intro');
  const [videoProvider, setVideoProvider] = useState('grok');  // 💫 NEW: Video provider selection
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9'); // 💫 NEW: Aspect ratio (16:9 or 9:16)
  const [prompts, setPrompts] = useState(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFinalPrompt, setShowFinalPrompt] = useState(true);
  const [currentImage, setCurrentImage] = useState(null);
  const [promptType, setPromptType] = useState('enhanced'); // 'template' or 'enhanced' (ChatGPT)
  const [selectedSegment, setSelectedSegment] = useState(null); // ✨ NEW: For ChatGPT segment detail view
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(-1); // ✨ NEW: Selected segment index
  const [generatedVideos, setGeneratedVideos] = useState([]); // 💫 NEW: Store generated video segments
  const [generated, setGenerated] = useState(false); // 💫 NEW: Track if videos were generated
  const imageInputRef = useRef(null);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false); // 💫 NEW: Gallery picker
  const [uploadToDrive, setUploadToDrive] = useState(false); // 💫 NEW: Drive upload option
  const [driveUploadStatus, setDriveUploadStatus] = useState(null); // 💫 NEW: Drive upload status
  const [scenarioImages, setScenarioImages] = useState({  // 💫 NEW: Scenario-specific image uploads
    characterWearing: null,
    characterHolding: null,
    productReference: null
  });

  // 💫 NEW: Get scenario config from selectedScenario
  const scenario = VIDEO_SCENARIOS.find(s => s.value === selectedScenario);

  // Handler for scenario images change
  const handleScenarioImagesChange = (images) => {
    setScenarioImages(images);
  };

  // Get selected image from location state
  const initialImage = location.state?.image;
  const characterImage = location.state?.characterImage;
  const productImage = location.state?.productImage;

  // Initialize with passed image or allow upload
  useEffect(() => {
    if (initialImage) {
      setCurrentImage(initialImage);
    }
  }, [initialImage]);

  const handleImageChange = (imageData) => {
    setCurrentImage(imageData);
  };

  // ✨ NEW: Handle segment selection from ChatGPT component
  const handleSegmentSelect = (segment, index) => {
    setSelectedSegment(segment);
    setSelectedSegmentIndex(index);
  };

  const handleGenerateVideo = async () => {
    if (!currentImage) {
      alert('Please upload or select an image');
      return;
    }

    setIsGenerating(true);
    setGenerated(false);
    try {
      // Extract scripts from prompts (handles both string and object formats)
      const scripts = (prompts || []).map(p => {
        if (typeof p === 'string') return p;
        if (typeof p === 'object' && p?.script) return p.script;
        return '';
      });

      // Prepare video generation request
      const videoData = {
        videoProvider,  // 💫 Include video provider selection
        duration: selectedDuration,
        scenario: selectedScenario,
        aspectRatio: selectedAspectRatio, // 💫 NEW: Include aspect ratio
        segments: scripts,
        sourceImage: currentImage,
        characterImage,
        productImage
      };

      console.log('📹 Starting video generation with provider:', videoProvider);
      console.log('   Video data:', videoData);

      // Call backend API using browserAutomationAPI
      const response = await browserAutomationAPI.generateVideo(videoData);
      
      if (response?.success && response?.data) {
        console.log('✅ Video generation complete:', response.data);
        
        // 💫 Handle new segment-based response structure
        const { generatedVideos = [], totalVideos, totalSegments, outputDir, message } = response.data;
        
        if (Array.isArray(generatedVideos) && generatedVideos.length > 0) {
          console.log(`📊 Generated ${generatedVideos.length} video segments`);
          console.log('   Segments:', generatedVideos);
          
          // Store generated videos info
          setGeneratedVideos(generatedVideos);  // If you have this state
          // 💫 NEW: Mark as generated
          setGenerated(true);
          
          // 💫 NEW: Upload to Google Drive if enabled
          if (uploadToDrive) {
            await handleUploadVideosToGoogleDrive(generatedVideos);
          }
          
          // Show success message with segment info
          alert(`✅ Success! Generated ${totalVideos} of ${totalSegments} video segments.\n\nOutput directory: ${outputDir}`);
          
          // Optionally reset form and advance step
          setCurrentStep(3);  // Move to generate step to show results
        }
      } else {
        throw new Error(response?.error || 'Video generation failed');
      }
    } catch (error) {
      console.error('❌ Video generation failed:', error);
      alert(`❌ Video generation error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 💫 NEW: Upload videos to Google Drive
  const handleUploadVideosToGoogleDrive = async (videos) => {
    try {
      setDriveUploadStatus('Uploading videos to Google Drive...');
      
      const successfulUploads = [];
      
      for (const video of videos) {
        try {
          // Fetch video file from server
          const response = await fetch(video.url);
          if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
          
          const blob = await response.blob();
          const file = new File([blob], video.filename, { type: 'video/mp4' });
          
          // Upload to Google Drive
          await driveAPI.uploadFile(file, {
            description: `Video segment ${video.segmentNum} from Smart Wardrobe\nPrompt: ${video.prompt.substring(0, 100)}...`,
            metadata: {
              type: 'video',
              segmentNum: video.segmentNum,
              generatedAt: new Date().toISOString(),
              provider: videoProvider
            }
          });
          
          console.log(`✅ Uploaded video: ${video.filename}`);
          successfulUploads.push(video.filename);
        } catch (error) {
          console.error(`❌ Failed to upload video ${video.filename}:`, error);
        }
      }
      
      // 💫 NEW: Remove temporary files after successful upload
      if (successfulUploads.length > 0) {
        try {
          for (const filename of successfulUploads) {
            await fetch('/api/v1/browser-automation/delete-temp-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename })
            });
            console.log(`🗑️  Removed temp file: ${filename}`);
          }
        } catch (error) {
          console.warn(`⚠️  Could not remove temp files: ${error.message}`);
        }
      }
      
      setDriveUploadStatus(`✅ Successfully uploaded ${successfulUploads.length} video(s) to Google Drive!`);
      setTimeout(() => setDriveUploadStatus(null), 5000);
    } catch (error) {
      console.error('❌ Google Drive upload failed:', error);
      setDriveUploadStatus(`❌ Upload failed: ${error.message}`);
    }
  };

  const handleReset = () => {
    navigate('/virtual-tryon');
  };

  return (
    <div className="bg-gray-900 text-white flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 flex-shrink-0 h-14">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-400" />
            <span className="font-bold">Video Generation</span>
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
                      isActive ? 'bg-blue-600 text-white' : 
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

          <button onClick={handleReset} className="p-1.5 bg-gray-700 rounded hover:bg-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 💫 NEW: Gallery Picker Modal */}
      <GalleryPicker
        isOpen={showGalleryPicker}
        onClose={() => setShowGalleryPicker(false)}
        onSelect={(item) => {
          handleImageChange(item.url);
          setShowGalleryPicker(false);
        }}
        mediaType="image"
        title="Select Image for Video"
      />

      {/* Main Content - Flex container with scrollable content and fixed bottom buttons */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Main Content Area - Scrollable */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Settings (Compact) */}
          <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto flex-shrink-0">
            <div className="p-3 space-y-3">
              {currentStep === 1 && (
                <VideoSettingsStep
                  onNext={() => setCurrentStep(2)}
                  selectedDuration={selectedDuration}
                  onDurationChange={setSelectedDuration}
                  selectedScenario={selectedScenario}
                  onScenarioChange={setSelectedScenario}
                  onImageChange={handleImageChange}
                  videoProvider={videoProvider}
                  onVideoProviderChange={setVideoProvider}
                  selectedAspectRatio={selectedAspectRatio}  // 💫 NEW: Pass aspect ratio
                  onAspectRatioChange={setSelectedAspectRatio}  // 💫 NEW: Pass aspect ratio handler
                  scenarioImages={scenarioImages}  // 💫 NEW: Pass scenario images
                  onScenarioImagesChange={handleScenarioImagesChange}  // 💫 NEW: Pass handler
                />
              )}

              {currentStep === 2 && (
                <div className="space-y-3">
                  {/* Prompt Type Selector */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">📝 Prompt Generation Mode</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPromptType('template')}
                        className={`p-2 rounded-lg border-2 transition text-sm ${
                          promptType === 'template'
                            ? 'border-blue-500 bg-blue-600/20'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        📋 Template
                      </button>
                      <button
                        onClick={() => setPromptType('enhanced')}
                        className={`p-2 rounded-lg border-2 transition text-sm ${
                          promptType === 'enhanced'
                            ? 'border-purple-500 bg-purple-600/20'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        ✨ ChatGPT
                      </button>
                    </div>
                  </div>

                  {/* Render selected prompt generation component */}
                  {promptType === 'template' ? (
                    <VideoPromptStepWithTemplates
                      onNext={() => setCurrentStep(3)}
                      duration={selectedDuration}
                      scenario={selectedScenario}
                      prompts={prompts}
                      onPromptsChange={setPrompts}
                      selectedImage={currentImage}
                      isGenerating={isGenerating}
                      videoProvider={videoProvider}
                    />
                  ) : (
                    <VideoPromptStep
                      onNext={() => setCurrentStep(3)}
                      duration={selectedDuration}
                      scenario={selectedScenario}
                      prompts={prompts}
                      onPromptsChange={setPrompts}
                      selectedImage={currentImage}
                      isGenerating={isGenerating}
                      videoProvider={videoProvider}
                      scenarioImages={scenarioImages}  // 💫 NEW: Pass scenario images
                    />
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <VideoGenerationStep
                  duration={selectedDuration}
                  scenario={selectedScenario}
                  prompts={prompts}
                  selectedImage={currentImage}
                  onBack={() => setCurrentStep(2)}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerateVideo}
                  videoProvider={videoProvider}
                  generatedVideos={generatedVideos}  // 💫 NEW: Pass generated videos
                />
              )}
            </div>
          </div>

          {/* Center - Main Content Area */}
          <div className="flex-1 bg-gray-900 overflow-y-auto">
            <div className="p-4">
              {/* Step 1 - Script Template & Image Upload */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  {/* Scenario Details - Script Template */}
                  {scenario && (
                    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-700/50">
                      <h4 className="text-sm font-semibold text-blue-300 mb-3">📝 Script Template for {scenario.label}</h4>
                      <p className="text-xs text-blue-300 mb-3">This scenario needs {scenario.imageSchema ? Object.values(scenario.imageSchema).filter(img => img.required).length : 1} required + {scenario.imageSchema ? Object.values(scenario.imageSchema).filter(img => !img.required).length : 0} optional images</p>
                      <div className="space-y-2">
                        {scenario.scriptTemplate.map((template, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                            <span className="text-blue-400 font-bold">Seg {idx + 1}:</span>
                            <span>{template}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scenario-Based Image Upload Component */}
                  <ScenarioImageUploadComponent
                    scenario={selectedScenario}
                    onImagesChange={handleScenarioImagesChange}
                    imagePreviewUrls={scenarioImages}
                    disabled={false}
                  />
                </div>
              )}
              {currentStep === 2 && promptType === 'enhanced' && selectedSegment && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        Segment {selectedSegmentIndex + 1}: {selectedSegment.name || 'Unnamed'}
                      </h2>
                      <p className="text-gray-400 text-sm">Duration: {selectedSegment.duration}s</p>
                    </div>
                  </div>

                  {/* Segment Details - 5 Column Layout */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Script */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">📝 Script</label>
                      <textarea
                        readOnly
                        value={selectedSegment.script || ''}
                        className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono resize-none"
                        placeholder="Script content..."
                      />
                    </div>

                    {/* Movements */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">🎬 Movements</label>
                      <textarea
                        readOnly
                        value={selectedSegment.movements || ''}
                        className="w-full h-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 resize-none"
                        placeholder="Movement details..."
                      />
                    </div>

                    {/* Camera Work */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">📸 Camera Work</label>
                      <textarea
                        readOnly
                        value={selectedSegment.cameraWork || ''}
                        className="w-full h-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 resize-none"
                        placeholder="Camera angles..."
                      />
                    </div>

                    {/* Lighting */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">💡 Lighting</label>
                      <textarea
                        readOnly
                        value={selectedSegment.lighting || ''}
                        className="w-full h-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 resize-none"
                        placeholder="Lighting setup..."
                      />
                    </div>

                    {/* Music/Audio */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">🎵 Music/Audio</label>
                      <textarea
                        readOnly
                        value={selectedSegment.music || ''}
                        className="w-full h-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 resize-none"
                        placeholder="Music or audio details..."
                      />
                    </div>
                  </div>

                  {/* Segment Navigation */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => {
                        const prevIdx = selectedSegmentIndex - 1;
                        if (prompts && prevIdx >= 0 && prevIdx < prompts.length) {
                          handleSegmentSelect(prompts[prevIdx], prevIdx);
                        }
                      }}
                      disabled={selectedSegmentIndex === 0}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-white"
                    >
                      ← Previous Segment
                    </button>
                    <button
                      onClick={() => {
                        const nextIdx = selectedSegmentIndex + 1;
                        if (prompts && nextIdx < prompts.length) {
                          handleSegmentSelect(prompts[nextIdx], nextIdx);
                        }
                      }}
                      disabled={!prompts || selectedSegmentIndex >= prompts.length - 1}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-white"
                    >
                      Next Segment →
                    </button>
                  </div>
                </div>
              )}

              {/* Default Step 2 Content - No Segment Selected */}
              {currentStep === 2 && (!selectedSegment || promptType !== 'enhanced') && (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-bold text-white mb-2">Step 2: Write Your Script</h2>
                  <p className="text-gray-400 mb-4">Select a segment from the left panel to view or edit its details</p>
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 inline-block">
                    <p className="text-gray-500 text-sm">👈 Click on a segment in the left sidebar to get started</p>
                  </div>
                </div>
              )}

              {/* 💫 FIXED: Step 3 - Generated Videos in CENTER with Preview */}
              {currentStep === 3 && generatedVideos.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">✅ Generated Video Segments</h2>
                    <p className="text-gray-400">Preview your video clips or download them</p>
                  </div>

                  <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/50">
                    <div className="grid grid-cols-1 gap-4">
                      {generatedVideos.map((video) => {
                        // 💫 FIXED: Build preview URL with fallback using correct path
                        const previewUrl = video.previewUrl || (
                          video.path ? `/api/v1/browser-automation/preview-video/${video.filename}?path=${encodeURIComponent(video.path)}` : null
                        );
                        
                        // 💫 DEBUG: Log URL for troubleshooting
                        console.log(`📹 Segment ${video.segmentNum}:`, {
                          filename: video.filename,
                          path: video.path,
                          previewUrl: video.previewUrl,
                          fallbackUrl: previewUrl
                        });

                        return (
                        <div key={video.segmentNum} className="bg-gray-800/50 rounded-lg border border-green-700/30 overflow-hidden">
                          {/* Video Preview */}
                          <div className="relative bg-black aspect-video flex items-center justify-center">
                            {previewUrl ? (
                              <>
                                <video
                                  key={previewUrl}
                                  controls
                                  className="w-full h-full object-contain"
                                  src={previewUrl}
                                  onError={(e) => {
                                    console.error(`❌ Video load error for ${video.filename}:`, e);
                                    console.error('   Tried URL:', previewUrl);
                                  }}
                                  onLoadStart={() => console.log(`✓ Loading ${video.filename}`)}
                                  onCanPlay={() => console.log(`✓ Can play ${video.filename}`)}
                                >
                                  Your browser does not support the video tag.
                                </video>
                              </>
                            ) : (
                              <div className="text-gray-400 text-center p-4">
                                <p className="text-lg mb-2">📹 Segment {video.segmentNum}</p>
                                <p className="text-sm text-gray-500">{video.filename}</p>
                                <p className="text-xs text-gray-600 mt-2">⚠️ No path available</p>
                              </div>
                            )}
                          </div>

                          {/* Video Details */}
                          <div className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-green-300 font-semibold flex items-center gap-2">
                                  <span className="text-sm bg-green-700/30 px-2 py-1 rounded">Segment {video.segmentNum}</span>
                                  <span className="text-xs text-gray-400 font-normal">{video.filename}</span>
                                </div>
                                <div className="text-gray-400 text-xs mt-2 line-clamp-2">
                                  {video.prompt}
                                </div>
                              </div>
                              <a
                                href={video.url}
                                download={video.filename}
                                className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 rounded text-sm font-medium text-white transition flex-shrink-0 ml-4 whitespace-nowrap"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </a>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-4 border-t border-green-700/30 text-sm text-green-300">
                      ✅ {generatedVideos.length} of {calculateSegmentCount(videoProvider, selectedDuration)} video segments ready
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Summary */}
        <div className="w-56 bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Configuration</h3>
              <div className="bg-gray-700/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Duration:</span>
                  <span className="text-purple-300 font-medium">{selectedDuration}s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Scenario:</span>
                  <span className="text-purple-300 font-medium">
                    {VIDEO_SCENARIOS.find(s => s.value === selectedScenario)?.label}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Segments:</span>
                  <span className="text-purple-300 font-medium">
                    {calculateSegmentCount(videoProvider, selectedDuration)}  {/* 💫 FIXED: Dynamic calculation */}
                  </span>
                </div>
              </div>
            </div>

            {currentStep >= 2 && prompts && Array.isArray(prompts) && prompts.some(p => {
              // Handle both string prompts and object prompts
              if (typeof p === 'string') return p.trim().length > 0;
              if (typeof p === 'object' && p?.script) return p.script.trim().length > 0;
              return false;
            }) && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Script Summary</h3>
                <div className="bg-gray-700/30 rounded-lg p-3 space-y-2">
                  {prompts.map((prompt, idx) => {
                    const scriptText = typeof prompt === 'string' ? prompt : prompt?.script || '';
                    return scriptText.trim().length > 0 && (
                      <div key={idx} className="text-xs">
                        <div className="text-gray-500 mb-1">Seg {idx + 1}:</div>
                        <div className="text-gray-400 line-clamp-3">{scriptText}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* ==================== FIXED BOTTOM ACTION BAR ==================== */}
      <div className="flex-shrink-0 bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Status Messages */}
          <div className="text-xs text-gray-400">
            {currentStep === 1 && '⬆️ Select video settings in the left panel'}
            {currentStep === 2 && '✍️ Write your video script (3 segments)'}
            {currentStep === 3 && '🚀 Ready to generate video'}
            {isGenerating && '⏳ Video generation in progress...'}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 1 && !isGenerating && (
              <button
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium text-white"
              >
                Back
              </button>
            )}

            {currentStep === 1 && (
              <button
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-sm font-medium text-white"
              >
                <span>Continue to Script</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                onClick={() => setCurrentStep(3)}
                disabled={isGenerating || prompts.some(p => {
                  // 💫 FIXED: Handle both string and object formats
                  if (!p) return true;
                  if (typeof p === 'string') return p.trim().length === 0;
                  if (typeof p === 'object' && p?.script) return !p.script || p.script.trim().length === 0;
                  return true;
                })}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-white"
              >
                <span>Review & Generate</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating || !currentImage}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    <span>{generated ? 'Re-generate Video' : 'Create Video'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

