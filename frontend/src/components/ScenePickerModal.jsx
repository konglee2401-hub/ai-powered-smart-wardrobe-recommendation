import React from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getImageUrl(url) {
  if (!url) return null;
  const normalized = url.replace(/\\/g, '/');

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    // Replace localhost base with configured API host when needed (e.g., staging/prod)
    try {
      const baseHost = (API_BASE_URL || '').replace('/api', '');
      if (baseHost && normalized.includes('localhost:5000')) {
        return normalized.replace(/https?:\/\/localhost:5000/gi, baseHost);
      }
    } catch (err) {
      // ignore and fall through
    }
    return normalized;
  }

  const tempMatch = normalized.match(/[\\/](temp)[\\/](.+)/i);
  if (tempMatch) {
    return `${API_BASE_URL.replace('/api', '')}/temp/${tempMatch[2]}`;
  }

  if (normalized.startsWith('/')) {
    return `${API_BASE_URL.replace('/api', '')}${normalized}`;
  }

  return `${API_BASE_URL.replace('/api', '')}/${normalized}`;
}

export default function ScenePickerModal({ isOpen, onClose, scenes = [], selectedScene, onSelect, language = 'en', aspectRatio = '16:9' }) {
  if (!isOpen) return null;

  const getLockedPrompt = (scene) => {
    const isVi = (language || 'en').toLowerCase().startsWith('vi');
    return isVi
      ? (scene.sceneLockedPromptVi || scene.sceneLockedPrompt || scene.promptSuggestionVi || scene.promptSuggestion || '')
      : (scene.sceneLockedPrompt || scene.sceneLockedPromptVi || scene.promptSuggestion || scene.promptSuggestionVi || '');
  };

  // Get the correct image URL based on aspect ratio
  const getSceneImageUrl = (scene) => {
    if (!scene) return null;
    
    // Priority 1: Get aspect-specific URL from sceneLockedImageUrls
    if (scene.sceneLockedImageUrls && typeof scene.sceneLockedImageUrls === 'object') {
      const aspectUrl = scene.sceneLockedImageUrls[aspectRatio];
      if (aspectUrl) return aspectUrl;
      
      // Fallback: Try other aspects in priority order
      if (aspectRatio === '16:9' && scene.sceneLockedImageUrls['9:16']) {
        return scene.sceneLockedImageUrls['9:16'];
      }
      if (aspectRatio === '9:16' && scene.sceneLockedImageUrls['16:9']) {
        return scene.sceneLockedImageUrls['16:9'];
      }
    }
    
    // Priority 2: Use the generic sceneLockedImageUrl
    if (scene.sceneLockedImageUrl) return scene.sceneLockedImageUrl;
    
    // Priority 3: Use previewImage
    return scene.previewImage;
  };


  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Scene Picker</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {scenes.map((scene) => {
            const locked = getLockedPrompt(scene);
            const isActive = selectedScene === scene.value;
            const imageUrl = getImageUrl(getSceneImageUrl(scene));

            return (
              <button
                key={scene.value}
                onClick={() => {
                  onSelect(scene.value, scene);
                  onClose();
                }}
                className={`text-left border rounded-lg p-2 transition flex flex-col gap-2 ${isActive ? 'border-purple-500 bg-purple-900/30' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
              >
                {/* Thumbnail image */}
                {imageUrl ? (
                  <div className="relative w-full aspect-square shrink-0 overflow-hidden rounded border border-gray-600">
                    <img
                      src={imageUrl}
                      alt={scene.label}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const placeholder = e.currentTarget.parentElement?.querySelector('.img-placeholder');
                        if (placeholder) placeholder.classList.remove('hidden');
                      }}
                    />
                    <div className="img-placeholder hidden absolute inset-0 rounded border border-dashed border-gray-600 bg-gray-700/70 text-xs text-gray-300 flex items-center justify-center text-center px-1">
                      Image unavailable
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded border border-gray-700 bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                    No Image
                  </div>
                )}
                
                {/* Scene info */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{scene.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{scene.description}</div>
                  <details className="mt-1">
                    <summary className="text-xs text-purple-300 cursor-pointer">Prompt</summary>
                    <p className="text-xs text-gray-300 mt-1 line-clamp-3">{locked || 'No locked prompt yet'}</p>
                  </details>
                </div>
              </button>
            );
          })}

        </div>
      </div>
    </div>
  );
}
