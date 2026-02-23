/**
 * Video Scenario Selector Component
 * Allows users to select video scenarios, styles, and camera movements
 */

import React from 'react';
import { VIDEO_SCENARIOS, VIDEO_STYLES, CAMERA_MOVEMENTS, LIGHTING_PRESETS } from '../constants/videoScenarios';
import { Film, Sliders, Camera, Lightbulb } from 'lucide-react';

export default function VideoScenarioSelector({
  selectedScenario,
  onScenarioChange,
  selectedStyle,
  onStyleChange,
  selectedCamera,
  onCameraChange,
  selectedLighting,
  onLightingChange
}) {
  return (
    <div className="space-y-6">
      {/* Video Scenarios */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Film className="w-5 h-5 text-purple-400" />
          Video Scenario
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Choose how you want your video to flow. Each scenario has its own movement choreography and narrative structure.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(VIDEO_SCENARIOS).map(([key, scenario]) => (
            <button
              key={key}
              onClick={() => onScenarioChange(key)}
              className={`p-4 rounded-lg border-2 transition text-left ${
                selectedScenario === key
                  ? 'border-purple-600 bg-purple-900/30'
                  : 'border-gray-700 bg-gray-700 hover:border-purple-500'
              }`}
            >
              <div className="font-semibold text-sm">{scenario.name}</div>
              <div className="text-xs text-gray-400 mt-1">{scenario.description}</div>
              <div className="text-xs text-gray-500 mt-2">
                {scenario.duration}s • {scenario.segments} segments
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Video Style */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-400" />
          Video Style
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Select the movement speed and flow. This affects how the character moves and how viewers perceive the overall energy.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(VIDEO_STYLES).map(([key, style]) => (
            <button
              key={key}
              onClick={() => onStyleChange(key)}
              className={`p-4 rounded-lg border-2 transition text-left ${
                selectedStyle === key
                  ? 'border-blue-600 bg-blue-900/30'
                  : 'border-gray-700 bg-gray-700 hover:border-blue-500'
              }`}
            >
              <div className="font-semibold text-sm">{style.name}</div>
              <div className="text-xs text-gray-400 mt-1">{style.description}</div>
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                {style.characteristics.map((char, idx) => (
                  <div key={idx}>• {char}</div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Camera Movement */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-green-400" />
          Camera Movement
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Determine how the camera will move. This enhances the visual story and product showcase.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(CAMERA_MOVEMENTS).map(([key, movement]) => (
            <button
              key={key}
              onClick={() => onCameraChange(key)}
              className={`p-4 rounded-lg border-2 transition text-left ${
                selectedCamera === key
                  ? 'border-green-600 bg-green-900/30'
                  : 'border-gray-700 bg-gray-700 hover:border-green-500'
              }`}
            >
              <div className="font-semibold text-sm">{movement.name}</div>
              <div className="text-xs text-gray-400 mt-1">{movement.description}</div>
              <div className="text-xs text-gray-500 mt-2">
                {movement.movements.map((m, idx) => (
                  <div key={idx}>• {m}</div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lighting Preset */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          Lighting Preset
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Choose the lighting style. This dramatically affects mood, product visibility, and skin tone flattery.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(LIGHTING_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => onLightingChange(key)}
              className={`p-4 rounded-lg border-2 transition text-left ${
                selectedLighting === key
                  ? 'border-yellow-600 bg-yellow-900/30'
                  : 'border-gray-700 bg-gray-700 hover:border-yellow-500'
              }`}
            >
              <div className="font-semibold text-sm">{preset.name}</div>
              <div className="text-xs text-gray-400 mt-1">{preset.description}</div>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-6 h-6 rounded border border-gray-600"
                  style={{ backgroundColor: preset.color }}
                  title={preset.color}
                />
                <div className="text-xs text-gray-500">
                  Intensity: {Math.round(preset.intensity * 100)}%
                </div>
              </div>
              <div className="text-xs text-gray-500 mt- 2 space-y-1 mt-2">
                {preset.characteristics.map((char, idx) => (
                  <div key={idx}>• {char}</div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Summary */}
      {selectedScenario && (
        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Selected Configuration</h4>
          <div className="text-xs text-gray-400 space-y-1">
            <div>
              <span className="font-medium text-gray-300">Scenario:</span> {VIDEO_SCENARIOS[selectedScenario]?.name}
            </div>
            <div>
              <span className="font-medium text-gray-300">Style:</span> {VIDEO_STYLES[selectedStyle]?.name}
            </div>
            <div>
              <span className="font-medium text-gray-300">Camera:</span> {CAMERA_MOVEMENTS[selectedCamera]?.name}
            </div>
            <div>
              <span className="font-medium text-gray-300">Lighting:</span> {LIGHTING_PRESETS[selectedLighting]?.name}
            </div>
            <div className="mt-2 pt-2 border-t border-purple-700">
              <span className="font-medium text-gray-300">Duration:</span> {VIDEO_SCENARIOS[selectedScenario]?.duration}s ({VIDEO_SCENARIOS[selectedScenario]?.segments} segments)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
