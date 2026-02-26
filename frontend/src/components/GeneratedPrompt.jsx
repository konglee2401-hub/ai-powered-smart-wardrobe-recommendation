import React from 'react';

import { useTranslation } from 'react-i18next';

export default function GeneratedPrompt({
  previewPrompt,
  structuredPrompt,
  setPromptLang,
  promptLang,
  generateImage,
  loading
}) {
  if (!previewPrompt) return null;

  return (
    <div className="bg-yellow-600/80 p-3 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm">Generated Prompt</span>
        <div className="flex gap-1">
          <button
            onClick={() => setPromptLang('vi')}
            className={`px-2 py-1 rounded text-xs ${promptLang === 'vi' ? 'bg-white text-yellow-600' : 'bg-yellow-800 text-gray-300'}`}
          >
            VN
          </button>
          <button
            onClick={() => setPromptLang('en')}
            className={`px-2 py-1 rounded text-xs ${promptLang === 'en' ? 'bg-white text-yellow-600' : 'bg-yellow-800 text-gray-300'}`}
          >
            EN
          </button>
        </div>
      </div>
      
      <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono">
        {structuredPrompt}
      </pre>
      
      <button
        onClick={generateImage}
        disabled={loading}
        className="mt-2 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white py-2 px-4 rounded font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? 'Generating...' : 'Generate 9:16 Image'}
      </button>
    </div>
  );
}
