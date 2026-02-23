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
    
    // Add ALL other keys from analysis.recommendations (skip characterProfile and productDetails)
    if (analysis?.recommendations) {
      Object.keys(analysis.recommendations).forEach(key => {
        // Skip metadata and structural keys already shown in sidebar
        if (['analysis', 'newOptions', 'characterProfile', 'productDetails'].includes(key)) {
          return;
        }
        
        // Only add if the value is a non-empty recommendation object or has content
        const value = analysis.recommendations[key];
        if (value && typeof value === 'object') {
          // Has keys - potentially displayable
          if (Object.keys(value).length > 0) {
            keys.add(key);
          }
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
      
      // Skip if null/undefined
      if (!rec) return;
      
      // Skip truly empty objects (no choice and no other keys)
      if (typeof rec === 'object' && !rec.choice && Object.keys(rec).length === 0) {
        return;
      }
      
      // Extract choice - handle multiple formats including arrays
      let choiceArray = [];
      let reason = '';
      let isMulti = false;
      
      if (typeof rec === 'string') {
        // Simple string recommendation
        choiceArray = [rec];
      } else if (typeof rec === 'object' && rec !== null) {
        // Object with choice/reason fields
        if (rec.choice) {
          // ✅ NEW: Handle both string and array choice
          if (Array.isArray(rec.choice)) {
            // Already array (multi-select)
            choiceArray = rec.choice
              .map(c => typeof c === 'string' ? c : String(c || ''))
              .filter(c => c && String(c).trim() !== '[object Object]');
            isMulti = choiceArray.length > 1;
          } else if (typeof rec.choice === 'string') {
            // String choice
            const choice = String(rec.choice).trim();
            if (choice && String(choice).trim() !== '[object Object]') {
              choiceArray = [choice];
            }
          }
          reason = (typeof rec.reason === 'string') ? rec.reason : '';
        }
        // Or use choiceArray field if available (backend provides this)
        else if (rec.choiceArray && Array.isArray(rec.choiceArray)) {
          choiceArray = rec.choiceArray;
          isMulti = rec.isMulti || rec.choiceArray.length > 1;
          reason = (typeof rec.reason === 'string') ? rec.reason : '';
        }
        // Or has value/label fields (option-like structure)
        else if (rec.value) {
          choiceArray = [typeof rec.value === 'string' ? rec.value : ''];
          reason = (typeof rec.reason === 'string') ? rec.reason : (typeof rec.label === 'string' ? rec.label : '');
        }
        // For objects like characterProfile or productDetails with multiple fields
        else if (Object.keys(rec).length > 0) {
          // Format as "key1: value1 | key2: value2..."
          const formatted = Object.entries(rec)
            .filter(([k, v]) => v && typeof v === 'string' && String(v).trim() !== '[object Object]')
            .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
            .join(' | ');
          choiceArray = formatted.length > 0 ? [formatted] : [];
          reason = `Auto-detected from analysis`;
        }
        // Or try to extract first meaningful key-value pair
        else {
          const firstKey = Object.keys(rec)[0];
          if (firstKey && rec[firstKey] && typeof rec[firstKey] === 'string') {
            const choice = String(rec[firstKey]).trim();
            if (choice !== '[object Object]') {
              choiceArray = [choice];
            }
          }
        }
      }
      
      // Format choice display - single or multiple
      let choiceDisplay = '';
      if (choiceArray.length === 1) {
        choiceDisplay = choiceArray[0];
      } else if (choiceArray.length > 1) {
        choiceDisplay = choiceArray.join(' + ');
        isMulti = true;
      }
      
      // Only add if we have valid choice(s)
      if (choiceDisplay && choiceDisplay.length > 0) {
        // Extract current value - handle both string and object formats
        let currentVal = 'Not set';
        const currOption = currentValues[key];
        
        if (typeof currOption === 'string') {
          // Simple string value
          currentVal = currOption;
        } else if (Array.isArray(currOption)) {
          // If it's an array, extract clean values
          if (currOption.length > 5) {
            // Large array - likely all available options from DB
            currentVal = `(${currOption.length} options available)`;
          } else if (currOption.length > 0) {
            // Small array - extract readable values
            const values = currOption
              .map(opt => {
                if (typeof opt === 'string') return opt;
                if (typeof opt === 'object' && opt !== null) {
                  // Extract value or label, NOT the whole object
                  const val = opt.value || opt.label || opt.description;
                  return (val && typeof val === 'string') ? val : null;
                }
                return null;
              })
              .filter(v => v && String(v).trim() !== '[object Object]');
            currentVal = values.length > 0 ? values.join(', ') : 'Not set';
          }
        } else if (typeof currOption === 'object' && currOption !== null) {
          // Single object - extract value or label
          currentVal = currOption.value || currOption.label || currOption.description || 'Not set';
          // Ensure it's not "[object Object]"
          if (String(currentVal).trim() === '[object Object]') {
            currentVal = 'Not set';
          }
        } else if (currOption) {
          currentVal = String(currOption);
        }
        
        // ✅ NEW: Clean up currentVal - remove any corrupted text after delimiter
        if (typeof currentVal === 'string') {
          // Remove anything after common delimiters that indicate corrupted data
          const delimiter = /\]|provide.*|suggest.*|or.*none/i;
          const cleanedIndex = currentVal.search(delimiter);
          if (cleanedIndex > 0) {
            currentVal = currentVal.substring(0, cleanedIndex).trim();
          }
          // Remove outer brackets and quotes
          currentVal = currentVal.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').trim();
          // If empty after cleaning, mark as "Not set"
          if (!currentVal || currentVal.length === 0) {
            currentVal = 'Not set';
          }
        }
        
        recs[key] = {
          choice: choiceDisplay,
          choiceArray: choiceArray, // Keep array for multi-select scenarios
          isMulti: isMulti,
          reason: reason && typeof reason === 'string' ? reason.trim() : '',
          current: currentVal,
          isNew: PRIMARY_CATEGORIES.indexOf(key) === -1 // Mark as new if not in primary list
        };
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
      return catOptions
        .map(opt => {
          // If it's already a string, return as is (for clean values)
          if (typeof opt === 'string') {
            return opt && String(opt).trim() !== '[object Object]' ? opt : null;
          }
          // If it's an object, prefer value, then label, then description
          if (typeof opt === 'object' && opt !== null) {
            const val = opt.value || opt.label || opt.description;
            // Only return if it's a valid string, not "[object Object]"
            if (val && typeof val === 'string' && String(val).trim().length > 0) {
              return String(val).trim();
            }
            return null;
          }
          return null;
        })
        .filter((opt) => {
          // Remove null, empty strings, and "[object Object]" entries
          return opt !== null && String(opt).trim() !== '' && String(opt) !== '[object Object]';
        });
    } else {
      // Single object case
      if (typeof catOptions === 'string') {
        return String(catOptions).trim() !== '[object Object]' ? [catOptions] : [];
      }
      if (typeof catOptions === 'object' && catOptions !== null) {
        const val = catOptions.value || catOptions.label || catOptions.description;
        return val && typeof val === 'string' && String(val).trim().length > 0 ? [String(val).trim()] : [];
      }
      return [];
    }
  };

  // Update decision for a category
  const updateDecision = (category, updates) => {
    const defaultDecision = { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
    setDecisions(prev => ({
      ...prev,
      [category]: { ...(prev[category] || defaultDecision), ...updates }
    }));
  };

  // Get final value based on decision
  const getFinalValue = (category, rec) => {
    const decision = decisions[category] || { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
    let finalVal = '';
    
    switch(decision.action) {
      case 'apply':
        // ✅ NEW: Return array if multi-select, string if single
        finalVal = rec.isMulti ? rec.choiceArray : rec.choice;
        break;
      case 'choose':
        finalVal = decision.chosenOption || rec.current;
        break;
      case 'keep':
      default:
        finalVal = rec.current;
        break;
    }
    
    // Ensure it's always a string
    return typeof finalVal === 'string' ? finalVal : String(finalVal || 'Not set');
  };

  // Build final recommendations object to pass back
  const buildFinalRecommendations = () => {
    const result = {};
    Object.entries(recommendations).forEach(([cat, rec]) => {
      const decision = decisions[cat] || { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
      result[cat] = {
        action: decision.action,
        finalValue: getFinalValue(cat, rec),
        saveAsOption: decision.saveAsOption
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
      const defaultDecision = { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
      newDecisions[cat] = { ...(decisions[cat] || defaultDecision), action: 'apply' };
    });
    setDecisions(newDecisions);
  };

  // Save All: Mark all for saving
  const handleSaveAll = () => {
    const newDecisions = {};
    allRecommendationKeys.forEach(cat => {
      const defaultDecision = { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
      newDecisions[cat] = { ...(decisions[cat] || defaultDecision), saveAsOption: true };
    });
    setDecisions(newDecisions);
  };

  // Uncheck all saves
  const handleUnsaveAll = () => {
    const newDecisions = {};
    allRecommendationKeys.forEach(cat => {
      const defaultDecision = { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
      newDecisions[cat] = { ...(decisions[cat] || defaultDecision), saveAsOption: false };
    });
    setDecisions(newDecisions);
  };

  // Sanitize reason text to prevent displaying corrupted data
  const sanitizeReasonText = (text) => {
    if (!text || typeof text !== 'string') return '';
    
    // Remove any "[object Object]" strings
    let cleaned = text.replace(/\[object Object\]/g, '');
    
    // Truncate if too long (likely corrupted if > 2000 chars)
    if (cleaned.length > 2000) {
      cleaned = cleaned.substring(0, 2000) + '...';
    }
    
    // Clean up extra whitespace
    cleaned = cleaned.trim().replace(/\n\n+/g, '\n');
    
    return cleaned;
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
          const decision = decisions[category] || { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
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
                        Current: <span className="text-gray-300 font-medium">{typeof rec.current === 'string' ? rec.current : String(rec.current || 'Not set')}</span>
                      </div>
                      <div className="text-purple-400">
                        AI suggests: <span className="text-purple-300 font-medium">{typeof rec.choice === 'string' ? rec.choice : String(rec.choice || 'Unknown')}</span>
                      </div>
                    </div>

                    {/* Collapsible Why Section */}
                    {rec.reason && sanitizeReasonText(rec.reason).length > 0 && (
                      <button
                        onClick={() => updateDecision(category, { expandWhy: !decision.expandWhy })}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors font-medium"
                      >
                        {decision.expandWhy ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Why this recommendation?
                      </button>
                    )}

                    {decision.expandWhy && rec.reason && sanitizeReasonText(rec.reason).length > 0 && (
                      <div className="mt-2 p-3 bg-blue-900/20 rounded border border-blue-700/30">
                        <p className="text-xs text-blue-200 leading-relaxed whitespace-pre-wrap">
                          {sanitizeReasonText(rec.reason)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Final Value Display */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-500">Final:</div>
                    <div className="text-xs font-semibold text-green-400 mt-0.5 px-2 py-1 bg-green-900/20 rounded border border-green-700/30">
                      {typeof finalValue === 'string' ? finalValue : String(finalValue || 'Not set')}
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
