/**
 * Step 3 Enhanced - Style & Prompt (Merged)
 * Clean, straightforward layout with 3 functional sections
 */

import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
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

const Step3EnhancedWithSessionComponent = ({
  characterImage,
  productImage,
  selectedOptions,
  onOptionChange,
  generatedPrompt,
  onPromptChange,
  useCase = 'change-clothes',
  analysis = null,
  userId = null,
  characterDescription = null
}, ref) => {
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

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    triggerVariations: () => {
      if (promptLayering) {
        const generator = new PromptVariationGenerator(promptLayering.mainPrompt);
        setPromptVariations(generator.generateAllVariations(4));
        setShowLayeringDialog(true);
      }
    },
    triggerOptimize: () => {
      setShowOptimizerModal(true);
    }
  }), [promptLayering]);

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

        // Try to sync to backend (optional - works offline)
        if (userId) {
          const result = await SessionHistoryService.createSession({
            sessionId: newSessionId,
            userId,
            useCase,
            characterImageId: characterImage?.id,
            productImageId: productImage?.id
          });
          if (result) {
            console.log('✅ Session synced to backend');
          } else {
            console.log('📱 Working offline - session saved locally only');
          }
        }
      } catch (error) {
        console.error('Session init error:', error);
      }
    };

    if (!sessionHistory) {
      initializeSession();
    }
  }, [userId, useCase, characterImage, productImage]);

  // Helper: Extract product description from analysis
  const getProductDescription = () => {
    if (!analysis?.recommendations?.productDetails) {
      return 'fashion item';
    }
    
    const prod = analysis.recommendations.productDetails;
    const parts = [
      prod.garment_type,
      prod.style_category,
      prod.fit_type,
      `${prod.primary_color} with ${prod.secondary_color}` 
    ].filter(Boolean);
    
    return parts.join(' ') || 'fashion item';
  };

  // Helper: Extract product name/type from analysis
  const getProductName = () => {
    if (!analysis?.recommendations?.productDetails?.garment_type) {
      return 'product';
    }
    return analysis.recommendations.productDetails.garment_type;
  };

  // Helper: Replace placeholders in prompt with actual values
  const replacePlaceholders = (prompt, productDesc, productName) => {
    if (!prompt) return prompt;
    return prompt
      .replace(/\[PRODUCT_DESCRIPTION\]/g, productDesc)
      .replace(/\[PRODUCT_NAME\]/g, productName);
  };

  // Generate Prompt with Layering
  useEffect(() => {
    const generatePrompt = async () => {
      if (Object.keys(selectedOptions).length === 0) {
        console.log('⚠️ No selected options yet, skipping prompt generation');
        return;
      }

      try {
        console.log('📝 Generating prompt with options:', selectedOptions);
        console.log('📝 Character description:', characterDescription);
        
        // Extract product information from analysis
        const productDesc = getProductDescription();
        const productName = getProductName();
        console.log('🏷️ Product info - Name:', productName, 'Description:', productDesc);
        
        const basePrompt = await generateAdvancedPrompt(
          useCase,
          selectedOptions,
          {
            productName: productName,
            characterName: 'character-image'
          }
        );

        console.log('✅ Base prompt generated (with placeholders):', basePrompt.positive.substring(0, 100) + '...');
        
        // Replace placeholders with actual product information
        let finalPositive = replacePlaceholders(basePrompt.positive, productDesc, productName);
        const finalNegative = replacePlaceholders(basePrompt.negative, productDesc, productName);
        
        // 💫 NEW: Add character description to prompt if available
        if (characterDescription) {
          finalPositive = `Character: ${characterDescription}\n\n${finalPositive}`;
          console.log('✅ Added character description to prompt');
        }
        
        console.log('✅ Prompt after placeholder replacement:', finalPositive.substring(0, 100) + '...');

        const layering = new PromptLayering(
          finalPositive,
          'high-quality, professional, sharp, well-composed',
          finalNegative
        );

        setPromptLayering(layering);
        
        // ✅ Send back to parent component
        console.log('📤 Sending prompt to parent via onPromptChange');
        onPromptChange({
          positive: finalPositive,
          negative: finalNegative
        });

        const variationGenerator = new PromptVariationGenerator(
          finalPositive
        );
        setPromptVariations(variationGenerator.generateAllVariations(3));

        // Update session
        if (sessionHistory) {
          sessionHistory.updatePromptStage({
            status: 'prompt_building',
            initialPrompt: finalPositive,
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
  }, [selectedOptions, useCase, analysis, sessionHistory, userId, onPromptChange, characterDescription]);

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
    // Removed - now handled in VirtualTryOnPage
  }, []);

  const handleRemoveReferenceImage = useCallback((id) => {
    // Removed - now handled in VirtualTryOnPage
  }, []);

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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-yellow-400" />
          Generated Prompt
        </h3>
      </div>

      {/* Main Content - Prompt Preview */}
      {promptLayering ? (
        <div className="space-y-3">
          {/* Main Prompt */}
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500 space-y-2">
            <p className="text-sm text-blue-400 font-bold">Main Prompt</p>
            <div className="bg-gray-900 rounded p-3 min-h-24 max-h-32 overflow-y-auto">
              <p className="text-sm text-white leading-relaxed">
                {promptLayering.mainPrompt}
              </p>
            </div>
            <button
              onClick={() => handleCopyPrompt(promptLayering.mainPrompt)}
              className="w-full text-sm px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center gap-2 transition"
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Main Prompt
                </>
              )}
            </button>
          </div>

          {/* Refiner */}
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500 space-y-2">
            <p className="text-sm text-green-400 font-bold">Quality Refiner</p>
            <div className="bg-gray-900 rounded p-3 max-h-16 overflow-y-auto">
              <p className="text-sm text-white leading-relaxed">
                {promptLayering.refinerPrompt}
              </p>
            </div>
            <button
              onClick={() => handleCopyPrompt(promptLayering.refinerPrompt)}
              className="w-full text-sm px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center gap-2 transition"
            >
              <Copy className="w-4 h-4" />
              Copy Refiner
            </button>
          </div>

          {/* Negative */}
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-red-500 space-y-2">
            <p className="text-sm text-red-400 font-bold">Avoid (Negative)</p>
            <div className="bg-gray-900 rounded p-3 max-h-16 overflow-y-auto">
              <p className="text-sm text-white leading-relaxed">
                {promptLayering.negativePrompt}
              </p>
            </div>
            <button
              onClick={() => handleCopyPrompt(promptLayering.negativePrompt)}
              className="w-full text-sm px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center gap-2 transition"
            >
              <Copy className="w-4 h-4" />
              Copy Negative
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-8 border border-dashed border-gray-600 flex items-center justify-center min-h-48">
          <div className="text-center">
            <Wand2 className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Select style options on the left</p>
            <p className="text-gray-500 text-sm mt-1">to generate prompts</p>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-5 max-w-sm border border-gray-700 w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Optimize Prompt</h3>

            {!optimizedPrompt ? (
              <button
                onClick={handleOptimizePrompt}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg text-sm font-semibold transition"
              >
                Run Optimization
              </button>
            ) : (
              <>
                <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
                  <p className="text-sm text-gray-400 mb-2 font-semibold">Result</p>
                  <p className="text-sm text-white mb-2 max-h-24 overflow-y-auto">{optimizedPrompt}</p>
                  <p className="text-sm text-green-400">
                    ✓ Reduced by {Math.round((1 - optimizedPrompt.length / (promptLayering?.mainPrompt.length || 1)) * 100)}%
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowOptimizerModal(false)}
                    className="flex-1 px-3 py-2 text-gray-400 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyOptimized}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-semibold transition"
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

export default forwardRef(Step3EnhancedWithSessionComponent);
