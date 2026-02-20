/**
 * AI Creative Studio - Video Generation from Images
 * - Step 1: Settings (Video Duration + Scenario)
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
import { browserAutomationAPI } from '../services/api';
import { VIDEO_DURATIONS, VIDEO_SCENARIOS } from '../constants/videoGeneration';

const STEPS = [
  { id: 1, name: 'Settings', icon: SettingsIcon },
  { id: 2, name: 'Prompt', icon: FileText },
  { id: 3, name: 'Generate', icon: Rocket },
];

// Step 1: Settings Component
function VideoSettingsStep({ onNext, selectedDuration, onDurationChange, selectedScenario, onScenarioChange, onImageChange }) {
  const scenario = VIDEO_SCENARIOS.find(s => s.value === selectedScenario);

  return (
    <div className="space-y-4">
      {/* Duration Selection */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Play className="w-4 h-4 text-purple-400" />
          Video Duration
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {VIDEO_DURATIONS.map(duration => (
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
                {duration.segments} × 10-second segments
              </div>
            </button>
          ))}
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

      {/* Scenario Details */}
      {scenario && (
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-700/50">
          <h4 className="text-xs font-semibold text-blue-300 mb-3">📝 Script Template for {scenario.label}</h4>
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

      {/* Upload File Input (Hidden) */}
      <input
        type="file"
        accept="image/*"
        id="video-image-upload"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              onImageChange(evt.target?.result);
            };
            reader.readAsDataURL(file);
          }
        }}
      />
    </div>
  );
}

