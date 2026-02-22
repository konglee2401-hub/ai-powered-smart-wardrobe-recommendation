/**
 * Recommendation Selector Component
 * Allow per-category choice: Apply AI / Keep Current / Choose Manually + Save as option
 * 
 * Now dynamically shows ALL recommendations from analysis, not just hardcoded list
 * Supports up to 13+ recommendations and allows creating new categories
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, Plus, AlertCircle } from 'lucide-react';

export default function RecommendationSelector({
  analysis,
  existingOptions,
  onApplyRecommendations, // Pass final selections
  isSaving = false
}) {
  // Hardcoded primary categories (always shown if available)
  const PRIMARY_CATEGORIES = [
    'scene', 'lighting', 'mood', 'cameraAngle', 
    'hairstyle', 'makeup', 'bottoms', 'shoes', 'accessories', 'outerwear'
  ];

  // Extract current selected values (from promptOptions)
  const currentValues = existingOptions || {};

  // Extract ALL recommendations from analysis (both primary + any additional ones)
  const allRecommendationKeys = useMemo(() => {
    const keys = new Set();
    
    // Add primary categories
    PRIMARY_CATEGORIES.forEach(k => keys.add(k));
    
    // Add ALL other keys from analysis.recommendations that aren't characterProfile or productDetails
    if (analysis?.recommendations) {
      Object.keys(analysis.recommendations).forEach(key => {
        // Skip non-recommendation sections
        if (key !== 'characterProfile' && key !== 'productDetails' && key !== 'analysis') {
          keys.add(key);
        }
      });
    }
    
    return Array.from(keys);
  }, [analysis]);

  // Track state: which action selected + save preference for each category
  const [decisions, setDecisions] = useState({});

  // Initialize decisions when recommendations change
  useEffect(() => {
    const newDecisions = {};
    allRecommendationKeys.forEach(cat => {
      // Preserve existing decision if it exists, otherwise create new
      if (decisions[cat]) {
        newDecisions[cat] = decisions[cat];
      } else {
        newDecisions[cat] = {
          action: 'keep', // 'apply' | 'keep' | 'choose'
          chosenOption: currentValues[cat] || null,
          saveAsOption: false,
          expandWhy: false
        };
      }
    });
    setDecisions(newDecisions);
  }, [allRecommendationKeys]);

  // Extract recommendations from analysis - handles dynamic keys
  const recommendations = useMemo(() => {
    const recs = {};
    allRecommendationKeys.forEach(key => {
      const rec = analysis?.recommendations?.[key];
      if (rec) {
        // Handle both nested {choice, reason} structure and simple strings
        const choice = rec.choice || rec;
        const reason = rec.reason || '';
        
        if (choice) {
          recs[key] = {
            choice: choice.toString().trim(),
            reason: reason.toString().trim(),
            current: currentValues[key] || 'Not set',
            isNew: PRIMARY_CATEGORIES.indexOf(key) === -1 // Mark as new if not in primary list
          };
        }
      }
    });
    return recs;
  }, [analysis, currentValues, allRecommendationKeys]);

  // Get available options for manual selection
  // existingOptions structure: { hairstyle: [{value, label, ...}, ...], lighting: [...], ... }
  const getOptionsForCategory = (category) => {
    const catOptions = existingOptions?.[category];
    if (!catOptions) return [];
    // Handle both array and single object
    if (Array.isArray(catOptions)) {
      return catOptions.map(opt => opt.value || opt);
    } else {
      return [catOptions.value || catOptions];
    }
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

  // Apply All: Set all to 'apply' action
  const handleApplyAll = () => {
    const newDecisions = {};
    allRecommendationKeys.forEach(cat => {
      newDecisions[cat] = { ...decisions[cat], action: 'apply' };
    });
    setDecisions(newDecisions);
  };

  // Save All: Mark all for saving
  const handleSaveAll = () => {
    const newDecisions = {};
    allRecommendationKeys.forEach(cat => {
      newDecisions[cat] = { ...decisions[cat], saveAsOption: true };
    });
    setDecisions(newDecisions);
  };

  // Uncheck all saves
  const handleUnsaveAll = () => {
    const newDecisions = {};
    allRecommendationKeys.forEach(cat => {
      newDecisions[cat] = { ...decisions[cat], saveAsOption: false };
    });
    setDecisions(newDecisions);
  };

  const recommendationsCount = allRecommendationKeys.length;
  const appliedCount = allRecommendationKeys.filter(k => decisions[k]?.action === 'apply').length;
  const saveCount = allRecommendationKeys.filter(k => decisions[k]?.saveAsOption).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-lg p-3 border border-purple-700/50">
        <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
          <span>✨</span>
          AI Recommendations
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {recommendationsCount} suggestions detected. Applied: {appliedCount} | To save: {saveCount}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={handleApplyAll}
            className="text-xs px-2 py-1 bg-purple-600/50 hover:bg-purple-600 text-purple-200 rounded border border-purple-500/50 transition-colors"
            title="Set all to Apply"
          >
            ✓ Apply All
          </button>
          <button
            onClick={handleSaveAll}
            className="text-xs px-2 py-1 bg-green-600/50 hover:bg-green-600 text-green-200 rounded border border-green-500/50 transition-colors"
            title="Mark all for saving"
          >
            💾 Save All
          </button>
          <button
            onClick={handleUnsaveAll}
            className="text-xs px-2 py-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded border border-gray-600/50 transition-colors"
            title="Uncheck all saves"
          >
            Clear Saves
          </button>
        </div>
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
                    <h4 className="text-sm font-semibold text-gray-200 capitalize mb-1 flex items-center gap-2">
                      {category}
                      {rec.isNew && (
                        <span className="text-xs bg-orange-600/50 text-orange-200 px-1.5 py-0.5 rounded border border-orange-500/50">
                          NEW
                        </span>
                      )}
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
                    {rec.reason && rec.reason.trim().length > 0 && (
                      <button
                        onClick={() => updateDecision(category, { expandWhy: !decision.expandWhy })}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors font-medium"
                      >
                        {decision.expandWhy ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Why this recommendation?
                      </button>
                    )}

                    {decision.expandWhy && rec.reason && rec.reason.trim().length > 0 && (
                      <div className="mt-2 p-3 bg-blue-900/20 rounded border border-blue-700/30">
                        <p className="text-xs text-blue-200 leading-relaxed whitespace-pre-wrap">
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
          <strong>All {allRecommendationKeys.length} AI recommendations shown.</strong><br/>
          Apply recommendations you like. <span className="text-orange-300">NEW</span> recommendations create new category options for future use. Your selections persist between projects.
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
