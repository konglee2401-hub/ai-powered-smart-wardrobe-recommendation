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
  Play, Pause, Volume2, VolumeX, Download, Copy, Sparkles, Plus, X, Upload, Database

} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, browserAutomationAPI } from '../services/api';
import GalleryPicker from '../components/GalleryPicker';
import ScenarioImageUploadComponent from '../components/ScenarioImageUploadComponent';  // 💫 NEW
import SessionLogModal from '../components/SessionLogModal';
import PageHeaderBar from '../components/PageHeaderBar';
import driveAPI from '../services/driveAPI';
import { captureGenerationSession } from '../services/generationSessionsService';
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
import { useTranslation } from 'react-i18next';

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
  scenarioImages = {},
  onScenarioImagesChange = () => {},
  videoProvider, 
  onVideoProviderChange, 
  selectedAspectRatio, 
  onAspectRatioChange 
}) {
  const scenario = VIDEO_SCENARIOS.find(s => s.value === selectedScenario);
  const availableDurations = getAvailableDurations(videoProvider);
  const maxDuration = getMaxDurationForProvider(videoProvider);
  const maxPerVideo = VIDEO_PROVIDER_LIMITS[videoProvider]?.maxDurationPerVideo || 10;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Provider</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {VIDEO_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => onVideoProviderChange(provider.id)}
              className={[
                'apple-option-chip apple-option-chip-cool flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition',
                videoProvider === provider.id ? 'apple-option-chip-selected' : 'border-slate-700/70 text-slate-300'
              ].join(' ')}
            >
              <span className="text-sm font-semibold">{provider.label}</span>
              <span className="text-xs text-slate-400">{provider.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 py-2 text-xs text-slate-400">
          Up to <span className="font-semibold text-slate-100">{maxPerVideo}s</span> per clip and <span className="font-semibold text-slate-100">{maxDuration}s</span> total.
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-slate-900/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Aspect Ratio</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { id: '16:9', label: '16:9', meta: 'Landscape' },
            { id: '9:16', label: '9:16', meta: 'Vertical' }
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onAspectRatioChange(option.id)}
              className={[
                'apple-option-chip apple-option-chip-violet rounded-xl border px-3 py-3 text-left transition',
                selectedAspectRatio === option.id ? 'apple-option-chip-selected' : 'border-slate-700/70 text-slate-300'
              ].join(' ')}
            >
              <div className="text-sm font-semibold">{option.label}</div>
              <div className="mt-1 text-xs text-slate-400">{option.meta}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-slate-900/35 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Duration</p>
        <div className="mt-3 space-y-2">
          {availableDurations.map((duration) => {
            const videoCount = calculateVideoCount(videoProvider, duration.value);
            return (
              <button
                key={duration.value}
                type="button"
                onClick={() => onDurationChange(duration.value)}
                className={[
                  'apple-option-chip apple-option-chip-warm flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition',
                  selectedDuration === duration.value ? 'apple-option-chip-selected' : 'border-slate-700/70 text-slate-300'
                ].join(' ')}
              >
                <div>
                  <div className="text-sm font-semibold">{duration.label}</div>
                  <div className="mt-1 text-xs text-slate-400">{videoCount} clips</div>
                </div>
                <span className="text-xs text-slate-500">{maxPerVideo}s/clip</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-slate-900/35 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Scenario</p>
          <span className="rounded-full border border-slate-600/70 bg-slate-800/80 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
            {scenario?.scriptTemplate?.length || calculateSegmentCount(videoProvider, selectedDuration)} segments
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {VIDEO_SCENARIOS.map((scen) => (
            <button
              key={scen.value}
              type="button"
              onClick={() => onScenarioChange(scen.value)}
              className={[
                'apple-option-chip flex w-full flex-col items-start rounded-xl border px-3 py-3 text-left transition',
                selectedScenario === scen.value ? 'apple-option-chip-selected apple-option-chip-cool' : 'border-slate-700/70 text-slate-300'
              ].join(' ')}
            >
              <span className="text-sm font-semibold">{scen.label}</span>
              <span className="mt-1 text-xs text-slate-400">{scen.description}</span>
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
      formData.append('language', i18n.language || 'en');  // 💫 Pass language for Vietnamese support
      
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
          '16:9',
          i18n.language || 'en'  // 💫 Pass language for Vietnamese support
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
  onUploadToDriveChange = () => {},  // 💫 NEW: Drive upload handler
  scenarioImages = {}  // 💫 NEW: Scenario images preview
}) {
  const segments = calculateSegmentCount(videoProvider, duration);  // 💫 FIXED: Dynamic based on provider

  return (
    <div className="space-y-4 max-w-2xl">
      {/*  Source Image Preview - MINIMAL DISPLAY */}
      {selectedImage && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400">📸 Main Source Image</label>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            <div className="aspect-video flex items-center justify-center bg-gray-950">
              <img
                src={selectedImage}
                alt="Source"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* 💫 CLEAN: Google Drive Upload Option - Main Action */}
      <div className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 rounded-lg p-4 border border-blue-700 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={uploadToDrive}
            onChange={(e) => onUploadToDriveChange(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-700 border-gray-600 checked:bg-blue-600 cursor-pointer"
          />
          <div>
            <div className="text-sm font-semibold text-white">☁️ Upload Videos to Google Drive</div>
            <div className="text-xs text-gray-300">Save all generated videos: My Drive → Uploaded → App → Videos</div>
          </div>
        </label>
      </div>

      {/* 💫 INFO: Generation Details */}
      <div className="bg-amber-900/20 rounded-lg p-3 border border-amber-700/50 text-xs text-amber-300">
        <p>
          ℹ️ <strong>Ready to generate:</strong> {segments} segments ({duration}s total) with {videoProvider === 'grok' ? 'Grok' : 'ChatGPT'} API
        </p>
      </div>
    </div>
  );
}

// Main Component
export default function VideoGenerationPage() {
  const { t, i18n } = useTranslation();
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
  const [videoUploadStatuses, setVideoUploadStatuses] = useState({}); // 💫 NEW: Per-video upload status tracking
  const [uploadNotification, setUploadNotification] = useState(null); // 💫 NEW: Upload notifications
  const [scenarioImages, setScenarioImages] = useState({  // 💫 NEW: Scenario-specific image uploads
    characterWearing: null,
    characterHolding: null,
    productReference: null
  });
  const [showSessionLogModal, setShowSessionLogModal] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState(null);

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

  // 💫 NEW: Auto-clear upload notification after duration expires
  useEffect(() => {
    if (uploadNotification) {
      const timer = setTimeout(() => {
        setUploadNotification(null);
      }, uploadNotification.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadNotification]);

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
    let flowId = null;
    try {
      // 💫 NEW: Initialize backend session to get flowId
      console.log('\n📝 Initializing backend session...');
      try {
        const sessionResponse = await fetch('/api/sessions/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flowType: 'video-generation',
            useCase: selectedScenario
          })
        });

        if (!sessionResponse.ok) {
          throw new Error(`Session creation failed: ${sessionResponse.status}`);
        }

        const sessionData = await sessionResponse.json();
        flowId = sessionData.data?.flowId || sessionData.data?.sessionId;
        console.log(`✅ Session created: ${flowId}`);
        setSelectedFlowId(flowId);  // Enable Preview Session button
        await captureGenerationSession(flowId, {
          flowType: 'video-generation',
          useCase: selectedScenario,
          status: 'in-progress',
          analysis: {
            videoRequest: {
              provider: videoProvider,
              duration: selectedDuration,
              scenario: selectedScenario,
              aspectRatio: selectedAspectRatio,
              segments: (prompts || []).map((prompt) => (typeof prompt === 'string' ? prompt : prompt?.script || '')),
            },
          },
          log: {
            category: 'video-generation',
            message: 'Video generation requested',
            details: {
              provider: videoProvider,
              duration: selectedDuration,
              scenario: selectedScenario,
            },
          },
        });
      } catch (sessionError) {
        console.warn(`⚠️ Could not create backend session (non-blocking):`, sessionError.message);
        // Continue without session logging
      }

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
        productImage,
        flowId,  // 💫 Pass flowId to backend
        language: i18n.language || 'en'  // 💫 Pass language for Vietnamese support
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
          if (flowId) {
            await captureGenerationSession(flowId, {
              flowType: 'video-generation',
              useCase: selectedScenario,
              status: 'completed',
              artifacts: {
                videoSegmentPaths: generatedVideos.map((video) => video.path || video.url).filter(Boolean),
              },
              analysis: {
                videoResult: {
                  provider: videoProvider,
                  generatedCount: generatedVideos.length,
                  totalVideos,
                  totalSegments,
                  outputDir,
                },
              },
              metricStage: {
                stage: 'video-generation',
                status: 'completed',
                endTime: new Date(),
              },
              log: {
                category: 'video-generation',
                message: `Generated ${generatedVideos.length} video segment(s) successfully`,
              },
            });
          }
          
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
      if (flowId) {
        await captureGenerationSession(flowId, {
          flowType: 'video-generation',
          useCase: selectedScenario,
          error: {
            stage: 'video-generation',
            message: error.message || 'Video generation failed',
          },
          log: {
            level: 'error',
            category: 'video-generation',
            message: error.message || 'Video generation failed',
          },
        });
      }
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

  // 💫 NEW: Simplified upload function for manual upload after generation
  const uploadToGoogleDrive = async (videoPaths) => {
    const videosToUpload = generatedVideos.filter(v => videoPaths.includes(v.path || v.url));
    
    for (const video of videosToUpload) {
      try {
        // Update status to uploading
        setVideoUploadStatuses(prev => ({
          ...prev,
          [video.filename]: { status: 'uploading', message: 'Uploading...' }
        }));

        // Fetch video file from server
        const response = await fetch(video.url);
        if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
        
        const blob = await response.blob();
        const file = new File([blob], video.filename, { type: 'video/mp4' });
        
        // Upload to Google Drive
        const uploadResponse = await driveAPI.uploadFile(file, {
          description: `Video segment ${video.segmentNum} from Smart Wardrobe\nPrompt: ${video.prompt.substring(0, 100)}...`,
          metadata: {
            type: 'video',
            segmentNum: video.segmentNum,
            generatedAt: new Date().toISOString(),
            provider: videoProvider
          }
        });

        // Check if file already exists
        if (uploadResponse?.error?.includes('already exists') || uploadResponse?.message?.includes('duplicate')) {
          setVideoUploadStatuses(prev => ({
            ...prev,
            [video.filename]: { status: 'exists', message: '📌 Already exists on Drive' }
          }));
          setUploadNotification({ type: 'warning', message: `📌 "${video.filename}" already exists on Google Drive`, duration: 5000 });
        } else {
          setVideoUploadStatuses(prev => ({
            ...prev,
            [video.filename]: { status: 'success', message: '✅ Uploaded' }
          }));
          setUploadNotification({ type: 'success', message: `✅ "${video.filename}" uploaded successfully!`, duration: 3000 });
          
          console.log(`✅ Uploaded video: ${video.filename}`);
        }
      } catch (error) {
        console.error(`❌ Failed to upload video ${video.filename}:`, error);
        setVideoUploadStatuses(prev => ({
          ...prev,
          [video.filename]: { status: 'error', message: `❌ ${error.message}` }
        }));
        setUploadNotification({ type: 'error', message: `❌ Failed to upload "${video.filename}": ${error.message}`, duration: 5000 });
      }
    }
  };

  const handleReset = () => {
    navigate('/virtual-tryon');
  };

  return (
    <div className="image-generation-shell -mx-5 -mb-5 -mt-5 grid min-h-0 grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden text-[13px] text-white lg:-mx-6 lg:-mb-6 lg:-mt-6" data-main-body>
      <PageHeaderBar
        icon={<Video className="h-4 w-4 text-amber-300" />}
        title={t('videoGeneration.title')}
        meta={
          (VIDEO_SCENARIOS.find((s) => s.value === selectedScenario)?.label || selectedScenario)
          + ' | '
          + selectedDuration
          + 's | '
          + calculateSegmentCount(videoProvider, selectedDuration)
          + ' segments | '
          + (VIDEO_PROVIDERS.find((provider) => provider.id === videoProvider)?.label || videoProvider)
        }
        actions={(
          <button
            type="button"
            onClick={handleReset}
            className="apple-option-chip rounded-lg px-3 py-1.5 text-xs font-medium transition"
          >
            Reset
          </button>
        )}
        className="h-16"
      />

      <div className="min-h-0 overflow-hidden px-5 py-4 lg:px-6">
        <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="studio-card-shell p-3">
          <div className="flex flex-wrap gap-2">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => (isCompleted || isActive) && setCurrentStep(step.id)}
                  disabled={!isCompleted && !isActive}
                  className={[
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition',
                    isActive
                      ? 'apple-chip-step-active'
                      : isCompleted
                        ? 'apple-option-chip apple-option-chip-cool text-slate-700'
                        : 'apple-option-chip text-gray-500',
                  ].join(' ')}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{step.name}</span>
                </button>
              );
            })}
          </div>
        </div>

      {/* Upload Notification Banner */}
      {uploadNotification && (
        <div className={`rounded-lg border px-4 py-3 text-xs font-medium ${
          uploadNotification.type === 'success' ? 'bg-green-900/30 border-b border-green-700/50' :
          uploadNotification.type === 'warning' ? 'bg-yellow-900/30 border-b border-yellow-700/50' :
          'bg-red-900/30 border-b border-red-700/50'
        }`}>
          <p className={`text-xs font-medium ${
            uploadNotification.type === 'success' ? 'text-green-300' :
            uploadNotification.type === 'warning' ? 'text-yellow-300' :
            'text-red-300'
          }`}>
            {uploadNotification.message}
          </p>
        </div>
      )}

      {/* 💫 NEW: Gallery Picker Modal */}
      <GalleryPicker
        isOpen={showGalleryPicker}
        onClose={() => setShowGalleryPicker(false)}
        onSelect={(item) => {
          if (!item || !item.url) {
            console.error('❌ Invalid gallery item selected:', item);
            alert('Error: Selected item is missing image URL');
            return;
          }
          console.log(`📷 Gallery image selected for video:`, { assetId: item.assetId, name: item.name, url: item.url });
          handleImageChange(item.url);
          setShowGalleryPicker(false);
        }}
        assetType="image"
        title="Select Image for Video"
      />

      {/* Main Content - Flex container with scrollable content and fixed bottom buttons */}
      <div className="flex-1 min-h-0">
        {/* Main Content Area - Flex container */}
        <div className="grid h-full gap-4 xl:grid-cols-[260px_minmax(0,1fr)_240px]">
          {/* Left Sidebar - Compact Segment List or Settings */}
          <div className="studio-card-shell overflow-y-auto rounded-[1.25rem]">
            <div className="p-3 space-y-3">
              {/* 💫 NEW: Scenario Images Preview - Top of Left Sidebar (Step 2 & 3) */}
              {(currentStep === 2 || currentStep === 3) && scenarioImages && Object.values(scenarioImages).some(img => img) && (
                <div className="space-y-2 pb-3 border-b border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-300">🖼️ Images</h3>
                  <div className="space-y-2">
                    {scenarioImages.characterWearing?.preview && (
                      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                        <div className="w-full h-32 bg-gray-950 flex items-center justify-center">
                          <img src={scenarioImages.characterWearing.preview} alt="Character" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-xs text-gray-400 p-1.5">👤 Character</div>
                      </div>
                    )}
                    {scenarioImages.characterHolding?.preview && (
                      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                        <div className="w-full h-32 bg-gray-950 flex items-center justify-center">
                          <img src={scenarioImages.characterHolding.preview} alt="Product" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-xs text-gray-400 p-1.5">🤲 Product</div>
                      </div>
                    )}
                    {scenarioImages.productReference?.preview && (
                      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                        <div className="w-full h-32 bg-gray-950 flex items-center justify-center">
                          <img src={scenarioImages.productReference.preview} alt="Reference" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-xs text-gray-400 p-1.5">📦 Reference</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  selectedAspectRatio={selectedAspectRatio}
                  onAspectRatioChange={setSelectedAspectRatio}
                  scenarioImages={scenarioImages}
                  onScenarioImagesChange={handleScenarioImagesChange}
                />
              )}

              {currentStep === 2 && (
                <div className="studio-card-shell rounded-[1.1rem] p-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Segments</p>
                  <div className="space-y-2">
                    {(prompts || []).map((prompt, idx) => {
                      const previewText = (typeof prompt === 'string' ? prompt : prompt?.script || '').trim();
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSegmentSelect(prompt, idx)}
                          className={[
                            'w-full rounded-xl border px-3 py-3 text-left text-xs transition',
                            selectedSegmentIndex === idx
                              ? 'apple-option-chip apple-option-chip-selected apple-option-chip-violet'
                              : 'border-slate-700/70 bg-slate-950/30 text-slate-300 hover:border-slate-500'
                          ].join(' ')}
                        >
                          <div className="font-semibold text-slate-100">Segment {idx + 1}</div>
                          <div className="mt-1 truncate text-slate-400">{previewText || 'Empty'}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="studio-card-shell rounded-[1.1rem] p-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Configuration</p>
                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Duration</span>
                      <span>{selectedDuration}s</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Scenario</span>
                      <span>{scenario?.label || selectedScenario}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Provider</span>
                      <span>{VIDEO_PROVIDERS.find((provider) => provider.id === videoProvider)?.label || videoProvider}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Segments</span>
                      <span>{(prompts || []).length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center - Main Content Area (Full Width for editors) */}
          <div className="studio-card-shell min-w-0 overflow-y-auto rounded-[1.25rem]">
            <div className="p-4">
              {currentStep === 1 && (
                <div className="space-y-4">
                  {scenario && (
                    <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-slate-100">{scenario.label}</h4>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{scenario.description}</p>
                        </div>
                        <div className="flex gap-2 text-[11px] font-medium">
                          <span className="rounded-full border border-slate-600/70 bg-slate-800/80 px-3 py-1 text-slate-300">{scenario.scriptTemplate?.length || 0} segments</span>
                          <span className="rounded-full border border-slate-600/70 bg-slate-800/80 px-3 py-1 text-slate-300">{selectedAspectRatio}</span>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {scenario.scriptTemplate.map((template, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-700/70 bg-slate-900/50 px-3 py-3 text-xs text-slate-300">
                            <span className="mr-2 font-semibold text-slate-100">{idx + 1}.</span>
                            {template}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <ScenarioImageUploadComponent
                    scenario={selectedScenario}
                    onImagesChange={handleScenarioImagesChange}
                    imagePreviewUrls={scenarioImages}
                    disabled={false}
                  />
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPromptType('template')}
                        className={[
                          'rounded-xl px-3 py-3 text-sm font-semibold transition',
                          promptType === 'template'
                            ? 'apple-option-chip apple-option-chip-selected apple-option-chip-cool'
                            : 'border border-slate-700/70 bg-slate-900/40 text-slate-300'
                        ].join(' ')}
                      >
                        Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setPromptType('enhanced')}
                        className={[
                          'rounded-xl px-3 py-3 text-sm font-semibold transition',
                          promptType === 'enhanced'
                            ? 'apple-option-chip apple-option-chip-selected apple-option-chip-violet'
                            : 'border border-slate-700/70 bg-slate-900/40 text-slate-300'
                        ].join(' ')}
                      >
                        ChatGPT
                      </button>
                    </div>
                  </div>

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
                      scenarioImages={scenarioImages}
                    />
                  )}
                </div>
              )}

              {currentStep === 3 && !generated && (
                <VideoGenerationStep
                  duration={selectedDuration}
                  scenario={selectedScenario}
                  prompts={prompts}
                  selectedImage={currentImage}
                  onBack={() => setCurrentStep(2)}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerateVideo}
                  videoProvider={videoProvider}
                  generatedVideos={generatedVideos}
                  uploadToDrive={uploadToDrive}
                  onUploadToDriveChange={setUploadToDrive}
                  scenarioImages={scenarioImages}
                />
              )}

              {currentStep === 3 && generated && generatedVideos.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="mb-2 text-2xl font-bold text-white">Generated Video Segments</h2>
                    <p className="text-gray-400">Preview or download each clip.</p>
                  </div>

                  <div className="rounded-xl border border-green-700/30 bg-green-900/10 p-4">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {generatedVideos.map((video) => {
                        const previewUrl = video.previewUrl || (
                          video.path ? `/api/v1/browser-automation/preview-video/${video.filename}?path=${encodeURIComponent(video.path)}` : null
                        );

                        return (
                          <div key={video.segmentNum} className="flex flex-col overflow-hidden rounded-xl border border-green-700/30 bg-slate-900/60">
                            <div className="relative flex aspect-square flex-shrink-0 items-center justify-center bg-black">
                              {previewUrl ? (
                                <video
                                  key={previewUrl}
                                  controls
                                  className="h-full w-full object-contain"
                                  src={previewUrl}
                                  onError={(e) => {
                                    console.error(`Video load error for ${video.filename}:`, e);
                                  }}
                                >
                                  Your browser does not support the video tag.
                                </video>
                              ) : (
                                <div className="p-4 text-center text-gray-400">
                                  <p className="text-sm font-medium">Segment {video.segmentNum}</p>
                                  <p className="mt-1 text-xs text-gray-500">No preview path</p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-1 flex-col gap-2 p-3">
                              <div>
                                <div className="inline-flex rounded-full border border-green-500/20 bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-200">
                                  Segment {video.segmentNum}
                                </div>
                                <div className="mt-2 line-clamp-2 text-xs text-gray-400">
                                  {video.prompt}
                                </div>
                              </div>
                              <div className="mt-auto flex flex-col gap-2">
                                <a
                                  href={video.url}
                                  download={video.filename}
                                  className="flex items-center justify-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-600"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </a>
                                {!uploadToDrive && (
                                  <>
                                    {videoUploadStatuses[video.filename]?.status === 'success' ? (
                                      <button disabled className="rounded-lg bg-green-700 px-3 py-2 text-xs font-medium text-white">Uploaded</button>
                                    ) : videoUploadStatuses[video.filename]?.status === 'exists' ? (
                                      <button disabled className="rounded-lg bg-yellow-700 px-3 py-2 text-xs font-medium text-white">Exists</button>
                                    ) : videoUploadStatuses[video.filename]?.status === 'error' ? (
                                      <button
                                        onClick={() => uploadToGoogleDrive([video.path || video.url])}
                                        title={videoUploadStatuses[video.filename]?.message}
                                        className="rounded-lg bg-red-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-600"
                                      >
                                        Retry Upload
                                      </button>
                                    ) : videoUploadStatuses[video.filename]?.status === 'uploading' ? (
                                      <button disabled className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Uploading
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => uploadToGoogleDrive([video.path || video.url])}
                                        className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-600"
                                      >
                                        Upload
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 border-t border-green-700/30 pt-4 text-sm text-green-300">
                      {generatedVideos.length} / {calculateSegmentCount(videoProvider, selectedDuration)} segments ready
                    </div>

                    {!uploadToDrive && (
                      <div className="mt-4 border-t border-blue-700/30 pt-4">
                        <button
                          onClick={() => {
                            const videoPaths = generatedVideos.map((v) => v.path || v.url).filter(Boolean);
                            if (videoPaths.length > 0) {
                              uploadToGoogleDrive(videoPaths);
                            }
                          }}
                          className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
                        >
                          Upload All Videos to Drive
                        </button>
                      </div>
                    )}

                    {selectedFlowId && (
                      <div className="mt-4 border-t border-purple-700/30 pt-4">
                        <button
                          onClick={() => setShowSessionLogModal(true)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-purple-700"
                        >
                          <Database className="h-4 w-4" />
                          Preview Session
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="studio-card-shell overflow-y-auto rounded-[1.25rem] p-4">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Summary</p>
                <div className="mt-3 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Provider</span>
                    <span className="font-medium text-slate-100">{VIDEO_PROVIDERS.find((provider) => provider.id === videoProvider)?.label || videoProvider}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Scenario</span>
                    <span className="text-right font-medium text-slate-100">{scenario?.label || selectedScenario}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-medium text-slate-100">{selectedDuration}s</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Aspect</span>
                    <span className="font-medium text-slate-100">{selectedAspectRatio}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Segments</span>
                    <span className="font-medium text-slate-100">{calculateSegmentCount(videoProvider, selectedDuration)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Source</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/50">
                  <div className="aspect-[4/5] bg-slate-950/60">
                    {currentImage ? (
                      <img src={currentImage} alt="Source" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">
                        Upload a main input image in step 1.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {currentStep >= 2 && prompts && Array.isArray(prompts) && prompts.some((p) => {
                if (typeof p === 'string') return p.trim().length > 0;
                if (typeof p === 'object' && p?.script) return p.script.trim().length > 0;
                return false;
              }) && (
                <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Prompt Summary</p>
                  <div className="mt-3 space-y-3">
                    {prompts.map((prompt, idx) => {
                      const scriptText = typeof prompt === 'string' ? prompt : prompt?.script || '';
                      return scriptText.trim().length > 0 ? (
                        <div key={idx} className="rounded-xl border border-slate-700/70 bg-slate-900/40 px-3 py-3 text-xs">
                          <div className="mb-1 font-semibold text-slate-100">Segment {idx + 1}</div>
                          <div className="line-clamp-3 text-slate-400">{scriptText}</div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>

      <div className="apple-footer-bar z-20 flex h-[60px] flex-shrink-0 items-center px-5 lg:px-6">
        <div className="flex h-full w-full items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              {isGenerating
                ? 'Video generation in progress.'
                : currentStep === 1
                  ? 'Complete settings and upload inputs.'
                  : currentStep === 2
                    ? 'Finalize prompts for every segment.'
                    : 'Review and run video generation.'}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentStep > 1 && !isGenerating && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  className="apple-option-chip rounded-lg px-4 py-2 text-sm font-medium transition"
                >
                  Back
                </button>
              )}

              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="apple-cta-primary rounded-lg px-4 py-2 text-sm font-semibold transition"
                >
                  Continue to Prompt
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  disabled={isGenerating || prompts.some(p => {
                    if (!p) return true;
                    if (typeof p === 'string') return p.trim().length === 0;
                    if (typeof p === 'object' && p?.script) return !p.script || p.script.trim().length === 0;
                    return true;
                  })}
                  className="apple-cta-primary rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Review Output
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="button"
                  onClick={handleGenerateVideo}
                  disabled={isGenerating || !currentImage}
                  className="apple-cta-primary flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      <span>{generated ? 'Generate Again' : 'Create Video'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
        </div>
      </div>

      {/* Session Log Modal */}
      <SessionLogModal
        isOpen={showSessionLogModal}
        onClose={() => {
          setShowSessionLogModal(false);
          setSelectedFlowId(null);
        }}
        sessionId={selectedFlowId}
        flowId={selectedFlowId}
      />
    </div>
  );
}
