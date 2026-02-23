/**
 * Prompt Template Renderer
 * Renders template with dynamic fields for user input
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Copy, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import promptTemplateService from '../services/promptTemplateService';

const PromptTemplateRenderer = ({
  templateId,
  onRender,
  onClose,
  autoRender = false
}) => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [renderedPrompt, setRenderedPrompt] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [copied, setCopied] = useState(false);

  // ============================================================
  // LIFECYCLE
  // ============================================================

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  // ============================================================
  // FETCH TEMPLATE
  // ============================================================

  const fetchTemplate = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await promptTemplateService.getTemplateById(templateId);
      setTemplate(result.data);
      initializeFieldValues(result.data.fields);
    } catch (err) {
      setError('Không thể tải template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initializeFieldValues = (fields) => {
    const values = {};
    if (fields && Array.isArray(fields)) {
      fields.forEach(field => {
        values[field.id] = field.defaultValue || '';
      });
    }
    setFieldValues(values);
  };

  // ============================================================
  // RENDER TEMPLATE
  // ============================================================

  const handleRenderTemplate = async () => {
    setRendering(true);
    setError('');
    setSuccess('');

    try {
      const result = await promptTemplateService.renderTemplate(templateId, fieldValues);
      setRenderedPrompt(result.data);
      setSuccess('✨ Prompt rendered successfully!');

      if (onRender) {
        onRender(result.data);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to render template');
      console.error(err);
    } finally {
      setRendering(false);
    }
  };

  // ============================================================
  // FIELD CHANGE HANDLER
  // ============================================================

  const handleFieldChange = (fieldId, value) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // ============================================================
  // COPY TO CLIPBOARD
  // ============================================================

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ============================================================
  // RENDER FIELD INPUT
  // ============================================================

  const renderFieldInput = (field) => {
    const value = fieldValues[field.id] || '';

    if (!field.editable) {
      return (
        <div className="p-3 bg-gray-900/30 border border-gray-600/50 rounded text-gray-400 text-sm cursor-not-allowed opacity-70">
          <span className="font-mono">{value || `{${field.id}}`}</span>
        </div>
      );
    }

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows="3"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm resize-none"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm"
          >
            <option value="">-- Select {field.label} --</option>
            {field.options && field.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options && field.options.map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-gray-300 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true' || value === true}
              onChange={(e) => handleFieldChange(field.id, e.target.checked ? 'true' : 'false')}
              className="w-4 h-4"
            />
            <span className="text-gray-300 text-sm">{field.label}</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm"
          />
        );

      case 'color':
        return (
          <div className="flex gap-2">
            <input
              type="color"
              value={value || '#808080'}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="w-12 h-10 rounded border border-gray-600 cursor-pointer"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm font-mono"
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-amber-500 outline-none text-sm"
          />
        );
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mr-3" />
        <span className="text-gray-400">Loading template...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <p className="text-red-200">{error}</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-400">Template not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          {template.name}
        </h3>
        {template.description && (
          <p className="text-gray-400 text-sm">{template.description}</p>
        )}
      </div>

      {/* Context Info */}
      {template.usedInPages && template.usedInPages.length > 0 && (
        <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded text-sm text-blue-200">
          <strong>Sử dụng trong:</strong>{' '}
          {template.usedInPages.map((loc, idx) => (
            <span key={idx}>
              {loc.page} {loc.step && `(Step ${loc.step})`}
              {idx < template.usedInPages.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded text-sm text-red-200 flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-900/20 border border-green-700/50 rounded text-sm text-green-200 flex gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {/* Dynamic Fields */}
      {template.fields && template.fields.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-300">Template Parameters</h4>

          {template.fields.map(field => (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {field.label}
                {field.editable ? (
                  <span className="text-amber-400 ml-1">*</span>
                ) : (
                  <span className="text-gray-500 text-xs ml-1">(read-only)</span>
                )}
              </label>
              {field.description && (
                <p className="text-xs text-gray-500">{field.description}</p>
              )}
              {renderFieldInput(field)}
            </div>
          ))}
        </div>
      )}

      {/* Template Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-300">Template Preview</h4>
          {renderedPrompt && (
            <button
              onClick={() => copyToClipboard(renderedPrompt.prompt)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-sm flex items-center gap-2 transition"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>

        <div className="p-4 bg-gray-800 rounded border border-gray-700 min-h-32">
          {renderedPrompt?.prompt ? (
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
              {renderedPrompt.prompt}
            </p>
          ) : (
            <p className="text-gray-500 text-sm italic">
              Fill in the parameters above and click render to see the prompt
            </p>
          )}
        </div>

        {renderedPrompt?.negativePrompt && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-400">Negative Prompt</h5>
            <div className="p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {renderedPrompt.negativePrompt}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-700">
        <button
          onClick={handleRenderTemplate}
          disabled={rendering}
          className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white rounded font-medium transition flex items-center justify-center gap-2"
        >
          {rendering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Rendering...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Render Prompt
            </>
          )}
        </button>

        {renderedPrompt && onRender && (
          <button
            onClick={() => onRender(renderedPrompt)}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition"
          >
            Use This Prompt
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default PromptTemplateRenderer;
