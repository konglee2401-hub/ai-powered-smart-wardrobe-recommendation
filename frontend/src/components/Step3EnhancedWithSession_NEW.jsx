/**
 * Step 3 Enhanced - Style & Prompt (Merged)
 * Clean, straightforward layout with 3 functional sections
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wand2, FileText, Image, Copy, Check, ChevronDown, ChevronUp,
  Loader2, Zap, RotateCcw, Upload, Shuffle, X
} from 'lucide-react';
import { promptsAPI } from '../services/api';
import SessionHistoryService from '../services/sessionHistoryService';
import { SessionHistory, generateSessionId } from '../utils/sessionHistory';
import {
  PromptLayering,
  PromptVariationGenerator
} from '../utils/advancedPromptEngineering';
import PromptLayeringDialog from './PromptLayeringDialog';
import { generateAdvancedPrompt } from '../utils/advancedPromptBuilder';
import { STYLE_CATEGORIES } from './Step3Enhanced';

const Step3EnhancedWithSession = ({
  characterImage,
  productImage,
  selectedOptions,
  onOptionChange,
  generatedPrompt,
  onPromptChange,
  useCase = 'change-clothes',
  referenceImages = [],
  onReferenceImagesChange,
  analysis = null,
  userId = null
}) => {
  // Session Management
  const [sessionHistory, setSessionHistory] = useState(null);

  // Prompt Engineering
  const [promptLayering, setPromptLayering] = useState(null);
  const [promptVariations, setPromptVariations] = useState([]);
  const [showLayeringDialog, setShowLayeringDialog] = useState(false);

  // UI State
  const [expandedCategories, setExpandedCategories] = useState({});
  const [copiedText, setCopiedText] = useState(null);
  const [showOptimizerModal, setShowOptimizerModal] = useState(false);
  const [optimizedPrompt, setOptimizedPrompt] = useState('');

  // Initialize Session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const newSessionId = generateSessionId();
        const session = new SessionHistory(
          newSessionId,
          useCase,
          characterImage?.id,
          productImage?.id
        );
        setSessionHistory(session);

        // Try to sync to backend
        if (userId) {
          try {
            await SessionHistoryService.createSession({
              sessionId: newSessionId,
              userId,
              useCase,
              characterImageId: characterImage?.id,
              productImageId: productImage?.id
            });
          } catch (apiError) {
            // Works offline without backend
          }
        }
      } catch (error) {
        console.error('Session init error:', error);
      }
    };

    if (!sessionHistory) {
      initializeSession();
    }
  }, [userId]);

  // Generate Prompt with Layering
  useEffect(() => {
    const generatePrompt = async () => {
      if (Object.keys(selectedOptions).length === 0) return;

      try {
        const basePrompt = await generateAdvancedPrompt(
          useCase,
          selectedOptions,
          referenceImages
        );

        const layering = new PromptLayering(
          basePrompt.positive,
          'high-quality, professional, sharp, well-composed',
          basePrompt.negative
        );

        setPromptLayering(layering);

        const variationGenerator = new PromptVariationGenerator(
          basePrompt.positive
        );
        setPromptVariations(variationGenerator.generateAllVariations(3));

        // Update session
        if (sessionHistory) {
          sessionHistory.updatePromptStage({
            status: 'prompt_building',
            initialPrompt: basePrompt.positive,
            layeredPrompt: layering.toJSON()
          });

          if (userId && sessionHistory.sessionId) {
            try {
              await SessionHistoryService.updateSession(
                sessionHistory.sessionId,
                { promptStage: sessionHistory.promptStage }
              );
            } catch (e) {
              // Offline mode
            }
          }
        }
      } catch (error) {
        console.error('Prompt generation error:', error);
      }
    };

    generatePrompt();
  }, [selectedOptions, useCase, referenceImages]);

  const toggleCategory = useCallback((key) => {
    setExpandedCategories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  const handleCopyPrompt = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(null), 2000);
  }, []);

  const handleAddReferenceImage = useCallback((e) => {
    const files = Array.from(e.target.files || []);

    if (referenceImages.length + files.length > 3) {
      alert('Maximum 3 reference images allowed');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newRef = {
          id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          base64: event.target.result,
          name: file.name
        };
        onReferenceImagesChange([...referenceImages, newRef]);
      };
      reader.readAsDataURL(file);
    });
  }, [referenceImages, onReferenceImagesChange]);

  const handleRemoveReferenceImage = useCallback((id) => {
    onReferenceImagesChange(referenceImages.filter(ref => ref.id !== id));
  }, [referenceImages, onReferenceImagesChange]);

  const handleOptimizePrompt = useCallback(() => {
    if (!promptLayering) return;

    let optimized = promptLayering.mainPrompt;
    // Remove extra whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // Remove less important words
    const words_to_remove = [
      'professional', 'high quality', 'sharp focus', 'perfectly'
    ];
    words_to_remove.forEach(word => {
      optimized = optimized.replace(new RegExp(word, 'gi'), '').trim();
    });

    // Truncate if needed
    if (optimized.length > 300) {
      const parts = optimized.split(' ');
      optimized = parts.slice(0, Math.floor(300 / 6)).join(' ');
    }

    setOptimizedPrompt(optimized);
  }, [promptLayering]);

  const handleApplyOptimized = useCallback(() => {
    if (optimizedPrompt) {
      onPromptChange(optimizedPrompt);
      setShowOptimizerModal(false);
    }
  }, [optimizedPrompt, onPromptChange]);

  const handleGenerateVariations = useCallback(() => {
    if (!promptLayering) return;
    const generator = new PromptVariationGenerator(promptLayering.mainPrompt);
    setPromptVariations(generator.generateAllVariations(4));
    setShowLayeringDialog(true);
  }, [promptLayering]);

  return (
    <div className="flex flex-col gap-4 bg-gray-900 rounded-lg p-4 h-full">
      {/* Three Column Layout */}
      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        {/* LEFT: Style Options */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-y-auto">
          <h4 className="text-sm font-bold text-white mb-3">Style Options</h4>

          <div className="space-y-2">
            {Object.entries(STYLE_CATEGORIES).map(([key, category]) => (
              <div key={key} className="border border-gray-700 rounded overflow-hidden">
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 flex items-center justify-between text-sm font-medium text-white"
                >
                  <span className="flex items-center gap-1">
                    <span>{category.icon}</span>
                    {category.label}
                  </span>
                  {expandedCategories[key] ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {expandedCategories[key] && (
                  <div className="p-2 bg-gray-800 space-y-1 max-h-40 overflow-y-auto">
                    {category.options.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => onOptionChange(key, opt.value)}
                        className={`w-full px-2 py-1 text-xs rounded text-left transition ${
                          selectedOptions[key] === opt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE: Generated Prompt */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-y-auto flex flex-col gap-3">
          <h4 className="text-sm font-bold text-white">Generated Prompt</h4>

          {promptLayering ? (
            <>
              {/* Main Prompt */}
              <div className="bg-gray-900 rounded p-3 border-l-2 border-blue-500 flex-1">
                <p className="text-xs text-gray-400 mb-2 font-semibold">Main Prompt</p>
                <p className="text-xs text-white leading-relaxed whitespace-pre-wrap mb-2">
                  {promptLayering.mainPrompt}
                </p>
                <button
                  onClick={() => handleCopyPrompt(promptLayering.mainPrompt)}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center gap-1"
                >
                  {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedText ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Refiner */}
              <div className="bg-gray-900 rounded p-3 border-l-2 border-green-500">
                <p className="text-xs text-gray-400 mb-1 font-semibold">Quality Refiner</p>
                <p className="text-xs text-white mb-2">{promptLayering.refinerPrompt}</p>
                <button
                  onClick={() => handleCopyPrompt(promptLayering.refinerPrompt)}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>

              {/* Negative */}
              <div className="bg-gray-900 rounded p-3 border-l-2 border-red-500">
                <p className="text-xs text-gray-400 mb-1 font-semibold">Avoid (Negative)</p>
                <p className="text-xs text-white mb-2">{promptLayering.negativePrompt}</p>
                <button
                  onClick={() => handleCopyPrompt(promptLayering.negativePrompt)}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-700">
                <button
                  onClick={handleGenerateVariations}
                  className="flex-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center justify-center gap-1"
                >
                  <Shuffle className="w-3 h-3" />
                  Variations
                </button>
                <button
                  onClick={() => setShowOptimizerModal(true)}
                  className="flex-1 px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded flex items-center justify-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  Optimize
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
              Select options → prompt appears here
            </div>
          )}
        </div>

        {/* RIGHT: Images & Reference */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-y-auto space-y-4">
          <h4 className="text-sm font-bold text-white">Images</h4>

          {/* Source Images */}
          <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold">Input Images</p>
            <div className="grid grid-cols-2 gap-2">
              {characterImage && (
                <div className="bg-gray-700 rounded overflow-hidden">
                  <img
                    src={characterImage.preview || characterImage}
                    alt="Character"
                    className="w-full h-20 object-cover"
                  />
                  <p className="text-xs text-gray-400 text-center p-1">Character</p>
                </div>
              )}
              {productImage && (
                <div className="bg-gray-700 rounded overflow-hidden">
                  <img
                    src={productImage.preview || productImage}
                    alt="Product"
                    className="w-full h-20 object-cover"
                  />
                  <p className="text-xs text-gray-400 text-center p-1">Product</p>
                </div>
              )}
            </div>
          </div>

          {/* Reference Images */}
          <div>
            <p className="text-xs text-gray-400 mb-2 font-semibold">
              Style References ({referenceImages.length}/3)
            </p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {referenceImages.map((ref) => (
                <div
                  key={ref.id}
                  className="relative bg-gray-700 rounded overflow-hidden group"
                >
                  <img
                    src={ref.base64}
                    alt="Ref"
                    className="w-full h-14 object-cover"
                  />
                  <button
                    onClick={() => handleRemoveReferenceImage(ref.id)}
                    className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {referenceImages.length < 3 && (
              <label className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded cursor-pointer text-xs transition">
                <Upload className="w-3 h-3" />
                Add Ref
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleAddReferenceImage}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <PromptLayeringDialog
        isOpen={showLayeringDialog}
        onClose={() => setShowLayeringDialog(false)}
        layeredPrompt={promptLayering}
        variations={promptVariations}
        onSelectVariation={(v) => {
          onPromptChange(v.variation);
          setShowLayeringDialog(false);
        }}
        onApplyLayering={(l) => {
          onPromptChange(l.combined().positive);
          setShowLayeringDialog(false);
        }}
      />

      {showOptimizerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40">
          <div className="bg-gray-900 rounded-lg p-5 max-w-sm border border-gray-700 w-full mx-4">
            <h3 className="text-sm font-bold text-white mb-4">Optimize Prompt</h3>

            {!optimizedPrompt ? (
              <button
                onClick={handleOptimizePrompt}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded text-sm font-semibold"
              >
                Run Optimization
              </button>
            ) : (
              <>
                <div className="bg-gray-800 rounded p-3 mb-4 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">Result</p>
                  <p className="text-xs text-white mb-2">{optimizedPrompt}</p>
                  <p className="text-xs text-green-400">
                    ✓ Reduced {Math.round((1 - optimizedPrompt.length / (promptLayering?.mainPrompt.length || 1)) * 100)}%
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowOptimizerModal(false)}
                    className="flex-1 px-3 py-2 text-gray-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyOptimized}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-semibold"
                  >
                    Apply
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Step3EnhancedWithSession;
