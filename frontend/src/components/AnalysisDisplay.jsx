/**
 * Analysis Display Component
 * Display unified analysis results (character + product + compatibility)
 */

import React from 'react';
import { User, Shirt, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function AnalysisDisplay({
  characterAnalysis,
  productAnalysis,
  compatibility,
  recommendations,
  pose,
  stylingNotes,
  isAnalyzing,
}) {
  // Loading state
  if (isAnalyzing) {
    return (
      <div className="analysis-loading p-8 bg-white rounded-xl shadow-sm">
        <div className="flex flex-col items-center justify-center">
          {/* Animated spinner */}
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-2 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-2 border-4 border-blue-500 rounded-full border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            🔍 Đang Phân Tích Thông Minh...
          </h3>
          <p className="text-gray-500 text-center max-w-md">
            AI đang phân tích character và product để tạo recommendations tối ưu
          </p>

          {/* Progress steps */}
          <div className="mt-8 w-full max-w-md">
            <div className="flex justify-between items-center">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white animate-pulse">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs mt-1 text-purple-600">Character</span>
              </div>
              
              <div className="flex-1 h-1 bg-purple-200 mx-2 rounded">
                <div className="h-full bg-purple-500 rounded animate-pulse" style={{ width: '60%' }}></div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white animate-pulse">
                  <Shirt className="w-4 h-4" />
                </div>
                <span className="text-xs mt-1 text-blue-600">Product</span>
              </div>
              
              <div className="flex-1 h-1 bg-blue-200 mx-2 rounded">
                <div className="h-full bg-blue-500 rounded animate-pulse" style={{ width: '30%' }}></div>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs mt-1 text-gray-400">AI Recs</span>
              </div>
            </div>
          </div>
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
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold">🧠 Kết Quả Phân Tích Thông Minh</h2>
        <p className="text-purple-100 mt-1">
          AI đã phân tích và đưa ra các đề xuất tối ưu
        </p>
      </div>

      {/* Analysis Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Character Analysis Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <User className="w-5 h-5" />
              Character Analysis
            </h3>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Face & Features */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Face & Features</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {characterAnalysis.faceShape && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Face Shape:</span>
                    <span className="font-medium">{characterAnalysis.faceShape}</span>
                  </div>
                )}
                {characterAnalysis.expression && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expression:</span>
                    <span className="font-medium">{characterAnalysis.expression}</span>
                  </div>
                )}
                {characterAnalysis.skinTone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Skin Tone:</span>
                    <span className="font-medium">{characterAnalysis.skinTone}</span>
                  </div>
                )}
                {characterAnalysis.makeup && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Makeup:</span>
                    <span className="font-medium">{characterAnalysis.makeup}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hair */}
            {characterAnalysis.hair && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Hair</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {characterAnalysis.hair.style && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Style:</span>
                      <span className="font-medium">{characterAnalysis.hair.style}</span>
                    </div>
                  )}
                  {characterAnalysis.hair.color && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Color:</span>
                      <span className="font-medium">{characterAnalysis.hair.color}</span>
                    </div>
                  )}
                  {characterAnalysis.hair.length && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Length:</span>
                      <span className="font-medium">{characterAnalysis.hair.length}</span>
                    </div>
                  )}
                  {characterAnalysis.hair.texture && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Texture:</span>
                      <span className="font-medium">{characterAnalysis.hair.texture}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Body & Pose */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Body & Pose</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {characterAnalysis.bodyType && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Body Type:</span>
                    <span className="font-medium">{characterAnalysis.bodyType}</span>
                  </div>
                )}
                {characterAnalysis.pose && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pose:</span>
                    <span className="font-medium">{characterAnalysis.pose}</span>
                  </div>
                )}
                {characterAnalysis.age && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age:</span>
                    <span className="font-medium">{characterAnalysis.age}</span>
                  </div>
                )}
                {characterAnalysis.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gender:</span>
                    <span className="font-medium">{characterAnalysis.gender}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Vibe */}
            {characterAnalysis.overallVibe && (
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Overall Vibe:</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {characterAnalysis.overallVibe}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Analysis Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-pink-50 px-6 py-4 border-b border-pink-100">
            <h3 className="text-lg font-semibold text-pink-800 flex items-center gap-2">
              <Shirt className="w-5 h-5" />
              Product Analysis
            </h3>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Product Details */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Product Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {productAnalysis.type && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{productAnalysis.type}</span>
                  </div>
                )}
                {productAnalysis.style && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Style:</span>
                    <span className="font-medium">{productAnalysis.style}</span>
                  </div>
                )}
                {productAnalysis.material && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Material:</span>
                    <span className="font-medium">{productAnalysis.material}</span>
                  </div>
                )}
                {productAnalysis.fit && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fit:</span>
                    <span className="font-medium">{productAnalysis.fit}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Colors */}
            {productAnalysis.colors && productAnalysis.colors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {productAnalysis.colors.map((color, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Patterns */}
            {productAnalysis.patterns && productAnalysis.patterns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Patterns</h4>
                <div className="flex flex-wrap gap-2">
                  {productAnalysis.patterns.map((pattern, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
                    >
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            {productAnalysis.details && productAnalysis.details.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Details</h4>
                <ul className="text-sm space-y-1">
                  {productAnalysis.details.slice(0, 4).map((detail, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-pink-400 rounded-full"></span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Target & Season */}
            <div className="pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {productAnalysis.targetDemographic && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target:</span>
                    <span className="font-medium">{productAnalysis.targetDemographic}</span>
                  </div>
                )}
                {productAnalysis.season && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Season:</span>
                    <span className="font-medium">{productAnalysis.season}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compatibility Score */}
      {compatibility && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-100">
            <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Compatibility Analysis
            </h3>
          </div>
          
          <div className="p-6">
            <div className="flex items-center gap-6">
              {/* Score Circle */}
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={compatibility.score >= 80 ? '#22c55e' : compatibility.score >= 60 ? '#eab308' : '#ef4444'}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(compatibility.score / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">{compatibility.score}</span>
                </div>
              </div>

              {/* Score Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold text-gray-800">
                    {compatibility.score >= 80 ? 'Excellent Match!' : 
                     compatibility.score >= 60 ? 'Good Match' : 
                     'Needs Adjustment'}
                  </span>
                  <span className="text-gray-500">/100</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full ${
                      compatibility.score >= 80 ? 'bg-green-500' : 
                      compatibility.score >= 60 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}
                    style={{ width: `${compatibility.score}%` }}
                  ></div>
                </div>

                {/* Strengths */}
                {compatibility.strengths && compatibility.strengths.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-green-700 mb-1 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Strengths
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {compatibility.strengths.slice(0, 3).map((strength, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {compatibility.suggestions && compatibility.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-amber-700 mb-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Suggestions
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {compatibility.suggestions.slice(0, 3).map((suggestion, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations && Object.keys(recommendations).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-purple-100">
            <h3 className="text-lg font-semibold text-purple-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Recommendations
            </h3>
            <p className="text-sm text-purple-600 mt-1">
              Các tùy chọn được AI đề xuất dựa trên phân tích
            </p>
          </div>
          
          <div className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(recommendations).map(([category, rec]) => (
                <div
                  key={category}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <h4 className="text-sm font-medium text-gray-500 capitalize mb-2">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {rec.primary}
                    </span>
                    {rec.alternatives && rec.alternatives.length > 0 && (
                      <span className="text-xs text-gray-400">
                        +{rec.alternatives.length} more
                      </span>
                    )}
                  </div>
                  {rec.reason && (
                    <p className="text-xs text-gray-500 mt-2">
                      {rec.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pose & Styling Notes */}
      {(pose || stylingNotes) && (
        <div className="grid md:grid-cols-2 gap-6">
          {pose && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">📸 Pose Direction</h3>
              <p className="text-gray-600">{pose.description || pose}</p>
              {pose.confidence && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Confidence:</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${pose.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{Math.round(pose.confidence * 100)}%</span>
                </div>
              )}
            </div>
          )}

          {stylingNotes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">✨ Styling Notes</h3>
              <p className="text-gray-600">{stylingNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
