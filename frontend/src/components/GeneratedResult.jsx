/**
 * Generated Result Component
 * Display generated image with actions
 */

import React, { useState } from 'react';
import {
  Download, RefreshCw, Eye, Copy, ExternalLink,
  ZoomIn, ZoomOut, Maximize2, X, CheckCircle
} from 'lucide-react';

export default function GeneratedResult({
  image,
  metadata,
  onDownload,
  onCopy,
  onRegenerate,
  onReset,
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenFullscreen() {
    setShowFullscreen(true);
  }

  function handleCloseFullscreen() {
    setShowFullscreen(false);
  }

  return (
    <>
      <div className="space-y-4">
        {/* Image Preview */}
        <div className="relative group">
          <img
            src={image}
            alt="Generated"
            className={`w-full rounded-xl shadow-lg transition-transform ${
              isZoomed ? 'scale-110' : 'scale-100'
            }`}
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="p-3 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
                title={isZoomed ? 'Zoom Out' : 'Zoom In'}
              >
                {isZoomed ? (
                  <ZoomOut className="w-5 h-5" />
                ) : (
                  <ZoomIn className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={handleOpenFullscreen}
                className="p-3 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => window.open(image, '_blank')}
                className="p-3 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Metadata */}
        {metadata && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            {metadata.provider && (
              <div className="flex justify-between">
                <span className="text-gray-600">Provider:</span>
                <span className="font-medium text-gray-800">{metadata.provider}</span>
              </div>
            )}

            {metadata.generationTime && (
              <div className="flex justify-between">
                <span className="text-gray-600">Generation Time:</span>
                <span className="font-medium text-gray-800">
                  {(metadata.generationTime / 1000).toFixed(2)}s
                </span>
              </div>
            )}

            {metadata.options?.preset && (
              <div className="flex justify-between">
                <span className="text-gray-600">Preset:</span>
                <span className="font-medium text-gray-800">{metadata.options.preset}</span>
              </div>
            )}

            {metadata.timestamp && (
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium text-gray-800">
                  {new Date(metadata.timestamp).toLocaleString('vi-VN')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>

          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
          <button
            onClick={handleCloseFullscreen}
            className="absolute top-4 right-4 p-3 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={image}
            alt="Generated Fullscreen"
            className="max-w-full max-h-full object-contain"
          />

          {/* Fullscreen Actions */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button
              onClick={onDownload}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download
            </button>

            <button
              onClick={() => window.open(image, '_blank')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              Open
            </button>
          </div>
        </div>
      )}
    </>
  );
}
