/**
 * Step 2: Script Generation Component
 * Sends videos to ChatGPT for analysis and script generation
 */

import React, { useState } from 'react';
import { FileText, Loader2, Copy, RefreshCw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { browserAutomationAPI } from '../services/api';

export default function ScriptGenerationStep({
  videos = [],
  productImage,
  style,
  readingStyle,
  productName = 'Fashion Product',
  productDescription = '',
  onScriptGenerated,
  onNext,
  isLoading = false,
  generatedScript = '',
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scriptText, setScriptText] = useState(generatedScript);
  const [editMode, setEditMode] = useState(false);

  const handleGenerateScript = async () => {
    if (videos.length === 0) {
      toast.error('No videos selected');
      return;
    }

    setIsGenerating(true);
    try {
      // Build analysis prompt based on platform
      const platformPrompts = {
        'tiktok-sales': `Analyze these videos and create a TikTok sales voiceover script for: ${productName}.
${productDescription ? `\nProduct details: ${productDescription}` : ''}

Requirements:
- Very engaging and energetic tone
- Duration: 15-30 seconds when read naturally
- Include product benefits concisely
- Add strong call-to-action at the end
- Use trend-relevant language
- Appeal to young audience (18-35 years old)
- Match the video content and pacing

Format: Provide ONLY the script text, no additional commentary.`,

        'facebook-voiceover': `Create a professional Facebook Reels voiceover script for: ${productName}.
${productDescription ? `\nProduct details: ${productDescription}` : ''}

Requirements:
- Professional but warm storytelling tone
- Duration: 20-40 seconds when read naturally
- Create narrative around product features and lifestyle
- Build emotional connection with audience
- Include product transition moments
- Address common customer concerns naturally
- First-person or conversational POV

Format: Provide ONLY the script text, no additional commentary.`,

        'youtube-vietsub': `Create a YouTube Short voiceover script (with Vietnamese subtitles in mind) for: ${productName}.
${productDescription ? `\nProduct details: ${productDescription}` : ''}

Requirements:
- Clear pronunciation and pacing for subtitle synchronization
- Duration: 30-60 seconds when read naturally
- Detailed product information and benefits
- Include time for product showcase visuals
- Structured with clear sections (intro, benefits, CTA)
- Make it easy to follow along with visuals
- Educational and informative tone

Format: Provide ONLY the script text, no additional commentary.`,

        'instagram-stories': `Create an Instagram Stories voiceover script for: ${productName}.
${productDescription ? `\nProduct details: ${productDescription}` : ''}

Requirements:
- Conversational, friend-to-friend tone
- Duration: 10-20 seconds when read naturally
- Create FOMO (fear of missing out)
- Highlight unique selling points
- Include limited availability messaging if applicable
- Use trendy language and casual phrasing
- Direct and punchy

Format: Provide ONLY the script text, no additional commentary.`,
      };

      const prompt = platformPrompts[style] || platformPrompts['tiktok-sales'];

      // Send first video for analysis (simplified approach)
      const videoFile = videos[0];
      const formData = new FormData();
      formData.append('video', videoFile.file);
      formData.append('prompt', prompt);
      
      if (productImage?.file) {
        formData.append('productImage', productImage.file);
      }

      // Call browser automation API for ChatGPT analysis
      const response = await browserAutomationAPI.analyzeWithBrowser(
        formData
      );

      if (response.success) {
        const script = response.analysis || response.script || '';
        setScriptText(script);
        onScriptGenerated(script);
        toast.success('Script generated successfully!');
      } else {
        throw new Error(response.error || 'Failed to generate script');
      }
    } catch (error) {
      console.error('Script generation error:', error);
      toast.error(error.message || 'Failed to generate script');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptText);
    toast.success('Script copied to clipboard!');
  };

  const handleSaveAndContinue = () => {
    if (!scriptText.trim()) {
      toast.error('Please generate or enter a script');
      return;
    }
    onScriptGenerated(scriptText);
    onNext();
  };

  const isScriptReady = scriptText.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          Step 2: Generate Script
        </h3>
        <p className="text-sm text-gray-400">
          ChatGPT will analyze your videos and generate a tailored voiceover script for your selected platform.
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/50">
          <div className="text-xs text-gray-400 mb-1">Videos to Analyze</div>
          <div className="text-lg font-bold text-blue-300">{videos.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-700/50">
          <div className="text-xs text-gray-400 mb-1">Platform</div>
          <div className="text-lg font-bold text-purple-300">
            {style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
        </div>
      </div>

      {/* Script Display / Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-300">Generated Script</label>
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {editMode ? 'Done Editing' : 'Edit'}
          </button>
        </div>

        {editMode ? (
          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder="Enter or edit your voiceover script here..."
            className="w-full p-4 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none resize-none h-40"
          />
        ) : (
          <div className="p-4 rounded-lg bg-gray-700/30 border border-gray-600 min-h-40">
            {scriptText ? (
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{scriptText}</p>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No script generated yet. Click "Generate Script" to start.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Script Stats */}
      {scriptText && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 rounded-lg bg-gray-700/30 border border-gray-600">
            <div className="text-xs text-gray-400">Characters</div>
            <div className="text-lg font-bold text-white">{scriptText.length}</div>
          </div>
          <div className="p-2 rounded-lg bg-gray-700/30 border border-gray-600">
            <div className="text-xs text-gray-400">Words</div>
            <div className="text-lg font-bold text-white">
              {scriptText.trim().split(/\s+/).length}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-gray-700/30 border border-gray-600">
            <div className="text-xs text-gray-400">Est. Duration</div>
            <div className="text-lg font-bold text-white">
              {Math.ceil((scriptText.trim().split(/\s+/).length / 150) * 60)}s
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleGenerateScript}
          disabled={isGenerating || videos.length === 0}
          className={`flex-1 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
            isGenerating || videos.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Generate Script
            </>
          )}
        </button>

        {scriptText && (
          <button
            onClick={handleCopyScript}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white transition-all"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        )}

        {scriptText && (
          <button
            onClick={() => setScriptText('')}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-4 border-t border-gray-700">
        <button
          onClick={handleSaveAndContinue}
          disabled={!isScriptReady}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            isScriptReady
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Audio Generation
        </button>
      </div>
    </div>
  );
}
