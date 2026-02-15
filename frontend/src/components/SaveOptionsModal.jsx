import React from 'react';

export default function SaveOptionsModal({
  showSaveConfirm,
  setShowSaveConfirm,
  saveOptionsPending,
  saveNewOptions
}) {
  if (!showSaveConfirm) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-4 rounded-xl max-w-md mx-4">
        <h3 className="font-bold mb-2">Save {saveOptionsPending.length} new options?</h3>
        <div className="flex flex-wrap gap-1 mb-4 max-h-32 overflow-y-auto">
          {saveOptionsPending.map((item, i) => (
            <span key={i} className="text-xs bg-purple-600 px-2 py-0.5 rounded">
              {item.category}: {item.value}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveNewOptions}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded text-sm"
          >
            Save
          </button>
          <button
            onClick={() => setShowSaveConfirm(false)}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
