/**
 * Prompt Builder Component
 * View and edit generated prompts before image generation
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Copy, Check, Edit3, Save, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function PromptBuilder({
  analysis,
  selectedOptions,
  onPromptChange,
  generatedPrompt,
  onRegeneratePrompt,
}) {
  const { i18n } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [copied, setCopied] = useState({ positive: false, negative: false });

  // Build prompt from analysis and options
  const buildPrompt = () => {
    if (!analysis) return { positive: '', negative: '' };

    const { character, product } = analysis;
    const positiveParts = [];
    const negativeParts = [];

    // Subject description
    const subjectParts = [];
    if (character?.age) subjectParts.push(`${character.age} year old`);
    if (character?.gender) subjectParts.push(character.gender);
    if (character?.overallVibe) subjectParts.push(character.overallVibe);
    if (character?.bodyType) subjectParts.push(character.bodyType);
    if (character?.skinTone) subjectParts.push(`${character.skinTone} skin tone`);
    if (subjectParts.length > 0) {
      positiveParts.push(`Professional fashion photography of ${subjectParts.join(', ')}`);
    }

    // Clothing description
    const clothingParts = [];
    if (product?.type) clothingParts.push(product.type);
    if (product?.style) clothingParts.push(product.style);
    if (product?.colors?.length > 0) clothingParts.push(`${product.colors.join(' and ')} colors`);
    if (product?.material) clothingParts.push(`${product.material} material`);
    if (product?.fit) clothingParts.push(`${product.fit} fit`);
    if (clothingParts.length > 0) {
      positiveParts.push(`wearing ${clothingParts.join(', ')}`);
    }

    // Scene
    if (selectedOptions?.scene) {
      positiveParts.push(`in ${selectedOptions.scene} setting`);
    }

    // Lighting
    if (selectedOptions?.lighting) {
      positiveParts.push(`with ${selectedOptions.lighting} lighting`);
    }

    // Mood
    if (selectedOptions?.mood) {
      positiveParts.push(`${selectedOptions.mood} mood`);
    }

    // Style
    if (selectedOptions?.style) {
      positiveParts.push(`${selectedOptions.style} photography style`);
    }

    // Color Palette
    if (selectedOptions?.colorPalette) {
      positiveParts.push(`${selectedOptions.colorPalette} color palette`);
    }

    // Camera Angle
    if (selectedOptions?.cameraAngle) {
      positiveParts.push(`${selectedOptions.cameraAngle} camera angle`);
    }

    // Quality
    positiveParts.push('professional fashion photography, 8K resolution, sharp focus, photorealistic, high detail, studio quality');

    // Custom prompt addition
    if (selectedOptions?.customPrompt) {
      positiveParts.push(selectedOptions.customPrompt);
    }

    // Negative prompt
    negativeParts.push(
      'blurry, low quality, distorted, deformed, ugly, bad anatomy, extra limbs, missing limbs, bad hands, poorly fitted clothing, wrinkled clothing, bad lighting, harsh shadows, bad composition, cropped, watermark, text, jpeg artifacts, grainy, noise'
    );

    if (product?.type?.includes('dress')) {
      negativeParts.push('torn fabric, stained, dirty hem');
    }

    if (selectedOptions?.negativePrompt) {
      negativeParts.push(selectedOptions.negativePrompt);
    }

    return {
      positive: positiveParts.join(', '),
      negative: negativeParts.join(', '),
    };
  };

  const prompts = generatedPrompt || buildPrompt();

  useEffect(() => {
    if (generatedPrompt !== prompts.positive && !editingPrompt) {
      onPromptChange?.(prompts);
    }
  }, [prompts]);

  const handleCopy = async (type) => {
    const text = type === 'positive' ? prompts.positive : prompts.negative;
    await navigator.clipboard.writeText(text);
    setCopied({ ...copied, [type]: true });
    setTimeout(() => setCopied({ ...copied, [type]: false }), 2000);
  };

  const handlePromptChange = (type, value) => {
    if (type === 'positive') {
      onPromptChange?.({ positive: value, negative: prompts.negative });
    } else {
      onPromptChange?.({ positive: prompts.positive, negative: value });
    }
  };

  const handleSave = () => {
    setEditingPrompt(false);
  };

  if (!analysis) {
    return (
      <div className="p-6 bg-gray-50 rounded-xl text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Chưa có dữ liệu phân tích. Vui lòng hoàn thành bước phân tích trước.</p>
      </div>
    );
  }

  return (
    <div className="prompt-builder">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Xây Dựng Prompt Thông Minh
            </h2>
            <p className="text-blue-100 mt-1">
              Prompt được tạo tự động từ phân tích AI. Bạn có thể xem và chỉnh sửa.
            </p>
          </div>

          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            {showPrompt ? (
              <>
                <EyeOff className="w-4 h-4" />
                Ẩn Prompt
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Xem Prompt
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prompt Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            📏 Positive: {prompts?.positive?.length || 0} chars
          </span>
          <span className="text-sm text-gray-500">
            🚫 Negative: {prompts?.negative?.length || 0} chars
          </span>
        </div>
      </div>

      {/* Prompts Display */}
      {showPrompt && (
        <div className="space-y-6 mb-6">
          {/* Positive Prompt */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-green-50 px-6 py-3 border-b border-green-100 flex items-center justify-between">
              <h3 className="font-semibold text-green-800 flex items-center gap-2">
                📝 Positive Prompt
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => editingPrompt ? handleSave() : setEditingPrompt(true)}
                  className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                >
                  {editingPrompt ? (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleCopy('positive')}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {copied.positive ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6">
              {editingPrompt ? (
                <textarea
                  value={prompts.positive}
                  onChange={(e) => handlePromptChange('positive', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none font-mono"
                  rows={6}
                />
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {prompts.positive}
                </div>
              )}
            </div>
          </div>

          {/* Negative Prompt */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-red-50 px-6 py-3 border-b border-red-100 flex items-center justify-between">
              <h3 className="font-semibold text-red-800 flex items-center gap-2">
                🚫 Negative Prompt
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => editingPrompt ? handleSave() : setEditingPrompt(true)}
                  className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                >
                  {editingPrompt ? (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleCopy('negative')}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {copied.negative ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6">
              <textarea
                value={prompts.negative}
                onChange={(e) => handlePromptChange('negative', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none font-mono"
                rows={4}
                readOnly={!editingPrompt}
              />
            </div>
          </div>

          {/* Prompt Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">🔍 Prompt Breakdown</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-700">📸 Photography</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Scene: {selectedOptions?.scene || 'Auto'}</li>
                  <li>• Lighting: {selectedOptions?.lighting || 'Auto'}</li>
                  <li>• Style: {selectedOptions?.style || 'Auto'}</li>
                  <li>• Camera: {selectedOptions?.cameraAngle || 'Auto'}</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-purple-700">👤 Subject</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Age: {analysis?.character?.age || 'N/A'}</li>
                  <li>• Body Type: {analysis?.character?.bodyType || 'N/A'}</li>
                  <li>• Vibe: {analysis?.character?.overallVibe || 'N/A'}</li>
                  <li>• Product: {analysis?.product?.type || 'N/A'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Preview */}
      {!showPrompt && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Quick Preview</h3>
            <button
              onClick={() => setShowPrompt(true)}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              Edit Prompt →
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 line-clamp-3">
              {prompts?.positive?.substring(0, 200) || 'Prompt not generated yet...'}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
