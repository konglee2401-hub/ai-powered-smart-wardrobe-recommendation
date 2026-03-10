import React from 'react';
import { createPortal } from 'react-dom';
import ModalPortal from './ModalPortal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getImageUrl(url) {
  if (!url) return null;
  const normalized = url.replace(/\\/g, '/');

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
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

export default function ScenePickerModal({
  isOpen,
  onClose,
  scenes = [],
  selectedScene,
  onSelect,
  language = 'en',
  aspectRatio = '16:9',
}) {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const isLightTheme = document.documentElement.dataset.theme === 'light';

  const getLockedPrompt = (scene) => {
    const isVi = (language || 'en').toLowerCase().startsWith('vi');
    return isVi
      ? (scene.sceneLockedPromptVi || scene.sceneLockedPrompt || scene.promptSuggestionVi || scene.promptSuggestion || '')
      : (scene.sceneLockedPrompt || scene.sceneLockedPromptVi || scene.promptSuggestion || scene.promptSuggestionVi || '');
  };

  const getSceneImageUrl = (scene) => {
    if (!scene) return null;

    if (scene.sceneLockedImageUrls && typeof scene.sceneLockedImageUrls === 'object') {
      const aspectUrl = scene.sceneLockedImageUrls[aspectRatio];
      if (aspectUrl) return aspectUrl;
      if (aspectRatio === '16:9' && scene.sceneLockedImageUrls['9:16']) return scene.sceneLockedImageUrls['9:16'];
      if (aspectRatio === '9:16' && scene.sceneLockedImageUrls['16:9']) return scene.sceneLockedImageUrls['16:9'];
    }

    if (scene.sceneLockedImageUrl) return scene.sceneLockedImageUrl;
    return scene.previewImage;
  };

  return createPortal(
    <div className={`apple-typography fixed inset-0 app-layer-modal overflow-y-auto ${isLightTheme ? 'bg-[rgba(145,167,193,0.28)] backdrop-blur-md' : 'bg-black/70'}`}>
      <div className="flex min-h-full items-start justify-center p-4 py-6">
        <div className={`w-full max-w-[1440px] rounded-xl p-4 ${isLightTheme ? 'studio-card-shell border border-white/50' : 'border border-gray-700 bg-gray-900'}`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Scene Picker</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close scene picker"
              className={isLightTheme ? 'text-slate-500 hover:text-slate-900' : 'text-gray-300 hover:text-white'}
            >
              x
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {scenes.map((scene) => {
              const locked = getLockedPrompt(scene);
              const isActive = selectedScene === scene.value;
              const imageUrl = getImageUrl(getSceneImageUrl(scene));

              return (
                <button
                  key={scene.value}
                  type="button"
                  onClick={() => {
                    onSelect(scene.value, scene);
                    onClose();
                  }}
                  className={`flex flex-col gap-2 rounded-lg border p-2 text-left transition ${
                    isLightTheme
                      ? isActive
                        ? 'apple-option-chip apple-option-chip-cool apple-option-chip-selected border-sky-300'
                        : 'studio-card-shell border-white/45 hover:border-sky-300'
                      : isActive
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                  }`}
                >
                  {imageUrl ? (
                    <div className={`relative w-full aspect-square shrink-0 overflow-hidden rounded border ${isLightTheme ? 'border-white/40 bg-white/10' : 'border-gray-600'}`}>
                      <img
                        src={imageUrl}
                        alt={scene.label}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const placeholder = e.currentTarget.parentElement?.querySelector('.img-placeholder');
                          if (placeholder) placeholder.classList.remove('hidden');
                        }}
                      />
                      <div className={`img-placeholder absolute inset-0 hidden items-center justify-center rounded border border-dashed px-1 text-center text-xs ${isLightTheme ? 'border-white/45 bg-white/60 text-slate-500' : 'border-gray-600 bg-gray-700/70 text-gray-300'}`}>
                        Image unavailable
                      </div>
                    </div>
                  ) : (
                    <div className={`flex w-full aspect-square items-center justify-center rounded border text-xs ${isLightTheme ? 'border-white/45 bg-white/55 text-slate-500' : 'border-gray-700 bg-gray-700 text-gray-300'}`}>
                      No Image
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-medium ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>{scene.label}</div>
                    <div className={`mt-0.5 line-clamp-2 text-xs ${isLightTheme ? 'text-slate-500' : 'text-gray-400'}`}>{scene.description}</div>
                    <p className={`mt-1 line-clamp-3 text-xs ${isLightTheme ? 'text-slate-600' : 'text-gray-300'}`}>
                      {locked || 'No locked prompt yet'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}


