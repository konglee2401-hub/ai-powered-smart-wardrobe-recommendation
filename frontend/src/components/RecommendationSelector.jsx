/**
 * Recommendation Selector Component
 * Allow per-category choice: Apply AI / Keep Current / Choose Manually + Save as option
 *
 * Now dynamically shows ALL recommendations from analysis, not just hardcoded list
 * Supports up to 13+ recommendations and allows creating new categories
 */

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getRecommendationLabel } from '../utils/recommendationMeta';

const RecommendationSelector = forwardRef(function RecommendationSelector({
  analysis,
  existingOptions,
  currentSelections = {},
  defaultAction = 'keep',
  defaultSaveStrategy = 'manual',
  onApplyRecommendations,
  isSaving = false
}, ref) {
  const PRIMARY_CATEGORIES = [
    'scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle',
    'hairstyle', 'makeup', 'bottoms', 'shoes', 'accessories', 'outerwear'
  ];

  const currentValues = currentSelections || {};

  const allRecommendationKeys = useMemo(() => {
    const keys = new Set();

    PRIMARY_CATEGORIES.forEach((key) => keys.add(key));

    if (analysis?.recommendations) {
      Object.keys(analysis.recommendations).forEach((key) => {
        if (['analysis', 'newOptions', 'characterProfile', 'productDetails'].includes(key)) {
          return;
        }

        const value = analysis.recommendations[key];
        if (value && typeof value === 'object' && Object.keys(value).length > 0) {
          keys.add(key);
        }
      });
    }

    return Array.from(keys);
  }, [analysis]);

  const [decisions, setDecisions] = useState({});

  useEffect(() => {
    const newDecisions = {};
    allRecommendationKeys.forEach((category) => {
      if (decisions[category]) {
        newDecisions[category] = decisions[category];
        return;
      }

      const recommendation = analysis?.recommendations?.[category] || {};
      const hasNewCandidates = Array.isArray(recommendation?.newOptionCandidates) && recommendation.newOptionCandidates.length > 0;

      newDecisions[category] = {
        action: defaultAction,
        chosenOption: Array.isArray(currentValues[category]) ? currentValues[category].join(', ') : (currentValues[category] || null),
        saveAsOption: defaultSaveStrategy === 'all' ? true : (defaultSaveStrategy === 'new-only' ? hasNewCandidates : false),
        expandWhy: false
      };
    });
    setDecisions(newDecisions);
  }, [allRecommendationKeys, currentValues, analysis, defaultAction, defaultSaveStrategy]);

  const recommendations = useMemo(() => {
    const recs = {};

    allRecommendationKeys.forEach((key) => {
      const rec = analysis?.recommendations?.[key];
      if (!rec) return;

      if (typeof rec === 'object' && !rec.choice && Object.keys(rec).length === 0) {
        return;
      }

      let choiceArray = [];
      let reason = '';
      let isMulti = false;

      if (typeof rec === 'string') {
        choiceArray = [rec];
      } else if (typeof rec === 'object' && rec !== null) {
        if (rec.choice) {
          if (Array.isArray(rec.choice)) {
            choiceArray = rec.choice
              .map((choice) => (typeof choice === 'string' ? choice : String(choice || '')))
              .filter((choice) => choice && String(choice).trim() !== '[object Object]');
            isMulti = choiceArray.length > 1;
          } else if (typeof rec.choice === 'string') {
            const choice = String(rec.choice).trim();
            if (choice && choice !== '[object Object]') {
              choiceArray = [choice];
            }
          }
          reason = typeof rec.reason === 'string' ? rec.reason : '';
        } else if (rec.choiceArray && Array.isArray(rec.choiceArray)) {
          choiceArray = rec.choiceArray;
          isMulti = rec.isMulti || rec.choiceArray.length > 1;
          reason = typeof rec.reason === 'string' ? rec.reason : '';
        } else if (rec.value) {
          choiceArray = [typeof rec.value === 'string' ? rec.value : ''];
          reason = typeof rec.reason === 'string' ? rec.reason : (typeof rec.label === 'string' ? rec.label : '');
        } else if (Object.keys(rec).length > 0) {
          const formatted = Object.entries(rec)
            .filter(([, value]) => value && typeof value === 'string' && String(value).trim() !== '[object Object]')
            .map(([field, value]) => `${field.replace(/_/g, ' ')}: ${value}`)
            .join(' | ');
          choiceArray = formatted.length > 0 ? [formatted] : [];
          reason = 'Auto-detected from analysis';
        } else {
          const firstKey = Object.keys(rec)[0];
          if (firstKey && rec[firstKey] && typeof rec[firstKey] === 'string') {
            const choice = String(rec[firstKey]).trim();
            if (choice !== '[object Object]') {
              choiceArray = [choice];
            }
          }
        }
      }

      let choiceDisplay = '';
      if (choiceArray.length === 1) {
        choiceDisplay = choiceArray[0];
      } else if (choiceArray.length > 1) {
        choiceDisplay = choiceArray.join(' + ');
        isMulti = true;
      }

      if (!choiceDisplay) {
        return;
      }

      let currentVal = 'Not set';
      const currOption = currentValues[key];

      if (typeof currOption === 'string') {
        currentVal = currOption;
      } else if (Array.isArray(currOption)) {
        if (currOption.length > 5) {
          currentVal = `(${currOption.length} options available)`;
        } else if (currOption.length > 0) {
          const values = currOption
            .map((option) => {
              if (typeof option === 'string') return option;
              if (typeof option === 'object' && option !== null) {
                const value = option.value || option.label || option.description;
                return typeof value === 'string' ? value : null;
              }
              return null;
            })
            .filter((value) => value && String(value).trim() !== '[object Object]');
          currentVal = values.length > 0 ? values.join(', ') : 'Not set';
        }
      } else if (typeof currOption === 'object' && currOption !== null) {
        currentVal = currOption.value || currOption.label || currOption.description || 'Not set';
        if (String(currentVal).trim() === '[object Object]') {
          currentVal = 'Not set';
        }
      } else if (currOption) {
        currentVal = String(currOption);
      }

      if (typeof currentVal === 'string') {
        const delimiter = /\]|provide.*|suggest.*|or.*none/i;
        const cleanedIndex = currentVal.search(delimiter);
        if (cleanedIndex > 0) {
          currentVal = currentVal.substring(0, cleanedIndex).trim();
        }
        currentVal = currentVal.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').trim();
        if (!currentVal) {
          currentVal = 'Not set';
        }
      }

      recs[key] = {
        choice: choiceDisplay,
        choiceArray,
        isMulti,
        reason: reason && typeof reason === 'string' ? reason.trim() : '',
        current: currentVal,
        isNew: !PRIMARY_CATEGORIES.includes(key)
      };
    });

    return recs;
  }, [analysis, currentValues, allRecommendationKeys]);

  const getOptionsForCategory = (category) => {
    const catOptions = existingOptions?.[category];
    if (!catOptions) return [];

    if (Array.isArray(catOptions)) {
      return catOptions
        .map((option) => {
          if (typeof option === 'string') {
            return option && String(option).trim() !== '[object Object]' ? option : null;
          }
          if (typeof option === 'object' && option !== null) {
            const value = option.value || option.label || option.description;
            if (value && typeof value === 'string' && String(value).trim().length > 0) {
              return String(value).trim();
            }
          }
          return null;
        })
        .filter((option) => option !== null && String(option).trim() !== '' && String(option) !== '[object Object]');
    }

    if (typeof catOptions === 'string') {
      return String(catOptions).trim() !== '[object Object]' ? [catOptions] : [];
    }
    if (typeof catOptions === 'object' && catOptions !== null) {
      const value = catOptions.value || catOptions.label || catOptions.description;
      return value && typeof value === 'string' && String(value).trim().length > 0 ? [String(value).trim()] : [];
    }
    return [];
  };

  const updateDecision = (category, updates) => {
    const defaultDecision = { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
    setDecisions((prev) => ({
      ...prev,
      [category]: { ...(prev[category] || defaultDecision), ...updates }
    }));
  };

  const getFinalValue = (category, rec) => {
    const decision = decisions[category] || { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
    let finalVal = '';

    switch (decision.action) {
      case 'apply':
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

    if (Array.isArray(finalVal)) {
      return finalVal;
    }

    return typeof finalVal === 'string' ? finalVal : String(finalVal || 'Not set');
  };

  const buildFinalRecommendations = () => {
    const result = {};
    Object.entries(recommendations).forEach(([category, rec]) => {
      const decision = decisions[category] || { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
      result[category] = {
        action: decision.action,
        finalValue: getFinalValue(category, rec),
        saveAsOption: decision.saveAsOption
      };
    });
    return result;
  };

  const handleApply = () => {
    onApplyRecommendations(buildFinalRecommendations());
  };

  useImperativeHandle(ref, () => ({
    applySelections: handleApply
  }), [handleApply, decisions, recommendations]);

  const handleApplyAll = () => {
    const newDecisions = {};
    allRecommendationKeys.forEach((category) => {
      const defaultDecision = { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
      newDecisions[category] = { ...(decisions[category] || defaultDecision), action: 'apply' };
    });
    setDecisions(newDecisions);
  };

  const handleSaveAll = () => {
    const newDecisions = {};
    allRecommendationKeys.forEach((category) => {
      const defaultDecision = { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
      newDecisions[category] = { ...(decisions[category] || defaultDecision), saveAsOption: true };
    });
    setDecisions(newDecisions);
  };

  const handleUnsaveAll = () => {
    const newDecisions = {};
    allRecommendationKeys.forEach((category) => {
      const defaultDecision = { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
      newDecisions[category] = { ...(decisions[category] || defaultDecision), saveAsOption: false };
    });
    setDecisions(newDecisions);
  };

  const sanitizeReasonText = (text) => {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text.replace(/\[object Object\]/g, '');
    if (cleaned.length > 2000) {
      cleaned = `${cleaned.substring(0, 2000)}...`;
    }

    return cleaned.trim().replace(/\n\n+/g, '\n');
  };

  const recommendationsCount = allRecommendationKeys.length;
  const appliedCount = allRecommendationKeys.filter((key) => decisions[key]?.action === 'apply').length;
  const saveCount = allRecommendationKeys.filter((key) => decisions[key]?.saveAsOption).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-purple-700/40 bg-gradient-to-r from-purple-950/55 via-indigo-950/40 to-blue-950/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-purple-200">
          <span className="text-base leading-none">AI</span>
          AI Recommendations
        </h3>
        <p className="mt-1 text-xs text-gray-400">
          {recommendationsCount} suggestions detected. Applied: {appliedCount} | To save: {saveCount}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={handleApplyAll}
            className="rounded border border-purple-500/50 bg-purple-600/50 px-2 py-1 text-xs text-purple-200 transition-colors hover:bg-purple-600"
            title="Set all to Apply"
          >
            Apply All
          </button>
          <button
            onClick={handleSaveAll}
            className="rounded border border-green-500/50 bg-green-600/50 px-2 py-1 text-xs text-green-200 transition-colors hover:bg-green-600"
            title="Mark all for saving"
          >
            Save All
          </button>
          <button
            onClick={handleUnsaveAll}
            className="rounded border border-gray-600/50 bg-gray-700/50 px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-700"
            title="Uncheck all saves"
          >
            Clear Saves
          </button>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
        {Object.entries(recommendations).map(([category, rec]) => {
          const decision = decisions[category] || { action: 'keep', chosenOption: null, saveAsOption: false, expandWhy: false };
          const selectedAction = decision.action;
          const finalValue = getFinalValue(category, rec);

          return (
            <div
              key={category}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,40,0.78),rgba(14,20,34,0.55))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors hover:border-white/15"
            >
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-200">
                      {getRecommendationLabel(category)}
                      {rec.isNew && (
                        <span className="rounded border border-orange-500/50 bg-orange-600/50 px-1.5 py-0.5 text-xs text-orange-200">
                          NEW
                        </span>
                      )}
                    </h4>

                    <div className="space-y-1 text-xs">
                      <div className="text-gray-500">
                        Current: <span className="font-medium text-gray-300">{typeof rec.current === 'string' ? rec.current : String(rec.current || 'Not set')}</span>
                      </div>
                      <div className="text-purple-400">
                        AI suggests: <span className="font-medium text-purple-300">{Array.isArray(rec.choiceArray) && rec.choiceArray.length > 0 ? rec.choiceArray.join(', ') : (typeof rec.choice === 'string' ? rec.choice : String(rec.choice || 'Unknown'))}</span>
                      </div>
                    </div>

                    {rec.reason && sanitizeReasonText(rec.reason).length > 0 && (
                      <button
                        onClick={() => updateDecision(category, { expandWhy: !decision.expandWhy })}
                        className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
                      >
                        {decision.expandWhy ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        Why this recommendation?
                      </button>
                    )}

                    {decision.expandWhy && rec.reason && sanitizeReasonText(rec.reason).length > 0 && (
                      <div className="mt-2 rounded border border-blue-700/30 bg-blue-900/20 p-3">
                        <p className="whitespace-pre-wrap text-xs leading-relaxed text-blue-200">
                          {sanitizeReasonText(rec.reason)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-gray-500">Final:</div>
                    <div className="mt-0.5 rounded border border-green-700/30 bg-green-900/20 px-2 py-1 text-xs font-semibold text-green-400">
                      {Array.isArray(finalValue) ? finalValue.join(', ') : (typeof finalValue === 'string' ? finalValue : String(finalValue || 'Not set'))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => updateDecision(category, { action: 'apply' })}
                    className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                      selectedAction === 'apply'
                        ? 'border border-purple-500 bg-purple-600 text-white'
                        : 'border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title="Use AI recommendation"
                  >
                    Apply
                  </button>

                  <button
                    onClick={() => updateDecision(category, { action: 'keep' })}
                    className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                      selectedAction === 'keep'
                        ? 'border border-blue-500 bg-blue-600 text-white'
                        : 'border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title="Keep current value unchanged"
                  >
                    Keep Current
                  </button>

                  <button
                    onClick={() => updateDecision(category, { action: 'choose' })}
                    className={`rounded px-3 py-1 text-xs font-medium transition-all ${
                      selectedAction === 'choose'
                        ? 'border border-orange-500 bg-orange-600 text-white'
                        : 'border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    title="Choose manually from saved options"
                  >
                    Choose
                  </button>
                </div>

                {selectedAction === 'choose' && (
                  <div className="mt-2">
                    <select
                      value={decision.chosenOption || ''}
                      onChange={(event) => updateDecision(category, { chosenOption: event.target.value })}
                      className="w-full rounded border border-gray-600 bg-gray-900 p-2 text-xs text-gray-200 outline-none focus:border-orange-500"
                    >
                      <option value="">Select an option...</option>
                      {getOptionsForCategory(category).map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="mt-2 block cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={decision.saveAsOption}
                    onChange={(event) => updateDecision(category, { saveAsOption: event.target.checked })}
                    className="mr-2 h-3.5 w-3.5 cursor-pointer rounded border-gray-600 bg-gray-700"
                  />
                  <span className="text-gray-300 hover:text-gray-200">
                    Save "{Array.isArray(rec.choiceArray) && rec.choiceArray.length > 0 ? rec.choiceArray.join(', ') : rec.choice}" as new option for next time
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
});

export default RecommendationSelector;

