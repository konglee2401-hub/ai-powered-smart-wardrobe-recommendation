/**
 * Voice Settings Component
 * Left sidebar for selecting gender, language, reading style, and voice
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, Volume2, Sparkles, BookOpen } from 'lucide-react';
import {
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  READING_STYLES,
  getVoicesByGender,
  GOOGLE_VOICES,
} from '../constants/voiceOverOptions';

export default function VoiceSettings({
  selectedGender,
  onGenderChange,
  selectedLanguage,
  onLanguageChange,
  selectedStyle,
  onStyleChange,
  selectedVoice,
  onVoiceChange,
  className = '',
}) {
  const [expandedSection, setExpandedSection] = useState('gender');

  // Get voices filtered by gender
  const availableVoices = useMemo(() => {
    return getVoicesByGender(selectedGender);
  }, [selectedGender]);

  // Ensure selected voice is valid
  const currentVoice = availableVoices.find((v) => v.id === selectedVoice) ||
    availableVoices[0] || null;

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div
      className={`bg-gray-800/50 backdrop-blur rounded-lg p-4 space-y-4 border border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold text-white">Voice Settings</h2>
      </div>

      {/* Gender Selection */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('gender')}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/40 hover:bg-gray-700/60 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-300">Gender</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              expandedSection === 'gender' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSection === 'gender' && (
          <div className="grid grid-cols-2 gap-2 pl-2">
            {GENDER_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onGenderChange(option.id);
                  // Reset voice to first available for new gender
                  const newVoices = getVoicesByGender(option.id);
                  if (newVoices.length > 0) {
                    onVoiceChange(newVoices[0].id);
                  }
                }}
                className={`p-2 rounded-lg text-center transition-all text-sm ${
                  selectedGender === option.id
                    ? 'bg-amber-500/30 border border-amber-500 text-amber-200 font-medium'
                    : 'bg-gray-700/30 border border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-lg mb-1">{option.emoji}</div>
                <div className="text-xs">{option.label}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Language Selection */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('language')}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/40 hover:bg-gray-700/60 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-300">Language</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              expandedSection === 'language' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSection === 'language' && (
          <div className="grid grid-cols-2 gap-2 pl-2">
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => onLanguageChange(option.id)}
                className={`p-2 rounded-lg text-center transition-all text-sm ${
                  selectedLanguage === option.id
                    ? 'bg-blue-500/30 border border-blue-500 text-blue-200 font-medium'
                    : 'bg-gray-700/30 border border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-lg mb-1">{option.emoji}</div>
                <div className="text-xs">{option.label}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reading Style Selection */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('style')}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/40 hover:bg-gray-700/60 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-300">Reading Style</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              expandedSection === 'style' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSection === 'style' && (
          <div className="space-y-2 pl-2">
            {READING_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => onStyleChange(style.id)}
                className={`w-full p-2 rounded-lg text-left transition-all text-sm ${
                  selectedStyle === style.id
                    ? 'bg-purple-500/30 border border-purple-500 text-purple-200'
                    : 'bg-gray-700/30 border border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{style.emoji}</span>
                  <span className="font-medium">{style.label}</span>
                </div>
                <div className="text-xs text-gray-400">{style.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice Selection */}
      <div className="space-y-2">
        <button
          onClick={() => toggleSection('voice')}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/40 hover:bg-gray-700/60 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-300">Voice</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              expandedSection === 'voice' ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSection === 'voice' && (
          <div className="space-y-2 pl-2">
            {availableVoices.length > 0 ? (
              availableVoices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => onVoiceChange(voice.id)}
                  className={`w-full p-3 rounded-lg text-left transition-all text-sm ${
                    selectedVoice === voice.id
                      ? 'bg-emerald-500/30 border border-emerald-500 text-emerald-200'
                      : 'bg-gray-700/30 border border-gray-600 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="font-semibold mb-1">{voice.name}</div>
                  <div className="text-xs text-gray-400 mb-2">{voice.description}</div>
                  <div className="flex flex-wrap gap-1">
                    {voice.characteristics.map((char) => (
                      <span
                        key={char}
                        className="text-xs bg-gray-600/50 text-gray-300 px-2 py-1 rounded"
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Best for: {voice.useCase}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-sm text-gray-400 text-center py-3">
                No voices available for selected gender
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Voice Preview */}
      {currentVoice && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-900/20 border border-emerald-700/50">
          <div className="text-xs text-gray-400 mb-1">Currently Selected</div>
          <div className="text-sm font-semibold text-emerald-300">{currentVoice.name}</div>
          <div className="text-xs text-gray-400 mt-1">{currentVoice.description}</div>
        </div>
      )}
    </div>
  );
}
