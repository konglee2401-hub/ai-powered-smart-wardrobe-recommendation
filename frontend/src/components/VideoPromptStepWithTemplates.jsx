/**
 * Enhanced Video Prompt Step with Template Support
 * Allows users to choose between template-based or manual prompt editing
 */

import React, { useState, useEffect } from 'react';
import {
  Wand2, RefreshCw, FileText, Loader2, Sparkles, Plus, X,
  Check, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import promptTemplateService from '../services/promptTemplateService';
import { browserAutomationAPI } from '../services/api';

const VideoPromptStepWithTemplates = ({
  onNext,
  duration,
  scenario,
  prompts,
  onPromptsChange,
  selectedImage,
  isGenerating,
  videoProvider
}) => {
  const [mode, setMode] = useState('template'); // 'template' or 'manual'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [renderedPrompts, setRenderedPrompts] = useState(null);
  const [renderingError, setRenderingError] = useState(null);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = React.useState(false);
  const [promptError, setPromptError] = React.useState(null);

  const VIDEO_DURATIONS = {
    30: 3,
    60: 6,
    90: 9,
    120: 12
  };

  const VIDEO_PROVIDER_LIMITS = {
    grok: { maxDurationPerVideo: 10, maxDurationTotal: 120 },
    'google-flow': { maxDurationPerVideo: 20, maxDurationTotal: 180 }
  };

  const segments = VIDEO_DURATIONS[duration] || 3;
  const maxPerVideo = VIDEO_PROVIDER_LIMITS[videoProvider]?.maxDurationPerVideo || 10;

  // ============================================================
  // LOAD TEMPLATES
  // ============================================================

  useEffect(() => {
    if (mode === 'template') {
      loadTemplates();
    }
  }, [mode, scenario]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      // Get templates by use case (video scenario)
      const result = await promptTemplateService.getTemplatesByUseCase('video-generation');
      setTemplates(result.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // ============================================================
  // TEMPLATE RENDERING
  // ============================================================

  const handleSelectTemplate = (template) => {
    setSelectedTemplateId(template.id);
    setFieldValues({});
    setRenderedPrompts(null);
    setRenderingError(null);

    // Initialize field values with defaults
    if (template.fields && Array.isArray(template.fields)) {
      const values = {};
      template.fields.forEach(field => {
        values[field.id] = field.defaultValue || '';
      });
      setFieldValues(values);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleRenderTemplate = async () => {
    if (!selectedTemplateId) {
      setRenderingError('Please select a template');
      return;
    }

    setRenderingError(null);

    try {
      const result = await promptTemplateService.renderTemplate(selectedTemplateId, fieldValues);
      const renderedText = result.data.renderedPrompt || result.data;

      // Split rendered prompt into segments
      let promptList = [];
      if (typeof renderedText === 'string') {
        // Try to split by segment markers
        const segmentPattern = /Segment \d+:|Seg \d+:|[\n]+/i;
        promptList = renderedText
          .split(segmentPattern)
          .filter(text => text.trim())
          .slice(0, segments)
          .map(text => text.trim());

        // Pad with empty strings if needed
        while (promptList.length < segments) {
          promptList.push('');
        }
      }

      setRenderedPrompts(promptList);
      onPromptsChange(promptList);
    } catch (error) {
      console.error('Error rendering template:', error);
      setRenderingError('Failed to render template. Please try again.');
    }
  };

  // ============================================================
  // MANUAL MODE HANDLERS
  // ============================================================

  const handlePromptChange = (index, value) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    onPromptsChange(newPrompts);
  };

  const handleAutoFill = () => {
    // Use default scenario template
    const defaultPrompts = Array(segments)
      .fill('')
      .map((_, idx) => `Segment ${idx + 1}: Describe the action, camera movement, and details for this ~${maxPerVideo}s segment.`);
    onPromptsChange(defaultPrompts);
    setPromptError(null);
  };

  const handleGeneratePromptsFromChatGPT = async () => {
    setIsGeneratingPrompts(true);
    setPromptError(null);

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
    } catch (error) {
      console.error('Error generating prompts:', error);
      setPromptError('Could not generate prompts. Using template instead.');
      handleAutoFill();
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2 border-b border-gray-700 pb-3">
        <button
          onClick={() => setMode('template')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === 'template'
              ? 'bg-blue-600 text-white border border-blue-500'
              : 'bg-gray-700 text-gray-300 border border-gray-700 hover:bg-gray-600'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          Template Mode
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            mode === 'manual'
              ? 'bg-purple-600 text-white border border-purple-500'
              : 'bg-gray-700 text-gray-300 border border-gray-700 hover:bg-gray-600'
          }`}
        >
          <FileText className="w-4 h-4" />
          Manual Mode
        </button>
      </div>

      {/* TEMPLATE MODE */}
      {mode === 'template' && (
        <div className="space-y-4">
          <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/50">
            <p className="text-xs text-blue-300">
              ✨ Select a template and customize its fields to generate video prompts for {segments} segments (~{maxPerVideo}s each).
            </p>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Available Templates
            </h3>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-4 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-700/50">
                <p className="text-xs text-yellow-300">
                  📝 No templates found for video generation. Please create templates in the manager or use Manual Mode.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <button
                    key={template._id || template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedTemplateId === (template._id || template.id)
                        ? 'border-blue-500 bg-blue-600/20'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-xs font-semibold text-white">{template.name}</h4>
                        <p className="text-xs text-gray-400 mt-1">{template.description}</p>
                        {template.fields && (
                          <p className="text-xs text-gray-500 mt-2">
                            {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {selectedTemplateId === (template._id || template.id) && (
                        <Check className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Template Fields */}
          {selectedTemplateId && templates.find(t => (t._id || t.id) === selectedTemplateId)?.fields && (
            <div className="space-y-3 bg-gray-800/30 rounded-lg p-3 border border-gray-700">
              <h3 className="text-xs font-semibold text-gray-300">Customize Fields</h3>
              {templates
                .find(t => (t._id || t.id) === selectedTemplateId)
                ?.fields.map(field => (
                  <div key={field.id} className="space-y-1">
                    <label className="text-xs font-medium text-gray-300">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                        rows="2"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select {field.label}</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}

              <button
                onClick={handleRenderTemplate}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-900/30 hover:bg-green-900/50 border border-green-700/50 rounded-lg text-xs font-medium text-green-300 transition-colors mt-3"
              >
                <Sparkles className="w-3 h-3" />
                Generate Prompts from Template
              </button>

              {renderingError && (
                <div className="bg-red-900/20 rounded p-2 border border-red-700/50">
                  <p className="text-xs text-red-300">{renderingError}</p>
                </div>
              )}

              {renderedPrompts && (
                <div className="bg-green-900/20 rounded p-2 border border-green-700/50">
                  <p className="text-xs text-green-300">✓ Prompts generated successfully!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MANUAL MODE */}
      {mode === 'manual' && (
        <div className="space-y-4">
          <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-700/50">
            <p className="text-xs text-purple-300">
              ✨ Each segment is ~{maxPerVideo} seconds. Describe the action, camera movement, and details for each segment.
              {videoProvider === 'grok'
                ? ' Grok will generate a smooth transition between segments.'
                : ' Google Flow will generate high-quality video clips.'}
            </p>
          </div>

          {/* Prompt Generation Buttons */}
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
              Auto Fill
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
      )}
    </div>
  );
};

export default VideoPromptStepWithTemplates;
