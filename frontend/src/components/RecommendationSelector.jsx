/**
 * Recommendation Selector Component
 * Allow per-category choice: Apply AI / Keep Current / Choose Manually + Save as option
 * 
 * Purpose: Users want flexibility to:
 * 1. Apply some AI recommendations
 * 2. Keep some current values (not options to save, just preserve)
 * 3. Choose manually from saved options
 * 4. Optionally save good recommendations for reuse next time
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Check, Plus, AlertCircle } from 'lucide-react';

export default function RecommendationSelector({
  analysis,
  existingOptions,
  onApplyRecommendations, // Pass final selections
  isSaving = false
}) {
  // Categories that have AI recommendations
  const RECOMMENDATION_CATEGORIES = [
    'scene', 'lighting', 'mood', 'cameraAngle', 
    'hairstyle', 'makeup', 'bottoms', 'shoes', 'accessories', 'outerwear'
  ];

  // Extract current selected values (from promptOptions)
  const currentValues = existingOptions || {};

  // Track state: which action selected + save preference for each category
  const [decisions, setDecisions] = useState(() => {
    const init = {};
    RECOMMENDATION_CATEGORIES.forEach(cat => {
      init[cat] = {
        action: 'keep', // 'apply' | 'keep' | 'choose'
        chosenOption: currentValues[cat] || null,
        saveAsOption: false,
        expandWhy: false
      };
    });
    return init;
  });

  // Extract recommendations from analysis
  const recommendations = useMemo(() => {
    const recs = {};
    RECOMMENDATION_CATEGORIES.forEach(key => {
      const rec = analysis?.recommendations?.[key] || analysis?.[key];
      if (rec) {
        recs[key] = {
          choice: rec.choice || rec,
          reason: rec.reason || '',
          current: currentValues[key] || 'Not set'
        };
      }
    });
    return recs;
  }, [analysis, currentValues]);

  // Get available options for manual selection
  const getOptionsForCategory = (category) => {
    return existingOptions?.[category] ? 
      (Array.isArray(existingOptions[category]) ? existingOptions[category] : [existingOptions[category]]) 
      : [];
  };

  // Update decision for a category
  const updateDecision = (category, updates) => {
    setDecisions(prev => ({
      ...prev,
      [category]: { ...prev[category], ...updates }
    }));
  };

  // Get final value based on decision
  const getFinalValue = (category, rec) => {
    const decision = decisions[category];
    switch(decision.action) {
      case 'apply':
        return rec.choice;
      case 'choose':
        return decision.chosenOption || rec.current;
      case 'keep':
      default:
        return rec.current;
    }
  };

  // Build final recommendations object to pass back
  const buildFinalRecommendations = () => {
    const result = {};
    Object.entries(recommendations).forEach(([cat, rec]) => {
      result[cat] = {
        action: decisions[cat].action,
        finalValue: getFinalValue(cat, rec),
        saveAsOption: decisions[cat].saveAsOption
      };
    });
    return result;
  };

  const handleApply = () => {
    onApplyRecommendations(buildFinalRecommendations());
  };

  const recommendationsCount = Object.keys(recommendations).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-lg p-3 border border-purple-700/50">
        <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
          <span>✨</span>
          AI Recommendations
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {recommendationsCount} suggestions detected. Choose how to apply each one.
        </p>
      </div>

      {/* Recommendations List */}
      <div className="space-y-2">
        {Object.entries(recommendations).map(([category, rec]) => {
          const decision = decisions[category];
          const selectedAction = decision.action;
          const finalValue = getFinalValue(category, rec);

          return (
            <div
              key={category}
              className="bg-gray-800/60 rounded-lg border border-gray-700/50 overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Category Header */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-200 capitalize mb-1">
                      {category}
                    </h4>
                    
                    {/* Current & Recommended Values */}
                    <div className="text-xs space-y-1">
                      <div className="text-gray-500">
                        Current: <span className="text-gray-300 font-medium">{rec.current}</span>
                      </div>
                      <div className="text-purple-400">
                        AI suggests: <span className="text-purple-300 font-medium">{rec.choice}</span>
                      </div>
                    </div>

                    {/* Collapsible Why Section */}
                    {rec.reason && (
                      <button
                        onClick={() => updateDecision(category, { expandWhy: !decision.expandWhy })}
                        className="mt-2 text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1 transition-colors"
                      >
                        {decision.expandWhy ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Why?
                      </button>
                    )}

                    {decision.expandWhy && rec.reason && (
                      <div className="mt-2 p-2 bg-gray-900/50 rounded border border-gray-700/50">
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Final Value Display */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-500">Final:</div>
                    <div className="text-xs font-semibold text-green-400 mt-0.5 px-2 py-1 bg-green-900/20 rounded border border-green-700/30">
                      {finalValue}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => updateDecision(category, { action: 'apply' })}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      selectedAction === 'apply'
                        ? 'bg-purple-600 text-white border border-purple-500'
                        : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    }`}
                    title="Use AI recommendation"
                  >
                    ✓ Apply
                  </button>

                  <button
                    onClick={() => updateDecision(category, { action: 'keep' })}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      selectedAction === 'keep'
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    }`}
                    title="Keep current value unchanged"
                  >
                    ⟲ Keep Current
                  </button>

                  <button
                    onClick={() => updateDecision(category, { action: 'choose' })}
                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                      selectedAction === 'choose'
                        ? 'bg-orange-600 text-white border border-orange-500'
                        : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                    }`}
                    title="Choose manually from saved options"
                  >
                    ☆ Choose
                  </button>
                </div>

                {/* Choose Manually: Dropdown */}
                {selectedAction === 'choose' && (
                  <div className="mt-2">
                    <select
                      value={decision.chosenOption || ''}
                      onChange={(e) => updateDecision(category, { chosenOption: e.target.value })}
                      className="w-full text-xs p-2 bg-gray-900 border border-gray-600 rounded text-gray-200 focus:border-orange-500 outline-none"
                    >
                      <option value="">Select an option...</option>
                      {getOptionsForCategory(category).map((opt, idx) => (
                        <option key={idx} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Save as Option Checkbox */}
                <label className="mt-2 block text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={decision.saveAsOption}
                    onChange={(e) => updateDecision(category, { saveAsOption: e.target.checked })}
                    className="mr-2 w-3.5 h-3.5 rounded bg-gray-700 border-gray-600 cursor-pointer"
                  />
                  <span className="text-gray-300 hover:text-gray-200">
                    💾 Save "{rec.choice}" as new option for next time
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-2 p-2 bg-blue-900/20 rounded border border-blue-700/30">
        <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-300">
          <strong>How it works:</strong> Apply AI recommendations you like. Keep current values to preserve them. 
          Or choose manually from your saved options. Checked items will be added as new choices for future use.
        </p>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApply}
        disabled={isSaving}
        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
      >
        {isSaving ? '💾 Saving...' : '✓ Apply Selections & Continue'}
      </button>
    </div>
  );
}