// Step 2: Prompt Builder Component
function VideoPromptStep({ 
  onNext, 
  duration, 
  scenario,
  prompts,
  onPromptsChange,
  selectedImage,
  isGenerating
}) {
  const scen = VIDEO_SCENARIOS.find(s => s.value === scenario);
  const segments = VIDEO_DURATIONS.find(d => d.value === duration)?.segments || 3;
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

  const handleGeneratePromptsFromGrok = async () => {
    setIsGeneratingPrompts(true);
    setPromptError(null);
    
    try {
      const response = await browserAutomationAPI.generateVideoPrompts(
        duration,
        scenario,
        segments,
        'professional'
      );

      if (response.success && response.data.prompts) {
        onPromptsChange(response.data.prompts);
      } else {
        setPromptError('Failed to generate prompts. Using template instead.');
        handleAutoFill();
      }
    } catch (error) {
      console.error('Error generating prompts:', error);
      setPromptError('Could not generate prompts from Grok. Using template instead.');
      handleAutoFill();
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Help Text */}
      <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/50">
        <p className="text-xs text-blue-300">
          ✨ Each segment is ~10 seconds. Describe the action, camera movement, and details for each segment. 
          Grok will generate a smooth transition between segments.
        </p>
      </div>

      {/* Prompt Generation Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleGeneratePromptsFromGrok}
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
              Generate with Grok AI
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

      {/* Prompt Segments */}
      <div className="space-y-3">
        {Array.from({ length: segments }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-purple-300">
                Segment {idx + 1} / {segments} (~10s)
              </label>
              <span className="text-xs text-gray-500">
                {(idx + 1) * 10}s
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
  onGenerate
}) {
  const segments = VIDEO_DURATIONS.find(d => d.value === duration)?.segments || 3;
  const scen = VIDEO_SCENARIOS.find(s => s.value === scenario);
  const [expandedSegment, setExpandedSegment] = useState(0);

  return (
    <div className="space-y-4">
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

      {/* Source Image */}
      {selectedImage && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-400">Source Image</label>
          <div className="relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
            <div className="aspect-video flex items-center justify-center bg-gray-950">
              <img
                src={selectedImage}
                alt="Source"
                className="w-full h-full object-cover"
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
          {prompts.map((prompt, idx) => (
            <div key={idx} className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSegment(expandedSegment === idx ? -1 : idx)}
                className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 transition flex items-center justify-between text-xs font-medium text-white"
              >
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-bold">Seg {idx + 1}</span>
                  <span className="text-gray-400">{prompt.substring(0, 40)}...</span>
                </div>
                {expandedSegment === idx ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              
              {expandedSegment === idx && (
                <div className="bg-gray-800 p-3 border-t border-gray-700">
                  <p className="text-xs text-gray-300 leading-relaxed">{prompt}</p>
                </div>
              )}
            </div>
          ))}
        </div>
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
  const [prompts, setPrompts] = useState(['', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFinalPrompt, setShowFinalPrompt] = useState(true);
  const [currentImage, setCurrentImage] = useState(null);
  const imageInputRef = useRef(null);

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

  const handleGenerateVideo = async () => {
    if (!currentImage) {
      alert('Please upload or select an image');
      return;
    }

    setIsGenerating(true);
    try {
      // Prepare video generation request
      const videoData = {
        duration: selectedDuration,
        scenario: selectedScenario,
        segments: prompts,
        sourceImage: currentImage,
        characterImage,
        productImage
      };

      console.log('📹 Starting video generation:', videoData);

      // Call backend API
      const response = await browserAutomationAPI.generateVideo(videoData);
      
      if (response?.success) {
        console.log('✅ Video generation started:', response.data);
        // TODO: Show video result or redirect to video view
      }
    } catch (error) {
      console.error('❌ Video generation failed:', error);
    } finally {
      setIsGenerating(false);
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

      {/* Main Content - Flex container with scrollable content and fixed bottom buttons */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Main Content Area - Scrollable */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Settings */}
          <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              {currentStep === 1 && (
                <VideoSettingsStep
                  onNext={() => setCurrentStep(2)}
                  selectedDuration={selectedDuration}
                  onDurationChange={setSelectedDuration}
                  selectedScenario={selectedScenario}
                  onScenarioChange={setSelectedScenario}
                  onImageChange={handleImageChange}
                />
              )}

              {currentStep === 2 && (
                <VideoPromptStep
                  onNext={() => setCurrentStep(3)}
                  duration={selectedDuration}
                  scenario={selectedScenario}
                  prompts={prompts}
                  onPromptsChange={setPrompts}
                  selectedImage={currentImage}
                  isGenerating={isGenerating}
                />
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
                />
              )}
            </div>
          </div>

          {/* Center - Preview */}
          <div className="flex-1 bg-gray-900 overflow-y-auto">
          <div className="p-6 max-w-4xl mx-auto">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Step 1: Select Source Image</h2>
                  <p className="text-gray-400">Choose or upload an image to create your video</p>
                </div>

                {/* Image Upload & Preview */}
                <div className="space-y-4">
                  {currentImage ? (
                    <>
                      {/* Image Preview */}
                      <div className="relative bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700">
                        <div className="aspect-video flex items-center justify-center bg-gray-950">
                          <img
                            src={currentImage}
                            alt="Video Source"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Replace Button */}
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium text-white"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Change Image</span>
                      </button>

                      {/* Image Info */}
                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-2">
                        <h4 className="text-xs font-semibold text-gray-400">📸 Image Information</h4>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div>✓ Image loaded and ready</div>
                          <div>✓ Configure settings in left panel</div>
                          <div>✓ Click "Continue to Script" when ready</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Upload Prompt */}
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        className="relative bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg border-2 border-dashed border-blue-500/50 hover:border-blue-400/70 transition-colors cursor-pointer overflow-hidden"
                      >
                        <div className="aspect-video flex flex-col items-center justify-center gap-3 p-8">
                          <Upload className="w-12 h-12 text-blue-400" />
                          <div className="text-center">
                            <h3 className="text-lg font-semibold text-white mb-2">Upload Source Image</h3>
                            <p className="text-sm text-gray-400 mb-4">
                              Click to select an image or drag and drop here
                            </p>
                            <p className="text-xs text-gray-500">
                              Supported formats: JPEG, PNG | Max size: 5MB
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Or Use Existing */}
                      {(characterImage || productImage) && (
                        <>
                          <div className="relative flex items-center gap-4">
                            <div className="flex-1 h-px bg-gray-700" />
                            <span className="text-xs text-gray-500 font-medium">OR USE EXISTING IMAGE</span>
                            <div className="flex-1 h-px bg-gray-700" />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {characterImage && (
                              <button
                                onClick={() => handleImageChange(characterImage)}
                                className="p-3 rounded-lg border-2 border-gray-700 hover:border-purple-500 hover:bg-purple-900/20 transition-all group"
                              >
                                <div className="aspect-video mb-2 rounded overflow-hidden bg-gray-900 flex items-center justify-center">
                                  <img
                                    src={characterImage}
                                    alt="Character"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-xs font-medium text-gray-300 group-hover:text-purple-300">
                                  👤 Character Image
                                </p>
                              </button>
                            )}

                            {productImage && (
                              <button
                                onClick={() => handleImageChange(productImage)}
                                className="p-3 rounded-lg border-2 border-gray-700 hover:border-blue-500 hover:bg-blue-900/20 transition-all group"
                              >
                                <div className="aspect-video mb-2 rounded overflow-hidden bg-gray-900 flex items-center justify-center">
                                  <img
                                    src={productImage}
                                    alt="Product"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <p className="text-xs font-medium text-gray-300 group-hover:text-blue-300">
                                  👕 Product Image
                                </p>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* File Input */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          handleImageChange(evt.target?.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-4">Step 2: Write Your Script</h2>
                <p className="text-gray-400">Create a detailed script for each segment of your video.</p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-4">Step 3: Generate Video</h2>
                <p className="text-gray-400">Review your video configuration and generate the video.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Summary */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0 p-4">
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
                    {VIDEO_DURATIONS.find(d => d.value === selectedDuration)?.segments}
                  </span>
                </div>
              </div>
            </div>

            {currentStep >= 2 && prompts.some(p => p.trim().length > 0) && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Script Summary</h3>
                <div className="bg-gray-700/30 rounded-lg p-3 space-y-2">
                  {prompts.map((prompt, idx) => (
                    prompt.trim().length > 0 && (
                      <div key={idx} className="text-xs">
                        <div className="text-gray-500 mb-1">Seg {idx + 1}:</div>
                        <div className="text-gray-400 line-clamp-3">{prompt}</div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
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
                disabled={isGenerating || prompts.some(p => !p || p.trim().length === 0)}
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
                    <span>Create Video</span>
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

