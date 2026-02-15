import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { promptTemplateAPI } from '../services/api';
import { 
  Wand2, 
  Copy, 
  Download, 
  Sparkles, 
  Settings, 
  Zap, 
  Save, 
  Trash2, 
  RefreshCw,
  Plus,
  Edit,
  Check
} from 'lucide-react';

export default function PromptBuilder() {
  const [characterDesc, setCharacterDesc] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [useCase, setUseCase] = useState('ecommerce');
  const [style, setStyle] = useState('realistic');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Template management
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const response = await promptTemplateAPI.getTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const generatePrompt = async () => {
    if (!characterDesc || !productDesc) {
      alert('Please fill in both character and product descriptions');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/prompts/generate`, {
        characterAnalysis: { character: { description: characterDesc } },
        productAnalysis: { outfit: { description: productDesc } },
        contentUseCase: useCase,
        style: style,
        templateId: selectedTemplate?._id
      });

      if (response.data.success) {
        setGeneratedPrompt(response.data.data.prompt);
        setNegativePrompt(response.data.data.negativePrompt);
      }
    } catch (error) {
      console.error('Failed to generate prompt:', error);
      // Fallback to local generation
      const localPrompt = generateLocalPrompt();
      setGeneratedPrompt(localPrompt);
      setNegativePrompt(generateNegativePrompt());
      alert('Generated prompt locally (API unavailable)');
    } finally {
      setLoading(false);
    }
  };

  // Local prompt generation (fallback)
  const generateLocalPrompt = () => {
    const styleMap = {
      realistic: 'Realistic photography, professional lighting, high detail',
      cinematic: 'Cinematic lighting, dramatic shadows, film grain, 35mm',
      fashion: 'High fashion editorial, Vogue style, studio lighting',
      casual: 'Lifestyle photography, natural light, casual setting',
      artistic: 'Artistic composition, creative lighting, unique perspective'
    };

    const useCaseMap = {
      ecommerce: 'E-commerce product listing, clean white background',
      social: 'Social media content, engagement optimized',
      advertising: 'Advertising campaign, commercial quality',
      editorial: 'Editorial style, magazine quality'
    };

    return `Professional fashion photography of ${characterDesc} wearing ${productDesc}. ${styleMap[style] || ''}. ${useCaseMap[useCase] || ''}. High quality, sharp details, vibrant colors, 4K resolution, professional studio lighting.`;
  };

  const generateNegativePrompt = () => {
    return 'blurry, low quality, distorted, watermark, text, logo, amateur, casual, messy, noise, artifacts, compression, ugly, deformed';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadPrompt = () => {
    const content = `MAIN PROMPT:\n${generatedPrompt}\n\nNEGATIVE PROMPT:\n${negativePrompt}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save template
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      const templateData = {
        name: templateName,
        description: `Template for ${useCase} - ${style}`,
        useCase,
        style,
        defaultPrompt: generatedPrompt,
        defaultNegativePrompt: negativePrompt
      };

      if (editingTemplate) {
        await promptTemplateAPI.updateTemplate(editingTemplate._id, templateData);
      } else {
        await promptTemplateAPI.createTemplate(templateData);
      }

      await loadTemplates();
      setShowSaveModal(false);
      setTemplateName('');
      setEditingTemplate(null);
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template: ' + (error.message || 'Unknown error'));
    }
  };

  // Load template
  const loadTemplate = (template) => {
    setSelectedTemplate(template);
    setUseCase(template.useCase || 'ecommerce');
    setStyle(template.style || 'realistic');
    if (template.defaultPrompt) {
      setGeneratedPrompt(template.defaultPrompt);
    }
    if (template.defaultNegativePrompt) {
      setNegativePrompt(template.defaultNegativePrompt);
    }
  };

  // Delete template
  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await promptTemplateAPI.deleteTemplate(templateId);
      await loadTemplates();
      if (selectedTemplate?._id === templateId) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <Wand2 className="w-8 h-8 inline text-purple-600 mr-2" />
              AI Prompt Helper
            </h1>
            <p className="text-gray-600">
              Generate perfect prompts for fashion image generation
            </p>
          </div>
          
          <button
            onClick={loadTemplates}
            disabled={loadingTemplates}
            className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 disabled:opacity-50 transition-colors flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loadingTemplates ? 'animate-spin' : ''}`} />
            Refresh Templates
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left: Input */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Templates */}
            {templates.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Save className="w-5 h-5 mr-2 text-purple-600" />
                  Saved Templates
                </h2>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {templates.map((template) => (
                    <div 
                      key={template._id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedTemplate?._id === template._id 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => loadTemplate(template)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{template.name}</p>
                          <p className="text-xs text-gray-500">{template.useCase} - {template.style}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(template._id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Character Description */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                Character Description
              </h2>
              <textarea
                value={characterDesc}
                onChange={(e) => setCharacterDesc(e.target.value)}
                placeholder="Describe the character: age, ethnicity, features, hair, body type, style..."
                className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-none"
              />
            </div>

            {/* Product Description */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-pink-600" />
                Product Description
              </h2>
              <textarea
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                placeholder="Describe the outfit: type, style, colors, material, fit, details..."
                className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm resize-none"
              />
            </div>

            {/* Settings */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-600" />
                Settings
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Use Case
                  </label>
                  <select
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ecommerce">E-commerce Product Listing</option>
                    <option value="social">Social Media Content</option>
                    <option value="advertising">Advertising Campaign</option>
                    <option value="editorial">Editorial/Magazine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="realistic">Realistic Photography</option>
                    <option value="cinematic">Cinematic</option>
                    <option value="fashion">High Fashion</option>
                    <option value="casual">Casual/Lifestyle</option>
                    <option value="artistic">Artistic/Creative</option>
                  </select>
                </div>
              </div>

              <button
                onClick={generatePrompt}
                disabled={loading || !characterDesc || !productDesc}
                className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Zap className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate Prompt
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Output */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main Prompt */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Main Prompt
                </h2>
                {generatedPrompt && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(generatedPrompt)}
                      className="text-purple-600 hover:text-purple-700 flex items-center text-sm px-3 py-1 rounded hover:bg-purple-50"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </button>
                    <button
                      onClick={() => {
                        setEditingTemplate(selectedTemplate);
                        setTemplateName(selectedTemplate?.name || '');
                        setShowSaveModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-700 flex items-center text-sm px-3 py-1 rounded hover:bg-blue-50"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save as Template
                    </button>
                  </div>
                )}
              </div>
              
              {generatedPrompt ? (
                <div className="relative">
                  <textarea
                    value={generatedPrompt}
                    onChange={(e) => setGeneratedPrompt(e.target.value)}
                    className="w-full h-64 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm resize-none"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                    {generatedPrompt.length} chars
                  </div>
                </div>
              ) : (
                <div className="h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Wand2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Generated prompt will appear here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Negative Prompt */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Negative Prompt
                </h2>
                {negativePrompt && (
                  <button
                    onClick={() => copyToClipboard(negativePrompt)}
                    className="text-pink-600 hover:text-pink-700 flex items-center text-sm px-3 py-1 rounded hover:bg-pink-50"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </button>
                )}
              </div>
              
              {negativePrompt ? (
                <div className="relative">
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 font-mono text-sm resize-none"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                    {negativePrompt.length} chars
                  </div>
                </div>
              ) : (
                <div className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                  <p className="text-sm">Negative prompt will appear here</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {(generatedPrompt || negativePrompt) && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <button
                  onClick={downloadPrompt}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download as Text File
                </button>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 mb-3">💡 Tips for Better Prompts:</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• <strong>Be specific:</strong> Include details about age, ethnicity, hair color, body type</li>
                <li>• <strong>Describe outfit clearly:</strong> Mention colors, materials, fit, and style</li>
                <li>• <strong>Set the scene:</strong> Lighting, background, mood can enhance results</li>
                <li>• <strong>Use keywords:</strong> "professional photography", "high quality", "detailed"</li>
                <li>• <strong>Avoid contradictions:</strong> Make sure descriptions don't conflict</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Template Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingTemplate ? 'Update Template' : 'Save as Template'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>Use Case: <strong>{useCase}</strong></p>
                  <p>Style: <strong>{style}</strong></p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setTemplateName('');
                    setEditingTemplate(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
