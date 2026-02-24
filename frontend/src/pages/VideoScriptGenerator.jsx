import React, { useState } from 'react';
import { Copy, Download, Send, Sparkles, Zap, BookOpen, PlayCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { VIDEO_PRODUCTION_TEMPLATES } from '../constants/videoProductionTemplates';
import {
  generateVideoScriptPrompt,
  generateStyleVariationPrompt,
  generateMovementDetailPrompt,
  generateCameraGuidancePrompt,
  generateLightingSetupPrompt,
  generateTemplateLibraryPrompt
} from '../utils/videoPromptGenerators';

export default function VideoScriptGenerator() {
  const [activeTab, setActiveTab] = useState('scenario-script');
  const [generatedScript, setGeneratedScript] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states for different generators
  const [scenarioForm, setScenarioForm] = useState({
    videoScenario: 'Fashion Flow',
    productType: 'Dress',
    productDetails: 'Elegant summer dress in navy blue, flowing fabric, minimalist design',
    targetAudience: 'Fashion-forward women 18-35',
    videoStyle: 'Normal Speed',
    totalDuration: 20,
    segmentCount: 3
  });

  const [styleForm, setStyleForm] = useState({
    productType: 'Shoes',
    scenarioCount: 5
  });

  const [movementForm, setMovementForm] = useState({
    movement: 'Slow 360-degree turn',
    duration: 8,
    productType: 'Jacket',
    productArea: 'Sleeve design and fit'
  });

  const [cameraForm, setCameraForm] = useState({
    scenario: 'Product Showcase',
    segmentCount: 3,
    aspectRatio: '9:16',
    primaryFocus: 'Outfit details'
  });

  const [lightingForm, setLightingForm] = useState({
    scenario: 'Fashion Flow',
    style: 'Professional',
    primaryProduct: 'Designer Handbag',
    skinTone: 'medium'
  });

  const [templateForm, setTemplateForm] = useState({
    count: 30
  });

  // Handlers
  const handleGenerateScenario = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/video/generate-video-scripts', {
        scenarioId: scenarioForm.videoScenario.toLowerCase().replace(/ /g, '-'),
        style: scenarioForm.videoStyle.toLowerCase().replace(/ /g, '-'),
        duration: scenarioForm.totalDuration,
        segments: scenarioForm.segmentCount,
        productName: scenarioForm.productType,
        productDescription: scenarioForm.productDetails,
        productType: scenarioForm.productType,
        targetAudience: scenarioForm.targetAudience
      });

      if (response.success) {
        setGeneratedScript(response.data);
        setGeneratedPrompt(response.data.rawContent);
        toast.success('Video script generated successfully!');
      } else {
        throw new Error(response.error || 'Failed to generate script');
      }
    } catch (error) {
      console.error('Error generating scenario:', error);
      toast.error(error.data?.error || error.message || 'Failed to generate script');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStyles = () => {
    setIsLoading(true);
    try {
      const prompt = generateStyleVariationPrompt(
        styleForm.productType,
        styleForm.scenarioCount
      );
      setGeneratedPrompt(prompt);
      toast.success('Style variation prompt generated!');
    } catch (error) {
      toast.error('Failed to generate prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMovement = () => {
    setIsLoading(true);
    try {
      const prompt = generateMovementDetailPrompt(
        movementForm.movement,
        movementForm.duration,
        movementForm.productType,
        movementForm.productArea
      );
      setGeneratedPrompt(prompt);
      toast.success('Movement prompt generated!');
    } catch (error) {
      toast.error('Failed to generate prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCamera = () => {
    setIsLoading(true);
    try {
      const prompt = generateCameraGuidancePrompt(
        cameraForm.scenario,
        cameraForm.segmentCount,
        cameraForm.aspectRatio,
        cameraForm.primaryFocus
      );
      setGeneratedPrompt(prompt);
      toast.success('Camera guidance prompt generated!');
    } catch (error) {
      toast.error('Failed to generate prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLighting = () => {
    setIsLoading(true);
    try {
      const prompt = generateLightingSetupPrompt(
        lightingForm.scenario,
        lightingForm.style,
        lightingForm.primaryProduct,
        lightingForm.skinTone
      );
      setGeneratedPrompt(prompt);
      toast.success('Lighting setup prompt generated!');
    } catch (error) {
      toast.error('Failed to generate prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLibrary = () => {
    setIsLoading(true);
    try {
      const prompt = generateTemplateLibraryPrompt(templateForm.count);
      setGeneratedPrompt(prompt);
      toast.success('Template library prompt generated!');
    } catch (error) {
      toast.error('Failed to generate prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = generatedScript?.rawContent || generatedPrompt;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    toast.success('Copied to clipboard!');
  };

  const downloadPrompt = () => {
    const textToDownload = generatedScript?.rawContent || generatedPrompt;
    if (!textToDownload) return;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(textToDownload));
    element.setAttribute('download', `video-script-${Date.now()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Downloaded!');
  };

  const openInChatGPT = () => {
    const textToSend = generatedScript?.rawContent || generatedPrompt;
    if (!textToSend) return;
    const url = `https://chat.openai.com/?q=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h1 className="text-4xl font-bold">Video Script Generator</h1>
          </div>
          <p className="text-gray-400">
            Generate intelligent ChatGPT prompts to create detailed video scenario scripts and guidance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Generator Selection */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-2 sticky top-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Generators
              </h2>
              
              {[
                { id: 'scenario-script', label: '🎬 Scenario Script', icon: PlayCircle },
                { id: 'style-variations', label: '🎨 Style Variations', icon: Sparkles },
                { id: 'movement-detail', label: '🚶 Movement Detail', icon: Zap },
                { id: 'camera-guidance', label: '📹 Camera Guidance', icon: Sparkles },
                { id: 'lighting-setup', label: '💡 Lighting Setup', icon: Sparkles },
                { id: 'template-library', label: '📚 Template Library', icon: BookOpen },
                { id: 'production-templates', label: '🎥 Production Templates', icon: PlayCircle }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setGeneratedPrompt('');
                    setGeneratedScript(null);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    activeTab === item.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Content - Forms and Output */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form Section */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              {/* Scenario Script Form */}
              {activeTab === 'scenario-script' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-6">Generate Video Scenario Script</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Video Scenario</label>
                      <input
                        type="text"
                        value={scenarioForm.videoScenario}
                        onChange={(e) => setScenarioForm({...scenarioForm, videoScenario: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="e.g., Fashion Flow, Product Zoom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Product Type</label>
                      <input
                        type="text"
                        value={scenarioForm.productType}
                        onChange={(e) => setScenarioForm({...scenarioForm, productType: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="e.g., Dress, Shoes"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Product Details</label>
                    <textarea
                      value={scenarioForm.productDetails}
                      onChange={(e) => setScenarioForm({...scenarioForm, productDetails: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      rows="3"
                      placeholder="Describe the product in detail..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Target Audience</label>
                    <input
                      type="text"
                      value={scenarioForm.targetAudience}
                      onChange={(e) => setScenarioForm({...scenarioForm, targetAudience: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      placeholder="e.g., Fashion-forward women 18-35"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Video Style</label>
                      <select
                        value={scenarioForm.videoStyle}
                        onChange={(e) => setScenarioForm({...scenarioForm, videoStyle: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option>Normal Speed</option>
                        <option>Slow Motion</option>
                        <option>Quick Cuts</option>
                        <option>Graceful Float</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
                      <input
                        type="number"
                        value={scenarioForm.totalDuration}
                        onChange={(e) => setScenarioForm({...scenarioForm, totalDuration: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        min="15"
                        max="60"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Segments</label>
                      <input
                        type="number"
                        value={scenarioForm.segmentCount}
                        onChange={(e) => setScenarioForm({...scenarioForm, segmentCount: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        min="2"
                        max="6"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateScenario}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    {isLoading ? 'Generating...' : 'Generate Scenario Script'}
                  </button>
                </div>
              )}

              {/* Style Variations Form */}
              {activeTab === 'style-variations' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-6">Generate Style Variations</h2>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Product Type</label>
                    <input
                      type="text"
                      value={styleForm.productType}
                      onChange={(e) => setStyleForm({...styleForm, productType: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      placeholder="e.g., Shoes, Handbag, Jacket"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Scenarios</label>
                    <input
                      type="number"
                      value={styleForm.scenarioCount}
                      onChange={(e) => setStyleForm({...styleForm, scenarioCount: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      min="3"
                      max="10"
                    />
                  </div>

                  <button
                    onClick={handleGenerateStyles}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    {isLoading ? 'Generating...' : 'Generate Style Variations'}
                  </button>
                </div>
              )}

              {/* Movement Detail Form */}
              {activeTab === 'movement-detail' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-6">Generate Movement Detail</h2>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Movement Description</label>
                    <input
                      type="text"
                      value={movementForm.movement}
                      onChange={(e) => setMovementForm({...movementForm, movement: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      placeholder="e.g., Slow 360-degree turn"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
                      <input
                        type="number"
                        value={movementForm.duration}
                        onChange={(e) => setMovementForm({...movementForm, duration: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        min="2"
                        max="15"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Product Type</label>
                      <input
                        type="text"
                        value={movementForm.productType}
                        onChange={(e) => setMovementForm({...movementForm, productType: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="e.g., Jacket"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Focus Area</label>
                      <input
                        type="text"
                        value={movementForm.productArea}
                        onChange={(e) => setMovementForm({...movementForm, productArea: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="e.g., Sleeve design"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateMovement}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    {isLoading ? 'Generating...' : 'Generate Movement Detail'}
                  </button>
                </div>
              )}

              {/* Camera Guidance Form */}
              {activeTab === 'camera-guidance' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-6">Generate Camera Guidance</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Scenario</label>
                      <input
                        type="text"
                        value={cameraForm.scenario}
                        onChange={(e) => setCameraForm({...cameraForm, scenario: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="e.g., Product Showcase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Segment Count</label>
                      <input
                        type="number"
                        value={cameraForm.segmentCount}
                        onChange={(e) => setCameraForm({...cameraForm, segmentCount: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        min="2"
                        max="6"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                      <select
                        value={cameraForm.aspectRatio}
                        onChange={(e) => setCameraForm({...cameraForm, aspectRatio: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option>9:16</option>
                        <option>16:9</option>
                        <option>1:1</option>
                        <option>4:5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Primary Focus</label>
                      <input
                        type="text"
                        value={cameraForm.primaryFocus}
                        onChange={(e) => setCameraForm({...cameraForm, primaryFocus: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="e.g., Outfit details"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateCamera}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    {isLoading ? 'Generating...' : 'Generate Camera Guidance'}
                  </button>
                </div>
              )}

              {/* Lighting Setup Form */}
              {activeTab === 'lighting-setup' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-6">Generate Lighting Setup</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Scenario</label>
                      <input
                        type="text"
                        value={lightingForm.scenario}
                        onChange={(e) => setLightingForm({...lightingForm, scenario: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="e.g., Fashion Flow"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Style</label>
                      <input
                        type="text"
                        value={lightingForm.style}
                        onChange={(e) => setLightingForm({...lightingForm, style: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                        placeholder="e.g., Professional, Casual"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Primary Product</label>
                    <input
                      type="text"
                      value={lightingForm.primaryProduct}
                      onChange={(e) => setLightingForm({...lightingForm, primaryProduct: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      placeholder="e.g., Designer Handbag"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Skin Tone (for flattering light)</label>
                    <select
                      value={lightingForm.skinTone}
                      onChange={(e) => setLightingForm({...lightingForm, skinTone: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="light">Light</option>
                      <option value="medium">Medium</option>
                      <option value="dark">Dark</option>
                      <option value="deep">Deep</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGenerateLighting}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    {isLoading ? 'Generating...' : 'Generate Lighting Setup'}
                  </button>
                </div>
              )}

              {/* Template Library Form */}
              {activeTab === 'template-library' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-6">Generate Template Library</h2>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Number of Templates</label>
                    <input
                      type="number"
                      value={templateForm.count}
                      onChange={(e) => setTemplateForm({...templateForm, count: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                      min="10"
                      max="50"
                    />
                    <p className="text-gray-400 text-sm mt-2">Generates this many unique video scenario templates</p>
                  </div>

                  <button
                    onClick={handleGenerateLibrary}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    {isLoading ? 'Generating...' : 'Generate Template Library'}
                  </button>
                </div>
              )}

              {/* Production Templates */}
              {activeTab === 'production-templates' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-6">Ready-to-Use Production Templates</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Pre-generated scripts for common products and scenarios. Copy, customize, and produce immediately.
                  </p>

                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                    {Object.entries(VIDEO_PRODUCTION_TEMPLATES).map(([templateId, template]) => (
                      <button
                        key={templateId}
                        onClick={() => {
                          setGeneratedScript(template);
                          setGeneratedPrompt(JSON.stringify(template, null, 2));
                        }}
                        className="text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition border border-gray-600"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-white">{template.title}</h3>
                            <div className="text-sm text-gray-400 mt-1 space-y-1">
                              <p>📦 {template.productType} • ⏱️ {template.duration}s • 📹 {template.scenarioId}</p>
                              <p className="text-xs text-gray-500">{template.segments.length} segments • Style: {template.style}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Click to view</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <p className="text-gray-400 text-xs mt-4">
                    Click any template to load it. All templates include detailed segment breakdowns, camera work, lighting, and movement instructions.
                  </p>
                </div>
              )}
            </div>

            {/* Output Section */}
            {(generatedPrompt || generatedScript) && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">
                    {generatedScript ? 'Generated Video Script' : 'Generated Prompt'}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition flex items-center gap-2 text-sm"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                    <button
                      onClick={downloadPrompt}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition flex items-center gap-2 text-sm"
                      title="Download as file"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={openInChatGPT}
                      className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2 text-sm font-medium"
                      title="Open in ChatGPT"
                    >
                      <Send className="w-4 h-4" />
                      ChatGPT
                    </button>
                  </div>
                </div>

                {/* Display Generated Script with Segments */}
                {generatedScript && generatedScript.segments && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm text-gray-400">
                      <div className="bg-gray-900 p-3 rounded-lg">
                        <div className="text-gray-500">Duration</div>
                        <div className="text-lg text-white font-semibold">{generatedScript.duration}s</div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded-lg">
                        <div className="text-gray-500">Segments</div>
                        <div className="text-lg text-white font-semibold">{generatedScript.segments.length}</div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded-lg">
                        <div className="text-gray-500">Style</div>
                        <div className="text-lg text-white font-semibold capitalize">{generatedScript.style}</div>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {generatedScript.segments.map((segment, index) => (
                        <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{segment.name || `Segment ${segment.number}`}</h3>
                              <p className="text-sm text-gray-400">{segment.timeCode}</p>
                            </div>
                            <div className="text-right text-sm text-gray-400">
                              {segment.duration}s
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            {segment.cameraWork && (
                              <div>
                                <span className="text-gray-500">Camera:</span>
                                <span className="text-gray-300 ml-2">{segment.cameraWork}</span>
                              </div>
                            )}
                            {segment.lighting && (
                              <div>
                                <span className="text-gray-500">Lighting:</span>
                                <span className="text-gray-300 ml-2">{segment.lighting}</span>
                              </div>
                            )}
                            {segment.movements && segment.movements.length > 0 && (
                              <div>
                                <span className="text-gray-500">Movements:</span>
                                <ul className="text-gray-300 ml-4 mt-1">
                                  {segment.movements.map((movement, i) => (
                                    <li key={i} className="list-disc">{movement}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {segment.script && (
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <span className="text-gray-500">Script:</span>
                                <p className="text-gray-300 mt-2 whitespace-pre-wrap">{segment.script}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display Raw Prompt */}
                {!generatedScript && generatedPrompt && (
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap">{generatedPrompt}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
