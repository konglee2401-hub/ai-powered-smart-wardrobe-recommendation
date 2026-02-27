import React from 'react';

export default function ScenePickerModal({ isOpen, onClose, scenes = [], selectedScene, onSelect, language = 'en' }) {
  if (!isOpen) return null;

  const getLockedPrompt = (scene) => {
    const isVi = (language || 'en').toLowerCase().startsWith('vi');
    return isVi
      ? (scene.sceneLockedPromptVi || scene.sceneLockedPrompt || scene.promptSuggestionVi || scene.promptSuggestion || '')
      : (scene.sceneLockedPrompt || scene.sceneLockedPromptVi || scene.promptSuggestion || scene.promptSuggestionVi || '');
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Scene Picker</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenes.map((scene) => {
            const locked = getLockedPrompt(scene);
            const isActive = selectedScene === scene.value;
            return (
              <button
                key={scene.value}
                onClick={() => {
                  onSelect(scene.value, scene);
                  onClose();
                }}
                className={`text-left border rounded-lg p-3 transition ${isActive ? 'border-purple-500 bg-purple-900/30' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
              >
                <div className="flex items-start gap-3">
                  {scene.sceneLockedImageUrl || scene.previewImage ? (
                    <img
                      src={scene.sceneLockedImageUrl || scene.previewImage}
                      alt={scene.label}
                      className="w-24 h-24 object-cover rounded border border-gray-700"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded border border-gray-700 bg-gray-700 flex items-center justify-center text-xs text-gray-300">No Image</div>
                  )}
                  <div className="flex-1">
                    <div className="text-white font-medium">{scene.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{scene.description}</div>
                    <details className="mt-2">
                      <summary className="text-xs text-purple-300 cursor-pointer">Locked prompt</summary>
                      <p className="text-xs text-gray-300 mt-1 line-clamp-6">{locked || 'No locked prompt yet'}</p>
                    </details>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
