/**
 * Analysis Display Component
 * Display unified analysis results (character + product + compatibility)
 */

import React, { useState } from 'react';
import { User, Shirt, CheckCircle, AlertCircle, Sparkles, ChevronDown, ChevronUp, Code } from 'lucide-react';

export default function AnalysisDisplay({ analysis, isAnalyzing }) {
  const { 
    character: characterAnalysis,
    product: productAnalysis,
    compatibility,
    recommendations,
    pose,
    stylingNotes,
    promptKeywords 
  } = analysis || {}; // Destructure with a fallback for initial render

  const [showRawJson, setShowRawJson] = useState(false);

  // Loading state
  if (isAnalyzing) {
    return (
      <div className="analysis-loading p-8 bg-white rounded-xl shadow-sm">
        <div className="flex flex-col items-center justify-center">
          {/* Animated spinner */}
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">🔍 Performing Unified AI Analysis...</h3>
          <p className="text-gray-500 text-center max-w-md">
            Analyzing character and product together for optimal compatibility.
          </p>
        </div>
      </div>
    );
  }

  // No data state
  if (!characterAnalysis || !productAnalysis) {
    return null;
  }

  return (
    <div className="analysis-display space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Unified AI Analysis Results
            </h2>
            <p className="text-purple-100 mt-1">
              Deep analysis of character, product, and style compatibility.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{compatibility?.score || 0}%</div>
            <div className="text-sm text-purple-200">Compatibility Score</div>
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Character Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50 px-6 py-3 border-b border-blue-100 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Character Profile</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Vibe</span>
                <span className="font-medium text-gray-800">{characterAnalysis.overallVibe || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Age/Gender</span>
                <span className="font-medium text-gray-800">
                  {characterAnalysis.age || '?'} / {characterAnalysis.gender || '?'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Body Type</span>
                <span className="font-medium text-gray-800">{characterAnalysis.bodyType || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Skin Tone</span>
                <span className="font-medium text-gray-800">{characterAnalysis.skinTone || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-purple-50 px-6 py-3 border-b border-purple-100 flex items-center gap-2">
            <Shirt className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-800">Product Details</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Type</span>
                <span className="font-medium text-gray-800">{productAnalysis.type || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Style</span>
                <span className="font-medium text-gray-800">{productAnalysis.style || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Material</span>
                <span className="font-medium text-gray-800">{productAnalysis.material || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Fit</span>
                <span className="font-medium text-gray-800">{productAnalysis.fit || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Highlights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">✨ AI Recommendations</h3>
        </div>
        <div className="p-6 grid md:grid-cols-3 gap-4">
          {recommendations && Object.entries(recommendations).map(([key, value]) => (
            <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{key}</div>
              <div className="font-medium text-purple-700 flex items-center gap-2">
                {value.primary}
                {value.isNew && (
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold">
                    NEW
                  </span>
                )}
              </div>
              {value.reason && (
                <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={value.reason}>
                  {value.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Extracted Keywords */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">🔑 Extracted Keywords</h3>
        </div>
        <div className="p-6 flex flex-wrap gap-2">
          {promptKeywords && Object.values(promptKeywords).flat().map((keyword, idx) => (
            <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-100">
              {keyword}
            </span>
          ))}
        </div>
      </div>

      {/* Raw JSON Toggle */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button 
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full px-6 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <Code className="w-5 h-5" />
            {showRawJson ? 'Hide Raw AI Response' : 'Show Raw AI Response'}
          </div>
          {showRawJson ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        
        {showRawJson && (
          <div className="p-6 bg-gray-900 text-gray-100 overflow-x-auto">
            <pre className="text-xs font-mono">
              {JSON.stringify({
                character: characterAnalysis,
                product: productAnalysis,
                compatibility,
                recommendations,
                promptKeywords
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
