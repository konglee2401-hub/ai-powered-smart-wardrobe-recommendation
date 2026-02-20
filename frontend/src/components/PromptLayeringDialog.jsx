/**
 * Prompt Layering & Variations Dialog
 * Displays layered prompts and variations for A/B testing
 */

import React, { useState, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
  Eye,
  Grid2X2,
  Code2
} from 'lucide-react';

const PromptLayeringDialog = ({
  isOpen,
  onClose,
  layeredPrompt,
  variations,
  onSelectVariation,
  onApplyLayering
}) => {
  const [selectedTab, setSelectedTab] = useState('layered'); // 'layered', 'variations'
  const [expandedVariation, setExpandedVariation] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedVariationId, setSelectedVariationId] = useState(null);

  const handleCopyToClipboard = useCallback((text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Advanced Prompt Engineering
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 border-b border-gray-700 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedTab('layered')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                selectedTab === 'layered'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Code2 className="w-4 h-4 inline mr-2" />
              Layered Prompt
            </button>
            <button
              onClick={() => setSelectedTab('variations')}
              className={`px-4 py-3 font-medium transition-colors border-b-2 relative ${
                selectedTab === 'variations'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <Grid2X2 className="w-4 h-4 inline mr-2" />
              A/B Testing Variations
              {variations && variations.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {variations.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Layered Prompt Tab */}
          {selectedTab === 'layered' && layeredPrompt && (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm mb-4">
                Layered prompts separate your instruction into main content and
                refiners for better control and quality.
              </p>

              {/* Main Prompt */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 text-white text-xs rounded flex items-center justify-center">
                    1
                  </span>
                  Main Prompt
                </h3>
                <div className="bg-gray-900 rounded p-3 mb-3">
                  <p className="text-gray-200 text-sm whitespace-pre-wrap break-words">
                    {layeredPrompt.mainPrompt}
                  </p>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>{layeredPrompt.mainPrompt.length} characters</span>
                  <button
                    onClick={() => handleCopyToClipboard(layeredPrompt.mainPrompt, 'main')}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-gray-200"
                  >
                    {copiedId === 'main' ? (
                      <>
                        <Check className="w-3 h-3 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Refiner Prompt */}
              {layeredPrompt.refinerPrompt && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-purple-500 text-white text-xs rounded flex items-center justify-center">
                      2
                    </span>
                    Refiner Prompt
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">
                    Used to enhance and refine the main prompt (optional)
                  </p>
                  <div className="bg-gray-900 rounded p-3 mb-3">
                    <p className="text-gray-200 text-sm whitespace-pre-wrap break-words">
                      {layeredPrompt.refinerPrompt}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{layeredPrompt.refinerPrompt.length} characters</span>
                    <button
                      onClick={() => handleCopyToClipboard(layeredPrompt.refinerPrompt, 'refiner')}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-gray-200"
                    >
                      {copiedId === 'refiner' ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Negative Prompt */}
              {layeredPrompt.negativePrompt && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-red-500 text-white text-xs rounded flex items-center justify-center">
                      3
                    </span>
                    Negative Prompt
                  </h3>
                  <div className="bg-gray-900 rounded p-3 mb-3">
                    <p className="text-gray-200 text-sm whitespace-pre-wrap break-words">
                      {layeredPrompt.negativePrompt}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{layeredPrompt.negativePrompt.length} characters</span>
                    <button
                      onClick={() => handleCopyToClipboard(layeredPrompt.negativePrompt, 'negative')}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-gray-200"
                    >
                      {copiedId === 'negative' ? (
                        <>
                          <Check className="w-3 h-3 text-green-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-sm text-blue-200">
                <p className="font-semibold mb-1">💡 How to use layered prompts:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Main prompt for primary instructions</li>
                  <li>Refiner for quality enhancements (some models support this)</li>
                  <li>Negative prompt for what to avoid</li>
                </ul>
              </div>

              {/* Apply Button */}
              <button
                onClick={() => onApplyLayering && onApplyLayering(layeredPrompt)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                Apply Layered Prompt
              </button>
            </div>
          )}

          {/* Variations Tab */}
          {selectedTab === 'variations' && variations && variations.length > 0 && (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm mb-4">
                Generated variations for A/B testing. Each variation keeps the core
                meaning while changing the wording.
              </p>

              {variations.map((variation) => (
                <div
                  key={variation.id}
                  className={`bg-gray-800 rounded-lg overflow-hidden transition-colors ${
                    selectedVariationId === variation.id
                      ? 'ring-2 ring-blue-500'
                      : ''
                  }`}
                >
                  {/* Variation Header */}
                  <button
                    onClick={() =>
                      setExpandedVariation(
                        expandedVariation === variation.id ? null : variation.id
                      )
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-700 transition"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <input
                        type="radio"
                        name="variation"
                        checked={selectedVariationId === variation.id}
                        onChange={() => setSelectedVariationId(variation.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-white capitalize">
                          {variation.method.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Quality Score: {variation.score}, Length: {variation.variation.length}
                          {' '}chars
                        </p>
                      </div>
                    </div>
                    {expandedVariation === variation.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* Variation Content */}
                  {expandedVariation === variation.id && (
                    <div className="border-t border-gray-700 p-4 space-y-3 bg-gray-900/50">
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Variation:</p>
                        <div className="bg-gray-900 rounded p-3">
                          <p className="text-gray-200 text-sm whitespace-pre-wrap break-words">
                            {variation.variation}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleCopyToClipboard(variation.variation, variation.id)
                          }
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition text-sm"
                        >
                          {copiedId === variation.id ? (
                            <>
                              <Check className="w-4 h-4 text-green-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </button>
                        <button
                          onClick={() =>
                            onSelectVariation && onSelectVariation(variation)
                          }
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          Use This
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Info */}
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-3 text-sm text-purple-200 mt-4">
                <p className="font-semibold mb-1">🧪 A/B Testing Tips:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Try different variations to find best results</li>
                  <li>Variations maintain core meaning with different wording</li>
                  <li>Select variation to use it for generation</li>
                </ul>
              </div>
            </div>
          )}

          {selectedTab === 'variations' && (!variations || variations.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-400">No variations generated yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptLayeringDialog;
