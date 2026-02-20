/**
 * Prompt Quality Indicator Component
 * Visual feedback for prompt quality based on content analysis
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, TrendingUp, Zap } from 'lucide-react';

const QUALITY_FACTORS = {
  length: {
    weight: 0.2,
    evaluate: (text) => {
      const len = text.length;
      if (len < 50) return 0;
      if (len < 100) return 0.3;
      if (len < 200) return 0.6;
      if (len < 400) return 1;
      if (len < 600) return 0.9;
      return 0.7; // Too long
    }
  },
  keywords: {
    weight: 0.3,
    evaluate: (text) => {
      const keywords = [
        'professional', 'high quality', 'detailed', 'sharp',
        'composition', 'lighting', 'color', 'style',
        'emotion', 'atmosphere', 'mood'
      ];
      const matches = keywords.filter(kw => text.toLowerCase().includes(kw)).length;
      return Math.min(matches / 5, 1);
    }
  },
  specificity: {
    weight: 0.3,
    evaluate: (text) => {
      const words = text.split(/\s+/).length;
      if (words < 5) return 0;
      if (words < 15) return 0.4;
      if (words < 50) return 0.8;
      return 1;
    }
  },
  readability: {
    weight: 0.2,
    evaluate: (text) => {
      const hasPunctuation = /[,.!?;:]/.test(text);
      const hasCommas = (text.match(/,/g) || []).length > 0;
      let score = 0;
      if (hasPunctuation) score += 0.5;
      if (hasCommas) score += 0.5;
      return score;
    }
  }
};

function getQualityScore(text) {
  if (!text) return 0;
  
  let totalScore = 0;
  let totalWeight = 0;

  for (const [factor, config] of Object.entries(QUALITY_FACTORS)) {
    const score = config.evaluate(text);
    totalScore += score * config.weight;
    totalWeight += config.weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

function getQualityLevel(score) {
  if (score < 0.2) return { level: 'Poor', color: 'bg-red-500', icon: AlertCircle, text: 'Needs Improvement' };
  if (score < 0.4) return { level: 'Fair', color: 'bg-orange-500', icon: AlertCircle, text: 'Could be better' };
  if (score < 0.65) return { level: 'Good', color: 'bg-blue-500', icon: TrendingUp, text: 'Decent quality' };
  if (score < 0.85) return { level: 'Very Good', color: 'bg-green-500', icon: CheckCircle, text: 'High quality' };
  return { level: 'Excellent', color: 'bg-emerald-500', icon: Zap, text: 'Outstanding' };
}

export default function PromptQualityIndicator({
  positivePrompt = '',
  negativePrompt = ''
}) {
  const [posScore, setPosScore] = useState(0);
  const [negScore, setNegScore] = useState(0);

  useEffect(() => {
    setPosScore(getQualityScore(positivePrompt));
    setNegScore(getQualityScore(negativePrompt));
  }, [positivePrompt, negativePrompt]);

  const posQuality = getQualityLevel(posScore);
  const negQuality = getQualityLevel(negScore);
  const PosIcon = posQuality.icon;
  const NegIcon = negQuality.icon;

  const avgScore = (posScore + negScore) / 2;
  const overallQuality = getQualityLevel(avgScore);
  const OverallIcon = overallQuality.icon;

  return (
    <div className="space-y-3 bg-gray-900 rounded-lg p-3 border border-gray-700">
      {/* Overall Score */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400">Overall Quality</span>
          <span className="text-xs font-bold text-gray-300">{Math.round(avgScore * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${overallQuality.color}`}
            style={{ width: `${avgScore * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          <OverallIcon className="w-3 h-3 text-gray-400" />
          <span className="text-gray-400">{overallQuality.level}</span>
          <span className="text-gray-600">-</span>
          <span className="text-gray-500">{overallQuality.text}</span>
        </div>
      </div>

      {/* Positive Prompt */}
      <div className="space-y-1 pt-2 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-green-400">Positive</span>
          <span className="text-xs text-gray-500">{Math.round(posScore * 100)}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${posQuality.color}`}
            style={{ width: `${posScore * 100}%` }}
          />
        </div>
      </div>

      {/* Negative Prompt */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-red-400">Negative</span>
          <span className="text-xs text-gray-500">{Math.round(negScore * 100)}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${negQuality.color}`}
            style={{ width: `${negScore * 100}%` }}
          />
        </div>
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 p-2 bg-gray-800/50 rounded border border-gray-700">
        <p className="mb-1 font-medium text-gray-400">💡 Tips to improve quality:</p>
        <ul className="space-y-0.5 text-gray-600">
          <li>• Use specific, descriptive keywords</li>
          <li>• Include camera/lighting terms</li>
          <li>• Specify mood, style, and composition</li>
          <li>• Aim for 200-400 characters</li>
          <li>• Use comma-separated terms</li>
        </ul>
      </div>
    </div>
  );
}
