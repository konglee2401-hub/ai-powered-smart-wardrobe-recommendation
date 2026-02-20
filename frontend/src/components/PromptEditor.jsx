/**
 * Prompt Editor Component
 * Edit positive and negative prompts with length counter
 */

import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, Sparkles, Copy } from 'lucide-react';

const PROMPT_QUALITY_LEVELS = {
  short: { min: 0, max: 50, label: 'Too Short', color: 'bg-red-500' },
  poor: { min: 51, max: 100, label: 'Poor', color: 'bg-orange-500' },
  fair: { min: 101, max: 200, label: 'Fair', color: 'bg-yellow-500' },
  good: { min: 201, max: 400, label: 'Good', color: 'bg-blue-500' },
  excellent: { min: 401, max: 600, label: 'Excellent', color: 'bg-green-500' },
  excessive: { min: 601, max: Infinity, label: 'Excessive', color: 'bg-purple-500' },
};

function getQualityLevel(length) {
  for (const [key, level] of Object.entries(PROMPT_QUALITY_LEVELS)) {
    if (length >= level.min && length <= level.max) {
      return level;
    }
  }
  return PROMPT_QUALITY_LEVELS.poor;
}

export default function PromptEditor({
  positivePrompt,
  negativePrompt,
  onPositiveChange,
  onNegativeChange,
  onEnhance,
  isEnhancing = false,
  analysis = null,
  customPrompt = '',
  onCustomPromptChange = null
}) {
  const [activeTab, setActiveTab] = useState('positive');
  const [copiedPositive, setCopiedPositive] = useState(false);
  const [copiedNegative, setCopiedNegative] = useState(false);

  const positiveLength = positivePrompt?.length || 0;
  const negativeLength = negativePrompt?.length || 0;
  const positiveQuality = getQualityLevel(positiveLength);
  const negativeQuality = getQualityLevel(negativeLength);

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text || '');
    if (type === 'positive') {
      setCopiedPositive(true);
      setTimeout(() => setCopiedPositive(false), 2000);
    } else {
      setCopiedNegative(true);
      setTimeout(() => setCopiedNegative(false), 2000);
    }
  };

  const tabs = [
    { id: 'positive', label: 'Positive Prompt', icon: '✅', count: positiveLength },
    { id: 'negative', label: 'Negative Prompt', icon: '❌', count: negativeLength },
    ...(onCustomPromptChange ? [{ id: 'custom', label: 'Custom Additions', icon: '📝', count: customPrompt?.length || 0 }] : []),
  ];

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className="bg-gray-700/50 px-1.5 py-0.5 rounded text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-2">
        {activeTab === 'positive' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-300 flex items-center gap-2">
                <span className="text-lg">✅</span>
                What you want to see
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded font-medium text-white ${positiveQuality.color}`}>
                  {positiveQuality.label}
                </span>
                <span className="text-xs text-gray-500">{positiveLength} chars</span>
              </div>
            </div>

            <textarea
              value={positivePrompt || ''}
              onChange={(e) => onPositiveChange(e.target.value)}
              placeholder="Describe what you want in the image (detailed keywords, composition, style, etc.)"
              className="w-full h-32 p-3 bg-gray-900 rounded-lg border border-gray-700 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500 font-mono"
            />

            {positiveLength < 100 && (
              <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Prompt quá ngắn. Hãy thêm chi tiết hơn để có kết quả tốt hơn.</span>
              </div>
            )}

            {positiveLength > 600 && (
              <div className="flex items-start gap-2 p-2 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Prompt quá dài. Model có thể bỏ qua các keyword ở cuối.</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(positivePrompt, 'positive')}
                className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copiedPositive ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={onEnhance}
                disabled={isEnhancing || !analysis}
                className="flex items-center justify-center gap-1.5 flex-1 px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                {isEnhancing ? 'Enhancing...' : 'Enhance'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'negative' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-300 flex items-center gap-2">
                <span className="text-lg">❌</span>
                What to avoid
              </label>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded font-medium text-white ${negativeQuality.color}`}>
                  {negativeQuality.label}
                </span>
                <span className="text-xs text-gray-500">{negativeLength} chars</span>
              </div>
            </div>

            <textarea
              value={negativePrompt || ''}
              onChange={(e) => onNegativeChange(e.target.value)}
              placeholder="Describe what you DON'T want to see (blur, artifacts, bad quality, etc.)"
              className="w-full h-32 p-3 bg-gray-900 rounded-lg border border-gray-700 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500 font-mono"
            />

            <div className="flex items-start gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Negative prompt giúp loại bỏ các chi tiết không mong muốn. Cùng 50-150 ký tự là lý tưởng.</span>
            </div>

            <button
              onClick={() => copyToClipboard(negativePrompt, 'negative')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              <Copy className="w-3 h-3" />
              {copiedNegative ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        {activeTab === 'custom' && onCustomPromptChange && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-300 flex items-center gap-2">
              <span className="text-lg">📝</span>
              Custom Additions
            </label>

            <textarea
              value={customPrompt || ''}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              placeholder="Thêm các yêu cầu tùy chỉnh riêng của bạn. Những thay đổi này sẽ được thêm vào cuối positive prompt."
              className="w-full h-32 p-3 bg-gray-900 rounded-lg border border-gray-700 text-xs text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-purple-500 font-mono"
            />

            <div className="flex items-start gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Những nội dung tùy chỉnh sẽ được hợp nhất vào prompt cuối cùng.</span>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-800 rounded-lg p-2 grid grid-cols-2 gap-2">
        <div className="text-center text-xs">
          <div className="text-gray-400">Total Characters</div>
          <div className="text-green-400 font-semibold">{positiveLength + negativeLength}</div>
        </div>
        <div className="text-center text-xs">
          <div className="text-gray-400">Recommendation</div>
          <div className="text-blue-400 font-semibold">350-450 chars</div>
        </div>
      </div>
    </div>
  );
}
