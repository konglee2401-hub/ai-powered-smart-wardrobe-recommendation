import React, { useState, useEffect, useCallback } from 'react';
import { promptsAPI, templatesAPI } from '../services/api';
import '../styles/PromptBuilder.css';

// REVISED: Unified userInputs state object for form sync (Issue 3 fix)
const DEFAULT_INPUTS = {
  characterDescription: '',
  productDescription: '',
  useCase: 'ecommerce',
  style: 'realistic'
};

const PromptBuilder = () => {
  // REVISED: Single unified state for user inputs (solves sync issue)
  const [userInputs, setUserInputs] = useState(DEFAULT_INPUTS);

  // State for generated prompts
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generatedNegativePrompt, setGeneratedNegativePrompt] = useState('');

  // State for templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // REVISED: State for UI with better error handling (Issue 4 fix)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // REVISED: Controlled input handler with proper state sync (Issue 3 fix)
  const handleInputChange = useCallback((field, value) => {
    setUserInputs(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError('');
  }, [error]);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fetch templates from API
  const fetchTemplates = async () => {
    try {
      const response = await templatesAPI.getAll();
      if (response.success) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Generate prompt
  const handleGeneratePrompt = async (e) => {
    e.preventDefault();
    
    // REVISED: Clear previous errors and validate
    setError('');
    setErrorDetails(null);
    setSuccessMessage('');

    // REVISED: Better validation with specific error messages
    if (!userInputs.characterDescription?.trim()) {
      setError('Please enter a character description');
      return;
    }
    if (!userInputs.productDescription?.trim()) {
      setError('Please enter a product description');
      return;
    }

    setLoading(true);
    try {
      // REVISED: Use unified userInputs state
      const response = await promptsAPI.generate(
        userInputs.characterDescription,
        userInputs.productDescription,
        userInputs.useCase,
        userInputs.style
      );

      if (response.success) {
        setGeneratedPrompt(response.data.prompt);
        setGeneratedNegativePrompt(response.data.negativePrompt);
        setSuccessMessage('Prompt generated successfully!');
      } else {
        setError(response.error || 'Failed to generate prompt');
      }
    } catch (error) {
      // REVISED: Better error handling with user feedback (Issue 4 fix)
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          'Network error. Please check your connection and try again.';
      setError(errorMessage);
      setErrorDetails(process.env.NODE_ENV === 'development' ? error.stack : null);
      console.error('Error generating prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage(`${type} copied to clipboard!`);
    setTimeout(() => setSuccessMessage(''), 2000);
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !generatedPrompt.trim()) {
      setError('Please enter a template name and generate a prompt first');
      return;
    }

    setLoading(true);
    try {
      // REVISED: Use unified userInputs state
      const response = await templatesAPI.create(
        templateName,
        templateDescription,
        userInputs.useCase,
        userInputs.style,
        generatedPrompt,
        generatedNegativePrompt
      );

      if (response.success) {
        setSuccessMessage('Template saved successfully!');
        setTemplateName('');
        setTemplateDescription('');
        setShowSaveTemplate(false);
        fetchTemplates();
      } else {
        setError(response.error || 'Failed to save template');
      }
    } catch (error) {
      // REVISED: Better error handling
      const errorMsg = error.response?.data?.error || 'Failed to save template. Please try again.';
      setError(errorMsg);
      console.error('Error saving template:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load template
  const handleLoadTemplate = async (templateId) => {
    try {
      const response = await templatesAPI.getById(templateId);
      if (response.success) {
        const template = response.data;
        // REVISED: Update unified state (solves sync issue)
        setUserInputs({
          characterDescription: '',
          productDescription: '',
          useCase: template.useCase,
          style: template.style
        });
        setGeneratedPrompt(template.defaultPrompt);
        setGeneratedNegativePrompt(template.defaultNegativePrompt);
        setSelectedTemplate(templateId);
        setSuccessMessage('Template loaded successfully!');
        setError('');
      }
    } catch (error) {
      // REVISED: Better error handling
      const errorMsg = error.response?.data?.error || 'Failed to load template';
      setError(errorMsg);
      console.error('Error loading template:', error);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await templatesAPI.delete(templateId);
      if (response.success) {
        setSuccessMessage('Template deleted successfully!');
        fetchTemplates();
        if (selectedTemplate === templateId) {
          setSelectedTemplate(null);
        }
      }
    } catch (error) {
      setError('Error deleting template');
      console.error('Error:', error);
    }
  };

  // Reset form
  const handleReset = () => {
    // REVISED: Reset unified state (solves sync issue)
    setUserInputs(DEFAULT_INPUTS);
    setGeneratedPrompt('');
    setGeneratedNegativePrompt('');
    setSelectedTemplate(null);
    setError('');
    setErrorDetails(null);
    setSuccessMessage('');
  };

  return (
    <div className="prompt-builder-container">
      <header className="prompt-builder-header">
        <h1>✨ Prompt Builder</h1>
        <p>Generate AI prompts for fashion photography</p>
      </header>

      <div className="prompt-builder-content">
        {/* Main Form */}
        <div className="prompt-builder-form-section">
          <form onSubmit={handleGeneratePrompt} className="prompt-builder-form">
            <h2>Generate Prompt</h2>

            {/* Character Description */}
            <div className="form-group">
              <label htmlFor="character">Character Description *</label>
              <textarea
                id="character"
                // REVISED: Use unified userInputs state (Issue 3 fix)
                value={userInputs.characterDescription}
                onChange={(e) => handleInputChange('characterDescription', e.target.value)}
                placeholder="e.g., A young woman with long blonde hair, wearing makeup, confident expression"
                rows="3"
              />
            </div>

            {/* Product Description */}
            <div className="form-group">
              <label htmlFor="product">Product Description *</label>
              <textarea
                id="product"
                // REVISED: Use unified userInputs state (Issue 3 fix)
                value={userInputs.productDescription}
                onChange={(e) => handleInputChange('productDescription', e.target.value)}
                placeholder="e.g., A red summer dress with floral patterns, lightweight fabric"
                rows="3"
              />
            </div>

            {/* Use Case */}
            <div className="form-group">
              <label htmlFor="useCase">Use Case</label>
              <select
                id="useCase"
                // REVISED: Use unified userInputs state (Issue 3 fix)
                value={userInputs.useCase}
                onChange={(e) => handleInputChange('useCase', e.target.value)}
              >
                <option value="ecommerce">E-commerce</option>
                <option value="social">Social Media</option>
                <option value="advertising">Advertising</option>
                <option value="editorial">Editorial</option>
                <option value="lookbook">Lookbook</option>
              </select>
            </div>

            {/* Style */}
            <div className="form-group">
              <label htmlFor="style">Style</label>
              <select
                id="style"
                // REVISED: Use unified userInputs state (Issue 3 fix)
                value={userInputs.style}
                onChange={(e) => handleInputChange('style', e.target.value)}
              >
                <option value="realistic">Realistic</option>
                <option value="cinematic">Cinematic</option>
                <option value="fashion">Fashion</option>
                <option value="casual">Casual</option>
                <option value="artistic">Artistic</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="form-buttons">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Prompt'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </form>

          {/* Messages */}
          {error && <div className="alert alert-error">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          {/* Generated Prompts */}
          {generatedPrompt && (
            <div className="generated-prompts">
              <h3>Generated Prompts</h3>

              {/* Positive Prompt */}
              <div className="prompt-box">
                <div className="prompt-header">
                  <h4>Positive Prompt</h4>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(generatedPrompt, 'Positive prompt')}
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="prompt-text">{generatedPrompt}</p>
              </div>

              {/* Negative Prompt */}
              <div className="prompt-box">
                <div className="prompt-header">
                  <h4>Negative Prompt</h4>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(generatedNegativePrompt, 'Negative prompt')}
                  >
                    📋 Copy
                  </button>
                </div>
                <p className="prompt-text">{generatedNegativePrompt}</p>
              </div>

              {/* Save Template Button */}
              <button
                className="btn btn-success"
                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
              >
                💾 Save as Template
              </button>

              {/* Save Template Form */}
              {showSaveTemplate && (
                <div className="save-template-form">
                  <h4>Save as Template</h4>
                  <div className="form-group">
                    <label htmlFor="templateName">Template Name *</label>
                    <input
                      id="templateName"
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Summer Dress Photoshoot"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="templateDesc">Description</label>
                    <textarea
                      id="templateDesc"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Optional description for this template"
                      rows="2"
                    />
                  </div>
                  <div className="form-buttons">
                    <button
                      className="btn btn-success"
                      onClick={handleSaveTemplate}
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Template'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowSaveTemplate(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Templates Sidebar */}
        <aside className="templates-sidebar">
          <h3>📚 Templates</h3>
          {templates.length > 0 ? (
            <div className="templates-list">
              {templates.map((template) => (
                <div
                  key={template._id}
                  className={`template-item ${selectedTemplate === template._id ? 'active' : ''}`}
                >
                  <div className="template-info">
                    <h4>{template.name}</h4>
                    <p className="template-meta">
                      {template.style} • {template.useCase}
                    </p>
                    {template.description && (
                      <p className="template-description">{template.description}</p>
                    )}
                  </div>
                  <div className="template-actions">
                    <button
                      className="btn-small btn-load"
                      onClick={() => handleLoadTemplate(template._id)}
                    >
                      Load
                    </button>
                    <button
                      className="btn-small btn-delete"
                      onClick={() => handleDeleteTemplate(template._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-templates">No templates yet. Create one!</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default PromptBuilder;
