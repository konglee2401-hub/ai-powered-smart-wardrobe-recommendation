/**
 * Analysis Breakdown Component
 * Display AI analysis results in organized sections with extracted keywords
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronUp, Copy, Download, Database, AlertCircle
} from 'lucide-react';

const ANALYSIS_SECTIONS = [
  { key: 'scene', label: 'Scene', icon: '🎬' },
  { key: 'lighting', label: 'Lighting', icon: '💡' },
  { key: 'mood', label: 'Mood', icon: '😊' },
  { key: 'cameraAngle', label: 'Camera Angle', icon: '📐' },
  { key: 'makeup', label: 'Makeup', icon: '✨' },
  { key: 'hairstyle', label: 'Hairstyle', icon: '💇' },
  { key: 'bottoms', label: 'Bottoms', icon: '👖' },
  { key: 'shoes', label: 'Shoes', icon: '👠' },
  { key: 'accessories', label: 'Accessories', icon: '💍' },
  { key: 'outerwear', label: 'Outerwear', icon: '🧥' },
];

function Tooltip({ children, content }) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block w-56">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-normal">
          {content}
          <div className="absolute top-full left-4 border-8 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  );
}

function AnalysisSection({ section, data, isExpanded, onToggle, newOptions, onSaveSection }) {
  const rec = data[section.key];
  const value = rec?.choice || rec; // Handle both nested {choice, reason, alternatives} and flat string
  const reason = rec?.reason || '';
  const alternatives = rec?.alternatives || [];
  const isNew = newOptions?.includes(section.key);

  if (!value) return null;

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden mb-3">
      {/* Header */}
      <button
        onClick={() => onToggle(section.key)}
        className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{section.icon}</span>
          <span className="text-sm font-medium">{section.label}</span>
          {isNew && (
            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/50">
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {value && (
            <span className="text-xs text-gray-500 font-mono px-2 py-1 bg-gray-900 rounded">
              {typeof value === 'string' ? value.substring(0, 30) + (value.length > 30 ? '...' : '') : 'object'}
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-gray-900 border-t border-gray-700 space-y-3">
          {/* Main Value Display */}
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/30 rounded-lg p-3 border border-purple-700/30">
            <p className="text-sm text-gray-200 font-medium">
              {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            </p>
          </div>

          {/* Reason */}
          {reason && (
            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/30">
              <p className="text-xs font-semibold text-blue-300 mb-2">Why:</p>
              <p className="text-xs text-gray-300 leading-relaxed">
                {reason}
              </p>
            </div>
          )}

          {/* Alternatives */}
          {alternatives && alternatives.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs font-semibold text-gray-400 mb-2">Alternatives:</p>
              <div className="space-y-1">
                {alternatives.map((alt, idx) => (
                  <div key={idx} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="text-gray-600">{idx + 1}.</span>
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isNew && (
            <div className="flex items-center gap-2 pt-2 px-2 pb-2 border-t border-gray-700">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-400">
                This option is new and can be saved to the database
              </span>
            </div>
          )}

          {isNew && (
            <button
              onClick={() => onSaveSection(section.key, value)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-green-600/20 text-green-400 border border-green-600/50 rounded hover:bg-green-600/30 transition-colors font-medium"
            >
              <Database className="w-3.5 h-3.5" />
              Save to Database
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalysisBreakdown({
  analysis,
  newOptions = [],
  onSaveOption,
  isSaving = false,
  metadata = null
}) {
  const [expandedSections, setExpandedSections] = useState(
    ANALYSIS_SECTIONS.reduce((acc, section) => ({ ...acc, [section.key]: true }), {})
  );
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyRawResponse = () => {
    const text = typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const downloadRawResponse = () => {
    const text = typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', 'ai-analysis.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const analysisData = typeof analysis === 'string'
    ? { character: analysis }
    : (analysis?.analysis || analysis || {});

  // Prepare data for display - extract both nested objects and flat fields
  // Backend returns: { analysis: rawText, recommendations: { characterProfile: {}, productDetails: {}, scene, lighting, ... } }
  const recommendations = analysis?.recommendations || {};
  const displayData = {
    // Flat recommendation fields
    ...(recommendations),
    // Explicitly include nested objects for display
    characterProfile: recommendations.characterProfile || {},
    productDetails: recommendations.productDetails || {},
    analysis: recommendations.analysis || {},
  };

  return (
    <div className="space-y-4">
      {/* Breakdown Sections */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3 flex items-center gap-2">
          <Tooltip content="AI phân tích chi tiết từng khía cạnh của ảnh">
            <span>📋 Analysis Breakdown</span>
          </Tooltip>
        </h3>
        <div className="space-y-2">
          {ANALYSIS_SECTIONS.map(section => (
            <AnalysisSection
              key={section.key}
              section={section}
              data={displayData}
              isExpanded={expandedSections[section.key]}
              onToggle={toggleSection}
              newOptions={newOptions}
              onSaveSection={onSaveOption}
            />
          ))}
        </div>
      </div>

      {/* Raw Response Collapse */}
      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowRawResponse(!showRawResponse)}
          className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 transition-colors"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <span className="text-lg">📄</span>
            Raw API Response
            {metadata && (
              <span className="text-xs text-gray-500">
                ({metadata.responseLength} chars, {metadata.duration}s)
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {showRawResponse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showRawResponse && (
          <div className="p-3 bg-gray-900 border-t border-gray-700 space-y-2">
            {metadata && (
              <div className="text-xs text-gray-500 space-y-1 mb-3 pb-3 border-b border-gray-700">
                <div>⏱️  <strong>Analysis completed in:</strong> {metadata.duration}s</div>
                <div>📊 <strong>Response length:</strong> {metadata.responseLength} characters</div>
                <div>🔧 <strong>Provider:</strong> {metadata.provider}</div>
                <div>🕐 <strong>Timestamp:</strong> {new Date(metadata.timestamp).toLocaleString()}</div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={copyRawResponse}
                disabled={isSaving}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
              >
                <Copy className="w-3 h-3" />
                {copiedRaw ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={downloadRawResponse}
                disabled={isSaving}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            </div>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap overflow-auto max-h-64 bg-gray-950 rounded-lg p-3 font-mono">
              {typeof analysis?.analysis === 'string'
                ? analysis.analysis
                : JSON.stringify(analysis, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
