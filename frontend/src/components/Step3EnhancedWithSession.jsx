/**
 * Step 3 Enhanced - Style & Prompt (Merged)
 * Clean, straightforward layout with 3 functional sections
 */

import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  Wand2, Copy, Check, Zap, Shuffle, X
} from 'lucide-react';
import { unifiedFlowAPI } from '../services/api';
import SessionHistoryService from '../services/sessionHistoryService';
import { SessionHistory, generateSessionId } from '../utils/sessionHistory';
import {
  PromptLayering,
  PromptVariationGenerator
} from '../utils/advancedPromptEngineering';
import PromptLayeringDialog from './PromptLayeringDialog';
import { generateAdvancedPrompt } from '../utils/advancedPromptBuilder';

const getStep3SmartDefaults = (useCase, scene = 'studio') => {
  switch (useCase) {
    case 'creator-thumbnail':
      return {
        scene,
        lighting: 'high-key',
        mood: 'energetic',
        style: 'commercial',
        cameraAngle: 'eye-level',
        colorPalette: 'vibrant',
        framing: 'shoulders-up',
        expression: 'excited',
        gesture: 'reaction-hands',
        textOverlayZone: 'right-negative-space',
        productPresence: 'secondary-prop'
      };
    case 'story-character':
      return {
        scene,
        lighting: 'dramatic-rembrandt',
        mood: 'mysterious',
        style: 'editorial',
        cameraAngle: 'three-quarter',
        colorPalette: 'earth-tones',
        storyRole: 'narrator',
        expression: 'serious-focus',
        pose: 'explaining',
        sceneDepth: 'cinematic-depth',
        propCue: 'not-needed'
      };
    default:
      return {
        scene,
        lighting: 'soft',
        mood: 'elegant',
        style: 'fashion-editorial',
        cameraAngle: 'three-quarter',
        colorPalette: 'neutral'
      };
  }
};

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
  characterDescription = null,
  productFocus = 'full-outfit'
}, ref) => {
  // Session Management
  const [sessionHistory, setSessionHistory] = useState(null);

  // Prompt Engineering
  const [promptLayering, setPromptLayering] = useState(null);
  const [promptVariations, setPromptVariations] = useState([]);
  const [showLayeringDialog, setShowLayeringDialog] = useState(false);

  // UI State
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
            console.log('âœ… Session synced to backend');
          } else {
            console.log('ðŸ“± Working offline - session saved locally only');
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
    const prod = analysis?.productDetails || analysis?.product || analysis?.recommendations?.productDetails;
    if (!prod) {
      return 'fashion item';
    }
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
    const prod = analysis?.productDetails || analysis?.product || analysis?.recommendations?.productDetails;
    if (!prod?.garment_type) {
      return 'product';
    }
    return prod.garment_type;
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
      // Handle empty selectedOptions: build defaults from analysis or use sensible defaults
      let optionsToUse = { ...selectedOptions };
      
      if (Object.keys(optionsToUse).length === 0) {
        console.log('âš ï¸ No selected options, building defaults from analysis...');
        
        // Try to extract recommendations from analysis
        if (analysis?.recommendations) {
          const rec = analysis.recommendations;
          
          Object.keys(rec).forEach((key) => {
            if (['analysis', 'newOptions', 'characterProfile', 'productDetails'].includes(key)) {
              return;
            }

            const rawChoice = rec[key]?.choiceArray?.length ? rec[key].choiceArray : rec[key]?.choice;
            if (rawChoice == null || rawChoice === '') {
              return;
            }

            optionsToUse[key] = rawChoice;
          });
          
          console.log('âœ… Extracted defaults from analysis:', optionsToUse);
        }
        
        // If still empty after analysis, use sensible defaults
        if (Object.keys(optionsToUse).length === 0) {
          console.log('âš ï¸ No analysis recommendations, using sensible defaults...');
          optionsToUse = getStep3SmartDefaults(useCase, selectedOptions?.scene || 'studio');
        }
      }

      try {
        console.log('ðŸ“ Generating prompt with options:', optionsToUse);
        console.log('ðŸ“ Character description:', characterDescription);
        
        // Extract product information from analysis
        const productDesc = getProductDescription();
        const productName = getProductName();
        console.log('ðŸ·ï¸ Product info - Name:', productName, 'Description:', productDesc);
        
        let finalPositive = '';
        let finalNegative = '';

        try {
          const backendPrompt = analysis
            ? await unifiedFlowAPI.buildPrompt(analysis, optionsToUse, useCase, productFocus)
            : null;

          if (backendPrompt?.success && backendPrompt.data?.prompt) {
            finalPositive = backendPrompt.data.prompt.positive || "";
            finalNegative = backendPrompt.data.prompt.negative || "";
            console.log('??? Using backend buildPrompt result for Step 3 preview');
          }
        } catch (backendError) {
          console.warn('?????? Step 3 backend prompt build failed, falling back to local builder:', backendError.message);
        }

        if (!finalPositive) {
          const basePrompt = await generateAdvancedPrompt(
            useCase,
            optionsToUse,
            {
              productName: productName,
              characterName: 'character-image'
            }
          );

          console.log('??? Base prompt generated (with placeholders):', basePrompt.positive.substring(0, 100) + '...');

          finalPositive = replacePlaceholders(basePrompt.positive, productDesc, productName);
          finalNegative = replacePlaceholders(basePrompt.negative, productDesc, productName);

          if (characterDescription) {
            finalPositive = `Character: ${characterDescription}

${finalPositive}`;
            console.log('??? Added character description to fallback prompt');
          }
        }

        console.log('??? Prompt ready:', finalPositive.substring(0, 100) + '...');
        const layering = new PromptLayering(
          finalPositive,
          'high-quality, professional, sharp, well-composed',
          finalNegative
        );

        setPromptLayering(layering);
        
        // âœ… Send back to parent component
        console.log('ðŸ“¤ Sending prompt to parent via onPromptChange');
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
  }, [selectedOptions, useCase, analysis, sessionHistory, userId, onPromptChange, characterDescription, productFocus]);

  const handleCopyPrompt = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
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
      onPromptChange({
        positive: optimizedPrompt,
        negative: promptLayering?.negativePrompt || generatedPrompt?.negative || ''
      });
      setShowOptimizerModal(false);
    }
  }, [optimizedPrompt, onPromptChange, promptLayering, generatedPrompt]);

  const handleGenerateVariations = useCallback(() => {
    if (!promptLayering) return;
    const generator = new PromptVariationGenerator(promptLayering.mainPrompt);
    setPromptVariations(generator.generateAllVariations(4));
    setShowLayeringDialog(true);
  }, [promptLayering]);

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <section className="apple-surface-panel flex min-h-0 flex-1 min-w-0 flex-col rounded-[2rem] p-3 overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Wand2 className="h-5 w-5 text-amber-300" />
              Generated Prompt
            </h3>
            {promptLayering ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateVariations}
                  className="apple-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Variations
                </button>
                <button
                  onClick={() => setShowOptimizerModal(true)}
                  className="apple-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Optimize
                </button>
              </div>
            ) : null}
          </div>

          {promptLayering ? (
            <div className="grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1.3fr)_auto_auto]">
              <div className="rounded-[1.35rem] bg-white/[0.03] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-white">Main Prompt</p>
                  <button
                    onClick={() => handleCopyPrompt(promptLayering.mainPrompt)}
                    className="apple-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                  >
                    {copiedText === promptLayering.mainPrompt ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Main Prompt
                      </>
                    )}
                  </button>
                </div>
                <div className="h-full min-h-[220px] overflow-y-auto">
                  <p className="apple-prompt-text text-[14px] leading-8 text-slate-200/96">{promptLayering.mainPrompt}</p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-[1.25rem] bg-white/[0.03] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Quality Refiner</p>
                    <button
                      onClick={() => handleCopyPrompt(promptLayering.refinerPrompt)}
                      className="apple-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  <div>
                    <p className="apple-prompt-text text-[13px] leading-7 text-slate-300">{promptLayering.refinerPrompt}</p>
                  </div>
                </div>

                <div className="rounded-[1.25rem] bg-white/[0.03] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">Avoid</p>
                    <button
                      onClick={() => handleCopyPrompt(promptLayering.negativePrompt)}
                      className="apple-secondary-button inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  <div>
                    <p className="apple-prompt-text text-[13px] leading-7 text-slate-300">{promptLayering.negativePrompt}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-[1.8rem] bg-white/[0.03]">
              <div className="text-center">
                <Wand2 className="mx-auto mb-3 h-12 w-12 text-slate-500" />
                <p className="font-medium text-slate-300">Select style options on the left</p>
                <p className="mt-1 text-sm text-slate-500">The prompt preview will update automatically.</p>
              </div>
            </div>
          )}
      </section>

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
        <div className="fixed inset-0 app-layer-modal flex items-center justify-center bg-black/60">
          <div className="apple-surface-panel w-full max-w-sm rounded-[1.75rem] p-5 mx-4">
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
                <div className="mb-4 rounded-[1.25rem] bg-white/[0.04] p-4">
                  <p className="text-sm text-gray-400 mb-2 font-semibold">Result</p>
                  <p className="text-sm text-white mb-2 max-h-24 overflow-y-auto">{optimizedPrompt}</p>
                  <p className="text-sm text-green-400">
                    âœ“ Reduced by {Math.round((1 - optimizedPrompt.length / (promptLayering?.mainPrompt.length || 1)) * 100)}%
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


