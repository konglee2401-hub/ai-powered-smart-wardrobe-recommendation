/**
 * AI Analysis Component
 * Display AI analysis and comparison
 */

import React, { useState } from 'react';
import {
  Brain, TrendingUp, Zap, Target, Award,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';

export default function AIAnalysis({ originalImage, generatedImage, metadata }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock analysis data (in real app, this would come from backend)
  const analysis = {
    qualityScore: 92,
    improvements: [
      { aspect: 'Lighting', score: 95, improvement: '+25%' },
      { aspect: 'Clarity', score: 88, improvement: '+18%' },
      { aspect: 'Composition', score: 90, improvement: '+15%' },
      { aspect: 'Colors', score: 93, improvement: '+22%' },
    ],
    strengths: [
      'Professional lighting setup',
      'Sharp details and clarity',
      'Balanced composition',
      'Vibrant color palette',
    ],
    suggestions: [
      'Consider adding more contrast',
      'Experiment with different angles',
    ],
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xl font-bold text-gray-800 mb-4"
      >
        <span className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-500" />
          AI Analysis
        </span>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-6">
          {/* Overall Quality Score */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white mb-3">
              <div>
                <div className="text-4xl font-bold">{analysis.qualityScore}</div>
                <div className="text-sm">Quality Score</div>
              </div>
            </div>
            <p className="text-gray-600">Excellent quality generation!</p>
          </div>

          {/* Improvements */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Improvements
            </h3>
            <div className="space-y-3">
              {analysis.improvements.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{item.aspect}</span>
                    <span className="text-sm font-semibold text-green-600">
                      {item.improvement}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-500" />
              Strengths
            </h3>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Suggestions
              </h3>
              <ul className="space-y-2">
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-blue-500 mt-0.5">→</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical Details */}
          {metadata && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-500" />
                Technical Details
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {metadata.provider && (
                  <div>
                    <span className="text-gray-600">Provider:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {metadata.provider}
                    </span>
                  </div>
                )}
                {metadata.generationTime && (
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {(metadata.generationTime / 1000).toFixed(2)}s
                    </span>
                  </div>
                )}
                {metadata.options?.quality && (
                  <div>
                    <span className="text-gray-600">Quality:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {metadata.options.quality}
                    </span>
                  </div>
                )}
                {metadata.options?.style && (
                  <div>
                    <span className="text-gray-600">Style:</span>
                    <span className="ml-2 font-medium text-gray-800">
                      {metadata.options.style}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
