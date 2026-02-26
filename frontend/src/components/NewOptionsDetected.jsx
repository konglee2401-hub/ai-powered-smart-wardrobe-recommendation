/**
 * New Options Detected Component
 * Display and save newly detected options from AI analysis
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Database, Star, TrendingUp } from 'lucide-react';

const CATEGORY_ICONS = {
  scene: '🎬',
  lighting: '💡',
  mood: '😊',
  cameraAngle: '📐',
  makeup: '✨',
  hairstyle: '💇',
  bottoms: '👖',
  shoes: '👠',
  accessories: '💍',
  outerwear: '🧥'
};

export default function NewOptionsDetected({
  analysis,
  existingOptions,
  newOptions = [],
  onSaveOption,
  isSaving = false
}) {
  const { t } = useTranslation();
  
  const CATEGORY_LABELS = {
    scene: t('newOptionsDetected.scene'),
    lighting: t('newOptionsDetected.lighting'),
    mood: t('newOptionsDetected.mood'),
    cameraAngle: t('newOptionsDetected.cameraAngle'),
    makeup: t('newOptionsDetected.makeup'),
    hairstyle: t('newOptionsDetected.hairstyle'),
    bottoms: t('newOptionsDetected.bottoms'),
    shoes: t('newOptionsDetected.shoes'),
    accessories: t('newOptionsDetected.accessories'),
    outerwear: t('newOptionsDetected.outerwear')
  };
  
  if (!analysis || Object.keys(analysis).length === 0) {
    return null;
  }

  // Only extract FLAT recommendation fields (NOT nested objects)
  // These are the actual "options" that can be saved
  const OPTION_FIELDS = ['scene', 'lighting', 'mood', 'cameraAngle', 'makeup', 'hairstyle', 'bottoms', 'shoes', 'accessories', 'outerwear'];
  
  const recommendations = analysis?.recommendations || {};

  // Find new options (options recommended by AI that don't exist in the system)
  const detectedNewOptions = {};
  
  OPTION_FIELDS.forEach(category => {
    const rec = recommendations[category];
    // Handle both nested {choice, reason, alternatives} and flat string format
    const value = rec?.choice || rec;
    
    if (!value || typeof value !== 'string' || !value.trim()) return;
    
    const categoryOptions = existingOptions?.[category] || [];
    const categoryLabels = categoryOptions.map(opt => 
      typeof opt === 'string' ? opt : opt.label?.toLowerCase()
    );

    // Smart comparison: check if value is truly new
    const valueLower = value.toLowerCase();
    const isKnownOption = categoryLabels.some(label => 
      label && (
        label === valueLower ||
        valueLower.includes(label) ||
        label.includes(valueLower)
      )
    );
    
    if (!isKnownOption) {
      if (!detectedNewOptions[category]) {
        detectedNewOptions[category] = [];
      }
      // Store both choice and reason for display
      detectedNewOptions[category].push({
        value: value,
        reason: rec?.reason || '',
        alternatives: rec?.alternatives || []
      });
    }
  });

  const hasNewOptions = Object.keys(detectedNewOptions).length > 0;
  
  // Calculate total new options for "Save All" button
  const totalNewOptions = Object.values(detectedNewOptions).reduce((sum, vals) => sum + vals.length, 0);
  
  const handleSaveAll = async () => {
    // Create array of all options to save
    const optionsToSave = [];
    Object.entries(detectedNewOptions).forEach(([category, values]) => {
      values.forEach(item => {
        optionsToSave.push({ category, value: item.value });
      });
    });

    // Save all options
    for (const option of optionsToSave) {
      await onSaveOption(option.category, option.value);
    }
  };

  if (!hasNewOptions) {
    return (
      <div className="bg-green-900/10 rounded-lg p-3 border border-green-700/30 flex items-center gap-2">
        <Star className="w-4 h-4 text-green-400 flex-shrink-0" />
        <span className="text-xs text-green-400">All options are standard</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-amber-900/20 rounded-lg border border-amber-700/30">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-300">🆕 New Options Detected</p>
            <p className="text-xs text-amber-200/70 mt-0.5">
              {totalNewOptions} new option(s) found
            </p>
          </div>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-600/30 text-green-300 border border-green-600/50 rounded hover:bg-green-600/50 transition-colors disabled:opacity-50 whitespace-nowrap font-medium"
        >
          <Database className="w-3.5 h-3.5" />
          Save All
        </button>
      </div>

      {/* New Options by Category */}
      <div className="space-y-2">
        {Object.entries(detectedNewOptions).map(([category, values]) => (
          <div key={category} className="bg-gray-700/30 rounded-lg p-3 border border-gray-700 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{CATEGORY_ICONS[category] || '📦'}</span>
              <h4 className="text-xs font-semibold text-gray-300">
                {CATEGORY_LABELS[category] || category}
              </h4>
              <span className="text-xs bg-amber-600/30 text-amber-300 px-1.5 py-0.5 rounded">
                {values.length} new
              </span>
            </div>

            <div className="space-y-1.5">
              {values.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-gray-800 rounded border border-gray-600 hover:border-amber-700/50 transition-colors">
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-200 mb-1">
                      {item.value}
                    </p>
                    {item.reason && (
                      <p className="text-xs text-gray-400 italic">
                        {item.reason.substring(0, 100)}{item.reason.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  
                  {!newOptions?.includes(category) && (
                    <button
                      onClick={() => onSaveOption(category, item.value)}
                      disabled={isSaving}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-green-600/20 text-green-400 border border-green-600/50 rounded hover:bg-green-600/30 transition-colors disabled:opacity-50"
                    >
                      <Database className="w-3 h-3" />
                      Save Option
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 p-2 bg-gray-900/50 rounded border border-gray-700">
        <AlertCircle className="w-3 h-3 inline mr-1" />
        Save new options to quickly use them in future projects
      </div>
    </div>
  );
}
