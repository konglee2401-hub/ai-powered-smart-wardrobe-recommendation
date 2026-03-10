/**
 * Image Prompt Step with Template Support
 * Allows users to choose between template-based or Step3 enhanced mode
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wand2, FileText, Loader2, Sparkles, AlertCircle, Check, Settings
} from 'lucide-react';
import promptTemplateService from '../services/promptTemplateService';
import Step3EnhancedWithSession from './Step3EnhancedWithSession';

const ImagePromptWithTemplates = ({
  characterImage,
  productImage,
  selectedOptions,
  onOptionChange,
  generatedPrompt,
  onPromptChange,
  useCase,
  userId,
  analysis,
  characterDescription,
  productFocus,
  mode = 'step3',
  onModeChange = null,
}) => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [renderedPrompt, setRenderedPrompt] = useState(null);
  const [renderingError, setRenderingError] = useState(null);

  // Load templates
  useEffect(() => {
    if (mode === 'template') {
      loadTemplates();
    }
  }, [mode]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await promptTemplateService.getTemplatesByUseCase('image-generation');
      setTemplates(result.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Handle template selection
  const handleSelectTemplate = (template) => {
    setSelectedTemplateId(template._id || template.id);
    setFieldValues({});
    setRenderedPrompt(null);
    setRenderingError(null);

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
      setRenderingError(t('imagePromptTemplates.selectTemplate'));
      return;
    }

    setRenderingError(null);

    try {
      const result = await promptTemplateService.renderTemplate(selectedTemplateId, fieldValues);
      const renderedText = result.data.renderedPrompt || result.data;

      setRenderedPrompt(renderedText);
      
      // Update parent's generated prompt
      onPromptChange({
        positive: renderedText,
        negative: generatedPrompt?.negative || ''
      });
    } catch (error) {
      console.error('Error rendering template:', error);
      setRenderingError('Failed to render template. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* TEMPLATE MODE */}
      {mode === 'template' && (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] bg-sky-400/10 p-4">
            <p className="text-xs text-blue-300">
              âœ¨ Select a template and customize its fields to generate an image prompt based on your selections.
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
              <div className="rounded-[1.5rem] bg-amber-400/10 p-4">
                <p className="text-xs text-yellow-300">
                  ðŸ“ No templates found for image generation. Please create templates in the manager or use Step 3 Mode.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {templates.map(template => (
                  <button
                    key={template._id || template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`w-full rounded-[1.25rem] p-4 text-left transition-all ${
                      selectedTemplateId === (template._id || template.id)
                        ? 'bg-sky-400/14 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.14)]'
                        : 'bg-white/[0.04] hover:bg-white/[0.07]'
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
            <div className="apple-surface-panel space-y-3 rounded-[1.75rem] p-4">
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
                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 resize-none"
                        rows="2"
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-white"
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
                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={fieldValues[field.id] || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500"
                      />
                    )}
                  </div>
                ))}

              <button
                onClick={handleRenderTemplate}
                className="apple-secondary-button mt-3 flex w-full items-center justify-center gap-2 rounded-[1.15rem] px-3 py-2.5 text-xs font-medium"
              >
                <Sparkles className="w-3 h-3" />
                Generate Prompt from Template
              </button>

              {renderingError && (
                <div className="rounded-[1rem] bg-rose-400/10 p-3">
                  <p className="text-xs text-red-300">{renderingError}</p>
                </div>
              )}

              {renderedPrompt && (
                <div className="space-y-2">
                  <div className="rounded-[1rem] bg-emerald-400/10 p-3">
                    <p className="text-xs text-green-300">âœ“ Prompt generated successfully!</p>
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded-[1rem] bg-white/[0.04] p-3">
                    <p className="apple-prompt-text text-xs leading-6 text-gray-300">{renderedPrompt}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 MODE */}
      {mode === 'step3' && (
        <Step3EnhancedWithSession
          characterImage={characterImage}
          productImage={productImage}
          selectedOptions={selectedOptions}
          onOptionChange={onOptionChange}
          generatedPrompt={generatedPrompt}
          onPromptChange={onPromptChange}
          useCase={useCase}
          userId={userId}
          analysis={analysis}
          characterDescription={characterDescription}
          productFocus={productFocus}
        />
      )}
    </div>
  );
};

export default ImagePromptWithTemplates;

