/**
 * VoiceOverPage - Main page for TTS voiceover generation
 * Implements 3-step flow: Video Upload > Script Generation > Audio Generation
 */

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Volume2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import VoiceSettings from '../components/VoiceSettings';
import VideoUploadStep from '../components/VideoUploadStep';
import ScriptGenerationStep from '../components/ScriptGenerationStep';
import AudioGenerationStep from '../components/AudioGenerationStep';
import { useTranslation } from 'react-i18next';

const STEPS = [
  { id: 1, name: 'Upload Videos', icon: '📹' },
  { id: 2, name: 'Generate Script', icon: '✍️' },
  { id: 3, name: 'Generate Audio', icon: '🎙️' },
];

export default function VoiceOverPage() {
  const { t } = useTranslation();
  // Navigation
  const [currentStep, setCurrentStep] = useState(1);

  // Voice Settings
  const [selectedGender, setSelectedGender] = useState('female');
  const [selectedLanguage, setSelectedLanguage] = useState('vi');
  const [selectedStyle, setSelectedStyle] = useState('tiktok-sales');
  const [selectedVoice, setSelectedVoice] = useState('Aoede');

  // Step 1: Videos
  const [videos, setVideos] = useState([]);
  const [productImage, setProductImage] = useState(null);

  // Step 2: Script
  const [generatedScript, setGeneratedScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Step 3: Audio
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Metadata
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    toast.success('Voiceover generation complete! Your audio is ready.');
    // Could redirect to history or show download options
  };

  const handleScriptGenerated = (script) => {
    setGeneratedScript(script);
  };

  const handleAudioGenerated = (audio) => {
    setGeneratedAudio(audio);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Main Content Grid */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar - Voice Settings */}
        <div className="w-72 border-r border-gray-700 overflow-y-auto bg-gray-900/50 backdrop-blur">
          <div className="p-4 space-y-4">
            {/* Branding */}
            <div className="flex items-center gap-2 mb-6">
              <Volume2 className="w-6 h-6 text-amber-400" />
              <div>
                <h1 className="text-lg font-bold text-white">{t('voiceOver.title')}</h1>
                <p className="text-xs text-gray-400">TTS Generation Studio</p>
              </div>
            </div>

            {/* Product Info (Optional metadata) */}
            <div className="space-y-2 p-3 rounded-lg bg-gray-700/20 border border-gray-700">
              <label className="text-xs font-semibold text-gray-300">Product Name (Optional)</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Summer Dress"
                className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white text-sm placeholder-gray-500 focus:border-amber-500 focus:outline-none"
              />

              <label className="text-xs font-semibold text-gray-300 block mt-2">
                Product Description (Optional)
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="e.g., Blue linen blend, lightweight, perfect for summer"
                className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white text-sm placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none h-16"
              />
            </div>

            {/* Voice Settings */}
            <VoiceSettings
              selectedGender={selectedGender}
              onGenderChange={setSelectedGender}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              selectedStyle={selectedStyle}
              onStyleChange={setSelectedStyle}
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
            />

            {/* Progress Indicator */}
            <div className="mt-6 pt-4 border-t border-gray-700 space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase">Progress</h3>
              <div className="space-y-2">
                {STEPS.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 p-2 rounded transition-all ${
                      currentStep === step.id
                        ? 'bg-amber-500/20 text-amber-300'
                        : currentStep > step.id
                        ? 'text-green-400'
                        : 'text-gray-400'
                    }`}
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-gray-700">
                      {currentStep > step.id ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span className="text-sm">{step.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Step Header */}
          <div className="border-b border-gray-700 bg-gray-800/30 backdrop-blur px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {STEPS[currentStep - 1].icon} {STEPS[currentStep - 1].name}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Step {currentStep} of {STEPS.length}
                </p>
              </div>

              {/* Step Progress Bar */}
              <div className="flex gap-1">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={`h-2 rounded-full transition-all ${
                      currentStep >= step.id ? 'w-12 bg-amber-500' : 'w-8 bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {currentStep === 1 && (
              <VideoUploadStep
                videos={videos}
                onVideosChange={setVideos}
                productImage={productImage}
                onProductImageChange={setProductImage}
                onNext={handleNext}
                isLoading={isGeneratingScript}
              />
            )}

            {currentStep === 2 && (
              <ScriptGenerationStep
                videos={videos}
                productImage={productImage}
                style={selectedStyle}
                readingStyle={selectedStyle}
                productName={productName || 'Fashion Product'}
                productDescription={productDescription}
                generatedScript={generatedScript}
                onScriptGenerated={handleScriptGenerated}
                onNext={handleNext}
                isLoading={isGeneratingScript}
              />
            )}

            {currentStep === 3 && (
              <AudioGenerationStep
                script={generatedScript}
                voiceName={selectedVoice}
                language={selectedLanguage.toUpperCase()}
                generatedAudio={generatedAudio}
                onAudioGenerated={handleAudioGenerated}
                onComplete={handleComplete}
                isLoading={isGeneratingAudio}
              />
            )}
          </div>

          {/* Navigation Footer */}
          <div className="border-t border-gray-700 bg-gray-800/30 backdrop-blur px-8 py-4 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                currentStep === 1
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="text-sm text-gray-400">
              Step {currentStep} of {STEPS.length}
            </div>

            {/* Next button is in the step components for more control */}
          </div>
        </div>
      </div>
    </div>
  );
}
