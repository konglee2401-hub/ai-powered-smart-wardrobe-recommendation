/**
 * Frontend UI Patch for UnifiedVideoGeneration.jsx
 * This file contains the UI components that need to be added
 * 
 * ADD THESE SECTIONS TO UnifiedVideoGeneration.jsx:
 */

// ===== SECTION 1: ADD TO STEP 2 (after the title, before Image Generation Options) =====
// Replace the Step 2 section with this:

{/* Step 2: Generate Images */}
{currentStep === 2 && (
  <div className="space-y-6">
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ImageIcon size={28} className="text-purple-600" />
        Step 2: Generate Images
      </h2>
      
      {/* AI Analysis Results (NEW!) */}
      {isAnalyzing && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center gap-3">
          <Loader className="animate-spin text-blue-600" size={20} />
          <span className="text-blue-800 font-medium">Analyzing images with AI...</span>
        </div>
      )}
      
      {aiAnalysis && aiAnalysis.suggestions && (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-purple-200 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            AI Suggestions
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {aiAnalysis.suggestions.setting && (
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Setting:</p>
                  <p className="text-sm text-gray-600">{aiAnalysis.suggestions.setting}</p>
                </div>
              </div>
            )}
            {aiAnalysis.suggestions.lighting && (
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Lighting:</p>
                  <p className="text-sm text-gray-600">{aiAnalysis.suggestions.lighting}</p>
                </div>
              </div>
            )}
            {aiAnalysis.suggestions.mood && (
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Mood:</p>
                  <p className="text-sm text-gray-600">{aiAnalysis.suggestions.mood}</p>
                </div>
              </div>
            )}
            {aiAnalysis.suggestions.enhancements && aiAnalysis.suggestions.enhancements.length > 0 && (
              <div className="flex items-start gap-2 md:col-span-2">
                <Sparkles className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Enhancements:</p>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {aiAnalysis.suggestions.enhancements.map((enhancement, idx) => (
                      <li key={idx}>{enhancement}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* ===== SECTION 2: ADD AFTER IMAGE GENERATION OPTIONS ===== */}
      
      {/* Build Image Prompt Button (NEW!) */}
      {!showImagePromptPreview && imageGenStatus === 'idle' && (
        <div className="mb-6">
          <button
            onClick={handleBuildImagePrompt}
            className="w-full bg-indigo-600 text-white p-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Eye size={20} />
            Build & Preview Prompt
          </button>
        </div>
      )}
      
      {/* ===== SECTION 3: ADD AFTER BUILD BUTTON (Image Prompt Preview) ===== */}
      
      {/* Image Prompt Preview Modal (NEW!) */}
      {showImagePromptPreview && (
        <div className="mb-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              Image Prompt Preview
            </h3>
            <button
              onClick={() => setIsEditingImagePrompt(!isEditingImagePrompt)}
              className="text-indigo-600 hover:text-indigo-700 flex items-center text-sm px-3 py-1 border border-indigo-300 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Edit className="w-4 h-4 mr-1" />
              {isEditingImagePrompt ? 'Save' : 'Edit'}
            </button>
          </div>
          
          {/* Style Highlights (NEW!) */}
          {imagePromptHighlights && imagePromptHighlights.applied && imagePromptHighlights.applied.length > 0 && (
            <div className="mb-4 p-4 bg-white rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Applied Styles:</p>
              <div className="flex flex-wrap gap-2">
                {imagePromptHighlights.applied.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium"
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.category}: <strong className="ml-1">{item.value}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* AI Suggestions in Prompt (NEW!) */}
          {imagePromptHighlights && imagePromptHighlights.aiSuggestions && imagePromptHighlights.aiSuggestions.length > 0 && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2 flex items-center">
                <Sparkles className="w-4 h-4 mr-1" />
                AI Enhancements Applied:
              </p>
              <ul className="space-y-1">
                {imagePromptHighlights.aiSuggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-xs text-green-700 flex items-start">
                    <Check className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span>{suggestion.icon} {suggestion.suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Prompt Text */}
          {isEditingImagePrompt ? (
            <textarea
              value={imagePromptPreview}
              onChange={(e) => setImagePromptPreview(e.target.value)}
              rows={10}
              className="w-full p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
            />
          ) : (
            <div className="bg-white p-4 rounded-lg max-h-80 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                {imagePromptPreview}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {/* Generate Images Button */}
      {imageGenStatus === 'idle' && showImagePromptPreview && (
        <button
          onClick={handleGenerateImages}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
        >
          <Sparkles size={20} />
          Generate Images
        </button>
      )}
      
      {/* ... rest of the existing code ... */}
    </div>
  </div>
)}
