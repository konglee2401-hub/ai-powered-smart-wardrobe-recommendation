/**
 * Character & Product Summary Component
 * Display extracted information with option to save new options
 */

import React, { useState } from 'react';
import { Check, Plus, AlertCircle, Database } from 'lucide-react';

export default function CharacterProductSummary({
  analysis,
  characterImage,
  productImage,
  onSaveNewOption,
  isSaving = false
}) {
  const [selectedNewOptions, setSelectedNewOptions] = useState({});

  if (!analysis) return null;

  // Access recommendations object that contains characterProfile and productDetails
  const recommendations = analysis?.recommendations || analysis || {};

  // Extract character traits from nested characterProfile object
  const charProfile = recommendations.characterProfile || {};
  const characterTraits = [
    { label: 'Gender', value: charProfile.gender },
    { label: 'Age Range', value: charProfile.age_range },
    { label: 'Body Type', value: charProfile.body_type },
    { label: 'Skin Tone', value: charProfile.skin_tone },
    { label: 'Hair Color', value: charProfile.hair_color },
    { label: 'Hair Length', value: charProfile.hair_length },
    { label: 'Hair Style', value: charProfile.hair_style },
    { label: 'Hair Texture', value: charProfile.hair_texture },
    { label: 'Face Shape', value: charProfile.face_shape },
    { label: 'Current Outfit', value: charProfile.current_outfit },
  ].filter(t => t.value);

  // Extract product traits from nested productDetails object
  const prodDetails = recommendations.productDetails || {};
  const productTraits = [
    { label: 'Garment Type', value: prodDetails.garment_type },
    { label: 'Style Category', value: prodDetails.style_category },
    { label: 'Primary Color', value: prodDetails.primary_color },
    { label: 'Secondary Color', value: prodDetails.secondary_color },
    { label: 'Pattern', value: prodDetails.pattern },
    { label: 'Fabric Type', value: prodDetails.fabric_type },
    { label: 'Fit Type', value: prodDetails.fit_type },
    { label: 'Key Details', value: prodDetails.key_details },
  ].filter(t => t.value);

  // Extract recommendations - handle nested objects with {choice, reason}
  const categoryRecommendations = {};
  const RECOMMENDATION_KEYS = ['scene', 'lighting', 'mood', 'cameraAngle', 'hairstyle', 'makeup', 'bottoms', 'shoes', 'accessories', 'outerwear'];
  
  RECOMMENDATION_KEYS.forEach(key => {
    const rec = recommendations[key];
    if (rec) {
      // Handle both {choice, reason} object format and plain string format
      const value = rec.choice || rec;
      if (typeof value === 'string' && value.trim()) {
        categoryRecommendations[key] = {
          value: value,
          reason: rec.reason || '',
          choice: rec.choice || ''
        };
      }
    }
  });

  const handleSaveOption = (category, value) => {
    onSaveNewOption(category, value);
    setSelectedNewOptions(prev => ({
      ...prev,
      [`${category}-${value}`]: true
    }));
  };

  const TraitCard = ({ icon, title, traits, onSave }) => (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <h4 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        {title}
      </h4>
      <div className="space-y-1.5">
        {traits.map((trait, idx) => (
          <div key={idx} className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500">{trait.label}</div>
              <div className="text-xs font-medium text-gray-200 truncate" title={trait.value}>
                {trait.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Character Summary */}
      <TraitCard icon="👤" title="Character Profile" traits={characterTraits} />

      {/* Product Summary */}
      <TraitCard icon="👕" title="Product Details" traits={productTraits} />

      {/* Recommendations Summary - Removed, now handled by RecommendationSelector */}

      {/* Image Preview - Hidden in Step 2 to reduce clutter */}
      {false && (characterImage || productImage) && (
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <h4 className="text-xs font-semibold text-gray-300 mb-2">📸 Uploaded Images</h4>
          <div className="grid grid-cols-2 gap-2">
            {characterImage && (
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={characterImage.preview}
                  alt="Character"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {productImage && (
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={productImage.preview}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
